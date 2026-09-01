import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RawRefreshToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ refreshToken?: string }>();

    return request.refreshToken;
  },
);
