import { TipoSolicitacao } from '../../enums/solicitacao.enums';
import { BusinessRuleError } from '../../errors/domain.errors';
import { TransitionContext } from '../types';
import { TipoSolicitacaoHandler } from './tipo-handler';

export class MatriculaHandler implements TipoSolicitacaoHandler {
  readonly tipo = TipoSolicitacao.MATRICULA;

  efetivar({ aluno, disciplina }: TransitionContext): Promise<void> {
    // Valida ANTES de mutar qualquer um dos dois, para não deixar estado pela metade.
    if (aluno.estaMatriculadoEm(disciplina.id)) {
      throw new BusinessRuleError('Aluno já está matriculado nesta disciplina');
    }
    disciplina.ocuparVaga();
    aluno.matricularEm(disciplina.id);
    return Promise.resolve();
  }

  /** Estorno: devolve a vaga e retira a disciplina da grade do aluno. */
  reverter({ aluno, disciplina }: TransitionContext): Promise<void> {
    aluno.trancar(disciplina.id);
    disciplina.liberarVaga();
    return Promise.resolve();
  }
}
