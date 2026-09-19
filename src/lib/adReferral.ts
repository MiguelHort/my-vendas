/**
 * Click-to-WhatsApp: quando o contato chega clicando num anúncio, a Meta manda um
 * bloco `referral` na primeira mensagem com os dados do anúncio. Aqui a gente
 * valida/normaliza esse bloco (vem de fora, então nada é confiável) pra guardar
 * e mostrar na conversa.
 */

export type AdReferral = {
  source_id: string | null;
  source_type: string | null; // "ad" | "post"
  source_url: string | null;
  headline: string | null;
  body: string | null;
  media_type: string | null; // "image" | "video"
  image_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  ctwa_clid: string | null;
};

const str = (v: unknown, max = 500): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const url = (v: unknown): string | null => {
  const s = str(v, 2000);
  return s && /^https?:\/\//i.test(s) ? s : null;
};

/** Devolve null se o bloco não existir ou não tiver nada que identifique o anúncio. */
export function parseAdReferral(raw: unknown): AdReferral | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const parsed: AdReferral = {
    source_id: str(r.source_id, 100),
    source_type: str(r.source_type, 20),
    source_url: url(r.source_url),
    headline: str(r.headline),
    body: str(r.body, 1000),
    media_type: str(r.media_type, 20),
    image_url: url(r.image_url),
    video_url: url(r.video_url),
    thumbnail_url: url(r.thumbnail_url),
    ctwa_clid: str(r.ctwa_clid, 500),
  };

  return parsed.source_id || parsed.source_url || parsed.headline ? parsed : null;
}

/** Versão que vai pro navegador (sem o ctwa_clid, que é um identificador interno de conversão). */
export type AdReferralDto = Omit<AdReferral, "ctwa_clid">;

export function toAdReferralDto(stored: unknown): AdReferralDto | null {
  const p = parseAdReferral(stored);
  if (!p) return null;
  const { ctwa_clid: _omit, ...dto } = p;
  void _omit;
  return dto;
}

/** Miniatura a mostrar: imagem do anúncio, senão a miniatura do vídeo. */
export function adPreviewImage(ad: Pick<AdReferral, "image_url" | "thumbnail_url">): string | null {
  return ad.image_url ?? ad.thumbnail_url;
}

/** Origem gravada no lead quando o contato chega por anúncio Click-to-WhatsApp. */
export const AD_LEAD_ORIGIN = "Anúncio (WhatsApp)";
