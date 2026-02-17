import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: Partial<JwtService>;
  let usersService: Partial<UsersService>;

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
      user: null,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn(),
    };

    usersService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  describe('canActivate', () => {
    it('should return true for valid token and existing user', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should set user on request object', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      const request = context.switchToHttp().getRequest();
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 1 });
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      await guard.canActivate(context);

      expect(request.user).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No token provided',
      );
    });

    it('should throw UnauthorizedException when header does not start with Bearer', async () => {
      const context = createMockContext('Basic sometoken');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'No token provided',
      );
    });

    it('should throw UnauthorizedException when token is empty after Bearer', async () => {
      const context = createMockContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      const context = createMockContext('Bearer invalid.token');
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Failed to verify token',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 999 });
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token has no sub claim', async () => {
      const context = createMockContext('Bearer valid.jwt.token');
      (jwtService.verify as jest.Mock).mockReturnValue({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
