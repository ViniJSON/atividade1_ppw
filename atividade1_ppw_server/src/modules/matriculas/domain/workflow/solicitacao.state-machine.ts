import { EventoSolicitacao, PapelUsuario, StatusSolicitacao } from '../enums/solicitacao.enums';
import { ForbiddenError, TransicaoInvalidaError } from '../errors/domain.errors';
import { MANTER_ESTADO, TransitionRule } from './types';

/**
 * Motor da máquina de estados. NÃO conhece nenhuma regra de negócio concreta:
 * recebe a tabela de regras por construtor. Para adicionar um estado, um evento ou
 * uma guarda basta acrescentar uma entrada na tabela — este arquivo não muda (OCP).
 */
export class SolicitacaoStateMachine {
  constructor(private readonly regras: readonly TransitionRule[]) {}

  /**
   * Resolve a regra aplicável ou falha. A ordem das verificações é deliberada:
   *  1. evento inexistente        → 409
   *  2. papel sem nenhuma permissão para o evento → 403 (não vaza em que estado a solicitação está)
   *  3. evento não vale no estado atual → 409
   *  4. papel não permitido neste estado → 403
   */
  resolver(status: StatusSolicitacao, evento: EventoSolicitacao, papel: PapelUsuario): TransitionRule {
    const doEvento = this.regras.filter((r) => r.evento === evento);
    if (doEvento.length === 0) {
      throw new TransicaoInvalidaError(`Evento desconhecido: ${evento}`);
    }
    if (!doEvento.some((r) => r.papeis.includes(papel))) {
      throw new ForbiddenError(`O papel ${papel} não tem permissão para ${evento}`);
    }
    const regra = doEvento.find((r) => r.de.includes(status));
    if (!regra) {
      throw new TransicaoInvalidaError(
        `Transição inválida: ${evento} não é permitido para solicitação ${status}`,
      );
    }
    if (!regra.papeis.includes(papel)) {
      throw new ForbiddenError(`O papel ${papel} não pode executar ${evento} em solicitação ${status}`);
    }
    return regra;
  }

  /** Ações que o papel poderia tentar neste estado (a UI usa para exibir só os botões válidos). */
  acoesDisponiveis(status: StatusSolicitacao, papel: PapelUsuario): EventoSolicitacao[] {
    return this.regras
      .filter((r) => r.de.includes(status) && r.papeis.includes(papel))
      .map((r) => r.evento);
  }

  estadosTerminais(): StatusSolicitacao[] {
    const todos = new Set<StatusSolicitacao>();
    const comSaida = new Set<StatusSolicitacao>();
    for (const r of this.regras) {
      r.de.forEach((s) => {
        todos.add(s);
        comSaida.add(s);
      });
      if (r.para !== MANTER_ESTADO) todos.add(r.para);
    }
    return [...todos].filter((s) => !comSaida.has(s));
  }

  /** Gera o diagrama Mermaid direto da tabela de regras — a documentação nunca diverge do código. */
  toMermaid(): string {
    const linhas = ['stateDiagram-v2', '    [*] --> PENDENTE : CRIAR'];
    const vistos = new Set<string>();
    for (const r of this.regras) {
      for (const de of r.de) {
        const para = r.para === MANTER_ESTADO ? de : r.para;
        const papeis = r.papeis.map((p) => p.toLowerCase()).join('/');
        const linha = `    ${de} --> ${para} : ${r.evento} (${papeis})`;
        if (!vistos.has(linha)) {
          vistos.add(linha);
          linhas.push(linha);
        }
      }
    }
    for (const t of this.estadosTerminais()) linhas.push(`    ${t} --> [*]`);
    return linhas.join('\n');
  }

  get todasAsRegras(): readonly TransitionRule[] {
    return this.regras;
  }
}
