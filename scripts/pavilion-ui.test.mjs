import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../assets/js/pavilion-ui.js',import.meta.url),'utf8');
function page(width,height,pixelRatio,finePointer=true){
 const attributes=new Set(),properties={},events=new Map(),queries=[],notifications=[];
 const pointer={matches:finePointer,addEventListener(name,fn){assert.equal(name,'change');this.change=fn}};
 const root={style:{setProperty:(name,value)=>properties[name]=value},hasAttribute:name=>attributes.has(name),toggleAttribute(name,enabled){if(enabled)attributes.add(name);else attributes.delete(name)}};
 const window={innerWidth:width,innerHeight:height,devicePixelRatio:pixelRatio,addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent:event=>notifications.push(event.type)};
 vm.runInNewContext(source,{document:{documentElement:root},window,Event:class{constructor(type){this.type=type}},matchMedia(query){if(query.includes('pointer: fine'))return pointer;const entry={query};queries.push(entry);return {addEventListener:(name,fn,options)=>{entry.change=fn;assert.equal(name,'change');assert(options.once)}}}});
 return {window,attributes,properties,events,queries,notifications,pointer};
}
for(const ratio of [1,1.25,1.5,2,2.25,2.5,3,4]){
 const hd=page(1920/ratio,1080/ratio,ratio),uhd=page(3840/ratio,2160/ratio,ratio);
 assert(Math.abs(hd.window.PAVILION_UI.scale*ratio-1)<1e-10,'FullHD physical UI size');
 assert(Math.abs(uhd.window.PAVILION_UI.scale*ratio-2)<1e-10,'4K physical UI size');
 assert(hd.attributes.has('data-pavilion-desktop'));assert(uhd.attributes.has('data-pavilion-desktop'));
}
for(const [width,height,ratio] of [[390,844,3],[844,390,3],[1280,720,1],[800,600,1]])assert.equal(page(width,height,ratio,false).window.PAVILION_UI.scale,1,'Compact viewports retain their existing UI size');
const resized=page(1920,1080,1);
Object.assign(resized.window,{innerWidth:3840,innerHeight:2160});resized.events.get('resize')();
assert.equal(resized.window.PAVILION_UI.scale,2);
Object.assign(resized.window,{innerWidth:1920,innerHeight:1080,devicePixelRatio:2});resized.queries.at(-1).change();
assert.equal(resized.window.PAVILION_UI.scale,1,'OS/browser scaling must not be counted twice');
assert.equal(resized.queries.at(-1).query,'(resolution: 2dppx)');
resized.pointer.matches=false;resized.pointer.change();
Object.assign(resized.window,{innerWidth:390,innerHeight:844,devicePixelRatio:3});resized.events.get('resize')();
assert(!resized.attributes.has('data-pavilion-desktop'));assert.equal(resized.properties['--pavilion-ui-scale'],'1');
assert(resized.notifications.includes('pavilion-ui-resize'));
const css=fs.readFileSync(new URL('../assets/css/pavilion.css',import.meta.url),'utf8');
assert(css.includes('width:9.375rem;height:9.375rem'),'Joystick dimensions follow the UI scale');
assert(css.includes('width:600px;height:216px'),'World-projected controls retain their scene units');
assert(css.includes('transform-origin:73px 70px'),'SVG viewBox coordinates must not scale twice');
assert(!source.includes('renderScale'));assert(!source.includes('canvas'));
console.log('Passed: FullHD/4K UI proportions at 100–400% combined Windows/browser density, compact fallback, resize/DPR changes, independent sharp DOM/SVG and scene coordinates.');
