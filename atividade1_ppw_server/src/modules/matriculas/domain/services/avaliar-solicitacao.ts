import { Aluno } from '../entities/aluno.entity';
import { Disciplina } from '../entities/disciplina.entity';
import { TipoSolicitacao } from '../enums/solicitacao.enums';
import { BusinessRuleError } from '../errors/domain.errors';

export interface ResultadoAvaliacao {
  preRequisitosOk: boolean;
  vagaDisponivel: boolean;
}

export function avaliarSolicitacao(
  aluno: Aluno,
  disciplina: Disciplina,
  tipo: TipoSolicitacao,
): ResultadoAvaliacao {
  const matriculado = aluno.estaMatriculadoEm(disciplina.id);

  if (tipo === TipoSolicitacao.MATRICULA) {
    if (matriculado) {
      throw new BusinessRuleError('Aluno já está matriculado nesta disciplina');
    }
    return {
      preRequisitosOk: aluno.cumprePreRequisitosDe(disciplina),
      vagaDisponivel: disciplina.temVaga(),
    };
  }

  if (!matriculado) {
    throw new BusinessRuleError(
      'Aluno não está matriculado nesta disciplina, não é possível trancar',
    );
  }
  return { preRequisitosOk: true, vagaDisponivel: true };
}
