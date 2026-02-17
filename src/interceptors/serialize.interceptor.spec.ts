import { SerializeInterceptor, Serialize } from './serialize.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Expose } from 'class-transformer';

class TestDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}

describe('SerializeInterceptor', () => {
  let interceptor: SerializeInterceptor;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new SerializeInterceptor(TestDto);

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as ExecutionContext;
  });

  const createCallHandler = (returnValue: any): CallHandler => ({
    handle: () => of(returnValue),
  });

  describe('intercept', () => {
    it('should transform data using the dto', (done) => {
      const data = { id: 1, name: 'Test', secret: 'should-be-excluded' };
      const callHandler = createCallHandler(data);

      interceptor.intercept(mockContext, callHandler).subscribe((value) => {
        expect(value.id).toBe(1);
        expect(value.name).toBe('Test');
        expect(value.secret).toBeUndefined();
        done();
      });
    });

    it('should pass through objects with message property', (done) => {
      const data = { message: 'Success message' };
      const callHandler = createCallHandler(data);

      interceptor.intercept(mockContext, callHandler).subscribe((value) => {
        expect(value).toEqual(data);
        done();
      });
    });

    it('should pass through objects with accessToken property', (done) => {
      const data = { accessToken: 'jwt.token.here', userId: 1 };
      const callHandler = createCallHandler(data);

      interceptor.intercept(mockContext, callHandler).subscribe((value) => {
        expect(value).toEqual(data);
        done();
      });
    });

    it('should handle null data', (done) => {
      const callHandler = createCallHandler(null);

      interceptor.intercept(mockContext, callHandler).subscribe((value) => {
        expect(value).toBeNull();
        done();
      });
    });

    it('should handle array data', (done) => {
      const data = [
        { id: 1, name: 'Test1', secret: 'hidden' },
        { id: 2, name: 'Test2', secret: 'hidden' },
      ];
      const callHandler = createCallHandler(data);

      interceptor.intercept(mockContext, callHandler).subscribe((value) => {
        expect(Array.isArray(value)).toBe(true);
        expect(value).toHaveLength(2);
        expect(value[0].secret).toBeUndefined();
        expect(value[1].secret).toBeUndefined();
        done();
      });
    });
  });

  describe('Serialize decorator', () => {
    it('should return UseInterceptors decorator', () => {
      const decorator = Serialize(TestDto);
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });
});
