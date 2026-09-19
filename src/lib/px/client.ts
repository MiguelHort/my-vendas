/**
 * Cliente mínimo da API tRPC do painel da PX Tecnologia (sem API pública documentada).
 * O painel chama as procedures via GET:
 *   {BASE}/{procedure}?batch=1&input={"0": <input da procedure>}
 * e a resposta vem como [{ "result": { "data": ... } }].
 *
 * Só o job de sincronização usa isto — a cotação nunca chama a PX.
 * Segurança: o cookie vem de PX_COOKIE (variável de ambiente), é equivalente a uma senha
 * e NUNCA pode aparecer em log, erro ou banco. Só a procedure do produto é permitida.
 */

export class SessaoExpirada extends Error {
  constructor() {
    super("A sessão da PX expirou ou o cookie é inválido. Atualize o PX_COOKIE.");
    this.name = "SessaoExpirada";
  }
}

const BASE_PADRAO = "https://www.painel.pxtecnologia.com/api/trpc";

// Procedures que devolvem dados pessoais ou não interessam à integração: nunca chamar.
const PROCEDURES_PROIBIDAS = ["brokerUser", "activeTenant", "notificationsPoll"];

function configuracao() {
  const base = (process.env.PX_BASE_URL || BASE_PADRAO).replace(/\/+$/, "");
  const cookie = process.env.PX_COOKIE;
  if (!cookie) throw new Error("PX_COOKIE não configurado (variável de ambiente)");
  return { base, cookie };
}

type ItemTrpc = {
  result?: { data?: unknown };
  error?: { data?: { code?: string }; json?: { data?: { code?: string } } };
};

// Lê o código de erro nos dois formatos que o tRPC usa (com e sem superjson).
function codigoDoErro(erro: ItemTrpc["error"]): string | null {
  return erro?.data?.code || erro?.json?.data?.code || null;
}

async function chamar(
  procedure: string,
  input: unknown,
  { timeoutMs = 60000 }: { timeoutMs?: number } = {}
): Promise<unknown> {
  if (!procedure) {
    throw new Error("Nome da procedure não informado (confira PX_PROC_PRODUTO)");
  }
  if (procedure.includes(",")) {
    throw new Error(
      "PX_PROC_PRODUTO deve ter UMA procedure só (a que devolve o produto completo), não a lista inteira copiada da URL do DevTools. Ex.: PX_PROC_PRODUTO=nomeDaProcedure"
    );
  }
  if (PROCEDURES_PROIBIDAS.includes(procedure)) {
    throw new Error(`Procedure "${procedure}" não é permitida nesta integração`);
  }

  const { base, cookie } = configuracao();
  const url = `${base}/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: input }))}`;

  const resposta = await fetch(url, {
    headers: { accept: "application/json", cookie },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const corpo = (await resposta.json().catch(() => null)) as ItemTrpc[] | ItemTrpc | null;
  const item = Array.isArray(corpo) ? corpo[0] : corpo;

  if (resposta.status === 401 || codigoDoErro(item?.error) === "UNAUTHORIZED") {
    throw new SessaoExpirada();
  }
  if (!resposta.ok || item?.error || !item?.result) {
    const detalhe = JSON.stringify(item?.error ?? corpo ?? null).slice(0, 300);
    throw new Error(`Chamada ${procedure} falhou (HTTP ${resposta.status}): ${detalhe}`);
  }

  // Sem superjson o dado vem em result.data; com superjson, em result.data.json.
  const dados = item.result.data;
  return dados && typeof dados === "object" && "json" in dados ? (dados as { json: unknown }).json : dados;
}

/** Baixa o produto completo (tabelas, planos e preços). É a única chamada que a integração faz à PX. */
export async function buscarProduto(id: number): Promise<unknown> {
  const procedure = process.env.PX_PROC_PRODUTO;
  if (!procedure) throw new Error("PX_PROC_PRODUTO não configurado (variável de ambiente)");
  return chamar(procedure, { id });
}
