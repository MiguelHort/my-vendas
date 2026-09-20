'use strict';

// Job de sincronização. Rode com:  npm run sync
// Agende no cron, por exemplo todo dia às 3h:
//   0 3 * * * cd /caminho/px-sync && node --env-file=.env src/sync.js >> sync.log 2>&1

const { Pool } = require('pg');
const px = require('./pxClient');
const { normalizarProduto } = require('./normalizar');
const repo = require('./repositorio');

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function idsDosProdutos() {
  const ids = (process.env.PX_PRODUTOS || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) throw new Error('Defina PX_PRODUTOS no .env (ex.: PX_PRODUTOS=12,15,20)');
  return ids;
}

async function alertar(texto) {
  console.error(`[ALERTA] ${texto}`);
  const url = process.env.ALERTA_WEBHOOK_URL;
  if (!url) return;
  try {
    // "text" funciona no Slack e no n8n; "content" no Discord.
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: texto, content: texto }),
    });
  } catch (erro) {
    console.error('Não foi possível enviar o alerta:', erro.message);
  }
}

async function sincronizarProduto(pool, produtoId) {
  const bruto = await px.chamar(process.env.PX_PROC_PRODUTO, { id: produtoId });
  const normalizado = normalizarProduto(bruto); // lança erro se o formato mudou

  if ((await repo.hashAtual(pool, produtoId)) === normalizado.hash) {
    return { produto: produtoId, nome: normalizado.produto.nome, status: 'sem mudanças' };
  }

  const gravado = await repo.salvarProduto(pool, normalizado);
  const inconsistencias = normalizado.tabelas.flatMap((t) =>
    t.inconsistencias.map((i) => `tabela ${t.px_tabela_id}: ${i}`),
  );
  return { produto: produtoId, nome: normalizado.produto.nome, status: 'atualizado', ...gravado, inconsistencias };
}

async function main() {
  const iniciadoEm = new Date();
  const intervalo = Number(process.env.PX_INTERVALO_MS) || 2000;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const relatorio = [];

  try {
    const ids = idsDosProdutos();
    for (const [i, id] of ids.entries()) {
      try {
        relatorio.push(await sincronizarProduto(pool, id));
      } catch (erro) {
        relatorio.push({ produto: id, status: 'erro', erro: erro.message });
        if (erro instanceof px.SessaoExpirada) break; // sem sessão, os próximos falhariam também
      }
      if (i < ids.length - 1) await esperar(intervalo);
    }
  } catch (erro) {
    relatorio.push({ produto: null, status: 'erro', erro: erro.message });
  }

  const erros = relatorio.filter((r) => r.status === 'erro');
  const comInconsistencias = relatorio.filter((r) => r.inconsistencias?.length);

  try {
    await repo.registrarSync(pool, { iniciadoEm, status: erros.length ? 'com_erros' : 'ok', detalhes: relatorio });
  } catch (erro) {
    console.error('Não foi possível gravar o log da sincronização:', erro.message);
  }

  console.table(relatorio.map(({ inconsistencias, ...r }) => ({ ...r, inconsistencias: inconsistencias?.length ?? 0 })));

  if (erros.length) {
    await alertar(`Sincronização PX com ${erros.length} erro(s):\n` + erros.map((e) => `• produto ${e.produto}: ${e.erro}`).join('\n'));
  }
  if (comInconsistencias.length) {
    await alertar(
      'Tabelas da PX com dados inconsistentes (revise na Cotação V2):\n' +
        comInconsistencias.flatMap((r) => r.inconsistencias.map((i) => `• ${r.nome}: ${i}`)).join('\n'),
    );
  }

  await pool.end();
  process.exitCode = erros.length ? 1 : 0;
}

if (require.main === module) main();

module.exports = { sincronizarProduto };
