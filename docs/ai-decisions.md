# Registro crítico do uso de IA

Ferramenta: Claude (Anthropic), em conversa única com o código da Atividade 1 anexado.
Cada entrada segue o roteiro do enunciado: **1. Desafio · 2. Prompt · 3. Resposta bruta · 4. Crítica e refatoração**.
---

## Entrada 1 — Máquina de estados, RBAC, SLA, concorrência e auditoria para Matrícula/Trancamento

### 1. O desafio
Transformar a Atividade 1 (solicitação com `PENDENTE/APROVADA/REJEITADA` e uso de `PUT` para alterar dados, tudo em memória)
em um fluxo com transições orientadas a eventos, matriz de permissões por estado, guardas, SLA, estorno, concorrência na última
vaga e auditoria transacional — respeitando OCP/SRP/LSP.

### 2. Prompt utilizado
O prompt foi o texto do enunciado do Terceiro Trabalho (tema “09. Matrícula / Trancamento”: itens 1.A, 1.B, 1.C e 2, incluindo
o exemplo “Como modelar a árvore de pré-requisitos para validar a matrícula de forma eficiente sem N+1 queries?”),
acompanhado do arquivo `atividade1_ppw.zip`, seguido de “Continuar”. Texto integral: ver o enunciado da disciplina.

### 3. Resposta bruta da IA (resumo fiel do que foi gerado)
* Tabela de regras `TransitionRule[]` (evento, estados de origem, destino, papéis, guardas, efeito) + motor genérico `SolicitacaoStateMachine`.
* Guardas como classes (`PreRequisitosGuard`, `ChoqueHorarioGuard`, `VagaDisponivelGuard`, `JustificativaObrigatoriaGuard`, …) e handlers por tipo (`MatriculaHandler`, `TrancamentoHandler`).
* `TransicionarSolicitacaoUseCase` dentro de `UnitOfWork.run`, com `SELECT … FOR UPDATE`, controle otimista (`versao`) e linha de auditoria na mesma transação.
* Persistência PostgreSQL (`pg`, SQL explícito), `InMemoryUnitOfWork` (fila + snapshot/rollback), SLA por `Clock` injetável + scheduler, RBAC por cabeçalhos.
* 61 testes (fluxo, RBAC, guardas, concorrência, atomicidade, SLA, OCP, LSP) e o front adaptado.

### 4. Crítica e refatoração
Problemas efetivamente encontrados (pela revisão da IA ou pelo compilador/testes) e o que mudou:

| # | Problema | Como foi detectado | Correção |
|---|---|---|---|
| 1 | **N+1 herdado da Atividade 1**: `garantirDisciplinasExistem` fazia `findById` por pré-requisito; a checagem de ciclo carregava `findAll()`. | Revisão do código anexado | `findByIds` (1 consulta) e `preRequisitosTransitivos` (CTE recursiva). Teste conta chamadas com 2 e 40 pré-requisitos. |
| 2 | Guardas escritas como `aplicaA = fn` (propriedade) sobrepondo método da classe base. | `tsc`: TS2425 | Virou método. |
| 3 | `Actor` (interface) em parâmetro decorado do controller. Com `isolatedModules` + `emitDecoratorMetadata` o build do Nest quebraria. | `tsc`: TS1272 | `import type { Actor }`. |
| 4 | Primeira versão de `MatriculaHandler.efetivar` chamava `aluno.matricularEm` só para “forçar” o erro de duplicidade — frágil e ilegível. | Revisão | Lança `BusinessRuleError` explícito; valida antes de mutar qualquer objeto (handler não deixa estado pela metade — contrato LSP). |
| 5 | Teste “horários adjacentes” **não testava adjacência**; teste OCP instanciava `DomainError` (classe abstrata) com um `as never`. | Revisão dos próprios testes | Reescritos com disciplinas 08–10/10–12/09–11 e com `BusinessRuleError`. |
| 6 | Dúvida legítima: os testes de concorrência/rollback realmente detectam falha? | Teste de mutação manual | Removida a fila do `InMemoryUnitOfWork` → 3 testes de concorrência falham; removido o rollback → o teste ACID falha. |
| 7 | Excluir aluno/disciplina apagava as solicitações — incompatível com trilha de auditoria. | Análise de requisitos | Solicitações não têm `delete`; excluir quem tem histórico é bloqueado (mensagem explica). **Decisão a validar com o professor.** |

