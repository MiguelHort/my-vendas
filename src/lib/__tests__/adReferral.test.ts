import { describe, expect, it } from "vitest";
import { adPreviewImage, parseAdReferral, toAdReferralDto } from "../adReferral";

describe("parseAdReferral", () => {
  it("normaliza um referral típico de Click-to-WhatsApp", () => {
    const r = parseAdReferral({
      source_url: "https://fb.me/abc",
      source_id: "120210000000000",
      source_type: "ad",
      headline: "  Plano de saúde  ",
      body: "Cotação grátis",
      media_type: "image",
      image_url: "https://scontent.xx/img.jpg",
      ctwa_clid: "AR123",
    });
    expect(r?.source_id).toBe("120210000000000");
    expect(r?.headline).toBe("Plano de saúde");
    expect(r?.image_url).toBe("https://scontent.xx/img.jpg");
  });

  it("descarta lixo e urls que não são http(s)", () => {
    const r = parseAdReferral({
      source_id: 123,
      headline: "Oi",
      image_url: "javascript:alert(1)",
      source_url: "ftp://x",
    });
    expect(r?.source_id).toBeNull();
    expect(r?.image_url).toBeNull();
    expect(r?.source_url).toBeNull();
    expect(r?.headline).toBe("Oi");
  });

  it("retorna null sem nada que identifique o anúncio", () => {
    expect(parseAdReferral(null)).toBeNull();
    expect(parseAdReferral("x")).toBeNull();
    expect(parseAdReferral({})).toBeNull();
    expect(parseAdReferral({ body: "só texto" })).toBeNull();
  });
});

describe("toAdReferralDto / adPreviewImage", () => {
  it("não expõe o ctwa_clid", () => {
    const dto = toAdReferralDto({ source_id: "1", ctwa_clid: "secret" });
    expect(dto).not.toBeNull();
    expect("ctwa_clid" in (dto as object)).toBe(false);
  });

  it("prefere a imagem, cai na miniatura", () => {
    expect(adPreviewImage({ image_url: "a", thumbnail_url: "b" })).toBe("a");
    expect(adPreviewImage({ image_url: null, thumbnail_url: "b" })).toBe("b");
    expect(adPreviewImage({ image_url: null, thumbnail_url: null })).toBeNull();
  });
});
