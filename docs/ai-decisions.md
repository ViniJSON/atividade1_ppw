# Registro crítico do uso de IA

Ferramenta: Claude (Anthropic), em conversa única com o código da Atividade 1 anexado.
Cada entrada segue o roteiro do enunciado: **1. Desafio · 2. Prompt · 3. Resposta bruta · 4. Crítica e refatoração**.

> **Para o aluno (obrigatório antes de entregar):** a seção “Crítica e refatoração” de cada entrada abaixo lista problemas
> que realmente apareceram durante a construção, com a correção. Mas a crítica que vale nota é a **sua**: execute o projeto,
> leia o código, discorde de pelo menos uma decisão e registre isso em “Minha análise”. Não entregue este arquivo sem completá-lo.

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

**Minha análise (preencher):**
- O que eu mudaria na matriz de permissões e por quê: …
- Uma decisão da IA com a qual discordo / que simplifiquei: …
- O que descobri ao rodar contra o Postgres: …

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
* **Minha análise (preencher):** …
