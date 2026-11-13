const API = process.argv[2] ?? 'http://localhost:3001';
const ator = (id, papel) => ({ 'X-Actor-Id': id, 'X-Actor-Role': papel });
const coord = ator('coord-1', 'COORDENADOR');
const sec = ator('sec-1', 'SECRETARIA');

async function chamar(metodo, caminho, headers = {}, corpo) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await res.text();
  return { status: res.status, corpo: texto ? JSON.parse(texto) : null };
}
const exigir = (res, esperado, rotulo) => {
  if (res.status !== esperado) {
    throw new Error(`${rotulo}: esperava ${esperado}, veio ${res.status} ${JSON.stringify(res.corpo)}`);
  }
  return res.corpo;
};

const sufixo = Date.now().toString().slice(-6);
const disciplina = exigir(
  await chamar('POST', '/matriculas/disciplinas', {}, {
    codigo: `LAB${sufixo}`, nome: 'Laboratório (1 vaga)', vagasTotais: 1,
    horarios: [{ dia: 5, inicio: '14:00', fim: '16:00' }],
  }),
  201, 'criar disciplina',
);

const pedidos = [];
for (const n of [1, 2]) {
  const aluno = exigir(
    await chamar('POST', '/matriculas/alunos', {}, { nome: `Aluno Teste ${n}`, matricula: `T${sufixo}${n}` }),
    201, 'criar aluno',
  );
  const s = exigir(
    await chamar('POST', '/matriculas/solicitacoes', ator(aluno.id, 'ALUNO'),
      { alunoId: aluno.id, disciplinaId: disciplina.id, tipo: 'MATRICULA' }),
    201, 'criar solicitação',
  );
  exigir(await chamar('PATCH', `/matriculas/solicitacoes/${s.id}/iniciar-analise`, coord, {}), 200, 'iniciar análise');
  exigir(await chamar('PATCH', `/matriculas/solicitacoes/${s.id}/aprovar`, coord, {}), 200, 'aprovar');
  pedidos.push(s.id);
}

const [a, b] = await Promise.all(
  pedidos.map((id) => chamar('PATCH', `/matriculas/solicitacoes/${id}/concluir`, sec, {})),
);
const statuses = [a.status, b.status].sort();
const final = exigir(await chamar('GET', `/matriculas/disciplinas/${disciplina.id}`), 200, 'ler disciplina');

console.log('Efetivações simultâneas →', statuses, '| vagasOcupadas =', final.vagasOcupadas);
console.log('Mensagem da perdedora:', [a, b].find((r) => r.status !== 200)?.corpo?.message);
if (statuses.join() !== '200,400' || final.vagasOcupadas !== 1) {
  console.error('FALHOU: a vaga estourou ou as duas efetivações passaram.');
  process.exit(1);
}
console.log('OK: exatamente uma efetivação venceu e a vaga não estourou.');