**Limites da verificação (não omitir na defesa):** o código Postgres (`infrastructure/persistence/postgres`, `db/schema.sql`) e a
camada Nest (controllers/módulo/e2e) foram escritos e type-checados, mas **a execução real aconteceu apenas na suíte em memória**.
Rodar `docker compose up`, `npm run test:e2e` com `PERSISTENCE=postgres` e `scripts/smoke-concorrencia.mjs` é parte da validação a fazer.

**A. Matriz de permissões: o que eu mudaria e por quê**

1. *Cancelamento de solicitação `APROVADA` pela coordenação.* Hoje é permitido. **A favor:** corrige um erro antes de a vaga ser ocupada, sem precisar de estorno. **Contra:** a coordenação desfaz uma decisão que ela própria tomou, sem segunda pessoa. **Posição sugerida:** manter, porque a justificativa é obrigatória e a ação fica na trilha de auditoria; o risco é aceitável quando ainda não houve efeito.
2. *A mesma pessoa pode aprovar e efetivar* se tiver os dois papéis. A separação hoje é por papel, não por pessoa. **Posição sugerida:** acrescentar uma `SeparacaoDeFuncoesGuard` que compara o `autor_id` do `APROVAR` com o do `CONCLUIR`. É uma linha na tabela de regras e não altera o motor (OCP), o que torna a mudança barata.
3. *Solicitação `REJEITADA` não pode ser reaberta.* O aluno precisa criar outra. **A favor:** a trilha de cada pedido fica linear e simples de auditar. **Contra:** é mais burocrático para o aluno. **Posição sugerida:** manter; reabrir poderia ser um novo evento `REABRIR` caso o curso exija.

**B. Uma decisão da IA com a qual posso discordar ou que simplifiquei**

1. *Bloquear a exclusão de aluno e de disciplina que tenham histórico.* Preserva a auditoria, mas deixa o cadastro com registros que nunca saem. **Posição sugerida:** a alternativa melhor seria **inativar** (campo `ativo`) em vez de apagar ou bloquear; o bloqueio foi escolhido por ser mais simples e deve ser confirmado com o professor.
2. *Autenticação por cabeçalhos (`X-Actor-Id`/`X-Actor-Role`).* Qualquer cliente consegue se declarar coordenador. **Posição sugerida:** aceitável apenas por ser um trabalho acadêmico e estar documentado; em produção seria JWT. O resto do sistema consome só o objeto `Actor`, então a troca é localizada.
3. *O SLA não vale depois de `APROVADA`.* Uma solicitação aprovada que a secretaria nunca efetiva fica parada para sempre. **Posição sugerida:** é uma lacuna real; corrigir com um prazo de efetivação e um `EXPIRAR` a partir de `APROVADA`.
4. *O escalonamento só marca a solicitação e grava a trilha.* Não notifica ninguém (e-mail, alerta). **Posição sugerida:** limitação a declarar; a notificação exigiria um canal externo.
5. *Regra herdada da Atividade 1 e não alterada:* o aluno ainda pode solicitar matrícula numa disciplina que já concluiu.
---

## Entrada 2 — Pré-requisitos encadeados e choque de horários sem N+1

### 1. O desafio
Validar a matrícula (pré-requisitos encadeados + choque na grade semanal) sem uma consulta por pré-requisito/disciplina.

### 2. Prompt utilizado
O do enunciado: “Como modelar a árvore de pré-requisitos para validar a matrícula de forma eficiente sem N+1 queries?” — respondido
dentro da mesma conversa da Entrada 1 (não foi um prompt separado).

