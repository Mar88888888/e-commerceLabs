import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { AppService, HealthStatus } from './app.service';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let appService: Partial<AppService>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    appService = {
      checkHealth: jest.fn(),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      const healthyStatus: HealthStatus = {
        status: 'healthy',
        timestamp: '2024-01-15T12:00:00Z',
        dependencies: {
          database: { status: 'up' },
          redis: { status: 'up' },
        },
      };
      (appService.checkHealth as jest.Mock).mockResolvedValue(healthyStatus);

      await controller.checkHealth(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(healthyStatus);
    });

    it('should return 503 when database is down', async () => {
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-15T12:00:00Z',
        dependencies: {
          database: { status: 'down', message: 'Connection refused' },
          redis: { status: 'up' },
        },
      };
      (appService.checkHealth as jest.Mock).mockResolvedValue(unhealthyStatus);

      await controller.checkHealth(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(unhealthyStatus);
    });

    it('should return 503 when redis is down', async () => {
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-15T12:00:00Z',
        dependencies: {
          database: { status: 'up' },
          redis: { status: 'down', message: 'Redis timeout' },
        },
      };
      (appService.checkHealth as jest.Mock).mockResolvedValue(unhealthyStatus);

      await controller.checkHealth(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(unhealthyStatus);
    });

    it('should return 503 when all dependencies are down', async () => {
      const unhealthyStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-15T12:00:00Z',
        dependencies: {
          database: { status: 'down', message: 'DB error' },
          redis: { status: 'down', message: 'Redis error' },
        },
      };
      (appService.checkHealth as jest.Mock).mockResolvedValue(unhealthyStatus);

      await controller.checkHealth(mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(mockResponse.json).toHaveBeenCalledWith(unhealthyStatus);
    });
  });
});
