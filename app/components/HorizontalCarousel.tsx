"use client";

import { useRef } from "react";

export default function HorizontalCarousel({children,className=""}:{children:React.ReactNode;className?:string}){
  const rail=useRef<HTMLDivElement>(null);
  const move=(direction:number)=>rail.current?.scrollBy({left:direction*Math.min(760,rail.current.clientWidth*.9),behavior:"smooth"});
  return <div className="home-promotion-carousel"><button className="rail-arrow rail-prev" aria-label="წინა განცხადებები" onClick={()=>move(-1)}>‹</button><div className={`property-row home-turbo-rail ${className}`} ref={rail}>{children}</div><button className="rail-arrow rail-next" aria-label="შემდეგი განცხადებები" onClick={()=>move(1)}>›</button></div>;
}
