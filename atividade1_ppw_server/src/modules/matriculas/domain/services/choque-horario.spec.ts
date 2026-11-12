import { Disciplina } from '../entities/disciplina.entity';
import { BusinessRuleError } from '../errors/domain.errors';
import { horariosConflitam, validarHorario } from '../value-objects/horario';
import { encontrarConflitos } from './choque-horario';

const disc = (id: string, horarios: { dia: number; inicio: string; fim: string }[]) =>
  new Disciplina({ id, codigo: id, nome: id, vagasTotais: 1, horarios });

describe('Choque de horário', () => {
  it('sobreposição parcial, contenção e igualdade colidem', () => {
    expect(horariosConflitam({ dia: 1, inicio: '08:00', fim: '10:00' }, { dia: 1, inicio: '09:00', fim: '11:00' })).toBe(true);
    expect(horariosConflitam({ dia: 1, inicio: '08:00', fim: '12:00' }, { dia: 1, inicio: '09:00', fim: '10:00' })).toBe(true);
    expect(horariosConflitam({ dia: 1, inicio: '08:00', fim: '10:00' }, { dia: 1, inicio: '08:00', fim: '10:00' })).toBe(true);
  });

  it('faixas encostadas (fim = início) ou em dias diferentes não colidem', () => {
    expect(horariosConflitam({ dia: 1, inicio: '08:00', fim: '10:00' }, { dia: 1, inicio: '10:00', fim: '12:00' })).toBe(false);
    expect(horariosConflitam({ dia: 1, inicio: '08:00', fim: '10:00' }, { dia: 2, inicio: '08:00', fim: '10:00' })).toBe(false);
  });

  it('encontrarConflitos compara a candidata com toda a grade e ignora a própria disciplina', () => {
    const grade = [
      disc('a', [{ dia: 1, inicio: '08:00', fim: '10:00' }]),
      disc('b', [{ dia: 2, inicio: '08:00', fim: '10:00' }]),
    ];
    const candidata = disc('c', [{ dia: 1, inicio: '09:30', fim: '11:00' }, { dia: 2, inicio: '10:00', fim: '12:00' }]);
    const conflitos = encontrarConflitos(candidata, grade);
    expect(conflitos.map((c) => c.disciplina.id)).toEqual(['a']);
    expect(encontrarConflitos(grade[0], grade)).toEqual([]);
  });

  it('valida formato, dia e ordem do horário', () => {
    expect(() => validarHorario({ dia: 0, inicio: '08:00', fim: '09:00' })).toThrow(BusinessRuleError);
    expect(() => validarHorario({ dia: 1, inicio: '8:00', fim: '09:00' })).toThrow('HH:MM');
    expect(() => validarHorario({ dia: 1, inicio: '24:00', fim: '25:00' })).toThrow('HH:MM');
    expect(() => validarHorario({ dia: 1, inicio: '09:00', fim: '09:00' })).toThrow('anterior ao fim');
    expect(() => validarHorario({ dia: 7, inicio: '08:00', fim: '09:00' })).not.toThrow();
  });
});
