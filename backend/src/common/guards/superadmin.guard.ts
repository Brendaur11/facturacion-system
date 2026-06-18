import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.rol !== UserRole.SUPERADMIN && user?.rol !== UserRole.ADMIN) {
      throw new ForbiddenException('Acceso restringido');
    }
    return true;
  }
}
