import { ProcessingInterceptor } from './processing.interceptor';
import { ExecutionContext, CallHandler, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { DataStatus, Defaults } from '../common/constants';

describe('ProcessingInterceptor', () => {
  let interceptor: ProcessingInterceptor;
  let mockResponse: any;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new ProcessingInterceptor();

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn(),
    };

    mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;
  });

  const createCallHandler = (returnValue: any): CallHandler => ({
    handle: () => of(returnValue),
  });

  describe('intercept', () => {
    it('should return data for FRESH status', (done) => {
      const result = { data: { id: 1, name: 'Test' }, status: DataStatus.FRESH };
      mockCallHandler = createCallHandler(result);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(value).toEqual({ id: 1, name: 'Test' });
        expect(mockResponse.status).not.toHaveBeenCalled();
        done();
      });
    });

    it('should return data for STALE status', (done) => {
      const result = { data: { id: 1, name: 'Test' }, status: DataStatus.STALE };
      mockCallHandler = createCallHandler(result);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(value).toEqual({ id: 1, name: 'Test' });
        done();
      });
    });

    it('should set 202 status and Retry-After header for PROCESSING', (done) => {
      const result = { data: null, status: DataStatus.PROCESSING, retryAfter: 10 };
      mockCallHandler = createCallHandler(result);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', '10');
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
        expect(value).toEqual({ status: DataStatus.PROCESSING });
        done();
      });
    });

    it('should use default retry-after when not specified', (done) => {
      const result = { data: null, status: DataStatus.PROCESSING };
      mockCallHandler = createCallHandler(result);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Retry-After',
          String(Defaults.RETRY_AFTER_SECONDS),
        );
        expect(value).toEqual({ status: DataStatus.PROCESSING });
        done();
      });
    });

    it('should set 204 status for NOT_AVAILABLE', (done) => {
      const result = { data: null, status: DataStatus.NOT_AVAILABLE };
      mockCallHandler = createCallHandler(result);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
        expect(value).toBeNull();
        done();
      });
    });

    it('should pass through non-DataResult objects', (done) => {
      const result = { someField: 'value' };
      mockCallHandler = createCallHandler(result);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(value).toEqual(result);
        done();
      });
    });

    it('should pass through null values', (done) => {
      mockCallHandler = createCallHandler(null);

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(value).toBeNull();
        done();
      });
    });

    it('should pass through primitive values', (done) => {
      mockCallHandler = createCallHandler('simple string');

      interceptor.intercept(mockContext, mockCallHandler).subscribe((value) => {
        expect(value).toBe('simple string');
        done();
      });
    });
  });
});
