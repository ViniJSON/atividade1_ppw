import { Disciplina } from '../entities/disciplina.entity';

export function criaCicloDePreRequisitos(
  disciplinaId: string,
  novosPreRequisitos: string[],
  todas: Disciplina[],
): boolean {
  const porId = new Map(todas.map((d) => [d.id, d]));
  const visitados = new Set<string>();
  const pilha = [...novosPreRequisitos];

  while (pilha.length > 0) {
    const atual = pilha.pop()!;
    if (atual === disciplinaId) return true;
    if (visitados.has(atual)) continue;
    visitados.add(atual);
    pilha.push(...(porId.get(atual)?.preRequisitos ?? []));
  }
  return false;
}
