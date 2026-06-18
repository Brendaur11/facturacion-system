import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { Empresa } from './entities/empresa.entity';

@Injectable()
export class EmpresaService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepository: Repository<Empresa>,
  ) {}

  async findOne(empresaId: string) {
    const empresa = await this.empresaRepository.findOne({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa no configurada');
    return empresa;
  }

  async update(empresaId: string, updateEmpresaDto: UpdateEmpresaDto) {
    const empresa = await this.findOne(empresaId);
    await this.empresaRepository.update(empresa.id, updateEmpresaDto);
    return this.findOne(empresaId);
  }
}
