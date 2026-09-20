'use strict';

// Cliente mínimo para a API tRPC do painel da PX.
// O painel chama as procedures via GET, no formato:
//   {BASE}/{procedure}?batch=1&input={"0": <input da procedure>}
// e a resposta vem como [{ "result": { "data": ... } }].

class SessaoExpirada extends Error {
  constructor() {
    super('A sessão da PX expirou ou o cookie é inválido. Atualize o PX_COOKIE.');
    this.name = 'SessaoExpirada';
  }
}

function configuracao() {
  const base = (process.env.PX_BASE_URL || 'https://www.painel.pxtecnologia.com/api/trpc').replace(/\/+$/, '');
  const cookie = process.env.PX_COOKIE;
  if (!cookie) throw new Error('Defina PX_COOKIE no .env');
  return { base, cookie };
}

// Lê o código de erro nos dois formatos que o tRPC usa (com e sem superjson).
function codigoDoErro(erro) {
  return erro?.data?.code || erro?.json?.data?.code || null;
}

async function chamar(procedure, input, { timeoutMs = 60000 } = {}) {
  if (!procedure) throw new Error('Nome da procedure não informado (confira PX_PROC_PRODUTO no .env)');
  const { base, cookie } = configuracao();

  const url = `${base}/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: input }))}`;
  const resposta = await fetch(url, {
    headers: { accept: 'application/json', cookie },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const corpo = await resposta.json().catch(() => null);
  const item = Array.isArray(corpo) ? corpo[0] : corpo;

  if (resposta.status === 401 || codigoDoErro(item?.error) === 'UNAUTHORIZED') {
    throw new SessaoExpirada();
  }
  if (!resposta.ok || item?.error || !item?.result) {
    const detalhe = JSON.stringify(item?.error ?? corpo ?? null).slice(0, 300);
    throw new Error(`Chamada ${procedure} falhou (HTTP ${resposta.status}): ${detalhe}`);
  }

  // Sem superjson o dado vem em result.data; com superjson, em result.data.json.
  const dados = item.result.data;
  return dados && typeof dados === 'object' && 'json' in dados ? dados.json : dados;
}

module.exports = { chamar, SessaoExpirada };
