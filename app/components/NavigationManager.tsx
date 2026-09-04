"use client";

import {useEffect,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import Image from "next/image";

const eagerRoutes=["/","/real-estate","/map","/marketplace","/services","/business","/community","/profile"];

export default function NavigationManager(){
  const router=useRouter();
  const pathname=usePathname();
  const[navigating,setNavigating]=useState(false);
  useEffect(()=>setNavigating(false),[pathname]);
  useEffect(()=>{
    let fallback:ReturnType<typeof setTimeout>|undefined;
    const internalPath=(anchor:HTMLAnchorElement)=>{
      if((anchor.target&&anchor.target!=="_self")||anchor.hasAttribute("download"))return null;
      const raw=anchor.getAttribute("href");
      if(!raw||raw==="#"||raw.startsWith("mailto:")||raw.startsWith("tel:"))return null;
      const url=new URL(raw,location.href);
      return url.origin===location.origin?url:null;
    };
    const click=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=(event.target as Element|null)?.closest("a[href]") as HTMLAnchorElement|null;
      if(!anchor)return;
      const url=internalPath(anchor);
      if(!url||url.pathname===location.pathname&&url.search===location.search)return;
      event.preventDefault();setNavigating(true);
      if(fallback)clearTimeout(fallback);
      fallback=setTimeout(()=>setNavigating(false),8000);
      router.push(url.pathname+url.search+url.hash);
    };
    const warm=(event:Event)=>{
      const anchor=(event.target as Element|null)?.closest("a[href]") as HTMLAnchorElement|null;
      if(!anchor)return;
      const url=internalPath(anchor);
      if(url&&url.pathname!==location.pathname)router.prefetch(url.pathname+url.search);
    };
    document.addEventListener("click",click,true);
    document.addEventListener("pointerover",warm,true);
    document.addEventListener("focusin",warm,true);
    const idle=window.setTimeout(()=>eagerRoutes.forEach(route=>router.prefetch(route)),350);
    return()=>{if(fallback)clearTimeout(fallback);clearTimeout(idle);document.removeEventListener("click",click,true);document.removeEventListener("pointerover",warm,true);document.removeEventListener("focusin",warm,true)};
  },[router]);
  return navigating?<div className="route-transition-mask" role="status" aria-live="polite"><div><Image unoptimized src="/assets/logo-icon.png" alt="" width={38} height={38}/><span>იტვირთება</span><i/></div></div>:null;
}
