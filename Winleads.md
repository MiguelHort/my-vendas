# WinLeads

> **Aviso pra quem for editar o código (humano ou IA):** este arquivo é o resumo
> vivo do sistema. Sempre que uma mudança alterar o que está descrito aqui —
> uma tela nova, uma etapa do quiz, um campo de configuração, um cálculo — este
> arquivo deve ser atualizado junto, na mesma tarefa. Não precisa reescrever
> tudo: só a seção afetada.

## O que é

WinLeads é o CRM interno de uma corretora de planos de saúde. Ele existe pra
resolver um problema específico: o primeiro contato do cliente quase sempre
vem pelo WhatsApp (orgânico ou por anúncio), e esse lead precisa ser
qualificado, atendido rápido e acompanhado até virar venda — sem se perder em
conversas soltas no WhatsApp normal.

O sistema junta em um só lugar:

- **Um inbox de WhatsApp oficial** (Cloud API da Meta), com histórico, mídia,
  áudio transcrito e um **quiz automático** que qualifica o lead antes mesmo
  de um corretor abrir a conversa.
- **Um funil de vendas (kanban)** que acompanha o lead da entrada até a venda
  (ou até ser dispensado).
- **Cotação de planos de saúde** calculada localmente a partir das tabelas de
  preço da operadora PX Tecnologia.
- **Métricas, calendário, financeiro e mapa** pra dar visibilidade do negócio
  além do dia a dia de atendimento.

## Para quem é

Equipe de vendas de uma corretora (corretores = `VENDEDOR`, gestão =
`ADMIN`). Login por conta Google (Firebase Auth); cadastro novo fica
`aguardando aprovação` até um admin liberar.

## Stack técnica (resumo)

- **Next.js (App Router) + TypeScript**, tudo em `src/app`. Páginas do CRM
  ficam em `src/app/(protected)/dashboard/*` (exigem login); rotas de API em
  `src/app/api/*`.
- **Banco:** Postgres via Prisma (schema em `prisma/schema/schema.prisma`,
  migrations em `prisma/migrations`).
- **Auth:** Firebase Authentication (Google) — o front usa o SDK do Firebase,
  as rotas de API validam o token e cruzam com a tabela `users` (`role`,
  `approved`).
- **WhatsApp:** Cloud API oficial da Meta (não é biblioteca terceira) —
  `src/lib/whatsapp.ts` e o webhook em `src/app/api/whatsapp/webhook`.
- **UI:** Tailwind + shadcn/ui (Radix), gráficos com Recharts, mapa com
  `react-simple-maps`/`d3-geo`.
- **IA:** Google Gemini — usado no assistente **Will** e na transcrição de
  áudios do WhatsApp.

## Menu lateral (grupos)

O menu (`src/components/Layout.tsx`) é dividido por função, não por ordem de
criação da tela:

- **Visão Geral** — telas de número/relatório, nada se edita aqui: Dashboard,
  Métricas, Anúncios, Mapa.
- **Operação** — o trabalho do dia a dia com lead e conversa: Funil,
  Conversas, Calendário, Demandas, Etiquetas.
- **Vendas** — cotar e registrar o fechamento: Cotação, Minhas Vendas.
- **Assistentes (Will)** — Chat.
- **Admin** (só aparece pra quem é `ADMIN`) — Painel Admin, Financeiro.

Configurações e Sair da conta ficam no menu do usuário (rodapé da sidebar),
não num grupo de página.

## Funcionalidades

### Funil de leads (`/dashboard/funil`)
Kanban com as colunas Backlog, Triagem, Cotação, Avaliando, Fechamento,
Concluído, Retornar Futuramente e Dispensado. Cada card tem telefone, origem,
localização, operadora ofertada, valor e um atalho direto pro WhatsApp da
conversa (abre em `/dashboard/conversas`, e se não existir conversa ainda,
já deixa pronto pra iniciar uma). Mover um lead pra "Dispensado" pede o
motivo e some com a conversa dele do inbox; "Retornar Futuramente" agenda
uma data que aparece no Calendário.

### Conversas — inbox do WhatsApp (`/dashboard/conversas`)
Uma tela de chat (estilo WhatsApp Web) ligada à Cloud API oficial: texto,
áudio (com player e transcrição automática via Gemini), imagem, documento,
figurinha, reações e respostas de botão. Cada conversa tem:
- **Etiquetas** (livres, cadastradas em `/dashboard/etiquetas`) e uma
  etiqueta fixa de **follow-up** (contador que só aumenta, nunca reseta).
- **Observações internas** (texto livre, visível só pra equipe).
- Um menu com **Dispensar** (mesmo efeito de mover o lead pra "Dispensado" no
  funil), **Excluir conversa** e acesso às **respostas do quiz**.
- Envio de **Message Template** aprovado — obrigatório pela Meta quando já
  passou mais de 24h da última mensagem do contato, ou pra falar com quem
  nunca mandou mensagem.
- Preferência por usuário (em Configurações → Minha conta) de marcar (ou não)
  uma conversa como lida automaticamente ao abrir.

