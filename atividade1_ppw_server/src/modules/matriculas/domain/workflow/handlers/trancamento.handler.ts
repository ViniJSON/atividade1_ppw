import { TipoSolicitacao } from '../../enums/solicitacao.enums';
import { BusinessRuleError } from '../../errors/domain.errors';
import { encontrarConflitos } from '../../services/choque-horario';
import { TransitionContext } from '../types';
import { TipoSolicitacaoHandler } from './tipo-handler';

export class TrancamentoHandler implements TipoSolicitacaoHandler {
  readonly tipo = TipoSolicitacao.TRANCAMENTO;

  efetivar({ aluno, disciplina }: TransitionContext): Promise<void> {
    aluno.trancar(disciplina.id);
    disciplina.liberarVaga();
    return Promise.resolve();
  }

  /**
   * Estornar um trancamento = rematricular. Pode ser impossível se, nesse meio tempo,
   * a vaga foi ocupada por outro aluno ou surgiu choque de horário: nesse caso o estorno
   * falha e a transação inteira é desfeita (a solicitação continua CONCLUIDA).
   */
  async reverter({ aluno, disciplina, repos }: TransitionContext): Promise<void> {
    if (!disciplina.temVaga()) {
      throw new BusinessRuleError('Não é possível estornar o trancamento: a vaga já foi ocupada');
    }
    if (aluno.disciplinasAtivas.length > 0 && disciplina.horarios.length > 0) {
      const ativas = await repos.disciplinas.findByIds(aluno.disciplinasAtivas);
      const conflito = encontrarConflitos(disciplina, ativas)[0];
      if (conflito) {
        throw new BusinessRuleError(
          `Não é possível estornar o trancamento: choque de horário com ${conflito.disciplina.codigo}`,
        );
      }
    }
    disciplina.ocuparVaga();
    aluno.matricularEm(disciplina.id);
  }
}
