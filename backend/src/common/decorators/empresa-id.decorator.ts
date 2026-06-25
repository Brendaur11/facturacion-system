import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const EmpresaId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const empresaId: string | undefined = request.user?.empresaId;
    if (!empresaId) throw new ForbiddenException('Este recurso requiere pertenencia a una empresa');
    return empresaId;
  },
);
