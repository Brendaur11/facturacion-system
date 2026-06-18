import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaEstadoDto } from './dto/update-factura.dto';
import { FacturaEstado } from './entities/factura.entity';
import { FacturasService } from './facturas.service';

@ApiTags('Facturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facturas')
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  @ApiQuery({ name: 'estado', enum: FacturaEstado, required: false })
  @ApiQuery({ name: 'clienteId', required: false })
  @Get()
  findAll(
    @EmpresaId() empresaId: string,
    @Query('estado') estado?: FacturaEstado,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.facturasService.findAll(empresaId, estado, clienteId);
  }

  @Get(':id')
  findOne(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.facturasService.findOne(id, empresaId);
  }

  @Post()
  create(@EmpresaId() empresaId: string, @Body() createFacturaDto: CreateFacturaDto) {
    return this.facturasService.create(createFacturaDto, empresaId);
  }

  @Patch(':id/estado')
  updateEstado(
    @EmpresaId() empresaId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFacturaEstadoDto,
  ) {
    return this.facturasService.updateEstado(id, dto, empresaId);
  }

  @Post(':id/enviar')
  sendInvoiceByEmail(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.facturasService.sendInvoiceByEmail(id, empresaId);
  }

  @Delete(':id')
  remove(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.facturasService.remove(id, empresaId);
  }
}
