import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authServer";
import { NECESSIDADE_PRINCIPAL_LABEL } from "@/lib/quiz/definition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Métricas de leads e conversas do WhatsApp — pra ajudar a melhorar o
 * atendimento, os criativos dos anúncios e a estratégia (não é sobre
 * performance de campanha, isso já existe em /dashboard/anuncios via API da
 * Meta; aqui é só o que a gente registrou no nosso banco).
 *
 * Tudo é agregado aqui no servidor (contagens, médias, buckets por hora/dia)
 * — o cliente só recebe números prontos pra desenhar os gráficos, nunca a
 * lista crua de leads/conversas (que carrega dado de saúde e telefone).
 */

const TIMEZONE = "America/Sao_Paulo";
// Mesma ordem/cor das colunas do funil (dashboard/funil/page.tsx) — duplicado
// de propósito: esse arquivo roda no servidor, aquele é "use client".
const STATUS_ORDER: { status: string; color: string }[] = [
  { status: "Backlog", color: "#94a3b8" },
  { status: "Triagem", color: "#6366f1" },
  { status: "Cotação", color: "#3b82f6" },
  { status: "Avaliando", color: "#eab308" },
  { status: "Fechamento", color: "#8b5cf6" },
  { status: "Concluído", color: "#22c55e" },
  { status: "Retornar", color: "#f59e0b" },
  { status: "Dispensado", color: "#6b7280" },
];
const WEEKDAY_ORDER_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Hora local (0-23) na TZ do negócio — nunca a hora do servidor (Vercel roda em UTC). */
function localHour(date: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(date);
  return Number(s) % 24; // meia-noite pode vir como "24" em algumas ICU
}

/** Dia da semana local (0=Dom..6=Sáb) na TZ do negócio. */
function localWeekday(date: Date): number {
  const s = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" }).format(date);
  const idx = WEEKDAY_ORDER_EN.indexOf(s);
  return idx === -1 ? date.getUTCDay() : idx;
}

/** Chave "AAAA-MM-DD" local, pra agrupar série diária sem cortar o dia errado por causa do UTC. */
function localDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type Bucket = { key: string; count: number };

