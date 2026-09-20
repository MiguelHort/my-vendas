'use strict';

// Testa a conversão e o cálculo usando a resposta copiada do DevTools,
// sem precisar de banco nem de cookie.
//
// Uso:
//   node exemplos/testar-com-arquivo.js resposta.json --idades 34,31,4
//   node exemplos/testar-com-arquivo.js resposta.json --idades 40,38,12,9 --mei --acomodacao Apartamento
//
// Opções: --mei  --modalidade PME  --contratacao Compulsório  --coparticipacao Parcial
//         --acomodacao Enfermaria  --linha Selecionada  --sem-maximo  --limite 15

const fs = require('fs');
const { normalizarProduto, extrairProdutoDaResposta } = require('../src/normalizar');
const { calcularCotacao } = require('../src/cotacao');

function lerArgumentos(argv) {
  const [arquivo, ...resto] = argv;
  const args = { arquivo, flags: {} };
  for (let i = 0; i < resto.length; i++) {
    const chave = resto[i].replace(/^--/, '');
    const proximo = resto[i + 1];
    if (proximo === undefined || proximo.startsWith('--')) args.flags[chave] = true;
    else { args.flags[chave] = proximo; i++; }
  }
  return args;
}

const moeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const { arquivo, flags } = lerArgumentos(process.argv.slice(2));
if (!arquivo || !flags.idades) {
  console.log('Uso: node exemplos/testar-com-arquivo.js resposta.json --idades 34,31,4 [--mei] [--acomodacao Enfermaria]');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const normalizado = normalizarProduto(extrairProdutoDaResposta(json));
const { produto, tabelas } = normalizado;
for (const t of tabelas) { t.produto_nome = produto.nome; t.operadora = produto.operadora; }

const totalPrecos = tabelas.reduce((s, t) => s + t.planos.reduce((s2, p) => s2 + p.precos.length, 0), 0);
console.log(`\nProduto: ${produto.nome} (${produto.operadora}) | id ${produto.px_id}`);
console.log(`Tabelas: ${tabelas.length} | planos: ${normalizado.planos.length} | preços: ${totalPrecos}`);
console.log(`Hash: ${normalizado.hash.slice(0, 16)}...`);

const inconsistentes = tabelas.filter((t) => t.inconsistencias.length);
if (inconsistentes.length) {
  console.log(`\n⚠ ${inconsistentes.length} tabela(s) com dados inconsistentes na PX:`);
  for (const t of inconsistentes) {
    console.log(`  tabela ${t.px_tabela_id} (${t.linha || '-'}, ${t.coparticipacao}, ${t.contratacao}): ${t.inconsistencias.join('; ')}`);
  }
}

const entrada = {
  idades: String(flags.idades).split(',').map(Number),
  mei: Boolean(flags.mei),
  modalidade: flags.modalidade || 'PME',
  contratacao: flags.contratacao,
  coparticipacao: flags.coparticipacao,
  acomodacao: flags.acomodacao,
  linha: flags.linha,
};
const opcoes = { tabelasComVidasInvalidas: flags['sem-maximo'] ? 'tratar_como_sem_maximo' : 'excluir' };
const { resultados, excluidas } = calcularCotacao(tabelas, entrada, opcoes);

console.log(`\nCotação: idades ${entrada.idades.join(', ')} (${entrada.idades.length} vidas), ${entrada.mei ? 'MEI' : 'não MEI'}, ${entrada.modalidade}`);
console.log(`${resultados.length} opções encontradas. Mais baratas:`);
const limite = Number(flags.limite) || 15;
console.table(
  resultados.slice(0, limite).map((r) => ({
    linha: r.linha,
    plano: r.plano,
    acomodacao: r.acomodacao,
    coparticipacao: r.coparticipacao,
    contratacao: r.contratacao,
    total: moeda(r.total),
    tabela: r.referencia.px_tabela_id,
  })),
);

if (resultados[0]) {
  console.log('Detalhe da opção mais barata:');
  for (const d of resultados[0].detalhamento) console.log(`  ${d.idade} anos (faixa ${d.faixa}): ${moeda(d.valor)}`);
  console.log(`  Total: ${moeda(resultados[0].total)}`);
}

const motivos = excluidas.reduce((acc, e) => ((acc[e.motivo] = (acc[e.motivo] || 0) + 1), acc), {});
console.log('\nTabelas descartadas por motivo:');
for (const [motivo, qtd] of Object.entries(motivos).sort((a, b) => b[1] - a[1])) console.log(`  ${qtd}× ${motivo}`);
