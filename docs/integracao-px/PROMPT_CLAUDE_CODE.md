# Integração PX Tecnologia → CRM: tabelas de preço e cotação de planos de saúde

## Seu papel e como trabalhar

Você vai implementar, no CRM deste repositório, a sincronização das tabelas de preço de planos de saúde do painel da PX Tecnologia e um módulo de cotação que calcula os valores localmente.

Regras de trabalho:

1. **Comece pela Fase 0 e espere minha aprovação** antes de escrever qualquer código de produção.
2. Trabalhe fase por fase. Ao fim de cada fase, rode os testes e o lint do projeto, faça um commit com mensagem clara e me mostre um resumo curto do que mudou.
3. Siga as convenções que já existem no repositório: estrutura de pastas, ORM, padrão de migrations, estilo de código, idioma dos nomes, biblioteca de componentes da interface, forma de fazer jobs agendados e de guardar segredos.
4. Não altere código que não tenha relação com esta tarefa. Se precisar mudar uma tabela ou módulo existente, pergunte antes.
5. Quando algo estiver ambíguo, pergunte em vez de supor. Há uma lista de perguntas pendentes no fim deste documento.

## Contexto

A corretora usa o painel da PX Tecnologia (`https://www.painel.pxtecnologia.com`) para consultar tabelas de preço de planos de saúde (Amil, etc.). A PX não tem API pública documentada; o painel usa uma API interna tRPC, que foi mapeada pelo DevTools do navegador.

A decisão de arquitetura já foi tomada:

- Um **job de sincronização** roda de madrugada, baixa as tabelas de cada produto da PX e grava no banco do CRM.
- A **cotação é calculada localmente** no CRM, a partir das tabelas salvas. A PX nunca é chamada no momento da cotação.
- Cada cotação é salva com **uma cópia dos preços usados**, para não mudar quando a operadora reajustar a tabela.

### Implementação de referência

Em `docs/integracao-px/referencia/` há uma implementação completa em **Node.js + PostgreSQL**, já testada com dados reais. Ela é a **fonte da verdade para as regras de negócio**:

| Arquivo | Conteúdo |
|---|---|
| `schema.sql` | Estrutura das tabelas |
| `src/pxClient.js` | Chamada à API tRPC da PX, com detecção de sessão expirada |
| `src/normalizar.js` | Conversão do JSON da PX para o formato do CRM, validação da estrutura, hash de conteúdo |
| `src/repositorio.js` | Gravação transacional e leitura das tabelas |
| `src/sync.js` | Job de sincronização com log e alertas |
| `src/cotacao.js` | Calculador de cotação com todas as regras de elegibilidade |
| `test/cotacao.test.js` | Testes com valores esperados reais |
| `exemplos/fixture-amil-sc.json` | Resposta real da PX para o produto Amil SC (sem dados pessoais) |

Rode `npm install && npm test` dentro dessa pasta para ver os 11 testes passando.

- Se o CRM for Node.js com PostgreSQL, reaproveite o código, encaixando-o na estrutura do projeto (ORM, pastas, injeção de dependências, logger).
- Se for outra stack, **porte a lógica fielmente**. Os testes portados precisam dar exatamente os mesmos números.

## A API da PX

**Formato das chamadas** (tRPC via GET, com batch):

```
GET {PX_BASE_URL}/{procedure}?batch=1&input={encodeURIComponent(JSON.stringify({"0": <input>}))}
Header: cookie: <valor de PX_COOKIE>
```

- `PX_BASE_URL` provável: `https://www.painel.pxtecnologia.com/api/trpc` (a confirmar).
- **Resposta de sucesso**: `[{"result":{"data": <dados>}}]`. Não usa superjson (não existe o wrapper `json`), mas trate os dois formatos por segurança, como faz o `pxClient.js`.
- **Resposta de erro**: `[{"error":{"message":"...","code":-32001,"data":{"code":"UNAUTHORIZED","httpStatus":401}}}]`. HTTP 401 ou `data.code === "UNAUTHORIZED"` significa sessão expirada.
- **Autenticação**: cookie de sessão copiado do navegador de um usuário logado. Não há login automatizado nesta versão.

**Procedure que importa**: a que devolve o produto completo. O nome ainda precisa ser confirmado (variável `PX_PROC_PRODUTO`). O input é `{"id": <idDoProduto>}`. O produto Amil SC tem id `12`.

