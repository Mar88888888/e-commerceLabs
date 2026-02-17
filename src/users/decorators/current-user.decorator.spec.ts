import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  const mockUser = { id: 1, email: 'test@example.com' };

  const getParamDecoratorFactory = () => {
    class TestController {
      testMethod(@CurrentUser() user: any) {
        return user;
      }
    }

    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'testMethod',
    );

    const key = Object.keys(metadata)[0];
    return metadata[key].factory;
  };

  it('should return currentUser from request', () => {
    const factory = getParamDecoratorFactory();

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          currentUser: mockUser,
        }),
      }),
    } as ExecutionContext;

    const result = factory(null, mockContext);

    expect(result).toEqual(mockUser);
  });

  it('should return undefined when no currentUser', () => {
    const factory = getParamDecoratorFactory();

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;

    const result = factory(null, mockContext);

    expect(result).toBeUndefined();
  });
});
