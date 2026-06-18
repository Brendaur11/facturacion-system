import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateFacturaItemDto } from './create-factura-item.dto';

export class CreateFacturaDto {
  @ApiProperty()
  @IsUUID()
  clienteId: string;

  @ApiProperty()
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @ApiProperty({ type: [CreateFacturaItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateFacturaItemDto)
  items: CreateFacturaItemDto[];

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  impuesto?: number;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notas?: string;
}
