import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ExportFacturasDto } from './dto/export-facturas.dto';
import { ExportResult, ExportService } from './export.service';

function send(res: Response, result: ExportResult) {
  res.set({
    'Content-Type': result.contentType,
    'Content-Disposition': `attachment; filename="${result.filename}"`,
  });
  res.send(result.data);
}

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('facturas/pdf')
  async pdf(@EmpresaId() empresaId: string, @Body() dto: ExportFacturasDto, @Res() res: Response) {
    send(res, await this.exportService.exportPdf(dto, empresaId));
  }

  @Post('facturas/xlsx')
  async xlsx(@EmpresaId() empresaId: string, @Body() dto: ExportFacturasDto, @Res() res: Response) {
    send(res, await this.exportService.exportXlsx(dto, empresaId));
  }

  @Post('facturas/docx')
  async docx(@EmpresaId() empresaId: string, @Body() dto: ExportFacturasDto, @Res() res: Response) {
    send(res, await this.exportService.exportDocx(dto, empresaId));
  }

  @Post('facturas/csv')
  async csv(@EmpresaId() empresaId: string, @Body() dto: ExportFacturasDto, @Res() res: Response) {
    send(res, await this.exportService.exportCsv(dto, empresaId));
  }
}
