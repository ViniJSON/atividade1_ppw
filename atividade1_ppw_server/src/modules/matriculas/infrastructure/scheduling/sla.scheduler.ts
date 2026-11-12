import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ProcessarSlaUseCase } from '../../application/use-cases/solicitacoes/processar-sla.use-case';

/**
 * Dispara a varredura de SLA a cada `SLA_INTERVAL_MS` (0/ausente = desligado, útil em testes).
 * É seguro rodar em mais de uma instância: cada transição passa pelas guardas e pelo lock da
 * solicitação, então a segunda instância apenas encontra o item já expirado/escalonado.
 */
@Injectable()
export class SlaScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SlaScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private rodando = false;

  constructor(private readonly processar: ProcessarSlaUseCase) {}

  onModuleInit(): void {
    const intervalo = Number(process.env.SLA_INTERVAL_MS ?? 0);
    if (!intervalo) return;
    this.timer = setInterval(() => void this.tick(), intervalo);
    this.timer.unref();
    this.logger.log(`Varredura de SLA a cada ${intervalo} ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.rodando) return; // evita sobreposição se uma varredura demorar
    this.rodando = true;
    try {
      const r = await this.processar.execute();
      if (r.expiradas.length || r.escalonadas.length || r.falhas.length) {
        this.logger.log(
          `SLA: ${r.expiradas.length} expirada(s), ${r.escalonadas.length} escalonada(s), ${r.falhas.length} falha(s)`,
        );
      }
    } catch (erro) {
      this.logger.error('Falha na varredura de SLA', erro instanceof Error ? erro.stack : String(erro));
    } finally {
      this.rodando = false;
    }
  }
}
