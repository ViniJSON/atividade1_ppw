import { Aluno } from '../entities/aluno.entity';
import { Disciplina } from '../entities/disciplina.entity';
import { TipoSolicitacao } from '../enums/solicitacao.enums';
import { BusinessRuleError } from '../errors/domain.errors';
import { encontrarConflitos } from './choque-horario';

export interface ResultadoAvaliacao {
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
  semConflitoHorario: boolean;
}

/**
 * Pré-checagem no momento do pedido: barra pedidos impossíveis (já matriculado / não matriculado)
 * e devolve indicadores informativos. A decisão definitiva é das guardas na aprovação/conclusão.
 * `ativas` = disciplinas da grade atual do aluno, carregadas em lote por quem chama.
 */
export function avaliarSolicitacao(
  aluno: Aluno,
  disciplina: Disciplina,
  tipo: TipoSolicitacao,
  ativas: readonly Disciplina[],
): ResultadoAvaliacao {
  const matriculado = aluno.estaMatriculadoEm(disciplina.id);

  if (tipo === TipoSolicitacao.MATRICULA) {
    if (matriculado) {
      throw new BusinessRuleError('Aluno já está matriculado nesta disciplina');
    }
    return {
      preRequisitosOk: aluno.cumprePreRequisitosDe(disciplina),
      vagaDisponivel: disciplina.temVaga(),
      semConflitoHorario: encontrarConflitos(disciplina, ativas).length === 0,
    };
  }

  if (!matriculado) {
    throw new BusinessRuleError(
      'Aluno não está matriculado nesta disciplina, não é possível trancar',
    );
  }
  return { preRequisitosOk: true, vagaDisponivel: true, semConflitoHorario: true };
}
