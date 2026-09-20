'use strict';

// Leitura e gravação no PostgreSQL do CRM (driver "pg").
// Os inserts em lote usam jsonb_to_recordset: uma query por tipo de registro.

async function hashAtual(db, produtoId) {
  const { rows } = await db.query('SELECT hash_conteudo FROM px_produtos WHERE px_id = $1', [produtoId]);
  return rows[0]?.hash_conteudo ?? null;
}

// Substitui todas as tabelas de um produto numa única transação.
// Se qualquer passo falhar, nada muda no banco.
async function salvarProduto(pool, normalizado) {
  const { produto, planos, tabelas, hash } = normalizado;
  const precos = tabelas.flatMap((t) =>
    t.planos.flatMap((p) =>
      p.precos.map((f) => ({
        px_vinculo_id: t.px_vinculo_id,
        px_plano_id: p.px_plano_id,
        plano_nome: p.nome,
        acomodacao: p.acomodacao,
        plano_visivel: p.visivel,
        plano_ordem: p.ordem,
        ...f,
      })),
    ),
  );
  const tabelasSemPlanos = tabelas.map(({ planos: _ignorar, ...resto }) => resto);

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    await db.query(
      `INSERT INTO px_produtos (px_id, nome, operadora, operadora_px_id, categoria_px_id, visivel, hash_conteudo, sincronizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (px_id) DO UPDATE SET
         nome = EXCLUDED.nome, operadora = EXCLUDED.operadora, operadora_px_id = EXCLUDED.operadora_px_id,
         categoria_px_id = EXCLUDED.categoria_px_id, visivel = EXCLUDED.visivel,
         hash_conteudo = EXCLUDED.hash_conteudo, sincronizado_em = now()`,
      [produto.px_id, produto.nome, produto.operadora, produto.operadora_px_id, produto.categoria_px_id, produto.visivel, hash],
    );

    // Apaga a versão anterior (os preços saem junto, por ON DELETE CASCADE).
    await db.query('DELETE FROM px_tabelas WHERE produto_px_id = $1', [produto.px_id]);
    await db.query('DELETE FROM px_planos WHERE produto_px_id = $1', [produto.px_id]);

    await db.query(
      `INSERT INTO px_planos (produto_px_id, px_plano_id, nome, codigo_ans, acomodacao, abrangencia)
       SELECT $1, x.px_plano_id, x.nome, x.codigo_ans, x.acomodacao, x.abrangencia
       FROM jsonb_to_recordset($2::jsonb) AS x(px_plano_id int, nome text, codigo_ans text, acomodacao text, abrangencia text)`,
      [produto.px_id, JSON.stringify(planos)],
    );

    await db.query(
      `INSERT INTO px_tabelas (px_vinculo_id, px_tabela_id, produto_px_id, modalidade, linha, coparticipacao,
         coparticipacao_detalhe, contratacao, mei, obstetricia, idade_unica, vidas_min, vidas_max, idade_min, idade_max,
         desconto_percentual, administradora, entidades, vigencia_inicio, vigencia_fim, visivel, ordem, inconsistencias)
       SELECT x.px_vinculo_id, x.px_tabela_id, x.produto_px_id, x.modalidade, x.linha, x.coparticipacao,
         x.coparticipacao_detalhe, x.contratacao, x.mei, x.obstetricia, x.idade_unica, x.vidas_min, x.vidas_max,
         x.idade_min, x.idade_max, x.desconto_percentual, x.administradora, COALESCE(x.entidades, '[]'),
         x.vigencia_inicio, x.vigencia_fim, x.visivel, x.ordem, COALESCE(x.inconsistencias, '[]')
       FROM jsonb_to_recordset($1::jsonb) AS x(px_vinculo_id int, px_tabela_id int, produto_px_id int, modalidade text,
         linha text, coparticipacao text, coparticipacao_detalhe text, contratacao text, mei boolean, obstetricia boolean,
         idade_unica boolean, vidas_min int, vidas_max int, idade_min int, idade_max int, desconto_percentual numeric,
         administradora text, entidades jsonb, vigencia_inicio timestamptz, vigencia_fim timestamptz, visivel boolean,
         ordem int, inconsistencias jsonb)`,
      [JSON.stringify(tabelasSemPlanos)],
    );

    await db.query(
      `INSERT INTO px_precos (px_vinculo_id, px_plano_id, plano_nome, acomodacao, plano_visivel, plano_ordem,
         faixa_id, idade_min, idade_max, valor)
       SELECT x.px_vinculo_id, x.px_plano_id, x.plano_nome, x.acomodacao, x.plano_visivel, x.plano_ordem,
         x.faixa_id, x.idade_min, x.idade_max, x.valor
       FROM jsonb_to_recordset($1::jsonb) AS x(px_vinculo_id int, px_plano_id int, plano_nome text, acomodacao text,
         plano_visivel boolean, plano_ordem int, faixa_id int, idade_min int, idade_max int, valor numeric)`,
      [JSON.stringify(precos)],
    );

    await db.query('COMMIT');
    return { tabelas: tabelas.length, precos: precos.length };
  } catch (erro) {
    await db.query('ROLLBACK');
    throw erro;
  } finally {
    db.release();
  }
}

