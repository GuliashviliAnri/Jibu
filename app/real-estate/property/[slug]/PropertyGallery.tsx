"use client";

import Image from "next/image";
import {useEffect,useState} from "react";

export default function PropertyGallery({title,main,items}:{title:string;main:string;items?:string[]}){
 const photos=items?.length?items:[main];
 const[open,setOpen]=useState(false),[active,setActive]=useState(0);
 const show=(index:number)=>{setActive(index);setOpen(true)};
 const move=(step:number)=>setActive(i=>(i+step+photos.length)%photos.length);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!open)return;if(e.key==="Escape")setOpen(false);if(e.key==="ArrowRight")move(1);if(e.key==="ArrowLeft")move(-1)};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[open]);
 return <>
  <section className="detail-gallery">
   <button className="detail-main-photo" onClick={()=>show(0)} aria-label="მთავარი ფოტოს სრულად გახსნა"><Image unoptimized src={photos[0]} alt={title} fill priority quality={100}/><span className="photo-open-hint">ფოტოების ნახვა</span></button>
   <div>{photos.slice(1,3).map((src,i)=><button onClick={()=>show(i+1)} key={`${src}-${i}`} aria-label={`ფოტო ${i+2} სრულად`}><Image unoptimized src={src} alt={`${title} — ფოტო ${i+2}`} fill quality={100}/>{i===1&&photos.length>3&&<b className="more-photos">+{photos.length-3} ფოტო</b>}</button>)}</div>
  </section>
  <div className="detail-thumbs">{photos.slice(1).map((src,i)=><button key={`${src}-${i}`} onClick={()=>show(i+1)} aria-label={`ფოტო ${i+2} სრულად`}><Image unoptimized src={src} alt={`${title} ფოტო ${i+2}`} fill quality={100}/></button>)}</div>
  {open&&<div className="photo-viewer" role="dialog" aria-modal="true" aria-label="ქონების ფოტოების გალერეა" onMouseDown={()=>setOpen(false)}><button className="viewer-close" onClick={()=>setOpen(false)} aria-label="დახურვა">×</button><button className="viewer-prev" onMouseDown={e=>e.stopPropagation()} onClick={()=>move(-1)} aria-label="წინა ფოტო">‹</button><div className="viewer-image" onMouseDown={e=>e.stopPropagation()}><Image unoptimized src={photos[active]} alt={`${title} — ფოტო ${active+1}`} fill quality={100}/></div><button className="viewer-next" onMouseDown={e=>e.stopPropagation()} onClick={()=>move(1)} aria-label="შემდეგი ფოტო">›</button><span className="viewer-count">{active+1} / {photos.length}</span></div>}
 </>
}
