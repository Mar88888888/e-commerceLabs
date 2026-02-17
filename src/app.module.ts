import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { UserFavComp } from './users/favourite/user.favcomp.entity';
import { UserFavTeam } from './users/favourite/user.favteam.entity';
import { MatchesModule } from './matches/matches.module';
import { HttpModule } from '@nestjs/axios';
import { TeamsModule } from './team/teams.module';
import { CompetitionModule } from './competitions/competition.module';
import { StandingsModule } from './standings/standings.module';
import { FootballDataModule } from './football-data/football-data.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';
import { UserHiddenComp } from './users/hidden/user.hiddencomp.entity';

let redisConnected = true;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        autoLogging: {
          ignore: (req) => req.url === '/health',
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers["x-auth-token"]',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
          ],
          remove: true,
        },
        formatters: {
          level: (label) => ({ level: label.toUpperCase() }),
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      },
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [User, UserFavComp, UserFavTeam, UserHiddenComp],
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            migrationsRun: true,
            ssl: { rejectUnauthorized: false },
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [User, UserFavComp, UserFavTeam, UserHiddenComp],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: true,
        };
      },
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        const socketOptions = {
          reconnectStrategy: (retries: number) => {
            return Math.min(retries * 500, 5000);
          },
        };

        const logRedis = (level: string, message: string) => {
          if (process.env.NODE_ENV === 'production') {
            console.log(
              JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                context: 'Redis',
                message,
              }),
            );
          } else {
            const time = new Date().toLocaleTimeString();
            const color = level === 'ERROR' ? '\x1b[31m' : '\x1b[32m';
            console.log(`${color}[${time}] ${level}\x1b[0m [Redis] ${message}`);
          }
        };

        const setupRedisEvents = (client: any) => {
          client.on('error', (err: Error) => {
            if (redisConnected) {
              logRedis('ERROR', `Connection lost: ${err.message}`);
              redisConnected = false;
            }
          });
          client.on('ready', () => {
            if (!redisConnected) {
              logRedis('INFO', 'Connection restored');
            }
            redisConnected = true;
          });
        };

        if (redisUrl) {
          const store = await redisStore({
            url: redisUrl,
            socket: socketOptions,
          });
          setupRedisEvents(store.client);
          return { store, ttl: 60 * 1000 };
        }

        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');

        if (!redisHost || !redisPort) {
          throw new Error(
            'Redis configuration missing. Set REDIS_URL or both REDIS_HOST and REDIS_PORT',
          );
        }

        const store = await redisStore({
          socket: { host: redisHost, port: redisPort, ...socketOptions },
        });
        setupRedisEvents(store.client);
        return { store, ttl: 60 * 1000 };
      },
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 10000, limit: 20 },
        { name: 'medium', ttl: 60000, limit: 100 },
        { name: 'auth', ttl: 60000, limit: 5 },
      ],
      skipIf: (context) => {
        const request = context.switchToHttp().getRequest();
        return request.url === '/health';
      },
    }),

    UsersModule,
    MatchesModule,
    HttpModule,
    TeamsModule,
    CompetitionModule,
    StandingsModule,
    FootballDataModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