**Procedures que NÃO devem ser chamadas pela integração**: `brokerUser` (devolve CPF, telefone e e-mail do corretor), `activeTenant`, `notificationsPoll`. Também foi vista a `priceFindProductsFilterV2` (input com `ageId: []` e `lifeAmount`), que não é necessária nesta arquitetura.

**Educação com o servidor da PX**: uma requisição por produto, intervalo de 2 segundos entre produtos, execução de madrugada, timeout de 60 segundos. A requisição de um produto leva cerca de 5 segundos e devolve cerca de 1,2 MB.

## Estrutura do produto devolvido pela PX

```jsonc
[{ "result": { "data": {
  "id": 12, "name": "Amil SC", "categoryId": 1, "isVisible": true,
  "organization": { "id": 1, "name": "Amil", "logoUrl": "...", "informations": [/* textos: carências, documentos */] },
  "plans": [  // catálogo de planos do produto
    { "id": 273, "name": "Amil S380", "ansCode": "", "accommodation": { "id": 1, "name": "Enfermaria" },
      "coverageArea": { "id": 308, "name": "Amil SC " } }
  ],
  "tableBinds": [  // uma entrada por tabela de preço vinculada ao produto (60 no Amil SC)
    {
      "id": 322713, "order": 1, "isVisible": true, "percentualDiscount": 0,
      "expirationFrom": null, "expirationTo": null, "classEntityProfessions": [],
      "valueTable": {  // regras de quem pode usar a tabela
        "id": 5247, "isVisible": true, "isMei": true, "isObstetrics": true, "isSingleAge": false,
        "copayType": { "id": 2, "name": "Completa" }, "copayDescription": "",
        "compulsoryType": { "id": 3, "name": "Indiferente" },
        "lifeAmountMin": 2, "lifeAmountMax": 2, "ageLimitMin": 0, "ageLimitMax": 100,
        "extraInformation": "Amil", "modality": { "id": 2, "name": "PME" },
        "classOrganization": null, "classEntities": [], "expirationFrom": null, "expirationTo": null,
        "ages": [ { "id": 1, "minAge": 0, "maxAge": 18 } /* ... 10 faixas */ ]
      },
      "plans": [  // preços de cada plano nesta tabela
        { "id": 1798172, "planId": 283, "name": "Amil Prata", "order": 8, "isVisible": true,
          "accommodation": { "id": 1, "name": "Enfermaria" },
          "agePrices": [ { "id": 1798172, "age": { "id": 1, "minAge": 0, "maxAge": 18 }, "price": 312.9 } /* ... */ ] }
      ]
    }
  ],
  "tables": [ /* as mesmas valueTables, redundante: ignorar */ ],
  "networks": [ /* rede credenciada (aba "Rede" do painel): fora do escopo agora */ ],
  "exceptions": [ /* textos informativos */ ],
  "modalityAlerts": []
}}}]
```

**Valores de domínio observados:**

| Campo | Valores |
|---|---|
| `modality` | PME (2), Adesão (3) |
| `copayType` | Parcial (1), Completa (2). `copayDescription` pode ser `""` ou `"40%"` |
| `compulsoryType` | Compulsório (1), Opcional/Livre Adesão (2), Indiferente (3), ou `null` em Adesão |
| `accommodation` | Enfermaria (1), Apartamento (2) |
| `extraInformation` | Linha: Amil, Selecionada, Black (vazio em Adesão) |
| `ages` | 10 faixas da ANS: 0–18, 19–23, 24–28, 29–33, 34–38, 39–43, 44–48, 49–53, 54–58, 59–100 (ids 1 a 10) |
| Faixas de vidas | 2–2, 3–4, 5–29, 30–99, 1–100 (Adesão) e 30–29 (erro da PX, ver regras) |

## Regras de negócio da cotação

**Entrada**: lista de idades (uma por beneficiário), se a empresa é MEI, modalidade (PME ou Adesão) e filtros opcionais: tipo de contratação, coparticipação, acomodação, linha, obstetrícia e entidade de classe (Adesão). A quantidade de vidas é o número de idades.

**Uma tabela é elegível quando TODAS as condições valem:**

