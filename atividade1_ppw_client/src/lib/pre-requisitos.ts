import { Disciplina } from '@/types';

export function dependentesDe(id: string, disciplinas: Disciplina[]): Set<string> {
  const resultado = new Set<string>();
  const fila = [id];
  while (fila.length > 0) {
    const atual = fila.pop()!;
    for (const d of disciplinas) {
      if (d.preRequisitos.includes(atual) && !resultado.has(d.id)) {
        resultado.add(d.id);
        fila.push(d.id);
      }
    }
  }
  return resultado;
}
