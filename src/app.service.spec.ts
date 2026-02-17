import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

describe('AppService', () => {
  let service: AppService;
  let dataSource: Partial<DataSource>;
  let cacheManager: Partial<Cache>;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: DataSource, useValue: dataSource },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('checkHealth', () => {
    it('should return healthy when all dependencies are up', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([]);
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.get as jest.Mock).mockResolvedValue('ok');

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.dependencies.database.status).toBe('up');
      expect(result.dependencies.redis.status).toBe('up');
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy when database is down', async () => {
      (dataSource.query as jest.Mock).mockRejectedValue(new Error('Connection refused'));
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.get as jest.Mock).mockResolvedValue('ok');

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.database.status).toBe('down');
      expect(result.dependencies.database.message).toBe('Connection refused');
      expect(result.dependencies.redis.status).toBe('up');
    });

    it('should return unhealthy when redis is down', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([]);
      (cacheManager.set as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.database.status).toBe('up');
      expect(result.dependencies.redis.status).toBe('down');
    });

    it('should return unhealthy when redis read returns wrong value', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([]);
      (cacheManager.set as jest.Mock).mockResolvedValue(undefined);
      (cacheManager.get as jest.Mock).mockResolvedValue('wrong-value');

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.redis.status).toBe('down');
      expect(result.dependencies.redis.message).toBe('Redis read/write failed');
    });

    it('should return unhealthy when both dependencies are down', async () => {
      (dataSource.query as jest.Mock).mockRejectedValue(new Error('DB error'));
      (cacheManager.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.dependencies.database.status).toBe('down');
      expect(result.dependencies.redis.status).toBe('down');
    });

    it('should handle redis timeout', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([]);
      // Simulate a timeout by rejecting with timeout error
      (cacheManager.set as jest.Mock).mockRejectedValue(new Error('Redis health check timeout'));

      const result = await service.checkHealth();

      expect(result.dependencies.redis.status).toBe('down');
      expect(result.dependencies.redis.message).toBe('Redis health check timeout');
    });
  });
});
