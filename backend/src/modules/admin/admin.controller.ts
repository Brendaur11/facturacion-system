import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/superadmin.guard';
import { SuperAdminOnlyGuard } from '../../common/guards/superadmin-only.guard';
import { CreateEmpresaDto } from '../empresa/dto/create-empresa.dto';
import { UpdateEmpresaDto } from '../empresa/dto/update-empresa.dto';
import { AdminService } from './admin.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ─────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@CurrentUser() requester: { rol: string; empresaId?: string }) {
    return this.adminService.getDashboard(requester);
  }

  // ── Empresas ──────────────────────────────────────────────────────────

  @Get('empresas')
  findAllEmpresas() {
    return this.adminService.findAllEmpresas();
  }

  @Post('empresas')
  createEmpresa(@Body() dto: CreateEmpresaDto) {
    return this.adminService.createEmpresa(dto);
  }

  @Patch('empresas/:id')
  @UseGuards(SuperAdminOnlyGuard)
  updateEmpresa(@Param('id') id: string, @Body() dto: UpdateEmpresaDto) {
    return this.adminService.updateEmpresa(id, dto);
  }

  @Delete('empresas/:id')
  @UseGuards(SuperAdminOnlyGuard)
  removeEmpresa(@Param('id') id: string) {
    return this.adminService.removeEmpresa(id);
  }

  // ── Usuarios ──────────────────────────────────────────────────────────

  @Get('usuarios')
  findAllUsuarios(@CurrentUser() requester: { rol: string; empresaId?: string }) {
    return this.adminService.findAllUsuarios(requester);
  }

  @Post('usuarios')
  createUsuario(
    @CurrentUser() requester: { rol: string; empresaId?: string },
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.adminService.createUsuario(dto, requester);
  }

  @Patch('usuarios/:id')
  updateUsuario(
    @CurrentUser() requester: { rol: string; empresaId?: string },
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    return this.adminService.updateUsuario(id, dto, requester);
  }

  @Delete('usuarios/:id')
  removeUsuario(
    @CurrentUser() requester: { rol: string; empresaId?: string },
    @Param('id') id: string,
  ) {
    return this.adminService.removeUsuario(id, requester);
  }
}
