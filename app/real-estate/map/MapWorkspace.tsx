"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as maplibregl from "maplibre-gl";
import "../../map-worker";
import type { GeoJSONSource } from "maplibre-gl";
import { propertyListings } from "../property-data";
import { osmStyle } from "../../osm-style";
import { mapCollection } from "../listing-performance";

type Listing = {slug:string;image:string;tag:string;title:string;deal:string;location:string;longitude:number;latitude:number;price:string;area:string;local?:boolean};
export default function MapWorkspace() {
  const host = useRef<HTMLDivElement>(null),
    mapRef = useRef<maplibregl.Map | null>(null),
    [selected, setSelected] = useState<Listing | null>(null),
    [query, setQuery] = useState(""),
    [searchOpen,setSearchOpen] = useState(false),
    [activeOption,setActiveOption] = useState(-1),
    [showHomes,setShowHomes] = useState(false),
    [mapError, setMapError] = useState(""),
    [deal,setDeal]=useState<"all"|"იყიდება"|"ქირავდება">("all"),
    [allListings,setAllListings]=useState<Listing[]>(propertyListings),
    allRef=useRef<Listing[]>(propertyListings);
  useEffect(()=>{try{const local=JSON.parse(localStorage.getItem("jibu:user-listings")||"[]");if(Array.isArray(local)){const merged=[...propertyListings,...local.filter(p=>p&&typeof p.slug==="string"&&typeof p.title==="string"&&typeof p.location==="string")] as Listing[];setAllListings(merged)}}catch{}},[]);
  const deferredQuery = useDeferredValue(query);
  const listings = useMemo(
    () =>
      showHomes ? allListings.filter((p) =>(deal==="all"||p.deal===deal)&&(p.title + " " + p.location).toLowerCase().includes(deferredQuery.toLowerCase())) : [],
    [deferredQuery,deal,allListings,showHomes],
  );
  allRef.current = listings;
  const suggestions=useMemo(()=>{
    const term=query.trim().toLocaleLowerCase("ka");
    if(!term)return [];
    const matches:Listing[]=[];
    for(const item of allListings){
      if((deal==="all"||item.deal===deal)&&Number.isFinite(item.longitude)&&Number.isFinite(item.latitude)&&(item.title+" "+item.location).toLocaleLowerCase("ka").includes(term))matches.push(item);
      if(matches.length===8)break;
    }
    return matches;
  },[query,deal,allListings]);
  const chooseSuggestion=(item:Listing)=>{
    setQuery(item.location);setSelected(item);setSearchOpen(false);setActiveOption(-1);
    mapRef.current?.flyTo({center:[item.longitude,item.latitude],zoom:16});
  };
  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    if (!gl) { setMapError("რუკა ამ ბრაუზერში მიუწვდომელია"); return; }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    let disposed = false;
    const map = new maplibregl.Map({
      container: host.current,
      style: {...osmStyle, glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"},
      center: [44.793, 41.715],
      zoom: 11.8,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    map.on("load", () => {
      map.addSource("homes", {
        type: "geojson",
        data: mapCollection(allRef.current),
        cluster: true,
        clusterMinPoints: 8,
        clusterMaxZoom: 14,
        clusterRadius: 46,
      });
      map.addLayer({
        id: "clusters-halo",
        type: "circle",
        source: "homes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "rgba(104,70,232,.16)",
          "circle-radius": ["step", ["get", "point_count"], 29, 10, 36, 40, 44],
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "homes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#6846e8",
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 26, 40, 32],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 4,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "homes",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Open Sans Regular"],
        },
        paint: { "text-color": "#fff" },
      });
      // GPU-rendered pins: the worker clusters points and the renderer culls
      // offscreen features. No per-listing DOM nodes or move-event rebuilds.
      map.addLayer({
        id: "home-points", type: "circle", source: "homes",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-color": "#6846e8", "circle-radius": 9, "circle-stroke-color": "#fff", "circle-stroke-width": 3 },
      });
      void map.loadImage("/assets/map-listing-pin.png").then(image => {
        if (disposed) return;
        map.addImage("jibu-listing-pin", image.data);
        map.addLayer({
          id: "home-pins", type: "symbol", source: "homes",
          filter: ["!", ["has", "point_count"]],
          layout: { "icon-image": "jibu-listing-pin", "icon-size": .7, "icon-anchor": "bottom", "icon-allow-overlap": true },
        });
        map.setPaintProperty("home-points", "circle-opacity", 0);
        map.setPaintProperty("home-points", "circle-stroke-opacity", 0);
        map.on("click", "home-pins", event => {
          const slug = event.features?.[0]?.properties?.slug;
          setSelected(allRef.current.find(item => item.slug === slug) || null);
        });
        map.on("mouseenter", "home-pins", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "home-pins", () => { map.getCanvas().style.cursor = ""; });
      }).catch(() => { /* Keep clickable circle pins if the image is unavailable. */ });
      map.on("click", "home-points", event => {
        const slug = event.features?.[0]?.properties?.slug;
        setSelected(allRef.current.find(item => item.slug === slug) || null);
      });
      map.on("click", "clusters", async (e) => {
        const feature = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        })[0];
        if (!feature) return;
        const id = feature.properties?.cluster_id;
        const source = map.getSource("homes") as GeoJSONSource;
        let zoom: number;
        try { zoom = await source.getClusterExpansionZoom(id); } catch { return; }
        if (disposed) return;
        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
        });
      });
      for (const layer of ["clusters", "home-points"]) {
        map.on(
          "mouseenter",
          layer,
          () => (map.getCanvas().style.cursor = "pointer"),
        );
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
    });
    return () => {
      disposed = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const source = mapRef.current?.getSource("homes") as
      GeoJSONSource | undefined;
    source?.setData(mapCollection(listings));
    setSelected(current => current && listings.some(item => item.slug === current.slug) ? current : null);
  }, [listings]);
  return (
    <main className="map-workspace">
      <header className="map-toolbar">
        <div>
          <span>JIBU MAP</span>
          <h1>აღმოაჩინე ადგილები რუკაზე</h1>
          <p>
            {showHomes ? `${listings.length} განცხადება · დააჭირე პინს დეტალებისთვის` : "აირჩიე კატეგორია რუკაზე ადგილების სანახავად"}
          </p>
        </div>
        <div className="map-filter-actions"><button className={`map-category-toggle ${showHomes?"active":""}`} aria-pressed={showHomes} onClick={()=>{setShowHomes(value=>!value);setSearchOpen(false)}}>უძრავი ქონება</button>{showHomes && <><div className="map-deal-filter"><button className={deal==="all"?"active":""} onClick={()=>setDeal("all")}>ყველა</button><button className={deal==="იყიდება"?"active":""} onClick={()=>setDeal("იყიდება")}>იყიდება</button><button className={deal==="ქირავდება"?"active":""} onClick={()=>setDeal("ქირავდება")}>ქირავდება</button></div><div className="map-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setSearchOpen(false)}}><label>
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => {setQuery(e.target.value);setSearchOpen(true);setActiveOption(-1)}}
            onFocus={()=>setSearchOpen(true)}
            role="combobox"
            aria-label="განცხადების ან მისამართის ძიება"
            aria-autocomplete="list"
            aria-expanded={searchOpen&&!!query.trim()}
            aria-controls="map-search-options"
            aria-activedescendant={searchOpen&&suggestions[activeOption]?`map-option-${activeOption}`:undefined}
            autoComplete="off"
            onKeyDown={event=>{
              if(event.key==="Escape"){setSearchOpen(false);return}
              if(event.key==="ArrowDown"||event.key==="ArrowUp"){
                event.preventDefault();setSearchOpen(true);
                setActiveOption(index=>suggestions.length?(index+(event.key==="ArrowDown"?1:-1)+suggestions.length)%suggestions.length:-1);
              }
              if(event.key==="Enter"&&searchOpen&&suggestions.length){event.preventDefault();chooseSuggestion(suggestions[Math.max(0,Math.min(activeOption,suggestions.length-1))])}
            }}
            placeholder="მისამართი, ადგილი ან დასახელება"
          />
        </label>{searchOpen&&query.trim()&&<div className="map-search-options" id="map-search-options" role="listbox" aria-label="ნაპოვნი განცხადებები">
          {suggestions.length?suggestions.map((item,index)=><button type="button" role="option" aria-selected={activeOption===index} id={`map-option-${index}`} key={item.slug} onMouseDown={event=>event.preventDefault()} onClick={()=>chooseSuggestion(item)}><strong>{item.location}</strong><span>{item.title} · {item.deal}</span></button>):<p role="status">განცხადება ვერ მოიძებნა. სცადე სხვა ქუჩა ან უბანი.</p>}
        </div>}</div></>}</div>
      </header>
      <section className="map-stage">
        <div ref={host} className="all-listings-map" />
        {mapError && <p role="status">{mapError}</p>}
        {selected && (
          <article className="map-property-card">
            <button onClick={() => setSelected(null)} aria-label="დახურვა">
              ×
            </button>
            <a href={selected.local?"/real-estate/cabinet":`/real-estate/property/${selected.slug}`}>
              <div>
                <Image
                  unoptimized
                  src={`/assets/concept/${selected.image}.webp`}
                  alt={selected.title}
                  fill
                  sizes="320px"
                />
                <span>უძრავი ქონება</span>
              </div>
              <small>{selected.location}</small>
              <h2>{selected.title}</h2>
              <footer>
                <strong>{selected.price}</strong>
                <span>{selected.area} მ²</span>
              </footer>
              <b>{selected.local?"ჩემს განცხადებებში ნახვა →":"დეტალების ნახვა →"}</b>
            </a>
          </article>
        )}
        <aside className="map-tip">
          <i />
          {showHomes ? "დააჭირე მონიშნულ ადგილს დეტალების სანახავად" : "პინების სანახავად აირჩიე უძრავი ქონება"}
        </aside>
      </section>
    </main>
  );
}
