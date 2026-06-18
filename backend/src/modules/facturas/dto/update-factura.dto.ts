import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateFacturaDto } from './create-factura.dto';
import { FacturaEstado } from '../entities/factura.entity';

export class UpdateFacturaDto extends PartialType(CreateFacturaDto) {}

export class UpdateFacturaEstadoDto {
  @ApiPropertyOptional({ enum: FacturaEstado })
  @IsEnum(FacturaEstado)
  @IsOptional()
  estado: FacturaEstado;
}