### 3. Resposta bruta da IA
Lista de adjacência `disciplina_pre_requisitos`; carregar disciplina e aluno com `array_agg` em subselects; cruzar em memória;
`findByIds` para lote; CTE recursiva para fecho transitivo/ciclos; função pura `encontrarConflitos` sobre a grade carregada em lote.

### 4. Crítica e refatoração
* A primeira ideia de “validar toda a cadeia transitiva” é **semanticamente errada** para este domínio: exigir também os pré-requisitos dos pré-requisitos
  barraria alunos com aproveitamento/equivalência. Mantido: valida só os pré-requisitos **diretos**; a CTE serve para integridade do grafo (ciclos), não para a regra de matrícula.
* Comparar horários como string `"HH:MM"` só funciona com zero à esquerda; por isso `validarHorario` exige o formato e rejeita `8:00`.
* **Minha análise:** a decisão de validar só os pré-requisitos **diretos** é a mais defensável, porque a cadeia transitiva barraria alunos com aproveitamento ou equivalência. **Limite dessa decisão:** ela supõe que a secretaria registra corretamente as disciplinas concluídas; um dado errado em `aluno_concluidas` passa pela validação. **Posição sugerida:** manter a regra direta e, se o curso aceitar equivalências, modelá-las como uma tabela própria (`disciplina_equivalencias`), sem mexer na regra de matrícula. O modelo de lista de adjacência com `array_agg` mostrou-se simples; o ponto fraco é o custo de carregar os pré-requisitos junto com cada disciplina, aceitável para um currículo pequeno.

---
# Registro de perguntas e respostas: conversa real

> Observação de transparência: a conversa teve um prompt inicial grande (o enunciado) e depois perguntas de acompanhamento. Nada aqui foi simulado.

## 1. Prompt inicial

**Pergunta (aluno):** o texto integral do enunciado do trabalho (tema «09. Matrícula / Trancamento», itens 1.A, 1.B, 1.C e 2, incluindo o exemplo «Como modelar a árvore de pré-requisitos para validar a matrícula de forma eficiente sem N+1 queries?»), enviado junto com o arquivo `atividade1_ppw.zip`.

**Resposta (IA):** o projeto da Atividade 1 foi lido (NestJS + Next.js, tudo em memória) e evoluído para:

- máquina de estados explícita com 9 estados, 11 eventos e 4 papéis;
- RBAC por estado e guardas de transição (justificativa, dono, prazo, pré-requisitos, choque de horário, vaga);
- concorrência com `SELECT … FOR UPDATE`, controle otimista e índice único parcial;
- SLA com escalonamento e expiração, estorno como compensação e auditoria na mesma transação;
- persistência em PostgreSQL, README com DER e diagrama de estados, `AI-LOG.md` e `docs/ai-decisions.md`;
- 61 testes passando na suíte em memória, e um histórico Git com commits temáticos.

## 2. Quatro perguntas de acompanhamento

### 2.1 Por que a coordenação aprova e a secretaria efetiva?

**Pergunta (aluno):** «Por que a coordenação aprova e a secretaria efetiva? E se fosse a mesma pessoa?»

**Resposta (IA):** são dois atos de natureza diferente. **Aprovar** é decisão acadêmica: o aluno cumpre os pré-requisitos e não há choque de horário. **Efetivar** é ato administrativo que altera o registro oficial, ocupando a vaga e mexendo na grade. Separar os dois é o princípio dos «quatro olhos»: quem decide não executa sozinho, então um erro ou uma fraude exige duas pessoas.

Há também um motivo técnico. Entre aprovar e efetivar o mundo pode mudar, por exemplo se outro aluno pegar a última vaga. Por isso o `CONCLUIR` reavalia as guardas de elegibilidade sob lock.

**Se fosse a mesma pessoa, o código de hoje não impede.** A matriz é por papel, não por pessoa. Um usuário com os dois papéis poderia aprovar e depois efetivar. Com autenticação por cabeçalhos, qualquer um poderia até se declarar das duas. Para fechar isso em nível de pessoa, bastaria uma guarda nova, `SeparacaoDeFuncoesGuard`, que leria o histórico e recusaria o `CONCLUIR` se o `autor_id` fosse igual ao do `APROVAR`. É só uma linha na tabela de regras, sem mexer no motor (OCP).

