import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { EmpresaId } from '../../common/decorators/empresa-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @ApiQuery({ name: 'search', required: false })
  @Get()
  findAll(@EmpresaId() empresaId: string, @Query('search') search?: string) {
    return this.clientesService.findAll(empresaId, search);
  }

  @Get(':id')
  findOne(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.clientesService.findOne(id, empresaId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  importClientes(@EmpresaId() empresaId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(ext ?? ''))
      throw new BadRequestException('Solo se aceptan archivos .xlsx o .csv');
    return this.clientesService.importFromBuffer(file.buffer, empresaId);
  }

  @Post()
  create(@EmpresaId() empresaId: string, @Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto, empresaId);
  }

  @Patch(':id')
  update(
    @EmpresaId() empresaId: string,
    @Param('id') id: string,
    @Body() updateClienteDto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, updateClienteDto, empresaId);
  }

  @Delete(':id')
  remove(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.clientesService.remove(id, empresaId);
  }
}
