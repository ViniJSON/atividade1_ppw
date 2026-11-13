import { Papel } from '@/types';

export interface Perfil {
  id: string;
  papel: Papel;
  rotulo: string;
}

const CHAVE = 'matricula.perfil';

export const PERFIL_PADRAO: Perfil = { id: 'coord-1', papel: 'COORDENADOR', rotulo: 'Coordenação' };
export const PERFIL_SECRETARIA: Perfil = { id: 'sec-1', papel: 'SECRETARIA', rotulo: 'Secretaria' };

let atual: Perfil = PERFIL_PADRAO;

export const perfilAtual = () => atual;

export function definirPerfil(perfil: Perfil): void {
  atual = perfil;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(perfil));
  } catch {
  }
}

export function carregarPerfilSalvo(): Perfil {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto) {
      const p = JSON.parse(bruto) as Perfil;
      if (p?.id && p?.papel) {
        atual = p;
        return p;
      }
    }
  } catch {
  }
  atual = PERFIL_PADRAO;
  return PERFIL_PADRAO;
}
