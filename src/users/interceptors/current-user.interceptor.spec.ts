import { Test, TestingModule } from '@nestjs/testing';
import { CurrentUserInterceptor } from './curent-user.interceptor';
import { UsersService } from '../users.service';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('CurrentUserInterceptor', () => {
  let interceptor: CurrentUserInterceptor;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      currentUser: null,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  const mockCallHandler: CallHandler = {
    handle: () => of('test'),
  };

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
    };

    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrentUserInterceptor,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    interceptor = module.get<CurrentUserInterceptor>(CurrentUserInterceptor);
  });

  describe('intercept', () => {
    it('should set currentUser when valid token is provided', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      const request = context.switchToHttp().getRequest();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      await interceptor.intercept(context, mockCallHandler);

      expect(request.currentUser).toEqual(mockUser);
      expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should not set currentUser when no authorization header', async () => {
      const context = createMockContext(undefined);
      const request = context.switchToHttp().getRequest();

      await interceptor.intercept(context, mockCallHandler);

      expect(request.currentUser).toBeNull();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should not set currentUser when header does not start with Bearer', async () => {
      const context = createMockContext('Basic sometoken');
      const request = context.switchToHttp().getRequest();

      await interceptor.intercept(context, mockCallHandler);

      expect(request.currentUser).toBeNull();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should not set currentUser when token verification fails', async () => {
      const context = createMockContext('Bearer invalid.token');
      const request = context.switchToHttp().getRequest();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await interceptor.intercept(context, mockCallHandler);

      expect(request.currentUser).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should not set currentUser when user not found', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      const request = context.switchToHttp().getRequest();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 999 });
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await interceptor.intercept(context, mockCallHandler);

      expect(request.currentUser).toBeNull();
    });

    it('should not set currentUser when token has no sub claim', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      const request = context.switchToHttp().getRequest();
      (jwtService.verify as jest.Mock).mockReturnValue({});

      await interceptor.intercept(context, mockCallHandler);

      expect(request.currentUser).toBeNull();
      expect(usersService.findOne).not.toHaveBeenCalled();
    });

    it('should call handler.handle() and return observable', async () => {
      const context = createMockContext(undefined);
      const handleSpy = jest.spyOn(mockCallHandler, 'handle');

      const result = await interceptor.intercept(context, mockCallHandler);

      expect(handleSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
