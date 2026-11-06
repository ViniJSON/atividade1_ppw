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
import { Aluno } from '../../../domain/entities/aluno.entity';
import { AtualizarAlunoUseCase } from '../../../application/use-cases/alunos/atualizar-aluno.use-case';
import { BuscarAlunoUseCase } from '../../../application/use-cases/alunos/buscar-aluno.use-case';
import { CriarAlunoUseCase } from '../../../application/use-cases/alunos/criar-aluno.use-case';
import { ExcluirAlunoUseCase } from '../../../application/use-cases/alunos/excluir-aluno.use-case';
import { ListarAlunosUseCase } from '../../../application/use-cases/alunos/listar-alunos.use-case';
import { SalvarAlunoDto } from '../dtos/salvar-aluno.dto';

@Controller('matriculas/alunos')
export class AlunosController {
  constructor(
    private readonly listar: ListarAlunosUseCase,
    private readonly buscar: BuscarAlunoUseCase,
    private readonly criar: CriarAlunoUseCase,
    private readonly atualizar: AtualizarAlunoUseCase,
    private readonly excluir: ExcluirAlunoUseCase,
  ) {}

  @Get()
  listarTodos(): Promise<Aluno[]> {
    return this.listar.execute();
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string): Promise<Aluno> {
    return this.buscar.execute(id);
  }

  @Post()
  @HttpCode(201)
  incluir(@Body() dto: SalvarAlunoDto): Promise<Aluno> {
    return this.criar.execute(dto);
  }

  @Put(':id')
  alterar(@Param('id') id: string, @Body() dto: SalvarAlunoDto): Promise<Aluno> {
    return this.atualizar.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string): Promise<void> {
    await this.excluir.execute(id);
  }
}