### Quiz automático de qualificação
Disparado sozinho na primeira mensagem de um contato novo no WhatsApp (antes
de qualquer corretor entrar). Pergunta, nessa ordem: canal de atendimento
preferido (mensagem ou ligação) → motivo da busca → (se for troca de plano)
o que espera de melhor → quantidade de pessoas → idades → CNPJ → tipo de
cobertura → cidade. É todo orientado a dados
(`src/lib/quiz/definition.ts` — editar textos/ramos é só editar esse
arquivo); as respostas alimentam o cadastro do lead (qtd. de vidas, idades,
CNPJ, cidade) e ficam visíveis no modal "Respostas do quiz" da conversa. Se
um atendente humano manda mensagem, o quiz é interrompido automaticamente.

### Cotação de planos (`/dashboard/cotacao`)
Guarda as tabelas de preço da PX Tecnologia (sincronização manual, sem API
pública — usa o painel interno da PX) e calcula cotações **localmente**, sem
chamar a PX na hora de cotar. Cada cotação salva guarda uma cópia dos preços
usados (não muda se a operadora reajustar depois). Dá pra cotar a partir de
um lead ou de dentro de uma conversa do WhatsApp, e mandar a proposta como
imagem direto pelo chat. Detalhes técnicos em `docs/integracao-px/`.

### Métricas (`/dashboard/metricas`)
Painel com dados de leads e conversas pra embasar decisão de atendimento e
de criativo/estratégia de anúncio: horário e dia da semana em que mais
chegam conversas novas, funil de leads, evolução no período, origem dos
leads, motivo de dispensa mais comum, volume de mensagens (equipe x
contato), taxa de conclusão do quiz automático e top-10 estados.

### Calendário (`/dashboard/calendario`)
Junta, num só calendário mensal, as tarefas com prazo (de Demandas) e os
leads agendados pra "Retornar Futuramente" (do funil), com destaque pros
atrasados.

### Demandas (`/dashboard/demandas`)
Kanban interno estilo Jira pra tarefas entre a equipe (A Fazer / Em
Andamento / Concluído), com prioridade, responsável e prazo.

### Financeiro (`/dashboard/financeiro`)
Lançamentos de entrada (vendas) e despesa eventual, mais custos fixos
recorrentes (com dia de vencimento e período de vigência) — visão de
caixa da operação.

### Anúncios (`/dashboard/anuncios`)
Performance de campanhas do Meta Ads (Facebook/Instagram) puxada direto da
API da Meta — gasto, nível de campanha/conjunto/anúncio, série diária e
quantas conversas cada anúncio gerou.

### Mapa de estados (`/dashboard/mapa-estados`)
Mapa do Brasil colorido pela concentração de leads/vendas por estado.

### Minhas Vendas (`/dashboard/minhas-vendas`)
Histórico de vendas do corretor logado, com edição dos dados de fechamento
(idades, operadora, valor, data).

### Novo Lead (`/dashboard/novo-lead`)
Cadastro manual de lead (pra quando a entrada não veio pelo WhatsApp).

### Will — assistente de IA (`/dashboard/will`)
Chat (texto e voz) com acesso aos dados reais da equipe — leads, etiquetas,
estado da conversa, resultado do quiz e a transcrição da conversa — pra
responder perguntas tipo "quantas vendas tivemos" ou "por que o lead X foi
dispensado". Roda no Gemini.

### Configurações (`/dashboard/configuracoes`)
- **Comissões:** percentual por operadora × modalidade (só admin edita).
- **Minha conta:** nome, exportar meus dados (LGPD), excluir conta, e a
  preferência de marcar conversa como lida ao abrir.

### Admin (`/dashboard/admin`)
Aprovação de cadastro novo e gestão de papel (`ADMIN`/`VENDEDOR`) de cada
usuário — só admin acessa.

### Dashboard inicial (`/dashboard`)
Visão geral: leads abordados, vendas fechadas, taxa de qualificação/fechamento,
série de vendas, retornos pendentes (leads sem contato há +24h) e top estados.

## Como os dados se conectam

- **Lead × Conversa do WhatsApp:** não tem chave estrangeira — o vínculo é
  pelo telefone (últimos 8 dígitos, ignorando o "9" a mais/a menos e o DDI),
  em `src/lib/leadMatch.ts`. Todo contato novo no WhatsApp vira lead
  automaticamente (status "Triagem").
- **Janela de 24h da Meta:** fora dela só dá pra mandar Message Template
  aprovado — regra da plataforma, tratada em `src/lib/whatsapp.ts` /
  `whatsappErrors.ts`.
- **LGPD:** as respostas do quiz e o conteúdo das conversas contam como dado
  sensível (saúde) — nunca vão pra log; só quem já tem acesso ao inbox lê.

## Mapa rápido de pastas

```
src/app/(protected)/dashboard/   páginas do CRM (uma pasta por tela)
src/app/api/                     rotas de API (uma pasta por recurso)
src/lib/quiz/                    motor do quiz de qualificação (orientado a dados)
src/lib/whatsapp.ts              cliente da Cloud API da Meta
src/lib/px/                      sincronização e cálculo de cotação (PX Tecnologia)
src/lib/leadMatch.ts             casamento lead × conversa por telefone
src/components/                  componentes de UI compartilhados
prisma/schema/schema.prisma      schema do banco
prisma/migrations/               migrations
docs/integracao-px/              detalhes técnicos da integração com a PX
```
