import { promotionQuote, type PromotionKind } from "./promotion-pricing";

export default function PromotionPrice({kind, days}: {kind: PromotionKind; days: number}) {
  const quote = promotionQuote(kind, days);
  return <div className={`promotion-price-summary promotion-price-${kind}`} aria-live="polite">
    <div className="promotion-price-line"><strong>{quote.price}<span>₾</span></strong>{quote.saving > 0 && <del aria-label={`ჩვეულებრივი ფასი ${quote.regular} ლარი`}>{quote.regular} ₾</del>}</div>
    <div className="promotion-price-details"><small>{days} დღე · {(quote.price / days).toFixed(2)} ₾/დღე</small>{quote.saving > 0 && <b>ზოგავ {quote.saving} ₾</b>}</div>
  </div>;
}
