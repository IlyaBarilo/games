import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'assets/js/pavilion.js'), 'utf8');
function declaration(name) {
    const start = source.indexOf('function ' + name + '(');
    assert(start >= 0, 'Missing scene function: ' + name);
    let end = source.indexOf('{', start) + 1, depth = 1;
    while (depth && end < source.length) {
        if (source[end] === '{') depth++;
        if (source[end] === '}') depth--;
        end++;
    }
    assert.equal(depth, 0);
    return source.slice(start, end);
}
const context = {};
vm.createContext(context);
vm.runInContext(['transform', 'pivotZ', 'mul', 'exhibitClamp', 'exhibitEase', 'lagoonShotTime', 'lagoonActionState',
    'lagoonKrakenPose', 'lagoonCurvePoint', 'lagoonArmPoint', 'lagoonFloatState', 'lagoonFigurePose'].map(declaration).join('\n'), context);
for (let time = 0; time < 24; time += .1) {
    const model = context.lagoonKrakenPose(time);
    for (let column = 0; column < 3; column++) {
        assert(Math.abs(Math.hypot(...model.slice(column * 4, column * 4 + 3)) - 1) < 1e-6, 'Submersion must preserve the kraken size');
    }
    if (time > 17) assert(model[13] < -1, 'The whole kraken must move below the water');
    for (let piece = 0; piece < 4; piece++) {
        const state = context.lagoonFloatState(time, piece);
        if (state.amount > .999) assert(state.y >= .125 && state.y <= .135, 'Floating pieces must touch the water');
        const pose = context.lagoonFigurePose(time, piece);
        for (let column = 0; column < 3; column++) {
            assert(Math.abs(Math.hypot(...pose.slice(column * 4, column * 4 + 3)) - 1) < 1e-6, 'Pieces surface without growing');
        }
    }
}
const surfaced = context.lagoonKrakenPose(8);
assert(surfaced[13] + .40 - .44 < .135, 'The surfaced mantle must intersect the water');
assert(surfaced[13] + .425 > .135, 'The eyes must remain above water');
for(let time=4.8;time<=8.9;time+=.1)for(let arm=0;arm<8;arm++){
    const pose=context.lagoonKrakenPose(time),root=context.lagoonArmPoint(time,arm,0);
    assert(pose[13]+root[1]<.135,'Every arm must emerge from the water without hovering');
}
assert(surfaced[8] < -.6 && surfaced[10] > .6, 'Kraken must face the ship and the visitor in front of the screen');
const finalFlashEnd = context.lagoonShotTime(2) + .15;
assert.equal(context.lagoonActionState(finalFlashEnd).rise, 1);
assert(context.lagoonActionState(finalFlashEnd + .1).rise < 1, 'Retreat must start immediately after the final flash');
assert.equal(context.lagoonActionState(finalFlashEnd + 1.4).rise, 0, 'Kraken must promptly disappear below the water');
// Run the real hull construction with a mesh collector; every surface edge must close.
const surfaces = [];
const hull = {
    motion: null, lagoonShipPose() {}, exhibitBeam() {},
    mesh(vertices) { surfaces.push(vertices); },
    quad(a, b, c, d) { surfaces.push([a, b, c, a, c, d].flatMap(point => [...point, 0, 0])); }
};
vm.createContext(hull);
const hullStart = source.indexOf('function lagoonHullHalf(');
const hullEnd = source.indexOf('for(const side of [-1,1]){const rail=[];', hullStart);
assert(hullEnd > hullStart);
vm.runInContext(source.slice(hullStart, hullEnd), hull);
const edges = new Map();
const pointKey = point => point.map(value => Math.round(value * 1e6)).join(',');
let triangles = 0;
for (const vertices of surfaces) for (let index = 0; index < vertices.length; index += 15) {
    const points = [vertices.slice(index, index + 3), vertices.slice(index + 5, index + 8), vertices.slice(index + 10, index + 13)];
    const u = points[1].map((value, axis) => value - points[0][axis]);
    const v = points[2].map((value, axis) => value - points[0][axis]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (Math.hypot(...normal) < 1e-8) continue;
    triangles++;
    for (let corner = 0; corner < 3; corner++) {
        const edge = [pointKey(points[corner]), pointKey(points[(corner + 1) % 3])].sort().join('|');
        edges.set(edge, (edges.get(edge) || 0) + 1);
    }
    if (points.every(point => Math.abs(point[2] + 1.65) < 1e-6)) assert(normal[2] < 0, 'Stern normals must face aft');
}
assert(triangles > 100);
assert([...edges.values()].every(count => count === 2), 'The ship hull, stern and deck must form a closed mesh');
console.log('Passed: kraken submerges at fixed size, game pieces float on water, and ship hull has no open edges.');
// Thematic layout keeps every gallery reachable with clear places to stop and look.
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'catalog/games.js'), 'utf8'), catalogContext);
const layoutContext = {
    games: Array.from(catalogContext.window.GAMES_CATALOG.games.filter(game => game.available)),
    document: { querySelectorAll: () => [] }, window: { addEventListener() {} }
};
vm.createContext(layoutContext);
const layoutStart = source.indexOf('// Stand-group layout begin.');
const layoutEnd = source.indexOf('// Stand-group layout end.');
vm.runInContext(source.slice(layoutStart, layoutEnd) + '\nthis.snapshot={hall,walkBounds,standGroups,pavilionThemes,mainAisles,crossAisles};', layoutContext);
const plan = layoutContext.snapshot;
assert.equal(plan.standGroups.length, 12);
const themedIds = Array.from(plan.pavilionThemes.flatMap(theme => theme.games));
assert.equal(new Set(themedIds).size, plan.standGroups.length, 'Every exhibit must have exactly one theme');
assert(plan.standGroups.every(group => themedIds.includes(group.id)));
for (const group of plan.standGroups) {
    layoutContext.setStandPosition(group.id, group.position[0], group.position[2]);
    const view = layoutContext.standViewPoint(plan.standGroups.indexOf(group));
    for (const dx of [-2.8, 0, 2.8]) for (const dz of [-.75, 0, .75]) {
        assert(!layoutContext.insideStandFootprint(view[0] + dx, view[2] + dz), 'Observation bay must be clear: ' + group.id);
    }
}
for (const aisle of plan.mainAisles) for (let z = plan.walkBounds.back; z <= plan.walkBounds.front; z += .25) {
    for (const dx of [-1.5, 0, 1.5]) assert(!layoutContext.insideStandFootprint(aisle + dx, z), 'Main aisle must stay open');
}
for (const [index, z] of plan.crossAisles.entries()) for (let x = -14; x <= 14; x += .25) {
    for (const dz of index === plan.crossAisles.length - 1 ? [-1, 0, 1] : [-2, 0, 2]) {
        assert(!layoutContext.insideStandFootprint(x, z + dz), 'Cross aisle must stay open');
    }
}
// Exchanges must be atomic, reversible, and valid for every pair of occupied bays.
const initial = JSON.stringify(plan.standGroups.map(group => group.position));
for (let a = 0; a < plan.standGroups.length; a++) for (let b = a + 1; b < plan.standGroups.length; b++) {
 const first = plan.standGroups[a], second = plan.standGroups[b], beforeFirst = [...first.position], beforeSecond = [...second.position];
 layoutContext.swapStands(first.id, second.id);
 assert.deepEqual(Array.from(first.position), beforeSecond);
 assert.deepEqual(Array.from(second.position), beforeFirst);
 assert.deepEqual(Array.from(first.offset), beforeSecond.map((value, index) => value - first.anchor[index]));
 for (const aisle of plan.mainAisles) for (const group of plan.standGroups) for (const dx of [-1.5, 0, 1.5]) assert(!layoutContext.insideStandFootprint(aisle + dx, group.position[2]), 'Swapping must preserve main aisles');
 layoutContext.swapStands(first.id, second.id);
 assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), initial);
}
assert.throws(() => layoutContext.swapStands('tictac', 'tictac'));
assert.throws(() => layoutContext.swapStands('tictac', 'missing'));
assert.throws(() => layoutContext.setStandPosition('tictac', 0, -16));
assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), initial, 'Invalid exchange must leave layout intact');
const memory = new Map();
layoutContext.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key)};
layoutContext.swapStands('tictac', 'tictac-sea');
const exchanged = JSON.stringify(plan.standGroups.map(group => group.position));
assert(layoutContext.saveStandLayout());
assert(layoutContext.restoreStandLayout());
assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), exchanged);
assert(layoutContext.resetStandLayout());
assert.equal(memory.size, 0);
assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), initial);
layoutContext.swapStands('tictac', 'tictac-sea');layoutContext.saveStandLayout();
const saved = JSON.parse(memory.get('pavilion-layout-v1'));
layoutContext.resetStandLayout();memory.set('pavilion-layout-v1', JSON.stringify(saved));
assert(layoutContext.restoreStandLayout());assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), exchanged);
layoutContext.resetStandLayout();
for (const corrupt of ['{', JSON.stringify({...saved, base: 'outdated'}), JSON.stringify({...saved, stands: saved.stands.map(() => saved.stands[0])}), JSON.stringify({...saved, stands: saved.stands.map((g,i) => i === 0 ? {...g, position:[999,0,999]} : g)})]) {
 memory.set('pavilion-layout-v1', corrupt);assert.equal(layoutContext.restoreStandLayout(), false);
 assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), initial);
}
layoutContext.localStorage = {getItem(){throw Error('Denied')}, setItem(){throw Error('Denied')}, removeItem(){throw Error('Denied')}};
assert.equal(layoutContext.restoreStandLayout(), false);assert.equal(layoutContext.saveStandLayout(), false);assert.equal(layoutContext.resetStandLayout(), false);
assert.equal(JSON.stringify(plan.standGroups.map(group => group.position)), initial);
console.log('Passed: atomic exchanges of all 66 pairs, local persistence, invalid-state recovery and clear aisles for all 12 stands.');

