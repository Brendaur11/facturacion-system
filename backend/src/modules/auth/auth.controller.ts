import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginAttemptsService } from './login-attempts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/superadmin.guard';
import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  @ApiOperation({ summary: 'Login — retorna JWT' })
  @Post('login')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    this.loginAttempts.check(ip);
    try {
      const result = await this.authService.login(loginDto);
      this.loginAttempts.reset(ip);
      return result;
    } catch (err) {
      this.loginAttempts.increment(ip);
      throw err;
    }
  }

  @ApiOperation({ summary: 'Registrar nuevo usuario (solo SUPERADMIN)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user);
  }

  @ApiOperation({ summary: 'Actualizar nombre o contraseña propios' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @ApiOperation({ summary: 'Subir foto de perfil' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (req: any, file, cb) => {
          cb(null, `${req.user.id}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const validMime = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
        const validExt = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
        if (!validMime || !validExt) {
          return cb(new BadRequestException('Solo se aceptan imágenes JPG, PNG o WebP'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } })
  uploadAvatar(@CurrentUser() user: User, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se envió ningún archivo');
    return this.authService.updateAvatar(user.id, file);
  }

  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @Throttle({ global: { limit: 4, ttl: 300_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Si el email está registrado, recibirás las instrucciones en breve' };
  }

  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  @Throttle({ global: { limit: 10, ttl: 900_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Contraseña actualizada correctamente' };
  }
}