A alternativa é deixar a coordenação também concluir: fica mais simples, mas com menos controle.

**Lacuna deixada:** o SLA só corre antes da aprovação. Uma solicitação `APROVADA` que a secretaria nunca efetiva fica parada para sempre. Vale um prazo de efetivação com `EXPIRAR` a partir de `APROVADA`, ou um alerta de escalonamento.

### 2.2 `SELECT … FOR UPDATE` e a ordem dos locks

**Pergunta (aluno):** «Explica o `SELECT … FOR UPDATE` e por que a ordem dos locks importa.»

**Resposta (IA):** `FOR UPDATE` trava as linhas lidas até o `COMMIT` ou `ROLLBACK`. Outra transação que tente `FOR UPDATE`, `UPDATE` ou `DELETE` na mesma linha espera. Leituras simples não bloqueiam, porque o Postgres usa MVCC.

Isso resolve a corrida do tipo «ler, checar, gravar». Sem o lock, duas efetivações leem `vagas_ocupadas = 0` de `1`, as duas passam na guarda e as duas gravam. Com o lock, a segunda espera. No `READ COMMITTED`, cada comando enxerga o que já foi confirmado. Por isso o `findByIdForUpdate` trava com `SELECT 1 … FOR UPDATE` e só depois lê a linha: a leitura vem depois do commit da primeira e vê a vaga ocupada.

**A ordem importa por causa de deadlock.** Se T1 trava a disciplina e quer o aluno, enquanto T2 trava o aluno e quer a disciplina, cada uma espera a outra. O Postgres detecta isso (`deadlock_timeout`, 1 s), derruba uma com `40P01`, e o `traduzirErroPg` devolve 409. Se todas as transações adquirem os locks na mesma ordem (**solicitação → disciplina → aluno**), não existe ciclo: quem chega depois só espera.

### 2.3 O que muda com SERIALIZABLE

**Pergunta (aluno):** «O que muda se eu trocar para SERIALIZABLE?»

**Resposta (IA):** o Postgres implementa o `SERIALIZABLE` com SSI. Ele **não bloqueia**: deixa as transações rodarem em paralelo, detecta padrões de dependência perigosos e aborta uma com `40001`. Na prática:

- **A aplicação precisa de retry.** Hoje não existe. O `40001` viraria um 409 «tente novamente», e pode ser um falso positivo, porque o SSI às vezes aborta transações que seriam seguras.
- **O `FOR UPDATE` deixa de ser necessário para a correção**, mas pode ficar como otimização. Cuidado: em `REPEATABLE READ` ou `SERIALIZABLE`, travar uma linha que mudou depois do snapshot dá erro de serialização, em vez de simplesmente reler. O padrão de dois comandos só funciona bem com retry.
- **Ganho:** proteção contra anomalias que locks de linha não cobrem, como write skew entre linhas diferentes.
- **Custo:** mais abortos e mais memória para os locks de predicado.

A escolha por `READ COMMITTED` mais locks se deve a que as invariantes daqui são por linha (vaga, solicitação, grade do aluno) e o comportamento é mais fácil de raciocinar. O `InMemoryUnitOfWork`, com a fila, já se comporta como serializável.

### 2.4 Por que a CTE recursiva não entra na regra de matrícula

**Pergunta (aluno):** «Por que a CTE recursiva não entra na regra de matrícula?»

**Resposta (IA):** pré-requisito é uma exigência **direta**. Se a disciplina C exige B e B exige A, ter concluído B já prova o que se queria. Exigir também A via cadeia transitiva barraria quem recebeu B por aproveitamento, equivalência ou transferência, sem ter A no histórico. A regra acadêmica não pede isso, então a validação confere só os pré-requisitos diretos, em memória, sem custo.