// Exercise the tour controller without waiting through real-time pauses.
const demoElement = {setAttribute(){}, querySelector:()=>({textContent:''})};
const demoContext = {
 document:{getElementById:()=>demoElement,addEventListener(){}},
 canvas:{dataset:{},addEventListener(){}},
 stands:plan.standGroups.map(group=>Array.from(group.position)),
 games:layoutContext.games,eye:[0,1.7,6],pitch:.5,travel:null,destination:null,jump:{},
 keys:new Set(),hint(){},stopStick(){},keepSafeDistance(){},setZoom(){},
 blocked:()=>false,findRoute:(_x,_z,x,z)=>[[x,z]],roundWalkRoute:(_start,route)=>route
};
vm.createContext(demoContext);
vm.runInContext(source.slice(source.indexOf('// Demo tour begin.'),source.indexOf('// Demo tour end.')) + '\nthis.demo=demo;',demoContext);
demoContext.standViewPoint=i=>{const p=demoContext.stands[i];return [p[0],1.7,p[2]+8.8]};
demoContext.cancelWalk=()=>{demoContext.stopDemo();demoContext.travel=null;demoContext.destination=null};
demoContext.startDemo();
assert(demoContext.demo.active);assert.equal(new Set(demoContext.demo.order).size,12);
const tourOrder=Array.from(demoContext.demo.order),visits=[];
for(let step=0;step<13;step++){
 visits.push(demoContext.demo.target);demoContext.travel=null;demoContext.updateDemo(.04);
 assert.equal(demoContext.demo.phase,'viewing');assert.equal(demoContext.demo.remaining,14);
 const target=demoContext.demo.target;demoContext.updateDemo(13.9);assert.equal(demoContext.demo.target,target);
 demoContext.updateDemo(.11);assert.equal(demoContext.demo.phase,'walking');
}
assert.deepEqual(visits.slice(0,12),tourOrder);assert.equal(visits[12],visits[0]);
demoContext.cancelWalk();assert(!demoContext.demo.active);demoContext.updateDemo(60);assert.equal(demoContext.travel,null);
demoContext.blocked=()=>true;demoContext.startDemo();assert(!demoContext.demo.active);assert.equal(demoContext.travel,null);
demoContext.blocked=()=>false;demoContext.findRoute=()=>null;demoContext.startDemo();assert(!demoContext.demo.active);
console.log('Passed: demo visits all stands, waits, loops, stops on manual cancellation and handles missing routes.');

