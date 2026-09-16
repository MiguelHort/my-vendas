/**
 * Meta Marketing API (Graph API) — leitura de métricas de anúncios.
 * Só leitura (`ads_read`); não cria/edita nada na conta de anúncios.
 *
 * Credenciais: `META_AD_ACCOUNT_ID` (formato "act_<id>") e `META_ADS_ACCESS_TOKEN`
 * (token de usuário do sistema com `ads_read`, não expira).
 */

const GRAPH_API_VERSION = "v24.0";

export class MetaAdsError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "MetaAdsError";
    this.status = status;
  }
}

export type AdsInsightRow = {
  campaignId?: string;
  campaignName?: string;
  adId?: string;
  adName?: string;
  /** "YYYY-MM-DD" — só presente quando a busca pede série diária (timeIncrement: 1). */
  date?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number; // %
  cpc: number; // custo por clique
  cpm: number; // custo por mil impressões
  reach: number;
  leads: number;
  costPerLead: number | null;
};

export type AdsInsightsLevel = "account" | "campaign" | "ad";

type GraphErrorBody = { error?: { message?: string; type?: string; code?: number } };

type GraphInsightRaw = {
  campaign_id?: string;
  campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  actions?: { action_type: string; value: string }[];
};

type GraphInsightsResponse = {
  data: GraphInsightRaw[];
  paging?: { cursors?: { after?: string }; next?: string };
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new MetaAdsError(`${name} não configurado`);
  return v;
}

const NUM_FIELDS = "spend,impressions,clicks,ctr,cpc,cpm,reach,actions";

/**
 * A Meta manda MUITOS `action_type` diferentes que contêm "lead" pro mesmo evento
 * (ex: "lead", "onsite_conversion.lead", "onsite_conversion.lead_grouped",
 * "onsite_web_lead", "offsite_search_add_meta_leads",
 * "offsite_complete_registration_add_meta_leads"...) — são visões/atribuições
 * sobrepostas do MESMO lead, não leads adicionais. Somar todos infla o número
 * (visto na prática: 7 action_types de "lead" cada um valendo 4 → apareceria
 * como 28 leads quando só 4 são reais). Por isso pegamos só o primeiro que
 * existir nessa lista de prioridade (mais canônico primeiro), nunca a soma.
 */
const LEAD_ACTION_PRIORITY = [
  "onsite_conversion.lead_grouped", // métrica "Leads" que a própria Ads Manager mostra p/ formulário nativo
  "lead", // evento padrão de pixel/conversão (Lead)
  "offsite_conversion.fb_pixel_lead", // Lead via pixel no site
  "onsite_conversion.lead",
  "onsite_web_lead",
];

function extractLeads(actions: GraphInsightRaw["actions"]): number {
  if (!actions) return 0;
  for (const type of LEAD_ACTION_PRIORITY) {
    const found = actions.find((a) => a.action_type === type);
    if (found) return Number(found.value) || 0;
  }
  return 0;
}

function mapRow(raw: GraphInsightRaw): AdsInsightRow {
  const spend = Number(raw.spend) || 0;
  const leads = extractLeads(raw.actions);
  return {
    campaignId: raw.campaign_id,
    campaignName: raw.campaign_name,
    adId: raw.ad_id,
    adName: raw.ad_name,
    date: raw.date_start,
    spend,
    impressions: Number(raw.impressions) || 0,
    clicks: Number(raw.clicks) || 0,
    ctr: Number(raw.ctr) || 0,
    cpc: Number(raw.cpc) || 0,
    cpm: Number(raw.cpm) || 0,
    reach: Number(raw.reach) || 0,
    leads,
    costPerLead: leads > 0 ? spend / leads : null,
  };
}

async function fetchInsightsPage(url: string): Promise<GraphInsightsResponse> {
  const res = await fetch(url);
  const body = (await res.json()) as GraphInsightsResponse & GraphErrorBody;

  if (!res.ok || body.error) {
    throw new MetaAdsError(
      body.error?.message ?? `Erro ${res.status} ao consultar a Marketing API`,
      res.status
    );
  }

  return body;
}

/**
 * Busca insights de anúncios num período. `level` controla a granularidade:
 * "account" devolve 1 linha (total da conta), "campaign"/"ad" devolvem 1 linha
 * por campanha/anúncio que teve atividade no período. `timeIncrement: 1` pede uma
 * linha por dia (série temporal) em vez de 1 linha pro período inteiro.
 */
export async function fetchAdsInsights(params: {
  since: string; // "YYYY-MM-DD"
  until: string; // "YYYY-MM-DD"
  level: AdsInsightsLevel;
  timeIncrement?: 1;
}): Promise<AdsInsightRow[]> {
  const accountId = envOrThrow("META_AD_ACCOUNT_ID");
  const token = envOrThrow("META_ADS_ACCESS_TOKEN");

  const fields =
    params.level === "account" ? NUM_FIELDS : `campaign_id,campaign_name,${params.level === "ad" ? "ad_id,ad_name," : ""}${NUM_FIELDS}`;

  const baseUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/insights`);
  baseUrl.searchParams.set("level", params.level);
  baseUrl.searchParams.set("fields", fields);
  baseUrl.searchParams.set("time_range", JSON.stringify({ since: params.since, until: params.until }));
  if (params.timeIncrement) {
    baseUrl.searchParams.set("time_increment", String(params.timeIncrement));
  }
  baseUrl.searchParams.set("limit", "500");
  baseUrl.searchParams.set("access_token", token);

  const rows: GraphInsightRaw[] = [];
  let url: string | null = baseUrl.toString();
  let pages = 0;

  // Insights raramente pagina pra uma única conta pequena, mas cobre o caso —
  // limite de páginas só pra nunca ficar em loop se algo vier estranho.
  while (url && pages < 10) {
    const page = await fetchInsightsPage(url);
    rows.push(...page.data);
    url = page.paging?.next ?? null;
    pages++;
  }

  return rows.map(mapRow);
}
