import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class CreateTenantUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.ADMIN })
  @IsEnum(UserRole)
  @IsOptional()
  rol?: UserRole;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  empresaId?: string;
}