// Moving exhibits must stay clear of their signs and finish turns smoothly.
const exhibitContext = {};
vm.createContext(exhibitContext);
const cloudRouteDeclaration = source.match(/const cloudRoute=([^;]+);/)[0];
vm.runInContext(cloudRouteDeclaration + '\n' + ['exhibitClamp','exhibitEase','cloudSceneState','courierSceneState','courierDeckHalfWidth'].map(declaration).join('\n'), exhibitContext);
for(let t=0;t<12;t+=.002){const p=exhibitContext.cloudSceneState(t);if(Math.abs(p.x)<1.8&&p.y>.4+3.48)assert(p.z-.23>-31.725,'Cloud hero must pass in front of the game sign');if(Math.abs(p.x)<2.4&&p.y+.42>4.565)assert(p.z-.23>-31.875,'Cloud hero must pass in front of the theme sign')}
for(const boundary of [0,1.92,8.32,10.24,16]){const before=exhibitContext.courierSceneState((boundary+16-.0001)%16),after=exhibitContext.courierSceneState((boundary+.0001)%16);assert(Math.abs(before.heading-after.heading)<.001,'Courier heading must be continuous across phases');}
for(let t=.001;t<16;t+=.001){const a=exhibitContext.courierSceneState(t-.001),b=exhibitContext.courierSceneState(t);assert(Math.abs(b.heading-a.heading)/.001<2.5,'Courier must turn without snapping');}
// Independent intersection with every edge of the octagon checks the stripe clearance.
function actualDeckWidth(z){const points=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*3.03,-23+Math.sin(i*Math.PI/4)*2.48]),xs=[];for(let i=0;i<8;i++){const a=points[i],b=points[(i+1)%8];if(z>=Math.min(a[1],b[1])&&z<=Math.max(a[1],b[1])&&a[1]!==b[1])xs.push(a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]))}return Math.max(...xs);}
for(let k=0;k<7;k++){
 const z=-24.8+k*.65,half=Math.min(exhibitContext.courierDeckHalfWidth(z-.008),exhibitContext.courierDeckHalfWidth(z+.008))-.10;
 for(const edge of [z-.008,z+.008])assert(half+.09<actualDeckWidth(edge),'Courier stripe must end inside deck');
 const lightZ=-24.6+k*.60,x=Math.min(2.78,exhibitContext.courierDeckHalfWidth(lightZ-.08)-.10,exhibitContext.courierDeckHalfWidth(lightZ+.08)-.10);
 for(const edge of [lightZ-.08,lightZ+.08])assert(x+.04<actualDeckWidth(edge),'Courier light must stay inside deck');
}
console.log('Passed: cloud jumps clear both signs, courier heading is smooth, stripes and edge lights fit the octagon.');