A CTE serve para **integridade do grafo**. Ao editar os pré-requisitos de uma disciplina X, ela devolve tudo o que é alcançável a partir dos novos pré-requisitos. Se X estiver nesse conjunto, a edição criaria um ciclo e é rejeitada, numa só consulta, sem carregar todas as disciplinas. O `UNION` (em vez de `UNION ALL`) faz a recursão terminar mesmo que o dado já tenha ciclo.

A cadeia transitiva seria útil em outro lugar: mostrar ao aluno «o que falta para chegar em ES301», como trilha de planejamento. Mas isso é uma funcionalidade nova, não a regra de matrícula.

## 3. Conceitos do trabalho e como aplicá-los

**Pergunta (aluno):** «Me explique os seguintes conceitos e me de um exemplo de cada: Transição orientadas a eventos/ações; matriz de permissões (RBAC) por estado; Guarda de transição (transition guards); coerência e locks; SLA e temporalidade; Roll back / cancelamento parcial; audit log. E depois me diga como posso aplicar esses conceitos sobre o projeto anexado.»

### 3.1 Transições orientadas a eventos/ações

O status de um registro não é um campo que qualquer formulário edita. Ele só muda quando uma **ação com nome e significado** acontece (`aprovar()`, `rejeitar()`), e o sistema decide qual é o novo estado. Com um `<select status>` livre, alguém põe «CONCLUÍDA» em algo que nunca foi aprovado. Com ações, só existem os caminhos que você desenhou.

**Exemplo (pedido de compra):** em `RASCUNHO` só existe a ação `enviar()` → `AGUARDANDO_APROVACAO`. Dali, `aprovar()` → `APROVADO` ou `rejeitar()` → `REJEITADO`. Não existe ação que leve de `RASCUNHO` direto a `APROVADO`, então esse caminho é impossível.

### 3.2 Matriz de permissões (RBAC) por estado

Uma tabela que responde: *quem* (papel) pode fazer *qual ação* em *qual estado*. A permissão depende do papel **e** do estado atual.

| Estado | Solicitante | Gerente | Financeiro |
|---|---|---|---|
| RASCUNHO | enviar, cancelar | — | — |
| AGUARDANDO | cancelar | aprovar, rejeitar | — |
| APROVADO | — | — | pagar |

O mesmo papel muda de poder conforme o estado: o solicitante cancela em `AGUARDANDO`, mas não em `APROVADO`. Em geral o RBAC vem com regras extras, como «quem solicita não aprova valores acima do teto».

### 3.3 Guardas de transição (transition guards)

Condições que precisam ser verdadeiras para a transição acontecer. O RBAC diz *quem pode tentar*. A guarda diz *se, neste momento, os dados permitem*.

**Exemplo (RMA):** para ir a `EM_REPARO`, o laudo técnico inicial precisa estar preenchido. Se estiver vazio, a ação é recusada e **nada muda**.

### 3.4 Concorrência e locks

Dois usuários agindo ao mesmo tempo sobre o mesmo recurso. Sem controle, os dois leem o mesmo estado, decidem com base nele e um sobrescreve o outro. Um **lock** faz o segundo esperar o primeiro terminar.

**Exemplo (sala de coworking):** a sala 3 está livre às 14h. Ana e Bruno clicam «reservar» no mesmo instante. Sem lock, os dois leem «livre», os dois gravam, e a sala tem duas reservas. Com `SELECT … FOR UPDATE`, Bruno espera até Ana dar `COMMIT`, relê, vê «ocupada» e recebe erro. Há também o **lock otimista**: uma coluna `versao`, em que o `UPDATE … WHERE versao = 5` falha se alguém alterou antes.

### 3.5 SLA e temporalidade

O tempo vira regra de negócio. Há um prazo, e passar dele dispara algo automaticamente: **escalonar** (avisar alguém acima) ou **expirar** (encerrar o status).

**Exemplo (incidente de segurança):** alerta crítico sem atendimento em 15 min → escalona ao gerente. Em 1 h → muda para `SLA_VENCIDO`. Implementa-se com um prazo gravado no registro mais um job que varre periodicamente. Em teste, o relógio é injetável para «avançar dias».

