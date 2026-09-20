'use strict';

// Exemplo de como o CRM gera uma cotação a partir do banco.
// Uso:  node --env-file=.env exemplos/cotar-no-crm.js
// Na prática, a função cotar() vira o handler de uma rota do seu CRM,
// por exemplo POST /api/leads/:id/cotacoes.

const { Pool } = require('pg');
const { carregarTabelas, salvarCotacao } = require('../src/repositorio');
const { calcularCotacao } = require('../src/cotacao');

async function cotar(db, leadId, entrada) {
  const tabelas = await carregarTabelas(db, { modalidade: entrada.modalidade ?? 'PME', vidas: entrada.idades.length });
  const { resultados } = calcularCotacao(tabelas, entrada);
  const cotacaoId = await salvarCotacao(db, { leadId, entrada, resultado: resultados });
  return { cotacaoId, resultados };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const entrada = { idades: [34, 31, 4], mei: false, modalidade: 'PME' };
    const { cotacaoId, resultados } = await cotar(pool, null, entrada);

    console.log(`Cotação ${cotacaoId} salva com ${resultados.length} opções. As 5 mais baratas:`);
    for (const r of resultados.slice(0, 5)) {
      const total = r.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      console.log(`  ${r.produto} | ${r.plano} ${r.acomodacao} | ${r.coparticipacao} | ${total}`);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = { cotar };
