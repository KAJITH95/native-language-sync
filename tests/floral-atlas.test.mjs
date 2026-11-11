import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const get = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = get('src/App.tsx');
const geo = get('src/data/worldAtlas.ts');
const countries = get('src/data/countries.ts');
const atlas = get('src/components/FloralAtlas.tsx');
const css = get('src/styles.css');
const floral = get('public/floral-world.svg');

test('every selectable destination has geographic coordinates', () => {
  const selectable = [...countries.matchAll(/^\s+code:\s*'([A-Z]{2})',/gm)].map(m => m[1]);
  const pinned = [...geo.matchAll(/^\s+([A-Z]{2}):\s*\[(-?[\d.]+),\s*(-?[\d.]+)\],/gm)];
  assert.equal(selectable.length,40);
  assert.deepEqual(new Set(pinned.map(m=>m[1])),new Set(selectable));
  for(const [,code,longitude,latitude] of pinned) {
    const lon=Number(longitude),lat=Number(latitude);
    assert.ok(lon>=-180 && lon<=180 && lat>=-60 && lat<=85,`${code} lies in map viewport`);
    const x=(lon+180)*(800/360),y=(85-lat)*(350/145);
    assert.ok(x>=0 && x<=800 && y>=0 && y<=350,`${code} pin on map`);
  }
});

test('world atlas is a real geographical silhouette, not a generic circle',()=>{
  const path=geo.match(/WORLD_LAND_PATH = `([^`]+)`;/)?.[1];
  assert.ok(path && path.length>15000);
  assert.match(atlas,/d=\{WORLD_LAND_PATH\}/);
  assert.match(atlas,/projectCountry\(country\.code\)/);
  assert.match(atlas,/key=\{country\.code\}/);
  assert.match(atlas,/language\.name/);
  assert.match(atlas,/aria-label/);
});

test('right panel binds live destination state to floral world map',()=>{
  assert.match(source,/<FloralAtlas country=\{selectedCountry\} language=\{selectedLanguage\}\/>/);
  assert.match(source,/<FloralGlobeMark\/>/);
  assert.match(source,/onChange=\{e=>changeCountry\(e\.target\.value\)\}/);
  assert.match(source,/onChange=\{e=>changeLanguage\(e\.target\.value\)\}/);
  assert.match(source,/fetch\('\/api\/translate'/);
  assert.match(source,/form action="\/auth\/logout"/);
  assert.doesNotMatch(source,/Source: \{detected\}/);
  assert.doesNotMatch(source,/Auto-translated · Review important details/);
});

test('floral illustration is local, subtle, and mobile/reduced-motion aware',()=>{
  for(const name of ['sakura','lotus','tulip','dahlia','hibiscus'])assert.match(floral,new RegExp(`id="${name}"`));
  assert.match(css,/url\('\/floral-world\.svg'\)/);
  assert.match(css,/@media\(max-width:580px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:root\[data-theme='dark'\] \.destination-atlas/);
});