vm.runInContext(['moonflowerPose','moonflowerHead','moonflowerStemPoint','moonflowerStemVertices','fireflyScenePose'].map(declaration).join('\n'), context);
const stemVertices=context.moonflowerStemVertices(),stemEdges=new Map();
for(let offset=0;offset<stemVertices.length;offset+=15){const points=[0,5,10].map(i=>Array.from(stemVertices.slice(offset+i,offset+i+3)).map(v=>v.toFixed(7)).join(','));for(let edge=0;edge<3;edge++){const key=[points[edge],points[(edge+1)%3]].sort().join('|');stemEdges.set(key,(stemEdges.get(key)||0)+1)}}
assert([...stemEdges.values()].every(count=>count===2),'Flower stem must have shared rings and closed ends');
let quiet=0,arrival=0;
for(let t=0;t<16;t+=.02){const m=context.moonflowerPose(t),head=context.moonflowerHead(t),angle=Math.abs(Math.atan2(m[1],m[0]));assert(Math.abs(m[0]*-5.8+m[4]*.31+m[12]+5.8)<1e-5,'Stem base must stay fixed');assert(Math.hypot(head[0]+5.82,head[1]-1.70)<.09,'Flower sway must stay gentle');if(t<6)quiet=Math.max(quiet,angle);if(t>8.5&&t<11)arrival=Math.max(arrival,angle)}
assert(arrival>quiet*2,'Flower must respond more strongly while the swarm gathers');
for(let k=0;k<24;k++){const head=context.moonflowerHead(9.5),bug=context.fireflyScenePose(9.5,k);assert(Math.hypot(bug[0]-head[0],bug[1]-head[1],bug[2]-head[2]-.23)<.38,'Swarm must gather around the moving flower')}
console.log('Passed: flower stem is closed, base stays fixed, sway reacts to the swarm and fireflies track the moving flower.');