### 3.6 Rollback / cancelamento parcial

O que acontece com os efeitos já aplicados quando o processo é interrompido no meio. Há dois casos: numa **falha técnica**, a transação desfaz tudo (tudo ou nada); num **cancelamento de negócio depois de efeitos concretos**, é preciso uma **compensação**, uma ação que desfaz o efeito.

**Exemplo (devolução de e-commerce):** o cliente devolve 3 itens. O sistema já estornou 2 e baixou o estoque de 2 quando o processo é cancelado. Compensar é reverter os 2 estornos e voltar o estoque ao valor anterior.

### 3.7 Audit log (trilha de auditoria)

Um histórico **imutável** de cada mudança crítica: quem, quando, de qual estado para qual, e por quê. Nunca sobrescreve nada, só acrescenta linhas.

| id_registro | estado_anterior | novo_estado | autor_id | justificativa | timestamp |
|---|---|---|---|---|---|
| 42 | PENDENTE | REJEITADA | coord-1 | Falta pré-requisito | 2026-11-03 10:15 |

A linha é gravada **na mesma transação** da mudança de estado. Assim não existe mudança sem registro, nem registro de mudança que não aconteceu.

### 3.8 Como aplicar no projeto da Atividade 1

Na Atividade 1 a solicitação tem `PENDENTE/APROVADA/REJEITADA`, e o `PUT` altera dados livremente. A ordem abaixo vai do mais fundamental ao mais complexo:

1. **Eventos/ações:** remover `PUT` e `DELETE` de solicitação; criar um endpoint por ação; status sem setter público; novos estados reais (`EM_ANALISE`, `CONCLUIDA`, `CANCELADA`).
2. **Tabela de transições:** em vez de vários `if`, uma tabela (de, evento, para). Isso já cumpre o OCP.
3. **RBAC:** acrescentar a cada linha quais papéis disparam o evento; fazer o papel chegar à API.
4. **Guardas:** transformar as validações existentes em classes (pré-requisitos, vaga, matrícula duplicada) e criar as novas (choque de horário, justificativa obrigatória).
5. **Auditoria:** tabela de histórico e repositório com só `registrar` e `listar`.
6. **Transação:** agrupar «mudar estado + efeito em vaga/matrícula + gravar histórico» num `UnitOfWork`; assim o rollback passa a funcionar.
7. **Concorrência:** `FOR UPDATE` na disciplina e na solicitação, sempre na mesma ordem; testar duas efetivações simultâneas para a última vaga.
8. **SLA:** `prazo_limite`, relógio injetável e um job que dispara `ESCALONAR` e `EXPIRAR`.
9. **Cancelamento parcial:** antes de concluir, cancelar não desfaz nada; depois, `ESTORNAR` devolve a vaga e retira a disciplina da grade.

Os nove passos já estão no pacote entregue. Mapa: eventos em `solicitacoes.controller.ts` e `Solicitacao.transitarPara`; tabela e RBAC em `domain/workflow/solicitacao.transitions.ts`; guardas em `guards/guards.ts`; locks em `PgDisciplinaRepository.findByIdForUpdate`; SLA em `processar-sla.use-case.ts` e `sla.scheduler.ts`; rollback em `TrancamentoHandler.reverter` e `PgUnitOfWork`; auditoria em `solicitacao_historico` (`db/schema.sql`). Como parte do que o professor quer ver é o entendimento do aluno, a IA sugeriu fazer os passos 1 a 3 à mão sobre a Atividade 1 original e só depois comparar com o código entregue.

## 4. Modificações feitas no projeto e o motivo de cada uma

**Pergunta (aluno):** «Me explique detalhadamente as modificações feitas no projeto e o motivo da alteração»

**Resposta (IA):** as mudanças respondem a três exigências do enunciado: um fluxo controlado (**1.A**), regras que lidam com concorrência e tempo (**1.B**) e rastreabilidade (**1.C**).

### 4.1 Domínio

