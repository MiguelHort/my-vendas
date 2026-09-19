This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Integração PX Tecnologia: tabelas de preço e cotação

O sistema guarda as tabelas de preço de planos de saúde do painel da PX Tecnologia e calcula as
cotações **localmente**. A PX não tem API pública; o painel usa uma API interna (tRPC) que a
integração consome com o cookie de sessão de um usuário logado.

- **Sincronização (manual):** baixa cada produto da PX (`PX_PRODUTOS`), valida a estrutura, compara o
  hash do conteúdo e, se mudou, substitui o produto inteiro numa transação. Sem alertas: o resultado
  de cada execução fica em `px_sync_log` e aparece na aba *Sincronização*.
- **Cotação:** calculada só com as tabelas salvas — a PX **nunca** é chamada na hora de cotar. Cada
  cotação salva guarda uma **cópia dos preços** usados, então não muda quando a operadora reajusta.
- **Tela:** menu **Cotação** (`/dashboard/cotacao`), com as abas *Cotar*, *Cotações salvas* e
  *Sincronização*. O card do lead tem um atalho (ícone de calculadora) que abre a cotação já com o lead
  selecionado. Qualquer usuário autenticado pode cotar e sincronizar.

### Variáveis de ambiente

Veja o [.env.example](.env.example). Todas ficam só em variável de ambiente (no `.env` local e nas
variáveis do deploy):

| Variável | Para quê |
|---|---|
| `PX_COOKIE` | Header `cookie` de uma sessão logada na PX. **É equivalente a uma senha.** |
| `PX_PROC_PRODUTO` | Nome da procedure tRPC que devolve o produto completo. |
| `PX_BASE_URL` | Base da API tRPC (padrão `https://www.painel.pxtecnologia.com/api/trpc`). |
| `PX_PRODUTOS` | IDs dos produtos a sincronizar, separados por vírgula (Amil SC = `12`). |
| `PX_INTERVALO_MS` | Pausa entre produtos (padrão 2000). |
| `PX_TABELAS_VIDAS_INVALIDAS` | `excluir` (padrão) ou `tratar_como_sem_maximo` (ver regras abaixo). |

### Como obter `PX_COOKIE` e `PX_PROC_PRODUTO` (DevTools)

1. Entre no painel da PX no Chrome e abra a página de um produto (ex.: Amil SC).
2. Abra o DevTools (F12) → aba **Network** e recarregue a página.
3. Ache a requisição grande cuja URL começa com `activeTenant,brokerUser,...` e clique nela.
4. Em **Headers → Request URL**, os nomes entre `/trpc/` e `?batch` são as procedures, separadas por
   vírgula. A **6ª** é a que devolve o produto completo → `PX_PROC_PRODUTO`. O que vem antes da lista é
   a `PX_BASE_URL`.
5. Em **Request Headers**, copie o valor inteiro do header `cookie` → `PX_COOKIE`.
6. O ID do produto aparece no input da requisição (`{"id":12}`) → `PX_PRODUTOS`.

A integração chama **somente** a procedure do produto. `brokerUser` (dados pessoais do corretor),
`activeTenant` e `notificationsPoll` são recusadas pelo cliente.

### Banco de dados

As migrations são SQL escrito à mão e **aplicadas manualmente** no Supabase (SQL Editor):

1. `prisma/migrations/20260919030000_add_px_cotacao/migration.sql`: cria `px_produtos`, `px_planos`,
   `px_tabelas`, `px_precos`, `px_sync_log` e `cotacoes` (valores em `NUMERIC`). Para reverter, rode o
   `rollback.sql` da mesma pasta.
2. `prisma/migrations/20260919030100_drop_cotacao_schema/migration.sql`: descarta o schema `cotacao`
   antigo (vazio e sem uso). **Destrutivo** — rode só depois de conferir que ele continua vazio.

### Rodar a sincronização

- **Pela tela:** *Cotação → Sincronização → Sincronizar agora*.
- **Pelo terminal:** `npm run px:sync` (usa o `.env`; sai com código 1 se houver erro).

Se uma execução já estiver em andamento, a segunda é recusada. Um produto com erro (formato quebrado,
falha de rede) não impede os outros e **nunca altera o que já estava salvo dele**. Sessão expirada
interrompe a execução inteira.

### Renovar o cookie quando expirar

Quando a sincronização mostrar *"A sessão da PX expirou ou o cookie é inválido"*: entre de novo no
painel da PX, copie o header `cookie` como no passo 5 acima, atualize `PX_COOKIE` (no `.env` e nas
variáveis do deploy) e sincronize de novo. Não há login automático e a senha da PX não é guardada.

### Regras de negócio da cotação

Uma tabela só entra na cotação se **todas** estas condições valem:

1. Tabela, vínculo e produto visíveis.
2. Data da cotação dentro da vigência (interseção da vigência da tabela com a do vínculo).
3. Não é tabela de idade única (regra ainda não confirmada; nenhuma usa isso hoje).
4. Modalidade (PME / Adesão) bate, quando informada.
5. `vidas_min ≤ vidas ≤ vidas_max`. Tabelas com faixa impossível na PX (ex.: 30 a 29) são **excluídas**
   por padrão; com `PX_TABELAS_VIDAS_INVALIDAS=tratar_como_sem_maximo` passam a exigir só `vidas ≥ mínimo`.
6. Todas as idades dentro do limite de idade da tabela.
7. **MEI** (só em PME): empresa MEI usa só tabelas MEI e empresa comum só as não-MEI (os preços são diferentes).
8. Contratação: passa se for do mesmo tipo, "Indiferente" ou vazia.
9. Coparticipação, linha e obstetrícia: igualdade exata, quando o filtro é informado.
10. Entidade de classe (Adesão): a sigla precisa constar na lista da tabela.

O total é a soma dos preços da faixa etária de cada beneficiário, **em centavos inteiros** (nunca
`float`), menos o desconto da tabela. "Completa" e "Completa 40%" são opções diferentes. O resultado
vem ordenado do menor para o maior total e a tela mostra por que cada tabela foi descartada.

**Pontos a confirmar com a PX (Cotação V2):**

- Se a PX mostra as tabelas com faixa "30 a 29 vidas" para 30 vidas ou mais (define o valor padrão de
  `PX_TABELAS_VIDAS_INVALIDAS`).
- Regra das tabelas de idade única (hoje são ignoradas).
- Se a lista de produtos a sincronizar (`PX_PRODUTOS`) está completa (não há descoberta automática).

### Testes

`npm test` roda tudo, incluindo `src/lib/px/__tests__` (normalização e hash com a fixture real do Amil
SC, cliente HTTP, sincronização com a PX simulada, cálculo dos 7 casos de referência e serviço).
A fixture não contém dados pessoais.
