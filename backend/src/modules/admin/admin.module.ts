import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Empresa } from '../empresa/entities/empresa.entity';
import { Factura } from '../facturas/entities/factura.entity';
import { Producto } from '../productos/entities/producto.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Empresa, User, Factura, Cliente, Producto])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