**Entidade `Solicitacao`.** Antes, `status` era um campo comum que qualquer código podia atribuir. Agora é privado, sem setter, e só muda por `transitarPara`, chamado pelo caso de uso depois de validar tudo. Ganhou `prazoLimite`, `escalonarEm`, `escalonadaEm`, `versao` e `ultimaJustificativa`. Motivo: o enunciado proíbe alterações arbitrárias de status; os prazos sustentam o SLA e a `versao` sustenta o controle otimista.

**Enums e erros.** Os estados passaram de 3 para 9 (`EM_ANALISE`, `AJUSTE_SOLICITADO`, `CONCLUIDA`, `CANCELADA`, `EXPIRADA`, `ESTORNADA` são novos), com 11 eventos e 4 papéis. Erros novos: `ForbiddenError` (403), `TransicaoInvalidaError` (409) e `GuardViolationError` (400). Motivo: a API precisa dizer *por que* recusou (sem permissão, estado errado ou regra violada).

**Máquina de estados (`domain/workflow/`)**, dividida em quatro peças:

| Peça | O que faz | Por quê |
|---|---|---|
| `solicitacao.transitions.ts` | Tabela de regras: evento, origem, destino, papéis, guardas, efeito | É o único lugar onde o fluxo é definido |
| `solicitacao.state-machine.ts` | Motor genérico que consulta a tabela | Não conhece regra concreta, o que cumpre o OCP |
| `guards/guards.ts` | Uma classe por condição | SRP: cada guarda valida uma coisa; todas seguem o mesmo contrato (LSP) |
| `handlers/` | Efeitos em vaga e matrícula, por tipo | Matrícula e trancamento fazem efeitos opostos; tipo novo = classe nova |

Decisões de desenho:

- **Quem aprova não efetiva:** a coordenação aprova e a secretaria conclui (separação de funções).
- **As guardas de elegibilidade rodam duas vezes**, em `APROVAR` e em `CONCLUIR`, porque entre as etapas o mundo muda. A segunda roda sob lock.
- **Ordem dos erros:** 403 (papel) antes de 409 (estado), para não revelar o estado a quem não tem permissão.
- **`ESTORNAR`** existe porque, depois de `CONCLUIDA`, cancelar exige desfazer efeitos reais.

**Horários e choque na grade.** `Disciplina` ganhou `horarios` (dia, início, fim), validados na criação. `encontrarConflitos` é uma função pura, com intervalos semiabertos (08–10 e 10–12 não colidem).

### 4.2 Portas e repositórios

- **`UnitOfWork`** (nova): fronteira da transação, tudo dentro de `run` é confirmado junto ou desfeito junto (o «A» de ACID).
- **`Clock`** (nova): o tempo vira dependência injetável; sem isso, testar expiração exigiria esperar 7 dias.
- **Métodos novos:** `findByIdForUpdate` (lock pessimista), `findByIds` (lote), `preRequisitosTransitivos` (CTE recursiva), `existeAberta` (evita duplicidade), `findParaExpirar` e `findParaEscalonar` (SLA).
- **Removido:** `SolicitacaoRepository.delete`, porque solicitações têm trilha de auditoria.
- **`HistoricoRepository`** novo, só com `registrar` e `listar` (append-only de propósito).

### 4.3 Casos de uso

- **`TransicionarSolicitacaoUseCase`** é o único caminho para mudar status. Numa transação: carrega com lock, resolve a regra, autoriza, roda as guardas, aplica o efeito, muda o estado e grava a auditoria. Os locks seguem sempre a ordem solicitação → disciplina → aluno, para evitar deadlock.
- **`CriarSolicitacaoUseCase`:** checa o papel (aluno só para si, secretaria para qualquer um), calcula os prazos e grava a linha `CRIAR`.
- **`ProcessarSlaUseCase`:** escalona e expira como ator `SISTEMA`, cada item na própria transação.
- **Novos:** `ListarHistoricoUseCase`; `Buscar` e `Listar` agora respeitam o papel.
- **Removidos:** aprovar, rejeitar, atualizar e excluir solicitação (absorvidos pelo fluxo de eventos).
- **Exclusão de aluno e disciplina:** antes apagava as solicitações junto; agora é bloqueada se houver qualquer solicitação, para preservar a auditoria.
- **Correção de N+1:** `garantirDisciplinasExistem` fazia um `findById` por pré-requisito e agora faz um `findByIds`; a checagem de ciclo carregava todas as disciplinas e agora usa uma consulta recursiva.

