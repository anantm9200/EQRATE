import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function greenHue(r:number,g:number,b:number):boolean{
 const rgb=[r,g,b].map(x=>x/255);
 const max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
 const light=(max+min)/2;
 if(delta===0)return false;
 let hue=max===rgb[0]?((rgb[1]-rgb[2])/delta)%6:
  max===rgb[1]?(rgb[2]-rgb[0])/delta+2:(rgb[0]-rgb[1])/delta+4;
 hue=(hue*60+360)%360;
 const saturation=delta/(1-Math.abs(2*light-1));
 return hue>=78&&hue<=178&&saturation>=.045;
}
function channels(hex:string):number[]{
 const h=hex.slice(1);
 if(h.length===3)return [...h].map(x=>parseInt(x+x,16));
 return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
}
test('every imported stylesheet uses blue/neutral pigments; only real success state retains green',()=>{
 const layout=readFileSync('app/layout.tsx','utf8');
 const files=[...layout.matchAll(/import '\.\/([^']+\.css)';/g)].map(m=>m[1]);
 assert.ok(files.length>12,'Imported stylesheets need to be audited, not just the last theme layer');
 for(const file of files){
  const css=readFileSync('app/'+file,'utf8');
  for(const color of css.match(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/gi)||[]){
   const swatch=channels(color);
   if(!greenHue(swatch[0],swatch[1],swatch[2]))continue;
   // Semantic operational readiness is permitted; branding green is not.
   assert.equal(file,'creqor-blue-compact.css','Unexpected green swatch '+color+' in '+file);
   assert.equal(color.toLowerCase(),'#248a58','Unexpected nonsemantic green swatch '+color);
  }
  for(const match of css.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[0-9.]+)?\s*\)/gi)){
   assert.ok(!greenHue(Number(match[1]),Number(match[2]),Number(match[3])),
    'Unexpected green RGB pigment '+match[0]+' in '+file);
  }
 }
});
test('homepage evidence panels and scroll progress use blue rather than green',()=>{
 const system=readFileSync('app/creqor-system.css','utf8');
 const unified=readFileSync('app/creqor-unified.css','utf8');
 assert.match(system,/\.ux-equation strong\{[^}]*color:#305fb9/i);
 assert.match(unified,/\.fx-scroll-progress\{background:linear-gradient\(90deg,#305fb9/i);
 assert.doesNotMatch(system,/\.ux-equation\{[^}]*background:#e(?:[a-f0-9]{5})/i);
});