function countBy<T>(items: T[], keyFn: (item: T) => string | null): Bucket[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    if (k === null) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Mantém as `n` maiores e agrupa o resto em "Outros" — evita gráfico com cauda longa ilegível. */
function topNWithOther(rows: Bucket[], n: number): Bucket[] {
  if (rows.length <= n) return rows;
  const top = rows.slice(0, n);
  const restCount = rows.slice(n).reduce((sum, r) => sum + r.count, 0);
  return [...top, { key: "Outros", count: restCount }];
}

function seriePorDia(dates: Date[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const d of dates) {
    const k = localDateKey(d);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

function parseDays(raw: string | null): number | null {
  if (!raw || raw === "all") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const days = parseDays(searchParams.get("days"));
  const cutoff = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const [leads, conversations, messages, quizStates] = await Promise.all([
    prisma.lead.findMany({
      where: cutoff ? { dataEntrada: { gte: cutoff } } : {},
      select: {
        dataEntrada: true,
        status: true,
        origem: true,
        estado: true,
        motivoDispensa: true,
        lastChamadoAt: true,
      },
    }),
    prisma.whatsAppConversation.findMany({
      where: cutoff ? { createdAt: { gte: cutoff } } : {},
      select: { createdAt: true, adSourceId: true },
    }),
    prisma.whatsAppMessage.findMany({
      where: cutoff ? { timestamp: { gte: cutoff } } : {},
      select: { timestamp: true, direction: true },
    }),
    prisma.whatsAppQuizState.findMany({
      where: cutoff ? { startedAt: { gte: cutoff } } : {},
      select: { status: true, necessidadePrincipal: true },
    }),
  ]);

  // ---------- Leads ----------
  const concluidos = leads.filter((l) => l.status === "Concluído").length;

  const temposPrimeiroContato = leads
    .filter((l) => l.lastChamadoAt)
    .map((l) => (l.lastChamadoAt!.getTime() - l.dataEntrada.getTime()) / 3_600_000)
    .filter((horas) => horas >= 0); // guarda contra dado inconsistente (chamado "antes" de entrar)

  const statusCounts = new Map(leads.map((l) => [l.status, 0]));
  for (const l of leads) statusCounts.set(l.status, (statusCounts.get(l.status) ?? 0) + 1);
  const porStatus = [
    ...STATUS_ORDER.filter((s) => statusCounts.has(s.status)).map((s) => ({
      status: s.status,
      count: statusCounts.get(s.status)!,
      color: s.color,
    })),
    // status que não está na lista fixa (cadastro manual antigo, etc.) — mostra mesmo assim
    ...[...statusCounts.keys()]
      .filter((s) => !STATUS_ORDER.some((o) => o.status === s))
      .map((s) => ({ status: s, count: statusCounts.get(s)!, color: "#a1a1aa" })),
  ];

  // ---------- Conversas ----------
  const porHoraMap = new Map<number, number>();
  const porDiaSemanaMap = new Map<number, number>();
  let comAnuncio = 0;
  for (const c of conversations) {
    const h = localHour(c.createdAt);
    porHoraMap.set(h, (porHoraMap.get(h) ?? 0) + 1);
    const dw = localWeekday(c.createdAt);
    porDiaSemanaMap.set(dw, (porDiaSemanaMap.get(dw) ?? 0) + 1);
    if (c.adSourceId) comAnuncio++;
  }

  // ---------- Mensagens por dia (inbound x outbound) ----------
  const mensagensPorDiaMap = new Map<string, { inbound: number; outbound: number }>();
  for (const m of messages) {
    const dia = localDateKey(m.timestamp);
    const entry = mensagensPorDiaMap.get(dia) ?? { inbound: 0, outbound: 0 };
    if (m.direction === "INBOUND") entry.inbound++;
    else entry.outbound++;
    mensagensPorDiaMap.set(dia, entry);
  }

  // ---------- Quiz de qualificação ----------
  const quizConcluidos = quizStates.filter((q) => q.status === "CONCLUIDO").length;
  const quizInterrompidos = quizStates.filter((q) => q.status === "INTERROMPIDO").length;
  const quizEmAndamento = quizStates.length - quizConcluidos - quizInterrompidos;
  const porNecessidade = countBy(
    quizStates.filter((q) => q.necessidadePrincipal),
    (q) =>
      NECESSIDADE_PRINCIPAL_LABEL[q.necessidadePrincipal as keyof typeof NECESSIDADE_PRINCIPAL_LABEL] ??
      q.necessidadePrincipal
  );

  return NextResponse.json({
    period: { days, from: cutoff?.toISOString() ?? null, to: new Date().toISOString() },
    leads: {
      total: leads.length,
      taxaConversao: leads.length ? concluidos / leads.length : 0,
      tempoMedioPrimeiroContatoHoras: temposPrimeiroContato.length
        ? temposPrimeiroContato.reduce((a, b) => a + b, 0) / temposPrimeiroContato.length
        : null,
      porStatus,
      porOrigem: countBy(leads, (l) => l.origem),
      porDispensaMotivo: topNWithOther(
        countBy(
          leads.filter((l) => l.status === "Dispensado"),
          (l) => l.motivoDispensa?.trim() || null
        ),
        8
      ),
      porEstado: topNWithOther(
        countBy(leads, (l) => l.estado),
        10
      ),
      serieDiaria: seriePorDia(leads.map((l) => l.dataEntrada)),
    },
    conversas: {
      total: conversations.length,
      comAnuncio,
      semAnuncio: conversations.length - comAnuncio,
      // 24 posições fixas (0..23) mesmo com contagem zero, pro eixo do gráfico não pular hora.
      porHora: Array.from({ length: 24 }, (_, h) => ({ hora: h, count: porHoraMap.get(h) ?? 0 })),
      porDiaSemana: WEEKDAY_LABELS_PT.map((dia, i) => ({ dia, count: porDiaSemanaMap.get(i) ?? 0 })),
      serieDiaria: seriePorDia(conversations.map((c) => c.createdAt)),
      mensagensPorDia: [...mensagensPorDiaMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v })),
      quiz: {
        iniciados: quizStates.length,
        concluidos: quizConcluidos,
        interrompidos: quizInterrompidos,
        emAndamento: quizEmAndamento,
        taxaConclusao: quizStates.length ? quizConcluidos / quizStates.length : 0,
        porNecessidade,
      },
    },
  });
}
