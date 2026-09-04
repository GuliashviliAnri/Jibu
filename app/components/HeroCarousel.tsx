"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { HERO_INTERVAL_MS, shouldRotate, wrapSlide } from "./carousel-math";

export default function HeroCarousel({children}: {children: ReactNode}) {
  const slides = Children.toArray(children);
  const [active, setActive] = useState(0);
  const host = useRef<HTMLElement>(null);
  const [paused,setPaused]=useState(false), [hovered,setHovered]=useState(false), [focused,setFocused]=useState(false);
  const [visible,setVisible]=useState(false), [inView,setInView]=useState(false), [reducedMotion,setReducedMotion]=useState(false), [touching,setTouching]=useState(false);
  const touch = useRef<{x:number;y:number} | null>(null);
  const move = (step: number) => setActive(index => wrapSlide(index + step, slides.length));
  const rotating=shouldRotate({count:slides.length,paused,hovered,focused,visible,inView,reducedMotion,touching});
  useEffect(()=>{
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion=()=>setReducedMotion(motion.matches);
    const syncVisibility=()=>setVisible(!document.hidden);
    syncMotion();syncVisibility();
    motion.addEventListener("change",syncMotion);
    document.addEventListener("visibilitychange",syncVisibility);
    const observer=new IntersectionObserver(entries=>setInView(entries.some(entry=>entry.isIntersecting)),{threshold:.3});
    if(host.current)observer.observe(host.current);
    return()=>{motion.removeEventListener("change",syncMotion);document.removeEventListener("visibilitychange",syncVisibility);observer.disconnect()};
  },[]);
  useEffect(()=>{
    if(!rotating)return;
    const timer=setTimeout(()=>setActive(index=>wrapSlide(index+1,slides.length)),HERO_INTERVAL_MS);
    return()=>clearTimeout(timer);
  },[rotating,active,slides.length]);

  return <section ref={host} className="hero home-hero" aria-roledescription="კარუსელი" aria-label="JIBU შესაძლებლობები"
    onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
    onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false)}}
    onTouchStart={event => { setTouching(true); const point=event.touches[0]; touch.current={x:point.clientX,y:point.clientY}; }}
    onTouchCancel={()=>{touch.current=null;setTouching(false)}}
    onTouchEnd={event => {
      setTouching(false);
      const start=touch.current, point=event.changedTouches[0]; touch.current=null;
      if (!start) return;
      const x=point.clientX-start.x,y=point.clientY-start.y;
      if (Math.abs(x)>60 && Math.abs(x)>Math.abs(y)*1.5) move(x<0?1:-1);
    }}
    onKeyDown={event => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); }
    }}>
    <div className="home-hero-slide" key={active} role="group" aria-roledescription="სლაიდი" aria-label={`${active+1} / ${slides.length}`}>{slides[active]}</div>
    <div className="home-hero-controls">
      <div className="home-hero-dots">{slides.map((_,index)=><button key={index} type="button" aria-label={`სლაიდი ${index+1}`} aria-current={index===active?"true":undefined} onClick={()=>{setActive(index);setPaused(true)}}><span/></button>)}</div>
    </div>
  </section>;
}
