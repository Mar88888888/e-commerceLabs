import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DataSource } from 'typeorm';

interface DependencyStatus {
  status: 'up' | 'down';
  message?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
}

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();

    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const isHealthy = dbStatus.status === 'up' && redisStatus.status === 'up';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      dependencies: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', message: error.message };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const timeout = 3000; // 3 seconds max

    try {
      const result = await Promise.race([
        this.redisHealthCheck(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Redis health check timeout')), timeout),
        ),
      ]);
      return result;
    } catch (error) {
      return { status: 'down', message: error.message };
    }
  }

  private async redisHealthCheck(): Promise<DependencyStatus> {
    const testKey = '__health_check__';
    await this.cacheManager.set(testKey, 'ok', 1000);
    const value = await this.cacheManager.get(testKey);
    if (value === 'ok') {
      return { status: 'up' };
    }
    return { status: 'down', message: 'Redis read/write failed' };
  }
}
