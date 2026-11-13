export function clonar<T extends object>(origem: T): T {
  const copia = Object.create(Object.getPrototypeOf(origem)) as T;
  return Object.assign(copia, structuredClone({ ...origem }));
}

export type Restaurar = () => void;
