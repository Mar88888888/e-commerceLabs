import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

describe('AppController', () => {
  let appService: AppService;
  let mockDataSource: Partial<DataSource>;
  let mockCacheManager: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers();

    mockDataSource = {
      query: jest.fn(),
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    appService = app.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('GET /health', () => {
    it('should return healthy when all dependencies are up', async () => {
      (mockDataSource.query as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue('ok');

      const health = await appService.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.dependencies.database.status).toBe('up');
      expect(health.dependencies.redis.status).toBe('up');
    });

    it('should return unhealthy when database is down', async () => {
      (mockDataSource.query as jest.Mock).mockRejectedValue(
        new Error('Connection refused'),
      );
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue('ok');

      const health = await appService.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.dependencies.database.status).toBe('down');
      expect(health.dependencies.database.message).toBe('Connection refused');
      expect(health.dependencies.redis.status).toBe('up');
    });

    it('should return unhealthy when redis is down', async () => {
      (mockDataSource.query as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      const health = await appService.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.dependencies.database.status).toBe('up');
      expect(health.dependencies.redis.status).toBe('down');
      expect(health.dependencies.redis.message).toBe('Redis connection failed');
    });

    it('should return unhealthy when both dependencies are down', async () => {
      (mockDataSource.query as jest.Mock).mockRejectedValue(
        new Error('DB connection refused'),
      );
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      const health = await appService.checkHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.dependencies.database.status).toBe('down');
      expect(health.dependencies.redis.status).toBe('down');
    });
  });
});
