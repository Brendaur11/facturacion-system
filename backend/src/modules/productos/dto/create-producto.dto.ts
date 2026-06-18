import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductoDto {
  @ApiProperty()
  @IsString()
  nombre: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unidad?: string;
}
