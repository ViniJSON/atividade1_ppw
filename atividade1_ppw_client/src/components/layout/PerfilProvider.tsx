'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  carregarPerfilSalvo,
  definirPerfil,
  Perfil,
  PERFIL_PADRAO,
  PERFIL_SECRETARIA,
} from '@/lib/perfil';
import { Aluno } from '@/types';
import { Select } from '@/components/ui/select';

const PerfilContext = createContext<Perfil>(PERFIL_PADRAO);
export const usePerfil = () => useContext(PerfilContext);

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  useEffect(() => {
    setPerfil(carregarPerfilSalvo());
    api.alunos.listar().then(setAlunos).catch(() => setAlunos([]));
  }, []);

  if (!perfil) return null;

  const opcoes: Perfil[] = [
    PERFIL_PADRAO,
    PERFIL_SECRETARIA,
    ...alunos.map((a) => ({ id: a.id, papel: 'ALUNO' as const, rotulo: `Aluno · ${a.nome}` })),
  ];
  const valorAtual = `${perfil.papel}:${perfil.id}`;

  return (
    <PerfilContext.Provider value={perfil}>
      <div className="flex items-center justify-end gap-2 text-xs text-[var(--ink-soft)]">
        <label htmlFor="perfil">Atuando como</label>
        <Select
          id="perfil"
          className="w-auto py-1"
          value={valorAtual}
          onChange={(e) => {
            const novo = opcoes.find((o) => `${o.papel}:${o.id}` === e.target.value);
            if (novo) {
              definirPerfil(novo);
              setPerfil(novo);
            }
          }}
        >
          {!opcoes.some((o) => `${o.papel}:${o.id}` === valorAtual) && (
            <option value={valorAtual}>{perfil.rotulo}</option>
          )}
          {opcoes.map((o) => (
            <option key={`${o.papel}:${o.id}`} value={`${o.papel}:${o.id}`}>
              {o.rotulo}
            </option>
          ))}
        </Select>
      </div>
      <div key={valorAtual}>{children}</div>
    </PerfilContext.Provider>
  );
}
