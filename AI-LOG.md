# AI-LOG

Índice do registro de uso de IA. O texto completo (desafio, prompt, resposta bruta, crítica e refatoração) está em
[`docs/ai-decisions.md`](docs/ai-decisions.md).

| # | Desafio | Onde está o resultado |
|---|---|---|
| 1 | Máquina de estados + RBAC + guardas + SLA + concorrência + auditoria ACID | `atividade1_ppw_server/src/modules/matriculas/domain/workflow/`, `application/use-cases/solicitacoes/`, `infrastructure/persistence/` |
| 2 | Pré-requisitos encadeados e choque de horários sem N+1 | `domain/workflow/guards/guards.ts`, `domain/services/choque-horario.ts`, `PgDisciplinaRepository.preRequisitosTransitivos` |

Ferramenta: Claude (Anthropic). Todo trecho gerado foi lido, executado nos testes e revisado; as correções aplicadas estão na tabela “Crítica e refatoração”.
