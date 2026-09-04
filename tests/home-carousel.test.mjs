import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/components/carousel-math.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {wrapSlide,shouldRotate,HERO_INTERVAL_MS} = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("autoplay pauses for interaction, offscreen tabs, and reduced motion",()=>{
  const normal={count:3,paused:false,hovered:false,focused:false,visible:true,inView:true,reducedMotion:false,touching:false};
  assert.equal(HERO_INTERVAL_MS,6500);
  assert.equal(shouldRotate(normal),true);
  for(const key of ["paused","hovered","focused","reducedMotion","touching"])assert.equal(shouldRotate({...normal,[key]:true}),false);
  for(const key of ["visible","inView"])assert.equal(shouldRotate({...normal,[key]:false}),false);
  assert.equal(shouldRotate({...normal,count:1}),false);
});

test("hero advances, goes back, and wraps at both ends",()=>{
  assert.equal(wrapSlide(1,3),1);
  assert.equal(wrapSlide(2,3),2);
  assert.equal(wrapSlide(3,3),0);
  assert.equal(wrapSlide(-1,3),2);
  assert.equal(wrapSlide(-7,3),2);
  assert.equal(wrapSlide(1,1),0);
  assert.equal(wrapSlide(1,0),0);
});

test("wallet has no seeded money and home polish does not override Turbo",async()=>{
  const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  const styles=await readFile(new URL("../app/home.css",import.meta.url),"utf8");
  assert.ok(page.includes('<small>JIBU საფულე</small><strong>0.00 ₾</strong>'));
  assert.ok(!page.includes("1,350.00"));
  assert.ok(!styles.includes("home-promotion-carousel"));
  assert.ok(!styles.includes("home-turbo-rail"));
});

test("hero has four distinct thematic assets with readable image alternatives",async()=>{
  const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  const hero=page.match(/function Hero\(\)[\s\S]*?<\/HeroCarousel>/)?.[0];
  assert.ok(hero);
  const sources=[...hero.matchAll(/src="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(sources,["/assets/concept/hero-ecosystem.webp","/assets/concept/hero-discover.webp","/assets/concept/marketplace-lifestyle.webp","/assets/concept/hero-black.webp"]);
  for(const source of sources){
    const bytes=await readFile(new URL(`../public${source}`,import.meta.url));
    assert.equal(bytes.subarray(8,12).toString(),"WEBP");
    assert.ok(bytes.length<700000,"hero asset must stay small enough for mobile");
  }
});