1. A tabela, o vínculo e o produto estão visíveis.
2. A data da cotação está dentro da vigência. A vigência efetiva é a interseção entre a da `valueTable` e a do `tableBind`; `null` significa sem limite.
3. `isSingleAge` é falso. Tabelas de idade única ficam de fora até a regra ser confirmada (nenhuma usa isso hoje).
4. A modalidade bate, quando informada.
5. `lifeAmountMin ≤ vidas ≤ lifeAmountMax`. Se `lifeAmountMax < lifeAmountMin` (erro de cadastro da PX, como "30 a 29"), a tabela é **excluída por padrão**. Deve existir uma configuração `tabelasComVidasInvalidas` com os valores `excluir` (padrão) e `tratar_como_sem_maximo` (passa a exigir apenas `vidas ≥ lifeAmountMin`).
6. Todas as idades estão entre `ageLimitMin` e `ageLimitMax`.
7. **MEI**: em PME, `isMei` precisa ser igual ao tipo da empresa. Tabelas MEI têm preços próprios e mais caros: empresa MEI usa só tabelas MEI e empresa comum só as não-MEI. Em Adesão, ignorar.
8. **Contratação**: se o usuário filtrar, a tabela passa se for do mesmo tipo, "Indiferente" ou `null`.
9. Coparticipação, linha e obstetrícia: igualdade exata, quando o filtro for informado.
10. Entidade (Adesão): se a tabela tem `classEntities` e o usuário informou uma entidade, a sigla precisa constar na lista.

**Cálculo, para cada plano visível de cada tabela elegível** (respeitando o filtro de acomodação):

1. Para cada idade, achar a faixa em `agePrices` com `minAge ≤ idade ≤ maxAge`. Se alguma idade não tiver faixa, descartar esse plano.
2. Subtotal = soma dos preços das faixas, **calculada em centavos (inteiros)**. Nunca some `float` de dinheiro.
3. Desconto = `round(subtotal × percentualDiscount / 100)`; total = subtotal − desconto. Hoje o desconto é 0 em todas as tabelas.
4. A coparticipação é exibida como `copayType.name` + `copayDescription` (ex.: "Completa 40%"). "Completa" e "Completa 40%" são opções diferentes, com preços diferentes.
5. Ordenar os resultados pelo total, do menor para o maior.
6. Cada resultado traz: produto, operadora, linha, plano, acomodação, coparticipação, contratação, modalidade, vidas, subtotal, desconto, total, detalhamento por beneficiário (idade, faixa, valor) e referência (`px_vinculo_id`, `px_tabela_id`, `px_plano_id`).
7. Retornar também a lista de tabelas descartadas com o motivo (útil para depurar "por que tal plano não apareceu?").

## Regras da sincronização

1. Os IDs dos produtos vêm da configuração (`PX_PRODUTOS=12,...`). Ainda não se sabe qual procedure lista todos os produtos.
2. Para cada produto: chamar a PX, **validar a estrutura** (id numérico, `tableBinds` não vazio, cada vínculo com `valueTable` e faixa de vidas numérica, cada plano com `agePrices` não vazio e preços numéricos). Se a validação falhar, **não gravar nada** desse produto e registrar o erro.
3. Calcular um hash SHA-256 do conteúdo normalizado, ordenado por id. Se for igual ao hash salvo, pular o produto ("sem mudanças").
4. Se mudou, substituir tudo do produto numa **única transação**: upsert do produto, apagar tabelas, planos e preços antigos, inserir os novos. Se qualquer passo falhar, rollback.
5. Detectar inconsistências (faixa de vidas inválida, preço zerado, buraco ou sobreposição nas faixas etárias), gravar junto com a tabela e incluir no alerta.
6. Se a PX responder `UNAUTHORIZED`, **interromper o job** (os próximos falhariam também) e alertar pedindo um cookie novo.
7. Registrar cada execução num log (início, fim, status e detalhes por produto) e alertar em caso de erro, pelo canal que o CRM já usa ou por webhook (`ALERTA_WEBHOOK_URL`).

## Fases de implementação

### Fase 0: reconhecimento e plano (não escreva código ainda)

Explore o repositório e me apresente:

- Stack: linguagem, framework, banco, ORM e ferramenta de migrations.
- Como o CRM faz jobs agendados hoje (cron, fila, scheduler do framework) e como guarda segredos.
- Onde ficam os leads, como a página do lead é montada e qual biblioteca de interface é usada.
- Como o CRM notifica usuários ou administradores (e-mail, notificação interna, webhook).
- Como estão organizados os testes.
- Um plano de arquivos a criar ou alterar, fase por fase, e as decisões em que você precisa da minha opinião.