// Carrega as tabelas no formato que o calcularCotacao espera.
// O filtro no SQL é só uma pré-seleção; as regras finas ficam no calculador.
async function carregarTabelas(db, { modalidade = null, vidas } = {}) {
  const { rows } = await db.query(
    `SELECT t.*, pr.nome AS produto_nome, pr.operadora,
            p.px_plano_id, p.plano_nome, p.acomodacao, p.plano_visivel, p.plano_ordem,
            p.faixa_id, p.idade_min AS faixa_idade_min, p.idade_max AS faixa_idade_max, p.valor
     FROM px_tabelas t
     JOIN px_produtos pr ON pr.px_id = t.produto_px_id AND pr.visivel
     JOIN px_precos p ON p.px_vinculo_id = t.px_vinculo_id
     WHERE t.visivel
       AND ($1::text IS NULL OR t.modalidade = $1)
       AND ($2::int IS NULL OR t.vidas_min <= $2)
     ORDER BY t.produto_px_id, t.ordem, p.plano_ordem, p.faixa_id`,
    [modalidade, vidas ?? null],
  );

  const tabelas = new Map();
  for (const r of rows) {
    let t = tabelas.get(r.px_vinculo_id);
    if (!t) {
      t = {
        px_vinculo_id: r.px_vinculo_id, px_tabela_id: r.px_tabela_id, produto_px_id: r.produto_px_id,
        produto_nome: r.produto_nome, operadora: r.operadora,
        modalidade: r.modalidade, linha: r.linha, coparticipacao: r.coparticipacao,
        coparticipacao_detalhe: r.coparticipacao_detalhe, contratacao: r.contratacao,
        mei: r.mei, obstetricia: r.obstetricia, idade_unica: r.idade_unica,
        vidas_min: r.vidas_min, vidas_max: r.vidas_max, idade_min: r.idade_min, idade_max: r.idade_max,
        desconto_percentual: Number(r.desconto_percentual), administradora: r.administradora,
        entidades: r.entidades, vigencia_inicio: r.vigencia_inicio, vigencia_fim: r.vigencia_fim,
        visivel: r.visivel, planosPorId: new Map(),
      };
      tabelas.set(r.px_vinculo_id, t);
    }
    let plano = t.planosPorId.get(r.px_plano_id);
    if (!plano) {
      plano = { px_plano_id: r.px_plano_id, nome: r.plano_nome, acomodacao: r.acomodacao, visivel: r.plano_visivel, precos: [] };
      t.planosPorId.set(r.px_plano_id, plano);
    }
    plano.precos.push({ faixa_id: r.faixa_id, idade_min: r.faixa_idade_min, idade_max: r.faixa_idade_max, valor: Number(r.valor) });
  }

  return [...tabelas.values()].map(({ planosPorId, ...t }) => ({ ...t, planos: [...planosPorId.values()] }));
}

async function salvarCotacao(db, { leadId = null, entrada, resultado }) {
  const { rows } = await db.query(
    'INSERT INTO cotacoes (lead_id, entrada, resultado) VALUES ($1, $2, $3) RETURNING id',
    [leadId, JSON.stringify(entrada), JSON.stringify(resultado)],
  );
  return rows[0].id;
}

async function registrarSync(db, { iniciadoEm, status, detalhes }) {
  await db.query(
    'INSERT INTO px_sync_log (iniciado_em, finalizado_em, status, detalhes) VALUES ($1, now(), $2, $3)',
    [iniciadoEm, status, JSON.stringify(detalhes)],
  );
}

module.exports = { hashAtual, salvarProduto, carregarTabelas, salvarCotacao, registrarSync };
