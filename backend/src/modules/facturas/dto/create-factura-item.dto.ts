import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateFacturaItemDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  productoId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  descripcion: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Max(100000)
  cantidad: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(999999999)
  precioUnitario: number;
}