const solidContext={faces:[],quad(...args){solidContext.faces.push(args.slice(0,4))}};
vm.createContext(solidContext);vm.runInContext(declaration('box'),solidContext);solidContext.box(0,0,0,2,3,4,[.5,.5,.5]);
assert.equal(solidContext.faces.length,6,'Solid boxes must have all six faces');
assert(solidContext.faces.some(face=>face.every(p=>p[1]===0)),'The bottom face must exist');
const boxEdges=new Map();for(const face of solidContext.faces)for(let i=0;i<4;i++){const key=[face[i].join(','),face[(i+1)%4].join(',')].sort().join('|');boxEdges.set(key,(boxEdges.get(key)||0)+1)}assert([...boxEdges.values()].every(count=>count===2),'Every box edge must join two faces');
assert.equal(demoContext.demoViewPoint(0)[2],demoContext.standViewPoint(0)[2]-.9,'Demo must stop closer to each exhibit');
console.log('Passed: six-sided boxes are closed and demo observation points are closer.');

const softContext={};vm.createContext(softContext);vm.runInContext(['roundedPlatformContour','ovalPlatformContour','cloudPlatformContour','platformSlice','softPlatformGeometry'].map(declaration).join('\n'),softContext);
function insideContour(point,contour){let inside=false;for(let i=0,j=contour.length-1;i<contour.length;j=i++){const a=contour[i],b=contour[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
for(const contour of [softContext.roundedPlatformContour(0,0,6.2,5.5,.42),softContext.ovalPlatformContour(0,0,3.08,2.62),softContext.cloudPlatformContour(0,0,3.04,2.525)]){
 assert(contour.length>=48);assert(contour.every(p=>p.every(Number.isFinite)));assert(insideContour([0,0],contour));assert(contour.every(p=>Math.abs(p[0])<=3.10001&&Math.abs(p[1])<=2.75001),'Soft contours must retain the reserved stand footprint');
 const geometry=softContext.softPlatformGeometry(contour,.13),edges=new Map();
 for(const vertices of Object.values(geometry))for(let k=0;k<vertices.length;k+=15){const ps=[0,5,10].map(j=>vertices.slice(k+j,k+j+3).map(v=>v.toFixed(7)).join(','));assert(new Set(ps).size===3,'Slab triangles must not collapse');for(let i=0;i<3;i++){const key=[ps[i],ps[(i+1)%3]].sort().join('|');edges.set(key,(edges.get(key)||0)+1)}}
 assert([...edges.values()].every(count=>count===2),'Bevelled slab must have closed sides and bottom');
}
const rounded=softContext.roundedPlatformContour(0,0,6.2,5.5,.42);assert(!insideContour([3.08,2.73],rounded),'Rounded corners must cut back the old sharp corner');
const reefOval=softContext.ovalPlatformContour(0,-24.55,3.07,2.62);
for(const [x,z,rx,rz]of [[2.4,-24.7,.48,.35],[1.30,-26.15,.48,.35],[-1.30,-26.15,.48,.35],[1.50,-22.8,.39,.32],[-1.50,-22.8,.39,.32]])for(let k=0;k<48;k++){const a=k*Math.PI/24;assert(insideContour([x+Math.cos(a)*rx,z+Math.sin(a)*rz],reefOval),'Reef ground decoration must fit its oval base')}
const lab=softContext.roundedPlatformContour(-8,-23,6.1,5.4,.42);
for(let k=0;k<10;k++){const x=-10.74+k*.61,slice=softContext.platformSlice(lab,x-.29,x+.29);assert(slice.length>=4);assert(slice.every(p=>p[0]>=x-.290001&&p[0]<=x+.290001),'Wooden boards must be clipped to the floor contour')}
console.log('Passed: smooth base contours fit stand bounds, bevelled slabs are closed, reef decor and wooden planks fit their new edges.');

// Exercise the real route planner at sub-grid distances from an oval edge.
const navigation={walkBounds:{left:-6,right:6,back:-6,front:6},animTime:0,props:[],
 robotDrive:()=>({x:100,z:100}),standOffset:()=>[0,0,0],benchmarkVisible:()=>true};
vm.createContext(navigation);
vm.runInContext(['pointSegmentDistance2','contourBlocksSegment','footprintShape','standFootprintBlocked','insideStandFootprint','ovalPlatformContour','blocked','clearLine','findRoute','roundWalkRoute'].map(declaration).join('\n')+`
this.standGroups=[{position:[0,0,0],bounds:{left:-3,right:3,back:-2.5,front:2.5},footprints:[footprintShape(ovalPlatformContour(0,0,3,2.5))]}];`,navigation);
assert(!navigation.blocked(2.8,2.3),'Empty oval corners must be available for walking');
assert(navigation.blocked(3.2,0),'Visitor clearance must still protect the real edge');
assert(!navigation.clearLine([-4,0],[4,0]),'A route must not cross the oval');
let navigationCases=0;
for(let k=0;k<32;k++){
 const a=k*Math.PI/16,start=[Math.cos(a)*3.31,Math.sin(a)*2.81];
 for(const turn of [.015,.5,2.5]){
  const end=[Math.cos(a+turn)*3.31,Math.sin(a+turn)*2.81],route=navigation.findRoute(...start,...end);
  assert(route,'Free points beside an oval must have a route');let previous=start;
  for(const p of navigation.roundWalkRoute(start,route)){
   assert(navigation.clearLine(previous,p),'Rounded routes must retain safe start, corners and endpoint');
   const count=Math.max(1,Math.ceil(Math.hypot(p[0]-previous[0],p[1]-previous[1])/.01));
   for(let j=0;j<=count;j++)assert(!navigation.blocked(previous[0]+(p[0]-previous[0])*j/count,previous[1]+(p[1]-previous[1])*j/count),'Walking must not encounter a hidden blocked sample');
   previous=p;
  }assert.deepEqual(Array.from(previous),end);navigationCases++;
 }
}
navigation.standGroups[0].position=[2,0,-2];assert(navigation.blocked(2,-2));assert(!navigation.blocked(-2.8,2.3),'Footprints must move with their stand');
navigation.standGroups=[];navigation.props=[{x:.053,z:0,r:0,group:0}];assert(!navigation.clearLine([0,.249],[.12,.249]),'Swept collision must catch a tiny obstacle between former sample points');
console.log('Passed: '+navigationCases+' routes beside oval edges, exact segment clearance, sub-grid endpoints and moved footprints.');

navigation.props=[];navigation.standGroups=[{position:[0,0,0],bounds:{left:-3,right:3,back:-2.5,front:2.5},footprints:[navigation.footprintShape(navigation.ovalPlatformContour(0,0,3,2.5))]}];
Object.assign(navigation,{eye:[-4,1.7,0],stands:[[4,0,0]],reduced:{matches:false},keys:new Set(),jump:{},canvas:{focus(){}},stopStick(){},hint(){},cancelWalk(){navigation.travel=null;navigation.destination=null},standViewPoint:()=>[4,1.7,0]});
vm.runInContext(declaration('go'),navigation);navigation.go('0');
assert.equal(navigation.travel.kind,'walk','Map navigation must use a walking route instead of a straight flight');
assert(navigation.travel.speed>6,'Map navigation must stay faster than ordinary walking');
assert.equal(navigation.travel.faceIndex,0);let mapPrevious=[-4,0];
for(const point of navigation.travel.route){assert(navigation.clearLine(mapPrevious,point),'Map navigation must go around the stand');mapPrevious=point}
assert.deepEqual(Array.from(mapPrevious),[4,0]);

// The loader must wait for actual preview settlement and a rendered frame.
const loadingSource=fs.readFileSync(path.join(root,'assets/js/pavilion-loading.js'),'utf8');
function loadingFixture(){
 const elements=new Map(),frames=[],timers=[],listeners=[];
 for(const id of ['pavilion-loading','loading-stage','loading-caption','games','loading-title','loading-progress'])elements.set(id,{hidden:false,textContent:'',attributes:{},classList:{values:new Set(),add(value){this.values.add(value)}},setAttribute(name,value){this.attributes[name]=value}});
 const scope={document:{getElementById:id=>elements.get(id)},window:{addEventListener(...args){listeners.push(args)}},requestAnimationFrame:fn=>frames.push(fn),setTimeout:fn=>timers.push(fn),setInterval:()=>0,clearInterval(){}};
 vm.runInNewContext(loadingSource,scope);return {api:scope.window.PAVILION_LOADING,elements,frames,timers,listeners};
}
const loading=loadingFixture();assert(loading.elements.get('games').inert);
loading.frames.shift()();assert.equal(loading.frames.length,1);loading.frames.shift()();await loading.api.painted;
loading.api.start(2);loading.api.frameRendered();assert(!loading.elements.get('pavilion-loading').classList.values.has('is-ready'));
loading.api.previewDone();loading.api.sceneInitialized();assert.equal(await loading.api.initialized,true);
loading.api.frameRendered();assert(!loading.elements.get('pavilion-loading').classList.values.has('is-ready'));
loading.api.previewDone();assert(!loading.elements.get('pavilion-loading').classList.values.has('is-ready'),'Last preview must be drawn before removing the cover');
loading.api.frameRendered();assert.equal(loading.elements.get('games').inert,false);assert(loading.elements.get('pavilion-loading').classList.values.has('is-ready'));
loading.timers.shift()();assert(loading.elements.get('pavilion-loading').hidden);
const failedLoading=loadingFixture();failedLoading.listeners[0][1]({target:{tagName:'SCRIPT',src:'https://example.test/assets/js/pavilion.js'}});
assert.equal(await failedLoading.api.initialized,false);failedLoading.api.sceneInitialized();failedLoading.api.frameRendered();
assert(failedLoading.elements.get('pavilion-loading').classList.values.has('has-error'));assert(!failedLoading.elements.get('pavilion-loading').hidden);assert(failedLoading.elements.get('loading-progress').hidden);
console.log('Passed: map travel follows safe paths; loading waits for previews and a rendered frame and handles script failures.');
