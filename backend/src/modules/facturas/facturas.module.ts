import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Cliente } from '../clientes/entities/cliente.entity';
import { FacturaItem } from './entities/factura-item.entity';
import { Factura } from './entities/factura.entity';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Factura, FacturaItem, Cliente]), AuthModule],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
