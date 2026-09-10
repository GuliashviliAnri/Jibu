"use client";

import {startTransition,useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

type ViewTransitionDocument=Document&{
  startViewTransition?:(update:()=>void|Promise<void>)=>{finished:Promise<void>};
};

export default function NavigationManager(){
  const router=useRouter();
  const pathname=usePathname();
  const pendingView=useRef<null|(()=>void)>(null);
  const warmed=useRef(new Set<string>());

  useEffect(()=>{
    pendingView.current?.();
    pendingView.current=null;
  },[pathname]);

  useEffect(()=>{
    const internalPath=(anchor:HTMLAnchorElement)=>{
      if((anchor.target&&anchor.target!=="_self")||anchor.hasAttribute("download"))return null;
      const raw=anchor.getAttribute("href");
      if(!raw||raw==="#"||raw.startsWith("mailto:")||raw.startsWith("tel:"))return null;
      const url=new URL(raw,location.href);
      return url.origin===location.origin?url:null;
    };
    const navigate=(target:string,replace=false)=>{
      const commit=()=>startTransition(()=>replace?router.replace(target):router.push(target));
      const documentWithTransition=document as ViewTransitionDocument;
      if(!documentWithTransition.startViewTransition||matchMedia("(prefers-reduced-motion: reduce)").matches){
        commit();
        return;
      }
      pendingView.current?.();
      documentWithTransition.startViewTransition(()=>new Promise<void>(resolve=>{
        let complete=false;
        const finish=()=>{if(complete)return;complete=true;resolve()};
        pendingView.current=finish;
        commit();
        window.setTimeout(finish,1200);
      })).finished.catch(()=>undefined);
    };
    const click=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=(event.target as Element|null)?.closest("a[href]") as HTMLAnchorElement|null;
      if(!anchor)return;
      const url=internalPath(anchor);
      if(!url||url.pathname===location.pathname&&url.search===location.search)return;
      event.preventDefault();
      anchor.closest("details")?.removeAttribute("open");
      navigate(url.pathname+url.search+url.hash);
    };
    const warm=(event:Event)=>{
      const anchor=(event.target as Element|null)?.closest("a[href]") as HTMLAnchorElement|null;
      if(!anchor)return;
      const url=internalPath(anchor);
      if(!url||url.pathname===location.pathname)return;
      const target=url.pathname+url.search;
      if(warmed.current.has(target))return;
      warmed.current.add(target);
      router.prefetch(target);
    };
    const warmVisibleRoutes=()=>{
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(anchor=>{
        const url=internalPath(anchor);
        if(!url||url.pathname===location.pathname)return;
        const target=url.pathname+url.search;
        if(warmed.current.has(target))return;
        warmed.current.add(target);
        router.prefetch(target);
      });
    };
    const appNavigate=(event:Event)=>{
      const detail=(event as CustomEvent<{path?:string;replace?:boolean}>).detail;
      if(!detail?.path)return;
      navigate(detail.path,detail.replace);
    };
    const requestIdle=(window as Window&{requestIdleCallback?:(callback:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
    const idleId=requestIdle?requestIdle(warmVisibleRoutes,{timeout:800}):window.setTimeout(warmVisibleRoutes,180);
    document.addEventListener("click",click,true);
    document.addEventListener("pointerover",warm,true);
    document.addEventListener("pointerdown",warm,true);
    document.addEventListener("focusin",warm,true);
    window.addEventListener("jibu:navigate",appNavigate);
    return()=>{
      if(requestIdle)(window as Window&{cancelIdleCallback?:(id:number)=>void}).cancelIdleCallback?.(idleId);
      else window.clearTimeout(idleId);
      pendingView.current?.();
      pendingView.current=null;
      document.removeEventListener("click",click,true);
      document.removeEventListener("pointerover",warm,true);
      document.removeEventListener("pointerdown",warm,true);
      document.removeEventListener("focusin",warm,true);
      window.removeEventListener("jibu:navigate",appNavigate);
    };
  },[router,pathname]);
  return null;
}
