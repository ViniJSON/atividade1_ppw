import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Disciplina } from '../../../domain/entities/disciplina.entity';
import { AtualizarDisciplinaUseCase } from '../../../application/use-cases/disciplinas/atualizar-disciplina.use-case';
import { BuscarDisciplinaUseCase } from '../../../application/use-cases/disciplinas/buscar-disciplina.use-case';
import { CriarDisciplinaUseCase } from '../../../application/use-cases/disciplinas/criar-disciplina.use-case';
import { ExcluirDisciplinaUseCase } from '../../../application/use-cases/disciplinas/excluir-disciplina.use-case';
import { ListarDisciplinasUseCase } from '../../../application/use-cases/disciplinas/listar-disciplinas.use-case';
import { SalvarDisciplinaDto } from '../dtos/salvar-disciplina.dto';

@Controller('matriculas/disciplinas')
export class DisciplinasController {
  constructor(
    private readonly listar: ListarDisciplinasUseCase,
    private readonly buscar: BuscarDisciplinaUseCase,
    private readonly criar: CriarDisciplinaUseCase,
    private readonly atualizar: AtualizarDisciplinaUseCase,
    private readonly excluir: ExcluirDisciplinaUseCase,
  ) {}

  @Get()
  listarTodas(): Promise<Disciplina[]> {
    return this.listar.execute();
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string): Promise<Disciplina> {
    return this.buscar.execute(id);
  }

  @Post()
  @HttpCode(201)
  incluir(@Body() dto: SalvarDisciplinaDto): Promise<Disciplina> {
    return this.criar.execute(dto);
  }

  @Put(':id')
  alterar(
    @Param('id') id: string,
    @Body() dto: SalvarDisciplinaDto,
  ): Promise<Disciplina> {
    return this.atualizar.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string): Promise<void> {
    await this.excluir.execute(id);
  }
}
