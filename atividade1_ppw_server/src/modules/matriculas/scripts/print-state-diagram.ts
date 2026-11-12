// Imprime o diagrama Mermaid gerado a partir da tabela de regras: `npm run docs:states`
import { SlaConfig } from '../domain/workflow/sla';
import { SolicitacaoStateMachine } from '../domain/workflow/solicitacao.state-machine';
import { criarRegrasDeTransicao } from '../domain/workflow/solicitacao.transitions';

console.log(new SolicitacaoStateMachine(criarRegrasDeTransicao(new SlaConfig())).toMermaid());
