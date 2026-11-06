import { AprovarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/aprovar-solicitacao.use-case';
import { AtualizarAlunoUseCase } from '../application/use-cases/alunos/atualizar-aluno.use-case';
import { AtualizarDisciplinaUseCase } from '../application/use-cases/disciplinas/atualizar-disciplina.use-case';
import { AtualizarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/atualizar-solicitacao.use-case';
import { CriarAlunoUseCase } from '../application/use-cases/alunos/criar-aluno.use-case';
import { CriarDisciplinaUseCase } from '../application/use-cases/disciplinas/criar-disciplina.use-case';
import { CriarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/criar-solicitacao.use-case';
import { ExcluirAlunoUseCase } from '../application/use-cases/alunos/excluir-aluno.use-case';
import { ExcluirDisciplinaUseCase } from '../application/use-cases/disciplinas/excluir-disciplina.use-case';
import { ExcluirSolicitacaoUseCase } from '../application/use-cases/solicitacoes/excluir-solicitacao.use-case';
import { ListarSolicitacoesUseCase } from '../application/use-cases/solicitacoes/listar-solicitacoes.use-case';
import { RejeitarSolicitacaoUseCase } from '../application/use-cases/solicitacoes/rejeitar-solicitacao.use-case';
import { InMemoryAlunoRepository } from '../infrastructure/persistence/in-memory/in-memory-aluno.repository';
import { InMemoryDisciplinaRepository } from '../infrastructure/persistence/in-memory/in-memory-disciplina.repository';
import { InMemorySolicitacaoRepository } from '../infrastructure/persistence/in-memory/in-memory-solicitacao.repository';

export function makeUseCases() {
  const alunos = new InMemoryAlunoRepository();
  const disciplinas = new InMemoryDisciplinaRepository();
  const solicitacoes = new InMemorySolicitacaoRepository();

  return {
    repos: { alunos, disciplinas, solicitacoes },
    alunos: {
      criar: new CriarAlunoUseCase(alunos, disciplinas),
      atualizar: new AtualizarAlunoUseCase(alunos, disciplinas),
      excluir: new ExcluirAlunoUseCase(alunos, solicitacoes),
    },
    disciplinas: {
      criar: new CriarDisciplinaUseCase(disciplinas),
      atualizar: new AtualizarDisciplinaUseCase(disciplinas),
      excluir: new ExcluirDisciplinaUseCase(disciplinas, alunos, solicitacoes),
    },
    solicitacoes: {
      listar: new ListarSolicitacoesUseCase(solicitacoes),
      criar: new CriarSolicitacaoUseCase(solicitacoes, alunos, disciplinas),
      atualizar: new AtualizarSolicitacaoUseCase(
        solicitacoes,
        alunos,
        disciplinas,
      ),
      excluir: new ExcluirSolicitacaoUseCase(solicitacoes),
      aprovar: new AprovarSolicitacaoUseCase(solicitacoes, alunos, disciplinas),
      rejeitar: new RejeitarSolicitacaoUseCase(solicitacoes),
    },
  };
}
