import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/real-estate/listing-performance.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { listingWindow, mapCollection, LISTING_BATCH_SIZE } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("10,000 results remain reachable in batches of at most 12, forward and backward", () => {
  const records = Array.from({length:10000}, (_,id) => ({id}));
  const {lastPage} = listingWindow(records, 0);
  const visited = [];
  for (let page=0; page<=lastPage; page++) {
    const window = listingWindow(records, page);
    assert.ok(window.items.length <= LISTING_BATCH_SIZE);
    visited.push(...window.items);
  }
  assert.deepEqual(visited, records);
  for (let page=lastPage; page>=0; page--) {
    assert.deepEqual(listingWindow(records,page).items, records.slice(page*12,(page+1)*12));
  }
  assert.equal(listingWindow(records, -4).page, 0);
  assert.equal(listingWindow(records, Infinity).page, lastPage);
  assert.deepEqual(listingWindow([], 999), {page:0,lastPage:0,items:[]});
  assert.equal(listingWindow(records.slice(0,3),lastPage).page,0);
});

test("map payload excludes photos and descriptions for 10,000 listings", () => {
  const records = Array.from({length:10000}, (_,i) => ({slug:`home-${i}`,longitude:44.7+(i%100)*.001,latitude:41.7+Math.floor(i/100)*.001,photos:["data:image/jpeg;base64,"+"x".repeat(1000)],description:"private large detail"}));
  const data = mapCollection(records);
  assert.equal(data.features.length, 10000);
  assert.deepEqual(data.features[42].properties,{slug:"home-42"});
  const payload = JSON.stringify(data);
  assert.ok(!payload.includes("photos"));
  assert.ok(!payload.includes("description"));
  assert.ok(payload.length < 1800000);
});

test("invalid coordinates do not enter the map worker; zero coordinates are valid", () => {
  const points = [[44,41],[0,0],[181,41],[44,91],[NaN,41],[44,Infinity],["44",41]];
  assert.equal(mapCollection(points.map(([longitude,latitude],i)=>({slug:String(i),longitude,latitude}))).features.length,2);
});

test("large map uses one clustered source and no per-listing DOM markers", async () => {
  const map = await readFile(new URL("../app/real-estate/map/MapWorkspace.tsx", import.meta.url), "utf8");
  assert.ok(map.includes("cluster: true"));
  assert.ok(map.includes('type: "symbol"'));
  assert.ok(!map.includes("new maplibregl.Marker"));
  assert.ok(!map.includes('map.on("move"'));
  assert.ok(map.includes('[showHomes,setShowHomes] = useState(false)'));
  assert.ok(map.includes('import "../../map-worker"'));
  const worker=await readFile(new URL("../app/map-worker.ts",import.meta.url),"utf8");
  assert.ok(worker.includes("?worker&url"));
});
