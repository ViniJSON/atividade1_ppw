import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { HistoricoSolicitacao } from '../../../domain/entities/historico-solicitacao';
import { EventoSolicitacao, PapelUsuario } from '../../../domain/enums/solicitacao.enums';
import { ForbiddenError } from '../../../domain/errors/domain.errors';
import { SolicitacaoStateMachine } from '../../../domain/workflow/solicitacao.state-machine';
import type { Actor } from '../../../domain/workflow/types';
import { BuscarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/buscar-solicitacao.use-case';
import { CriarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/criar-solicitacao.use-case';
import { ListarHistoricoUseCase } from '../../../application/use-cases/solicitacoes/listar-historico.use-case';
import { ListarSolicitacoesUseCase } from '../../../application/use-cases/solicitacoes/listar-solicitacoes.use-case';
import {
  ProcessarSlaUseCase,
  ResultadoSla,
} from '../../../application/use-cases/solicitacoes/processar-sla.use-case';
import { TransicionarSolicitacaoUseCase } from '../../../application/use-cases/solicitacoes/transicionar-solicitacao.use-case';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { AcaoSolicitacaoDto } from '../dtos/acao-solicitacao.dto';
import { SalvarSolicitacaoDto } from '../dtos/salvar-solicitacao.dto';
import { toSolicitacaoView } from '../views/solicitacao.view';

type SolicitacaoView = ReturnType<typeof toSolicitacaoView>;


@Controller('matriculas/solicitacoes')
export class SolicitacoesController {
  constructor(
    private readonly listar: ListarSolicitacoesUseCase,
    private readonly buscar: BuscarSolicitacaoUseCase,
    private readonly criar: CriarSolicitacaoUseCase,
    private readonly transicionar: TransicionarSolicitacaoUseCase,
    private readonly historico: ListarHistoricoUseCase,
    private readonly sla: ProcessarSlaUseCase,
    private readonly maquina: SolicitacaoStateMachine,
  ) {}

  @Get()
  async listarTodas(@CurrentActor() actor: Actor): Promise<SolicitacaoView[]> {
    const itens = await this.listar.execute(actor);
    return itens.map((s) => toSolicitacaoView(s, this.maquina, actor.papel));
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string, @CurrentActor() actor: Actor): Promise<SolicitacaoView> {
    return toSolicitacaoView(await this.buscar.execute(id, actor), this.maquina, actor.papel);
  }

  @Get(':id/historico')
  listarHistorico(@Param('id') id: string, @CurrentActor() actor: Actor): Promise<HistoricoSolicitacao[]> {
    return this.historico.execute(id, actor);
  }

  @Post()
  @HttpCode(201)
  async incluir(@Body() dto: SalvarSolicitacaoDto, @CurrentActor() actor: Actor): Promise<SolicitacaoView> {
    return toSolicitacaoView(await this.criar.execute(dto, actor), this.maquina, actor.papel);
  }

  @Post('sla/processar')
  @HttpCode(200)
  processarSla(@CurrentActor() actor: Actor): Promise<ResultadoSla> {
    if (actor.papel !== PapelUsuario.COORDENADOR) {
      throw new ForbiddenError('Somente a coordenação pode disparar a varredura de SLA');
    }
    return this.sla.execute();
  }

  @Patch(':id/iniciar-analise')
  iniciarAnalise(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.INICIAR_ANALISE, dto, actor);
  }

  @Patch(':id/solicitar-ajuste')
  solicitarAjuste(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.SOLICITAR_AJUSTE, dto, actor);
  }

  @Patch(':id/reenviar')
  reenviar(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.REENVIAR, dto, actor);
  }

  @Patch(':id/aprovar')
  aprovar(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.APROVAR, dto, actor);
  }

  @Patch(':id/rejeitar')
  rejeitar(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.REJEITAR, dto, actor);
  }

  @Patch(':id/concluir')
  concluir(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.CONCLUIR, dto, actor);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.CANCELAR, dto, actor);
  }

  @Patch(':id/estornar')
  estornar(@Param('id') id: string, @Body() dto: AcaoSolicitacaoDto, @CurrentActor() actor: Actor) {
    return this.acao(id, EventoSolicitacao.ESTORNAR, dto, actor);
  }

  private async acao(
    id: string,
    evento: EventoSolicitacao,
    dto: AcaoSolicitacaoDto,
    actor: Actor,
  ): Promise<SolicitacaoView> {
    const s = await this.transicionar.execute({
      solicitacaoId: id,
      evento,
      actor,
      justificativa: dto.justificativa,
    });
    return toSolicitacaoView(s, this.maquina, actor.papel);
  }
}
