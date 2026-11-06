'use client';

import { useCallback, useEffect, useState } from 'react';
import { mensagemDeErro } from '@/lib/api';

export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    try {
      setData(await loader());
      setErro(null);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }, [loader]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { data, erro, carregando, recarregar };
}
