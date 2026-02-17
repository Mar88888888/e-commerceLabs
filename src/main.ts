import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    exposedHeaders: ['Retry-After'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  app.setGlobalPrefix('fdc-api', { exclude: ['health'] });

  const port = configService.get<number>('PORT');
  if (!port) {
    throw new Error('PORT environment variable is not set');
  }

  await app.listen(port);
  logger.log(`Application is running on port ${port}`, 'Bootstrap');

  let isShuttingDown = false;
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    const timestamp = new Date().toISOString();
    const msg = {
      level: 'INFO',
      timestamp,
      context: 'Shutdown',
      msg: `${signal} received. Starting graceful shutdown...`,
    };
    console.log(JSON.stringify(msg));

    app
      .close()
      .catch((err) => console.error(`Shutdown error: ${err.message}`))
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  if (process.platform === 'win32') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('SIGINT', () => process.emit('SIGINT' as any));
  }
}

bootstrap();
