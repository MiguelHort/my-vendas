'use strict';

// Calcula a cotação localmente, a partir das tabelas salvas no banco.
// Não chama a PX: recebe as tabelas (formato do normalizar.js ou do
// repositorio.carregarTabelas) e os dados do lead.
//
// entrada = {
//   idades: [34, 31, 4],            // uma idade por beneficiário (obrigatório)
//   mei: false,                     // a empresa é MEI? (PME)
//   modalidade: 'PME',              // 'PME' | 'Adesão' (opcional)
//   contratacao: 'Compulsório',     // 'Compulsório' | 'Opcional/Livre Adesão' (opcional)
//   coparticipacao: 'Parcial',      // 'Parcial' | 'Completa' (opcional)
//   acomodacao: 'Enfermaria',       // 'Enfermaria' | 'Apartamento' (opcional)
//   linha: 'Selecionada',           // 'Amil' | 'Selecionada' | 'Black' (opcional)
//   entidade: 'UNICOM',             // sigla da entidade, para Adesão (opcional)
//   data: '2026-09-19',             // data de referência da vigência (padrão: hoje)
// }
//
// opcoes = {
//   tabelasComVidasInvalidas: 'excluir' | 'tratar_como_sem_maximo'
//     Algumas tabelas da PX vêm com faixa de vidas impossível (ex.: 30 a 29).
//     'excluir' (padrão) deixa essas tabelas de fora. Se você confirmar na
//     Cotação V2 que a PX as mostra para 30+ vidas, use 'tratar_como_sem_maximo'.
// }

const INDIFERENTE = 'Indiferente';

const emCentavos = (valor) => Math.round(Number(valor) * 100);
const emReais = (centavos) => centavos / 100;

function rotuloCoparticipacao(t) {
  return [t.coparticipacao, t.coparticipacao_detalhe].filter(Boolean).join(' ') || null;
}

function validarEntrada(entrada) {
  if (!entrada || !Array.isArray(entrada.idades) || entrada.idades.length === 0) {
    throw new Error('Informe ao menos uma idade em entrada.idades');
  }
  const idades = entrada.idades.map(Number);
  if (idades.some((i) => !Number.isInteger(i) || i < 0 || i > 120)) {
    throw new Error('Todas as idades precisam ser números inteiros entre 0 e 120');
  }
  return idades;
}

// Devolve o motivo pelo qual a tabela não serve para esta cotação, ou null se ela serve.
function motivoDeExclusao(t, entrada, idades, data, opcoes) {
  const vidas = idades.length;

  if (!t.visivel) return 'tabela oculta na PX';
  if (t.vigencia_inicio && new Date(t.vigencia_inicio) > data) return 'tabela ainda não vigente';
  if (t.vigencia_fim && new Date(t.vigencia_fim) < data) return 'tabela vencida';
  if (t.idade_unica) return 'tabela de idade única (regra ainda não implementada)';
  if (entrada.modalidade && t.modalidade !== entrada.modalidade) return `modalidade ${t.modalidade}`;

  if (t.vidas_max < t.vidas_min) {
    if (opcoes.tabelasComVidasInvalidas !== 'tratar_como_sem_maximo') {
      return `faixa de vidas inválida na PX (${t.vidas_min} a ${t.vidas_max})`;
    }
    if (vidas < t.vidas_min) return `aceita a partir de ${t.vidas_min} vidas`;
  } else if (vidas < t.vidas_min || vidas > t.vidas_max) {
    return `aceita de ${t.vidas_min} a ${t.vidas_max} vidas`;
  }

  if (idades.some((i) => i < t.idade_min || i > t.idade_max)) {
    return `aceita idades de ${t.idade_min} a ${t.idade_max}`;
  }

  // Na PX, tabelas MEI e não-MEI têm preços diferentes: cada empresa usa a sua.
  if (t.modalidade === 'PME' && t.mei !== Boolean(entrada.mei)) {
    return t.mei ? 'tabela exclusiva para MEI' : 'tabela não aceita MEI';
  }

  if (entrada.contratacao && t.contratacao && t.contratacao !== INDIFERENTE && t.contratacao !== entrada.contratacao) {
    return `contratação ${t.contratacao}`;
  }
  if (entrada.coparticipacao && t.coparticipacao !== entrada.coparticipacao) return `coparticipação ${t.coparticipacao}`;
  if (entrada.linha && t.linha !== entrada.linha) return `linha ${t.linha}`;
  if (entrada.obstetricia !== undefined && t.obstetricia !== Boolean(entrada.obstetricia)) {
    return t.obstetricia ? 'com obstetrícia' : 'sem obstetrícia';
  }
  if (entrada.entidade && t.entidades?.length && !t.entidades.some((e) => e.sigla === entrada.entidade)) {
    return 'entidade de classe diferente';
  }
  return null;
}

function calcularPlano(plano, idades) {
  const detalhamento = [];
  for (const idade of idades) {
    const faixa = plano.precos.find((p) => idade >= p.idade_min && idade <= p.idade_max);
    if (!faixa) return null;
    detalhamento.push({
      idade,
      faixa: faixa.idade_max >= 100 ? `${faixa.idade_min}+` : `${faixa.idade_min} a ${faixa.idade_max}`,
      valor: Number(faixa.valor),
    });
  }
  return detalhamento;
}

function calcularCotacao(tabelas, entrada, opcoes = {}) {
  const idades = validarEntrada(entrada);
  const data = entrada.data ? new Date(entrada.data) : new Date();
  const resultados = [];
  const excluidas = [];

  for (const t of tabelas) {
    const motivo = motivoDeExclusao(t, entrada, idades, data, opcoes);
    if (motivo) {
      excluidas.push({ px_vinculo_id: t.px_vinculo_id, linha: t.linha, motivo });
      continue;
    }

    for (const plano of t.planos) {
      if (!plano.visivel) continue;
      if (entrada.acomodacao && plano.acomodacao !== entrada.acomodacao) continue;

      const detalhamento = calcularPlano(plano, idades);
      if (!detalhamento) {
        excluidas.push({ px_vinculo_id: t.px_vinculo_id, linha: t.linha, motivo: `${plano.nome}: idade sem faixa de preço` });
        continue;
      }

      const subtotal = detalhamento.reduce((soma, d) => soma + emCentavos(d.valor), 0);
      const desconto = Math.round(subtotal * (Number(t.desconto_percentual) || 0) / 100);

      resultados.push({
        produto: t.produto_nome ?? null,
        operadora: t.operadora ?? null,
        linha: t.linha,
        plano: plano.nome,
        acomodacao: plano.acomodacao,
        coparticipacao: rotuloCoparticipacao(t),
        contratacao: t.contratacao,
        modalidade: t.modalidade,
        mei: t.mei,
        vidas: idades.length,
        subtotal: emReais(subtotal),
        desconto: emReais(desconto),
        total: emReais(subtotal - desconto),
        detalhamento,
        referencia: { px_vinculo_id: t.px_vinculo_id, px_tabela_id: t.px_tabela_id, px_plano_id: plano.px_plano_id },
      });
    }
  }

  resultados.sort((a, b) => a.total - b.total);
  return { vidas: idades.length, resultados, excluidas };
}

module.exports = { calcularCotacao, motivoDeExclusao };
