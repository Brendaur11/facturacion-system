import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class SuperAdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.rol !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Solo el superadmin puede realizar esta acción');
    }
    return true;
  }
}