### 4.4 Infraestrutura

**Em memória.** O `InMemoryUnitOfWork` usa uma fila (uma transação por vez) e *snapshots* para o rollback, já que os repositórios em memória devolvem objetos vivos. Testado por sabotagem: sem a fila, 3 testes de concorrência falham; sem o rollback, o teste ACID falha. O seed ganhou horários e a disciplina `RED202`, que colide com `ALG101` de propósito.

**PostgreSQL.** O banco impõe sozinho as garantias que a aplicação também checa:

- `CHECK` de vagas: a vaga nunca estoura, mesmo que o código erre;
- índice único parcial `uq_solicitacao_aberta`: no máximo uma solicitação aberta por aluno, disciplina e tipo, mesmo com criação simultânea;
- `ON DELETE RESTRICT` nas chaves das solicitações;
- trigger que bloqueia `UPDATE`, `DELETE` e `TRUNCATE` no histórico.

Foi usado SQL explícito com `pg`, sem ORM, para que locks, CTE e constraints fiquem visíveis. `traduzirErroPg` converte erros do banco em erros de domínio.

### 4.5 Camada HTTP

- Um `PATCH` por ação (`/aprovar`, `/concluir`…) e nenhum campo `status` em DTO; um `status` enviado no corpo é descartado.
- `CurrentActor` lê `X-Actor-Id` e `X-Actor-Role`. É uma simplificação: em produção viria de um JWT, e o resto do sistema não mudaria.
- `acoesPermitidas` na resposta vem da própria máquina de estados; a validação real continua no servidor.
- `SlaScheduler` e um endpoint manual rodam a varredura.
- O módulo seleciona `PERSISTENCE=memory|postgres`; o padrão em memória mantém os testes sem banco.
- O CORS passou a permitir os cabeçalhos de ator, e foi corrigido um erro de compilação real (`import type Actor`) que quebraria o `nest build`.

### 4.6 Front-end

- Seletor «Atuando como», que envia o ator em toda requisição e remonta a tela ao trocar de perfil.
- Lista e página de detalhe mostram só as ações permitidas, pedem justificativa quando exigida e exibem a trilha de auditoria.
- Editor de horários na disciplina.
- Removida a tela de edição de solicitação, porque o `PUT` não existe mais.

### 4.7 Testes

O spec antigo deu lugar a 61 testes: caminho feliz, transições inválidas, RBAC, justificativa, guardas, última vaga concorrente, rollback quando a auditoria falha, SLA (escalonar, expirar, reenviar reinicia o prazo), estorno e extensão do motor sem alterá-lo. Dois testes fracos foram reescritos na revisão.

### 4.8 Mudanças que alteram o comportamento da Atividade 1

1. Não é mais possível editar ou excluir uma solicitação, só cancelar.
2. Aluno ou disciplina com histórico não podem ser excluídos.
3. Duas solicitações abertas idênticas passam a ser recusadas.
4. Toda rota de solicitação exige os cabeçalhos de ator (401 sem eles).
5. Aprovar não altera mais vaga nem matrícula: isso agora é a etapa `CONCLUIR`, feita pela secretaria.
6. Recusa por papel responde 403, e transição inválida responde 409.

### 4.9 O que ainda precisa de validação

- O código de PostgreSQL, o e2e do Nest e o front foram escritos e checados por tipos, mas **não executados**. Falta rodar `docker compose up`, o e2e com `PERSISTENCE=postgres` e o `smoke-concorrencia.mjs`.
- A regra que bloqueia exclusão por histórico é decisão da IA; vale confirmar com o professor.
- Lacuna conhecida: uma solicitação `APROVADA` que a secretaria nunca efetiva não expira.
