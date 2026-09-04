"use client";

import { useEffect, useRef, useState } from "react";
import { listingWindow } from "./listing-performance";

export function useListingRail<T>(items: readonly T[]) {
  const ref = useRef<HTMLElement>(null);
  const [paging, setPaging] = useState({ source: items, page: 0 });
  const window = listingWindow(items, paging.source === items ? paging.page : 0);
  const enterFromEnd = useRef(false);

  useEffect(() => {
    const rail = ref.current;
    if (rail) rail.scrollLeft = enterFromEnd.current ? rail.scrollWidth : 0;
    enterFromEnd.current = false;
  }, [items, window.page]);

  const move = (direction: number) => {
    const rail = ref.current;
    if (!rail) return;
    const atEdge = direction > 0
      ? rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2
      : rail.scrollLeft <= 2;
    const next = window.page + direction;
    if (atEdge && next >= 0 && next <= window.lastPage) {
      enterFromEnd.current = direction < 0;
      setPaging({ source: items, page: next });
    } else {
      rail.scrollBy({ left: direction * Math.min(760, rail.clientWidth * .85), behavior: "smooth" });
    }
  };

  return { ref, items: window.items, move };
}
