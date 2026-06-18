import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { EmpresaService } from './empresa.service';

@ApiTags('Empresa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  findOne(@EmpresaId() empresaId: string) {
    return this.empresaService.findOne(empresaId);
  }

  @Patch()
  update(@EmpresaId() empresaId: string, @Body() updateEmpresaDto: UpdateEmpresaDto) {
    return this.empresaService.update(empresaId, updateEmpresaDto);
  }
}
