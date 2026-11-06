import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Solicitacao } from '../../../domain/entities/solicitacao.entity';
import { AprovarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/aprovar-solicitacao.use-case';
import { AtualizarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/atualizar-solicitacao.use-case';
import { BuscarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/buscar-solicitacao.use-case';
import { CriarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/criar-solicitacao.use-case';
import { ExcluirSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/excluir-solicitacao.use-case';
import { ListarSolicitacoesUseCase } from '../../../application/use-cases/solicitacoes/listar-solicitacoes.use-case';
import { RejeitarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/rejeitar-solicitacao.use-case';
import { RejeitarSolicitacaoDto } from '../dtos/rejeitar-solicitacao.dto';
import { SalvarSolicitacaoDto } from '../dtos/salvar-solicitacao.dto';

@Controller('matriculas/solicitacoes')
export class SolicitacoesController {
  constructor(
    private readonly listar: ListarSolicitacoesUseCase,
    private readonly buscar: BuscarSolicitacaoUseCase,
    private readonly criar: CriarSolicitacaoUseCase,
    private readonly atualizar: AtualizarSolicitacaoUseCase,
    private readonly excluir: ExcluirSolicitacaoUseCase,
    private readonly aprovarUseCase: AprovarSolicitacaoUseCase,
    private readonly rejeitarUseCase: RejeitarSolicitacaoUseCase,
  ) {}

  @Get()
  listarTodas(): Promise<Solicitacao[]> {
    return this.listar.execute();
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string): Promise<Solicitacao> {
    return this.buscar.execute(id);
  }

  @Post()
  @HttpCode(201)
  incluir(@Body() dto: SalvarSolicitacaoDto): Promise<Solicitacao> {
    return this.criar.execute(dto);
  }

  @Put(':id')
  alterar(
    @Param('id') id: string,
    @Body() dto: SalvarSolicitacaoDto,
  ): Promise<Solicitacao> {
    return this.atualizar.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remover(@Param('id') id: string): Promise<void> {
    await this.excluir.execute(id);
  }

  @Patch(':id/aprovar')
  aprovar(@Param('id') id: string): Promise<Solicitacao> {
    return this.aprovarUseCase.execute(id);
  }

  @Patch(':id/rejeitar')
  rejeitar(
    @Param('id') id: string,
    @Body() dto: RejeitarSolicitacaoDto,
  ): Promise<Solicitacao> {
    return this.rejeitarUseCase.execute(id, dto.motivo);
  }
}
