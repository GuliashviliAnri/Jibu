export const LISTING_BATCH_SIZE = 12;

/** Bounds mounted cards without dropping access to subsequent results. */
export function listingWindow<T>(items: readonly T[], requestedPage: number) {
  const lastPage = Math.max(0, Math.ceil(items.length / LISTING_BATCH_SIZE) - 1);
  const page = Math.min(lastPage, Math.max(0, Math.trunc(requestedPage) || 0));
  return { page, lastPage, items: items.slice(page * LISTING_BATCH_SIZE, (page + 1) * LISTING_BATCH_SIZE) };
}

/** Send only coordinates and a lookup key to the map worker, never photos or descriptions. */
export function mapCollection(items: readonly { slug: string; longitude: number; latitude: number }[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: items.flatMap((item, index) => {
      if (!Number.isFinite(item.longitude) || !Number.isFinite(item.latitude) || Math.abs(item.longitude) > 180 || Math.abs(item.latitude) > 90) return [];
      return [{ type: "Feature" as const, id: index, geometry: { type: "Point" as const, coordinates: [item.longitude, item.latitude] }, properties: { slug: item.slug } }];
    }),
  };
}
