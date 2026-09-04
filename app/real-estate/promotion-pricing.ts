export const promotionPackages = [
  { days: 1, vip: 2, turbo: 4 },
  { days: 3, vip: 6, turbo: 12 },
  { days: 7, vip: 12, turbo: 24 },
  { days: 15, vip: 24, turbo: 48 },
  { days: 30, vip: 42, turbo: 84 },
] as const;
export type PromotionKind = "vip" | "turbo";
export function promotionQuote(kind: PromotionKind, days: number) {
  const pack = promotionPackages.find(p => p.days === days);
  if (!pack) throw new Error("Unsupported promotion duration");
  const regular = days * (kind === "vip" ? 2 : 4);
  return { price: pack[kind], regular, saving: regular - pack[kind], badge: days === 15 ? "რეკომენდებული" : days === 30 ? "საუკეთესო ფასი" : "" };
}
export function extendPromotion(daysLeft: number, activeDays: number, purchasedDays: number) {
  const duration = Math.max(0, activeDays) + purchasedDays;
  return { activeDays: duration, daysLeft: Math.max(daysLeft, duration) };
}
