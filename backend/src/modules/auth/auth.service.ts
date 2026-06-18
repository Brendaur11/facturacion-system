import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MailerService } from './mailer.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: loginDto.email },
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const passwordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { sub: user.id, email: user.email, rol: user.rol, empresaId: user.empresaId };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(createUserDto: CreateUserDto) {
    const exists = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hashed = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({ ...createUserDto, password: hashed });
    const saved = await this.usersRepository.save(user);
    return this.safeUser(saved);
  }

  getProfile(user: User) {
    return this.safeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updates: Partial<User> = {};

    if (dto.nombre?.trim()) updates.nombre = dto.nombre.trim();

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Ingresá tu contraseña actual para cambiarla');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');
      updates.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (Object.keys(updates).length === 0) return this.safeUser(user);

    await this.usersRepository.update(userId, updates);
    const updated = await this.usersRepository.findOne({ where: { id: userId } });
    return this.safeUser(updated!);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (user?.avatarUrl) {
      const oldFile = basename(user.avatarUrl);
      const oldPath = join(process.cwd(), 'uploads', 'avatars', oldFile);
      if (existsSync(oldPath) && oldFile !== file.filename) {
        unlinkSync(oldPath);
      }
    }

    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3002');
    const avatarUrl = `${backendUrl}/uploads/avatars/${file.filename}`;
    await this.usersRepository.update(userId, { avatarUrl });
    return { avatarUrl };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) return;

    const token = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersRepository.update(user.id, {
      resetToken: token,
      resetTokenExpires: expires,
    });

    await this.mailerService.sendPasswordReset(email, user.nombre, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new BadRequestException('El link es inválido o ha expirado');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpires: null,
    });
  }

  private safeUser(user: User) {
    const { password: _p, resetToken: _rt, resetTokenExpires: _rte, ...result } = user;
    return result;
  }
}
