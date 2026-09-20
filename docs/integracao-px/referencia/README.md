# px-sync

Sincroniza as tabelas de preço do painel da PX Tecnologia com o banco do seu CRM e calcula as cotações localmente, sem depender da PX na hora de cotar.

## Como funciona

1. Toda madrugada, o `src/sync.js` chama a API da PX, baixa cada produto (tabelas, planos e preços por faixa etária) e grava no seu PostgreSQL. Se nada mudou desde a última vez, ele pula o produto.
2. Quando o corretor cota no CRM, o `src/cotacao.js` lê as tabelas do banco, filtra as que servem para o lead e soma o preço de cada beneficiário pela faixa etária dele.
3. Cada cotação é salva com uma cópia dos preços usados. Se a operadora reajustar, as cotações antigas continuam com os valores da época.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `schema.sql` | Cria as tabelas no banco |
| `src/pxClient.js` | Chama a API tRPC da PX com o cookie de sessão |
| `src/normalizar.js` | Converte o JSON da PX para o formato do CRM e valida a estrutura |
| `src/repositorio.js` | Grava e lê do PostgreSQL |
| `src/sync.js` | O job de sincronização |
| `src/cotacao.js` | O calculador de cotação |
| `exemplos/testar-com-arquivo.js` | Testa conversão e cálculo com um JSON copiado do DevTools, sem banco |
| `exemplos/cotar-no-crm.js` | Mostra como o CRM gera e salva uma cotação |
| `exemplos/fixture-amil-sc.json` | Resposta real da PX para o Amil SC, sem dados pessoais |
| `test/cotacao.test.js` | Testes automatizados com valores esperados (`npm test`) |

## Instalação

Requisitos: Node.js 20.6 ou mais novo e PostgreSQL.

```bash
npm install
psql "$DATABASE_URL" -f schema.sql
cp .env.example .env    # depois preencha o .env
```

## Configuração do .env

Três valores precisam ser pegos no DevTools do Chrome, com você logado no painel:

**PX_PROC_PRODUTO**: abra a página de um produto (ex.: Amil SC) com a aba Network aberta. Clique na requisição grande (a que começa com `activeTenant,brokerUser,...`) e, em Headers, copie a *Request URL*. Os nomes entre `/trpc/` e `?batch` são as procedures, separadas por vírgula. A **6ª** é a que devolve o produto completo.

**PX_BASE_URL**: na mesma Request URL, é tudo o que vem antes da lista de procedures (normalmente `https://www.painel.pxtecnologia.com/api/trpc`).

**PX_COOKIE**: na mesma requisição, em Request Headers, copie o valor inteiro do header `cookie`. Ele é equivalente à sua senha: não compartilhe e não coloque no Git.

**PX_PRODUTOS**: IDs dos produtos, separados por vírgula. O Amil SC é o `12`. O ID de cada produto aparece no input da requisição (`{"id":12}`).

## Testar antes de ligar no banco

Com uma resposta copiada do DevTools (botão direito → Copy → Copy response):

```bash
node exemplos/testar-com-arquivo.js resposta.json --idades 34,31,4
node exemplos/testar-com-arquivo.js resposta.json --idades 45,42,17,15 --mei --acomodacao Apartamento
```

Faça os mesmos cenários na tela Cotação V2 da PX e confira se os valores batem.

## Rodar a sincronização

```bash
npm run sync
```

Para agendar todo dia às 3h (cron do Linux):

```
0 3 * * * cd /caminho/px-sync && node --env-file=.env src/sync.js >> sync.log 2>&1
```

Cada execução fica registrada na tabela `px_sync_log`. Se `ALERTA_WEBHOOK_URL` estiver preenchido, os erros chegam por webhook (Slack, Discord, n8n etc.).

**Quando o cookie expirar**, o job para e avisa. Basta copiar um cookie novo do navegador para o `.env`.

## Usar no CRM

```js
const { carregarTabelas, salvarCotacao } = require('./px-sync/src/repositorio');
const { calcularCotacao } = require('./px-sync/src/cotacao');

const entrada = { idades: [34, 31, 4], mei: false, modalidade: 'PME', acomodacao: 'Enfermaria' };
const tabelas = await carregarTabelas(db, { modalidade: 'PME', vidas: entrada.idades.length });
const { resultados } = calcularCotacao(tabelas, entrada);
await salvarCotacao(db, { leadId, entrada, resultado: resultados });
```

Filtros aceitos em `entrada`: `idades` (obrigatório), `mei`, `modalidade`, `contratacao`, `coparticipacao`, `acomodacao`, `linha`, `obstetricia`, `entidade` e `data`. Cada resultado traz o total, o detalhamento por beneficiário e a referência da tabela e do plano na PX.

## Regras de negócio e pontos a confirmar

Estas regras foram deduzidas dos dados do Amil SC. Confira na Cotação V2 antes de usar em produção.

- **MEI**: na PX, as tabelas MEI têm preços próprios (mais caros). Empresa MEI usa só tabelas MEI e empresa não-MEI só as não-MEI.
- **Contratação "Indiferente"** vale tanto para compulsório quanto para livre adesão.
- **Faixa de vidas inválida**: 6 tabelas de livre adesão do Amil SC vêm da PX com "30 a 29 vidas", o que é impossível. Por padrão elas ficam de fora. Se a Cotação V2 mostrar essas tabelas para 30 vidas ou mais, passe `{ tabelasComVidasInvalidas: 'tratar_como_sem_maximo' }` como terceiro argumento do `calcularCotacao`.
- **Desconto percentual**: hoje está zerado em todas as tabelas. O cálculo aplica o desconto sobre o total; confira quando aparecer algum.
- **Idade única** (`isSingleAge`): nenhuma tabela usa hoje. Se aparecer, a tabela é descartada até a regra ser confirmada.
