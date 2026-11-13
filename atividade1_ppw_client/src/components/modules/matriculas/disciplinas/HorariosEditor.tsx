'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DIAS } from '@/lib/solicitacao-ui';
import { Horario } from '@/types';

export function HorariosEditor({
  value,
  onChange,
}: {
  value: Horario[];
  onChange: (horarios: Horario[]) => void;
}) {
  const alterar = (i: number, parcial: Partial<Horario>) =>
    onChange(value.map((h, j) => (j === i ? { ...h, ...parcial } : h)));

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-sm text-[var(--ink-soft)]">Nenhum horário (a disciplina nunca gera choque).</p>
      )}
      {value.map((h, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
          <Select
            aria-label="Dia da semana"
            value={h.dia}
            onChange={(e) => alterar(i, { dia: Number(e.target.value) })}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {DIAS[d]}
              </option>
            ))}
          </Select>
          <Input
            type="time"
            aria-label="Início"
            value={h.inicio}
            onChange={(e) => alterar(i, { inicio: e.target.value })}
            required
          />
          <Input
            type="time"
            aria-label="Fim"
            value={h.fim}
            onChange={(e) => alterar(i, { fim: e.target.value })}
            required
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            Remover
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...value, { dia: 1, inicio: '08:00', fim: '10:00' }])}
      >
        Adicionar horário
      </Button>
    </div>
  );
}