### Fase 1: banco de dados

Crie migrations equivalentes ao `schema.sql` de referência, usando o ORM do projeto: `px_produtos`, `px_planos`, `px_tabelas`, `px_precos`, `px_sync_log` e `cotacoes`.

- Ligue `cotacoes.lead_id` à tabela de leads existente, com chave estrangeira.
- Valores monetários em tipo decimal exato (`NUMERIC(10,2)` ou equivalente), nunca `float`.
- Mantenha as chaves primárias da referência: `px_tabelas` por `px_vinculo_id` (a mesma `valueTable` pode, em tese, estar vinculada a vários produtos) e `px_precos` por (`px_vinculo_id`, `px_plano_id`, `faixa_id`).
- Se o banco não for PostgreSQL, adapte os campos JSONB e os inserts em lote para o equivalente do banco.

### Fase 2: cliente da PX e normalização

- Cliente HTTP da PX conforme a seção da API, com erro específico para sessão expirada.
- Normalizador e validador, conforme `src/normalizar.js`.
- Testes unitários usando a fixture `exemplos/fixture-amil-sc.json`.

### Fase 3: job de sincronização

- Job conforme as regras da sincronização, agendado para as 3h pelo mecanismo que o CRM já usa.
- Comando para rodar manualmente (CLI ou equivalente do framework).
- Log em `px_sync_log` e alertas.
- Teste de integração com a PX simulada (servidor falso ou mock do HTTP que devolve a fixture): primeira execução grava 60 tabelas e 4.260 preços; segunda execução retorna "sem mudanças"; cookie inválido interrompe e alerta; resposta com formato quebrado não altera o que já estava salvo.

### Fase 4: serviço e API de cotação

- Serviço de cotação conforme `src/cotacao.js`: carrega do banco (pré-filtro por modalidade e `vidas_min ≤ vidas`) e aplica as regras em memória.
- Endpoints, protegidos pela autenticação e permissões atuais do CRM:
  - calcular uma cotação (sem salvar), para a tela mostrar os resultados;
  - salvar uma cotação para um lead, com as opções escolhidas pelo corretor e a cópia dos preços;
  - listar as cotações de um lead;
  - consultar o status da última sincronização.
- Validação de entrada: ao menos uma idade; idades inteiras de 0 a 120.

### Fase 5: interface no CRM

**Na página do lead, botão "Nova cotação" com um formulário:**

- Beneficiários: adicionar idades uma a uma e também colar uma lista ("34, 31, 4"). Se o CRM já guarda data de nascimento dos beneficiários, calcular a idade na data da cotação.
- Empresa MEI (sim/não), modalidade (PME/Adesão) e filtros opcionais: contratação, coparticipação, acomodação, linha. Em Adesão, a entidade de classe.

**Resultado:**

- Tabela ordenada pelo total mensal, com colunas para produto/operadora, linha, plano, acomodação, coparticipação, contratação e total.
- Cada linha expande para mostrar o valor de cada beneficiário e a faixa etária.
- Filtros rápidos na própria lista.
- O corretor marca as opções que quer guardar e salva a cotação no lead.
- Aviso visível com a data da última sincronização. Destaque em alerta se ela tiver mais de 3 dias.

**No lead:** histórico das cotações salvas, com data, quantidade de vidas e opções escolhidas. Os valores exibidos vêm da cópia salva, não da tabela atual.

**Área administrativa (só administradores):** status das sincronizações (última execução, produtos atualizados, erros e inconsistências), botão "Sincronizar agora" e lista de produtos sincronizados. Se o CRM já tiver um cofre de segredos com interface, proponha uma tela para atualizar o `PX_COOKIE`, **guardando o valor criptografado**. Caso contrário, mantenha o cookie em variável de ambiente.

### Fase 6: testes

Porte todos os testes de `test/cotacao.test.js` para o framework de testes do projeto. Os números precisam bater exatamente com a tabela de casos abaixo. Inclua também os testes das Fases 2, 3 e 4.

### Fase 7: documentação e entrega

- Seção no README do CRM explicando: variáveis de ambiente, como obter `PX_COOKIE` e `PX_PROC_PRODUTO` pelo DevTools, como rodar a sincronização manualmente, como renovar o cookie quando expirar, e as regras de negócio com os pontos a confirmar.
- Variáveis novas no `.env.example` (sem valores reais).
- Resumo final para mim: o que foi feito, como testar na interface e o que ficou pendente.

