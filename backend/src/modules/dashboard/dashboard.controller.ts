import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  getResumen(@EmpresaId() empresaId: string) {
    return this.dashboardService.getResumen(empresaId);
  }

  @Get('ultimas')
  getUltimas(@EmpresaId() empresaId: string) {
    return this.dashboardService.getUltimas(empresaId);
  }

  @Get('por-mes')
  getPorMes(@EmpresaId() empresaId: string) {
    return this.dashboardService.getPorMes(empresaId);
  }
}
