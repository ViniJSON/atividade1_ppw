import { perfilAtual } from '@/lib/perfil';
import {
  AcaoSolicitacao,
  Aluno,
  AlunoInput,
  Disciplina,
  DisciplinaInput,
  HistoricoItem,
  ResultadoSla,
  Solicitacao,
  SolicitacaoInput,
} from '@/types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Actor-Id': perfilAtual().id,
        'X-Actor-Role': perfilAtual().papel,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Não foi possível conectar à API. Verifique se o backend NestJS está rodando em ${API_URL}.`,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message)
      ? body.message.join('; ')
      : body.message;
    throw new Error(message || `Erro ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

const json = (data: unknown) => JSON.stringify(data);

export function mensagemDeErro(err: unknown, padrao = 'Ocorreu um erro inesperado'): string {
  return err instanceof Error ? err.message : padrao;
}

export const api = {
  alunos: {
    listar: () => request<Aluno[]>('/matriculas/alunos'),
    buscar: (id: string) => request<Aluno>(`/matriculas/alunos/${id}`),
    criar: (data: AlunoInput) =>
      request<Aluno>('/matriculas/alunos', { method: 'POST', body: json(data) }),
    atualizar: (id: string, data: AlunoInput) =>
      request<Aluno>(`/matriculas/alunos/${id}`, { method: 'PUT', body: json(data) }),
    excluir: (id: string) =>
      request<void>(`/matriculas/alunos/${id}`, { method: 'DELETE' }),
  },

  disciplinas: {
    listar: () => request<Disciplina[]>('/matriculas/disciplinas'),
    buscar: (id: string) => request<Disciplina>(`/matriculas/disciplinas/${id}`),
    criar: (data: DisciplinaInput) =>
      request<Disciplina>('/matriculas/disciplinas', { method: 'POST', body: json(data) }),
    atualizar: (id: string, data: DisciplinaInput) =>
      request<Disciplina>(`/matriculas/disciplinas/${id}`, { method: 'PUT', body: json(data) }),
    excluir: (id: string) =>
      request<void>(`/matriculas/disciplinas/${id}`, { method: 'DELETE' }),
  },

  solicitacoes: {
    listar: () => request<Solicitacao[]>('/matriculas/solicitacoes'),
    buscar: (id: string) => request<Solicitacao>(`/matriculas/solicitacoes/${id}`),
    historico: (id: string) => request<HistoricoItem[]>(`/matriculas/solicitacoes/${id}/historico`),
    criar: (data: SolicitacaoInput) =>
      request<Solicitacao>('/matriculas/solicitacoes', { method: 'POST', body: json(data) }),
    /** Não existe PUT/DELETE nem edição de status: tudo é uma ação nomeada da máquina de estados. */
    acao: (id: string, acao: AcaoSolicitacao, justificativa?: string) =>
      request<Solicitacao>(
        `/matriculas/solicitacoes/${id}/${acao.toLowerCase().replace(/_/g, '-')}`,
        { method: 'PATCH', body: json({ justificativa }) },
      ),
    processarSla: () =>
      request<ResultadoSla>('/matriculas/solicitacoes/sla/processar', { method: 'POST' }),
  },
};