## Casos de teste obrigatórios

Todos com a fixture do Amil SC, modalidade PME salvo indicação, e opção `excluir` para faixas de vidas inválidas salvo indicação.

| # | Entrada | Opções | Mais barata | Total da mais barata |
|---|---|---|---|---|
| 1 | Idades 34, 31, 4; não MEI | 61 | Amil Prata, Enfermaria, Completa 40%, tabela 5256. Detalhe: 426,57 + 406,26 + 237,18 | R$ 1.070,01 (a mais cara: R$ 9.333,28) |
| 2 | Idades 45, 42, 17, 15; MEI | 39, todas MEI | Tabela 5257 | R$ 1.828,59 |
| 3 | 35 vidas (idades 20 a 54); não MEI; Opcional/Livre Adesão | 13 | Tabela 5261 | R$ 16.982,93 |
| 4 | Igual ao 3, com `tratar_como_sem_maximo` | 55 | | |
| 5 | 35 vidas (20 a 54); não MEI; Compulsório; Parcial; linha Black | 11 | Black I R1, tabela 8260 | R$ 52.184,37 |
| 6 | Idades 60, 58; não MEI; Apartamento; linha Selecionada | 15, todas Apartamento | Amil S380, tabela 5243 | R$ 2.739,91 |
| 7 | Idade 40; modalidade Adesão | 4 | Amil Prata, Enfermaria, tabela 5270 | R$ 779,89 |

**Testes de normalização:** 60 tabelas, 24 planos, 4.260 preços. As tabelas com inconsistência são exatamente 434, 5245, 5253, 5269, 8261 e 8262. Hash SHA-256 do conteúdo normalizado: `bb35ee5086f40638562bf4263481d31ac2a82bb6e28e6d76cc45136c66ee87a2`. Se a serialização da sua linguagem gerar um hash diferente, o que importa é o hash ser estável entre execuções; nesse caso, me avise.

**Validação:** idades vazias, negativas ou não numéricas geram erro.

## Restrições (não negociáveis)

1. `PX_COOKIE` e qualquer credencial ficam em variável de ambiente ou no cofre de segredos. Nunca no código, em logs, no banco sem criptografia ou em commits. Confira o `.gitignore`.
2. Não guardar e-mail ou senha da PX em lugar nenhum. Não implementar login automatizado nesta versão.
3. Não chamar procedures que devolvem dados pessoais (`brokerUser`) nem qualquer procedure além da do produto.
4. A cotação nunca chama a PX em tempo real. Só o job de sincronização conversa com a PX.
5. Dinheiro sempre em centavos inteiros ou decimal exato.
6. Uma resposta com formato inesperado nunca pode apagar ou corromper as tabelas já salvas.
7. Nada de dados reais de clientes em fixtures ou testes.

## Critérios de aceite

- [ ] Migrations aplicam e revertem sem erro.
- [ ] O job sincroniza o Amil SC, é idempotente, para em sessão expirada, não grava dados inválidos e registra tudo no log.
- [ ] Todos os casos de teste da tabela passam com os valores exatos.
- [ ] O corretor consegue, pela página do lead, cotar, ver o detalhamento, salvar e consultar o histórico.
- [ ] O administrador vê o status da sincronização e consegue disparar uma sincronização manual.
- [ ] Nenhum segredo no repositório; `.env.example` e README atualizados.
- [ ] Lint e testes do projeto passando.

## Pendências: pergunte-me quando chegar a hora

1. Nome exato da procedure do produto (`PX_PROC_PRODUTO`) e confirmação da `PX_BASE_URL`. Posso mandar a Request URL completa copiada do DevTools.
2. Lista de IDs dos produtos a sincronizar, além do 12 (Amil SC).
3. Se a PX mostra as tabelas com faixa "30 a 29 vidas" na tela Cotação V2 para 30 vidas ou mais. Isso define o valor padrão de `tabelasComVidasInvalidas`.
4. Canal preferido para os alertas.
5. Quais perfis de usuário do CRM podem cotar e quais podem ver a área administrativa.

## Fora do escopo desta versão

Rede credenciada (campo `networks`), manuais e textos informativos, geração de PDF da proposta, login automatizado na PX e descoberta automática da lista de produtos. Se o CRM já tiver geração de PDF, me pergunte ao final se quero incluir a proposta em PDF.
