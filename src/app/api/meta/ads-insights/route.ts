import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/authServer";
import { fetchAdsInsights, MetaAdsError, type AdsInsightRow, type AdsInsightsLevel } from "@/lib/metaAds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDto(row: AdsInsightRow) {
  return {
    campaign_id: row.campaignId ?? null,
    campaign_name: row.campaignName ?? null,
    ad_id: row.adId ?? null,
    ad_name: row.adName ?? null,
    date: row.date ?? null,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.ctr,
    cpc: row.cpc,
    cpm: row.cpm,
    reach: row.reach,
    leads: row.leads,
    cost_per_lead: row.costPerLead,
  };
}

/**
 * GET ?since=YYYY-MM-DD&until=YYYY-MM-DD&level=account|campaign|ad&time_increment=1
 * Devolve as métricas de anúncio (gasto, cliques, leads etc.) da conta configurada
 * em META_AD_ACCOUNT_ID, pro período e granularidade pedidos. `time_increment=1`
 * pede uma linha por dia (série temporal) em vez de 1 linha pro período inteiro.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  const levelParam = url.searchParams.get("level") ?? "campaign";
  const timeIncrementParam = url.searchParams.get("time_increment");

  if (!isValidDate(since) || !isValidDate(until)) {
    return NextResponse.json({ error: "since/until precisam ser YYYY-MM-DD" }, { status: 400 });
  }
  if (levelParam !== "account" && levelParam !== "campaign" && levelParam !== "ad") {
    return NextResponse.json({ error: "level precisa ser account, campaign ou ad" }, { status: 400 });
  }
  if (timeIncrementParam !== null && timeIncrementParam !== "1") {
    return NextResponse.json({ error: "time_increment só suporta o valor 1" }, { status: 400 });
  }
  const level = levelParam as AdsInsightsLevel;
  const timeIncrement = timeIncrementParam === "1" ? 1 : undefined;

  try {
    const rows = await fetchAdsInsights({ since, until, level, timeIncrement });
    return NextResponse.json({ rows: rows.map(toDto) });
  } catch (err) {
    if (err instanceof MetaAdsError) {
      console.error("Erro Meta Ads Insights:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status ?? 502 });
    }
    console.error("Erro inesperado Meta Ads Insights:", err);
    return NextResponse.json({ error: "Erro inesperado ao consultar a Meta" }, { status: 500 });
  }
}
