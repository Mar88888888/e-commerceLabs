import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { AppService, HealthStatus } from './app.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async checkHealth(@Res() res: Response): Promise<void> {
    const health: HealthStatus = await this.appService.checkHealth();

    const statusCode =
      health.status === 'healthy'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(health);
  }
}
