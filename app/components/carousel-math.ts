export function wrapSlide(index: number, count: number) {
  return count > 0 ? ((index % count) + count) % count : 0;
}

export const HERO_INTERVAL_MS = 6500;
export function shouldRotate({count,paused,hovered,focused,visible,inView,reducedMotion,touching}: {count:number;paused:boolean;hovered:boolean;focused:boolean;visible:boolean;inView:boolean;reducedMotion:boolean;touching:boolean}) {
  return count > 1 && !paused && !hovered && !focused && visible && inView && !reducedMotion && !touching;
}
