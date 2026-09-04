"use client";
import {useEffect,useRef,useState} from "react";
import type { Map as MapInstance } from "maplibre-gl";
import {osmStyle} from "../../../osm-style";

export default function PropertyLocationMap({longitude,latitude,location}:{longitude:number;latitude:number;location:string}){
 const host=useRef<HTMLDivElement>(null);
 const [unavailable,setUnavailable]=useState(false);
 useEffect(() => {
  const container = host.current;
  if (!container) return;
  let disposed = false, started = false;
  let map: MapInstance | undefined;
  setUnavailable(false);
  const start = async () => {
   if (started || disposed) return;
   started = true;
   try {
    const maplibregl = await import("maplibre-gl");
    if (disposed) return;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    if (!gl) { setUnavailable(true); return; }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    const instance = new maplibregl.Map({container,style:osmStyle,center:[longitude,latitude],zoom:16,attributionControl:false});
    map = instance;
    instance.addControl(new maplibregl.NavigationControl({showCompass:false}),"top-right");
    instance.addControl(new maplibregl.AttributionControl({compact:true}),"bottom-right");
    const pin = document.createElement("div");
    pin.className = "jibu-static-pin";
    pin.appendChild(document.createElement("span"));
    instance.once("load", () => {
     if (!disposed) new maplibregl.Marker({element:pin,anchor:"bottom"}).setLngLat([longitude,latitude]).addTo(instance);
    });
   } catch { if (!disposed) setUnavailable(true); }
  };
  const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); void start(); }
  }, {rootMargin:"250px"});
  if (observer) observer.observe(container); else void start();
  return () => { disposed = true; observer?.disconnect(); map?.remove(); };
 }, [longitude,latitude]);
 return <div className="property-live-map property-map-embedded"><div ref={host}/><aside><span>JIBU MAP</span><b>{location}</b><small>{unavailable?"რუკა ამ ბრაუზერში მიუწვდომელია":"განცხადების ზუსტი მდებარეობა"}</small></aside></div>
}
