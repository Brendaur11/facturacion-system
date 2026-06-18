import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Empresa } from '../../empresa/entities/empresa.entity';
import { FacturaItem } from './factura-item.entity';

export enum FacturaEstado {
  BORRADOR = 'BORRADOR',
  EMITIDA = 'EMITIDA',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

@Entity('facturas')
@Unique(['numero', 'empresa'])
export class Factura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  numero: string;

  @ManyToOne(() => Cliente, (cliente) => cliente.facturas, { eager: true })
  cliente: Cliente;

  @ManyToOne(() => Empresa, { eager: true })
  empresa: Empresa;

  @OneToMany(() => FacturaItem, (item) => item.factura, {
    cascade: true,
    eager: true,
  })
  items: FacturaItem[];

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'date', nullable: true })
  fechaVencimiento: Date;

  @Column({
    type: 'enum',
    enum: FacturaEstado,
    default: FacturaEstado.BORRADOR,
  })
  estado: FacturaEstado;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  impuesto: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
