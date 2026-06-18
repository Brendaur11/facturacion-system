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
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductosService } from './productos.service';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @ApiQuery({ name: 'search', required: false })
  @Get()
  findAll(@EmpresaId() empresaId: string, @Query('search') search?: string) {
    return this.productosService.findAll(empresaId, search);
  }

  @Get(':id')
  findOne(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.productosService.findOne(id, empresaId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  importProductos(@EmpresaId() empresaId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(ext ?? ''))
      throw new BadRequestException('Solo se aceptan archivos .xlsx o .csv');
    return this.productosService.importFromBuffer(file.buffer, empresaId);
  }

  @Post()
  create(@EmpresaId() empresaId: string, @Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto, empresaId);
  }

  @Patch(':id')
  update(
    @EmpresaId() empresaId: string,
    @Param('id') id: string,
    @Body() updateProductoDto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, updateProductoDto, empresaId);
  }

  @Delete(':id')
  remove(@EmpresaId() empresaId: string, @Param('id') id: string) {
    return this.productosService.remove(id, empresaId);
  }
}
