import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @IsOptional()
  currentPassword?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @IsOptional()
  newPassword?: string;
}
