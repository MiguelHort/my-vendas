'use strict';

// Testes de referência. Rode com:  npm test
// Usam a fixture com os dados reais do Amil SC (sem dados pessoais).
// Os valores esperados foram conferidos manualmente contra o JSON da PX.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { normalizarProduto, extrairProdutoDaResposta, FormatoInesperado } = require('../src/normalizar');
const { calcularCotacao } = require('../src/cotacao');

const bruto = JSON.parse(fs.readFileSync(path.join(__dirname, '../exemplos/fixture-amil-sc.json'), 'utf8'));
const produto = extrairProdutoDaResposta(bruto);
const { tabelas, planos, hash } = normalizarProduto(produto);
const idades35 = Array.from({ length: 35 }, (_, i) => 20 + i); // 20 a 54 anos

test('normaliza o Amil SC completo', () => {
  assert.equal(tabelas.length, 60);
  assert.equal(planos.length, 24);
  const precos = tabelas.reduce((s, t) => s + t.planos.reduce((s2, p) => s2 + p.precos.length, 0), 0);
  assert.equal(precos, 4260);
  const inconsistentes = tabelas.filter((t) => t.inconsistencias.length).map((t) => t.px_tabela_id).sort((a, b) => a - b);
  assert.deepEqual(inconsistentes, [434, 5245, 5253, 5269, 8261, 8262]);
});

test('hash é estável para o mesmo conteúdo', () => {
  assert.equal(normalizarProduto(produto).hash, hash);
  assert.equal(hash, 'bb35ee5086f40638562bf4263481d31ac2a82bb6e28e6d76cc45136c66ee87a2');
});

test('rejeita resposta com formato inesperado', () => {
  assert.throws(() => normalizarProduto({ id: 12 }), FormatoInesperado);
  const semPreco = structuredClone(produto);
  semPreco.tableBinds[0].plans[0].agePrices[0].price = null;
  assert.throws(() => normalizarProduto(semPreco), FormatoInesperado);
});

test('3 vidas (34, 31, 4), empresa não MEI', () => {
  const { resultados } = calcularCotacao(tabelas, { idades: [34, 31, 4], mei: false, modalidade: 'PME' });
  assert.equal(resultados.length, 61);
  const [maisBarata] = resultados;
  assert.equal(maisBarata.plano, 'Amil Prata');
  assert.equal(maisBarata.acomodacao, 'Enfermaria');
  assert.equal(maisBarata.coparticipacao, 'Completa 40%');
  assert.equal(maisBarata.referencia.px_tabela_id, 5256);
  assert.equal(maisBarata.total, 1070.01);
  assert.deepEqual(maisBarata.detalhamento.map((d) => d.valor), [426.57, 406.26, 237.18]);
  assert.equal(resultados.at(-1).total, 9333.28);
});

test('4 vidas (45, 42, 17, 15), empresa MEI usa só tabelas MEI', () => {
  const { resultados } = calcularCotacao(tabelas, { idades: [45, 42, 17, 15], mei: true, modalidade: 'PME' });
  assert.equal(resultados.length, 39);
  assert.ok(resultados.every((r) => r.mei === true));
  assert.equal(resultados[0].total, 1828.59);
  assert.equal(resultados[0].referencia.px_tabela_id, 5257);
});

test('35 vidas em livre adesão exclui tabelas com faixa de vidas inválida', () => {
  const { resultados } = calcularCotacao(tabelas, { idades: idades35, mei: false, modalidade: 'PME', contratacao: 'Opcional/Livre Adesão' });
  assert.equal(resultados.length, 13);
  assert.equal(resultados[0].total, 16982.93);
  assert.equal(resultados[0].referencia.px_tabela_id, 5261);
});

test('35 vidas em livre adesão com tratar_como_sem_maximo', () => {
  const { resultados } = calcularCotacao(
    tabelas,
    { idades: idades35, mei: false, modalidade: 'PME', contratacao: 'Opcional/Livre Adesão' },
    { tabelasComVidasInvalidas: 'tratar_como_sem_maximo' },
  );
  assert.equal(resultados.length, 55);
});

test('35 vidas, compulsório, coparticipação parcial, linha Black', () => {
  const entrada = { idades: idades35, mei: false, modalidade: 'PME', contratacao: 'Compulsório', coparticipacao: 'Parcial', linha: 'Black' };
  const { resultados } = calcularCotacao(tabelas, entrada);
  assert.equal(resultados.length, 11);
  assert.equal(resultados[0].plano, 'Black I R1');
  assert.equal(resultados[0].total, 52184.37);
});

test('2 vidas (60, 58), apartamento, linha Selecionada', () => {
  const entrada = { idades: [60, 58], mei: false, modalidade: 'PME', acomodacao: 'Apartamento', linha: 'Selecionada' };
  const { resultados } = calcularCotacao(tabelas, entrada);
  assert.equal(resultados.length, 15);
  assert.ok(resultados.every((r) => r.acomodacao === 'Apartamento'));
  assert.equal(resultados[0].total, 2739.91);
});

test('Adesão, 1 vida de 40 anos', () => {
  const { resultados } = calcularCotacao(tabelas, { idades: [40], modalidade: 'Adesão' });
  assert.equal(resultados.length, 4);
  assert.equal(resultados[0].total, 779.89);
});

test('valida as idades informadas', () => {
  assert.throws(() => calcularCotacao(tabelas, { idades: [] }));
  assert.throws(() => calcularCotacao(tabelas, { idades: [30, -1] }));
  assert.throws(() => calcularCotacao(tabelas, { idades: [30, 'abc'] }));
});
