export type AgeBandPrice = { min: number; max: number | null; price: number };
export type AgeQty = { age: number; qty: number };

export function findBandPrice(bands: AgeBandPrice[], age: number): number | null {
  for (const b of bands) {
    const max = b.max ?? 999;
    if (age >= b.min && age <= max) return b.price;
  }
  return null;
}

export function calcTotalForAges(bands: AgeBandPrice[], ages: AgeQty[]) {
  let total = 0;
  const breakdown: Array<{ age: number; qty: number; unit: number; subtotal: number }> = [];

  for (const a of ages) {
    const unit = findBandPrice(bands, a.age);
    if (unit == null) return { ok: false as const, error: `Sem faixa para idade ${a.age}` };

    const subtotal = unit * a.qty;
    total += subtotal;
    breakdown.push({ age: a.age, qty: a.qty, unit, subtotal });
  }

  return { ok: true as const, total, breakdown };
}