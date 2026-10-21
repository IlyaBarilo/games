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
    'cacheAnimationState', 'lagoonKrakenPose', 'lagoonCurvePoint', 'lagoonArmCurve', 'lagoonArmPoint', 'lagoonFloatState', 'lagoonFigurePose'].map(declaration).join('\n'), context);
vm.runInContext('const lagoonArmCurves=cacheAnimationState(lagoonArmCurve);',context);
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
vm.runInContext('const moonflowerHeads=cacheAnimationState(moonflowerHead);',context);
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
function loadingFixture(random=Math.random){
 const elements=new Map(),frames=[],timers=[],listeners=[];
 for(const id of ['pavilion-loading','loading-stage','loading-caption','loading-mascot','loading-fallback','games','loading-title','loading-progress'])elements.set(id,{hidden:id==='loading-fallback',textContent:'',dataset:{},attributes:{},classList:{values:new Set(),add(value){this.values.add(value)}},setAttribute(name,value){this.attributes[name]=value}});
 const scope={Math:{floor:Math.floor,random},document:{getElementById:id=>elements.get(id)},window:{addEventListener(...args){listeners.push(args)}},requestAnimationFrame:fn=>frames.push(fn),setTimeout:fn=>timers.push(fn),setInterval:()=>0,clearInterval(){}};
 vm.runInNewContext(loadingSource,scope);return {api:scope.window.PAVILION_LOADING,elements,frames,timers,listeners};
}
const loading=loadingFixture();assert(loading.elements.get('games').inert);
assert(loading.elements.get('loading-fallback').hidden,'Normal loading must not offer a shortcut out of the pavilion');
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
assert(!failedLoading.elements.get('loading-fallback').hidden,'GameSpace remains available when the pavilion cannot open');
console.log('Passed: map travel follows safe paths; loading waits for previews and a rendered frame and handles script failures.');
for(const [i,name]of ['robot','kraken','firefly','rocket'].entries()){
 const fixture=loadingFixture(()=>i/4+.01),caption=fixture.elements.get('loading-caption');
 assert.equal(fixture.elements.get('loading-mascot').dataset.character,name);
 assert.equal(/кракен/i.test(caption.textContent),name==='kraken','Kraken captions must belong only to the kraken');
 fixture.api.start(12);fixture.api.sceneInitialized();fixture.api.previewDone();
 assert(caption.textContent.includes('1 из 12'),'Every mascot must retain the live preview count');
 assert.equal(/кракен/i.test(caption.textContent),name==='kraken');
}
console.log('Passed: loading captions match all four mascots and preserve the live preview count.');

// Visibility rejects only fully outside boxes, including moved and animated models.
const renderContext={Float32Array,Map,identity:new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),standOffset:group=>group===1?[7,0,-3]:[0,0,0]};
vm.createContext(renderContext);
vm.runInContext(['combinedBounds','viewFrustum','boundsInView','objectMatrix','transform'].map(declaration).join('\n'),renderContext);
const clip=renderContext.viewFrustum(renderContext.identity),boxBounds={center:[0,0,0],extent:[.2,.3,.4]};
assert(renderContext.boundsInView(boxBounds,renderContext.identity,clip));
for(const [x,y,z] of [[2,0,0],[-2,0,0],[0,2,0],[0,-2,0],[0,0,2],[0,0,-2]])assert(!renderContext.boundsInView(boxBounds,renderContext.transform(x,y,z),clip));
assert(renderContext.boundsInView(boxBounds,renderContext.transform(1.1,0,0),clip),'Boxes crossing the screen edge must stay visible');
assert(renderContext.boundsInView({center:[0,0,0],extent:[20,20,20]},renderContext.identity,clip),'A box enclosing the viewer must stay visible');
let rejected=0;
for(let i=0;i<400;i++){
 const m=renderContext.transform(Math.sin(i*.83)*3,Math.cos(i*.27)*2,Math.sin(i*.31)*3,i*.17);
 for(const col of [0,4,8])for(let row=0;row<3;row++)m[col+row]*=.2+(i%7)*.3;
 const corners=[];for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1]){const p=[a*.2,b*.3,c*.4];corners.push([0,1,2].map(j=>m[j]*p[0]+m[j+4]*p[1]+m[j+8]*p[2]+m[j+12]));}
 if(!renderContext.boundsInView(boxBounds,m,clip)){rejected++;assert([0,1,2].some(axis=>corners.every(p=>p[axis]<-1)||corners.every(p=>p[axis]>1)),'Culling must not reject any potentially visible corner');}
}
assert(rejected>100);
const combined=renderContext.combinedBounds([{bounds:boxBounds},{bounds:{center:[3,2,-1],extent:[1,.5,.2]}}]);
for(const [i,value] of [1.9,1.1,-.4].entries())assert(Math.abs(combined.center[i]-value)<1e-12);
for(const [i,value] of [2.1,1.4,.8].entries())assert(Math.abs(combined.extent[i]-value)<1e-12);
let poseCalls=0;const motion=t=>{poseCalls++;return renderContext.transform(t,0,0)},modelCache=new Map();
const first=renderContext.objectMatrix({group:0,motion},2,modelCache);
assert.strictEqual(first,renderContext.objectMatrix({group:0,motion},2,modelCache));
const moved=renderContext.objectMatrix({group:1,motion},2,modelCache);assert.equal(moved[12],9);assert.equal(moved[14],-3);assert.equal(first[12],2);assert.equal(poseCalls,2);
assert.equal(renderContext.objectMatrix({group:1,motion},3,new Map())[12],10,'Each new frame recomputes animation and layout transforms');

let pointers=0,bindings=0;
const attributes={gl:{ARRAY_BUFFER:1,FLOAT:2,bindBuffer(){},enableVertexAttribArray(){},disableVertexAttribArray(){},vertexAttribPointer(){pointers++}},attrP:0,attrUV:1,attrNormal:2,attrTint:3,vertexArrays:{createVertexArrayOES:()=>({}),bindVertexArrayOES(){bindings++}}};
vm.createContext(attributes);vm.runInContext(declaration('bindRenderGeometry'),attributes);
const elementBindings=[];attributes.gl.ELEMENT_ARRAY_BUFFER=4;attributes.gl.bindBuffer=(target,buffer)=>{if(target===4)elementBindings.push(buffer)};
const geometry={buffer:{},indexBuffer:{},batched:true};attributes.bindRenderGeometry(geometry);attributes.bindRenderGeometry(geometry);assert.equal(pointers,4);assert.equal(bindings,2);assert.deepEqual(elementBindings,[geometry.indexBuffer],'The index buffer is captured once by the VAO');
attributes.vertexArrays=null;pointers=0;attributes.bindRenderGeometry({buffer:{}});attributes.bindRenderGeometry({buffer:{}});assert.equal(pointers,6,'Browsers without the optional extension retain ordinary WebGL attributes');attributes.bindRenderGeometry(geometry);attributes.bindRenderGeometry(geometry);assert.equal(elementBindings.length,3,'Without VAOs, each indexed draw rebinds its own element buffer');

let uploads=0,deletions=0;const batchUploads=[];
const batching={objects:[],renderItems:[],batchedObjectCount:-1,motionIds:new WeakMap(),nextMotionId:1,canvas:{dataset:{}},vertexArrays:null,uintIndices:false,combinedBounds:renderContext.combinedBounds,gl:{ARRAY_BUFFER:1,STATIC_DRAW:2,createBuffer:()=>({}),bindBuffer(){},bufferData(target,data){uploads++;batchUploads.push(Array.from(data))},deleteBuffer(){deletions++}}};
vm.createContext(batching);vm.runInContext(['writeRenderVertices','indexRenderVertices','rebuildRenderBatches'].map(declaration).join('\n'),batching);
const part={group:0,n:3,vertices:[0,0,0,0,0,1,0,0,1,0,0,1,0,0,1],color:[1,1,1],bounds:boxBounds,emission:0};batching.objects.push(part);batching.rebuildRenderBatches();const originalBatch=batching.renderItems[0];assert.equal(uploads,1);
batching.objects.push({...part,texture:{}});batching.rebuildRenderBatches();assert.equal(uploads,1);assert.strictEqual(batching.renderItems[0],originalBatch);assert.equal(batching.renderItems.length,2,'New previews append without replacing unchanged geometry');
batching.objects.push({...part});batching.rebuildRenderBatches();assert.equal(uploads,2);assert.equal(deletions,1,'A genuine small geometry change replaces only the vertex buffer');
assert.deepEqual(batchUploads[1],[...batchUploads[0],...batchUploads[0]],'Small batches retain exact ordinary drawing');
const manyTriangles=Array.from({length:200},()=>part.vertices).flat();batching.objects=[{...part,n:600,vertices:manyTriangles}];batching.batchedObjectCount=-1;batching.rebuildRenderBatches();assert.equal(uploads,4);assert.equal(deletions,2);assert(batching.renderItems[0].indexBuffer,'Large repeated geometry receives an index buffer');
assert.deepEqual(batchUploads[2],batchUploads[0]);assert.deepEqual(batchUploads[3],Array.from({length:600},(_,i)=>i%3));
batching.batchedObjectCount=-1;batching.rebuildRenderBatches();assert.equal(uploads,6);assert.equal(deletions,4,'A full repack releases both old vertex and index buffers');
assert.deepEqual(batchUploads.slice(4),batchUploads.slice(2,4),'Repeated indexed packing is deterministic');
console.log('Passed: conservative view culling, shared model transforms, optional vertex arrays and incremental preview uploads.');

// Indexing must preserve all Float32 bits, seams, winding and triangle order.
const indexing={};vm.createContext(indexing);vm.runInContext(declaration('indexRenderVertices'),indexing);
const attributes11=[1,2,3,.25,.75,0,1,0,.2,.4,.6],variants=[attributes11];
for(const attribute of Array.from({length:11},(_,i)=>i)){const different=attributes11.slice();different[attribute]+=.125;variants.push(different)}
const signed=attributes11.slice();signed[5]=-0;variants.push(signed);
const ordered=[...variants,...variants.slice().reverse(),...variants],data11=new Float32Array(ordered.flat()),originalBits=new Uint32Array(data11.buffer).slice();
const indexed=indexing.indexRenderVertices(data11,false);assert.equal(indexed.vertices.length,variants.length*11);assert.equal(indexed.indices.BYTES_PER_ELEMENT,2);
const compactBits=new Uint32Array(indexed.vertices.buffer),restoredBits=new Uint32Array(data11.length);
indexed.indices.forEach((id,i)=>restoredBits.set(compactBits.subarray(id*11,(id+1)*11),i*11));assert.deepEqual(restoredBits,originalBits);assert.deepEqual(new Uint32Array(data11.buffer),originalBits,'Packing does not mutate its input');
const uniqueData=new Float32Array(variants.flat());assert.strictEqual(indexing.indexRenderVertices(uniqueData,true).vertices,uniqueData,'Unhelpful indexing retains ordinary drawing');
assert.equal(indexing.indexRenderVertices(new Float32Array(),false).vertices.length,0);assert.strictEqual(indexing.indexRenderVertices(data11,false,300).vertices,data11,'Small batches can skip indexing and its allocation cost');
function repeatedVertices(unique){const data=new Float32Array(unique*22);for(let i=0;i<unique*2;i++)data[i*11]=i%unique;return data}
const edge16=indexing.indexRenderVertices(repeatedVertices(65536),false);assert.equal(edge16.indices.BYTES_PER_ELEMENT,2);assert.equal(edge16.indices[65535],65535);assert.equal(edge16.indices[65536],0);
const needs32=repeatedVertices(65537),fallback32=indexing.indexRenderVertices(needs32,false);assert.strictEqual(fallback32.vertices,needs32);assert.equal(fallback32.indices,undefined,'WebGL1 without uint extension never receives a 32-bit index');
const edge32=indexing.indexRenderVertices(needs32,true);assert.equal(edge32.indices.BYTES_PER_ELEMENT,4);assert.equal(edge32.indices[65536],65536);assert.equal(edge32.indices[65537],0);
for(let i=0;i<edge32.indices.length;i++)assert.equal(edge32.vertices[edge32.indices[i]*11],needs32[i*11],'Hash collisions cannot merge distinct vertices');
console.log('Passed: lossless indexed triangles, UV/normal/color seams, signed zero, hash collisions, 16/32-bit limits and extension fallback.');

// Exact-time shared poses must advance, rewind and keep distinct articulated parts separate.
const memoScope={};vm.createContext(memoScope);vm.runInContext(declaration('cacheAnimationState'),memoScope);
let calculations=0;const pose=memoScope.cacheAnimationState((time,part)=>{calculations++;return [time,part]});
const same=pose(8.25,3);assert.strictEqual(pose(8.25,3),same);assert.notStrictEqual(pose(8.25,4),same);assert.equal(calculations,2);
assert.deepEqual(pose(8.26,3),[8.26,3]);assert.notStrictEqual(pose(8.25,3),same,'Rewinding must discard the previous frame cache');assert.equal(calculations,4);
let zeroCalls=0;const zero=memoScope.cacheAnimationState(()=>{zeroCalls++;return 0});zero(0);zero(0);assert.equal(zeroCalls,1);

// A model can be built and picked without a GPU allocation. Only visible individual geometry uploads.
let createdBuffers=0,individualUploads=0;const uploaded=[];
const lazy={objects:[],activeStandGroup:-1,activePlatform:-1,activeBenchmarkVariant:0,emissive:0,motion:null,waterline:null,
 gl:{ARRAY_BUFFER:1,STATIC_DRAW:2,FLOAT:3,createBuffer(){createdBuffers++;return {}},bindBuffer(){},bufferData(target,data){individualUploads++;uploaded.push(Array.from(data))},enableVertexAttribArray(){},disableVertexAttribArray(){},vertexAttribPointer(){}},
 vertexArrays:null,attrP:0,attrUV:1,attrNormal:2,attrTint:3};
vm.createContext(lazy);vm.runInContext(['geometryBounds','writeRenderVertices','mesh','bindRenderGeometry'].map(declaration).join('\n'),lazy);
const triangle=[0,0,0,0,0,1,0,0,1,0,0,1,0,0,1];lazy.mesh(triangle,[1,.5,0]);lazy.mesh(triangle,[0,.5,1]);
assert.equal(createdBuffers,0);assert.equal(individualUploads,0);assert.strictEqual(lazy.objects[0].vertices,triangle,'Precise picking retains its source triangles');
lazy.bindRenderGeometry(lazy.objects[0]);lazy.bindRenderGeometry(lazy.objects[0]);assert.equal(createdBuffers,1);assert.equal(individualUploads,1);
assert.deepEqual(uploaded[0],[0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,0,1,0,0,1,0,0,1]);assert.equal(lazy.objects[1].buffer,null,'Unseen individual geometry stays off the GPU');

assert(lazy.objects.every(o=>!('expanded' in o)),'Meshes do not retain intermediate upload arrays');
// Preserve positions, UVs, winding, normalized normals and colors, including degenerate triangles.
const uploadScope={};vm.createContext(uploadScope);vm.runInContext(declaration('writeRenderVertices'),uploadScope);
const vertices=[0,0,0,.1,.2,1,0,0,.3,.4,0,3,4,.5,.6, 1,2,3,1,0,1,2,3,0,1,1,2,3,1,1];
const normals=[[0,-.8,.6],[0,0,0]],tint=[.12,.46,.789],expected=[];
for(let t=0;t<2;t++)for(let v=0;v<3;v++)expected.push(...vertices.slice(t*15+v*5,t*15+v*5+5),...normals[t],...tint);
const packed=new Float32Array(68).fill(99),sourceCopy=vertices.slice();
assert.equal(uploadScope.writeRenderVertices(vertices,packed,1,tint),67);assert.equal(packed[0],99);assert.equal(packed[67],99);
assert.deepEqual(Array.from(packed.slice(1,67)),Array.from(new Float32Array(expected)));assert.deepEqual(vertices,sourceCopy);

// All parts of one button share a pose, but different buttons and stands remain independent.
let clock=1000;const timers=[],buttonScope={buttonPresses:new Map(),buttonMotions:new Map(),pendingButton:false,performance:{now:()=>clock},setTimeout:(fn,delay)=>timers.push({fn,delay}),transform:renderContext.transform};
vm.createContext(buttonScope);vm.runInContext(['buttonMotion','pressButton'].map(declaration).join('\n'),buttonScope);
const pressPose=buttonScope.buttonMotion(0,'play','actions');assert.strictEqual(pressPose,buttonScope.buttonMotion(0,'play','actions'));
assert.notStrictEqual(pressPose,buttonScope.buttonMotion(1,'play','actions'));assert.notStrictEqual(pressPose,buttonScope.buttonMotion(0,'info','actions'));
const difficultyPose=buttonScope.buttonMotion(0,'diff0','difficulty'),benchmarkPose=buttonScope.buttonMotion(5,'benchmark2','difficulty');let actions=0;
buttonScope.pressButton(0,'play',()=>actions++);buttonScope.pressButton(0,'play',()=>actions++);assert.equal(timers.length,1);assert.equal(timers[0].delay,110);
for(const elapsed of [0,70,110,140,210,279,280,400]){clock=1000+elapsed;const pulse=elapsed<280?Math.sin(Math.PI*elapsed/280):0;assert.equal(pressPose(8)[13],Math.fround(-.022*pulse),'Button advances on wall time even when scene animation time stays paused');assert.equal(pressPose(8)[14],0)}
assert.equal(actions,0);timers[0].fn();assert.equal(actions,1);assert.equal(buttonScope.pendingButton,false);
buttonScope.buttonPresses.set('0:diff0',1000);buttonScope.buttonPresses.set('5:benchmark2',1000);clock=1140;
assert.equal(difficultyPose(8)[14],Math.fround(-.042));assert.equal(benchmarkPose(8)[14],Math.fround(-.042));assert.equal(buttonScope.buttonMotion(1,'diff0','difficulty')(8)[14],-0);

// Identical action labels share one Canvas/texture; difficulty selections keep separate artwork.
let canvasCount=0,textureCount=0;const textureScope={controlTextures:[],actionControlTexture:null,controlCanvas:(width,height)=>{canvasCount++;return {width,height}},texture:()=>({id:++textureCount})};
vm.createContext(textureScope);vm.runInContext(declaration('controlTextureEntry'),textureScope);
const actionEntry=textureScope.controlTextureEntry(0,'actions');const difficulties=[];
for(let i=0;i<12;i++){assert.strictEqual(textureScope.controlTextureEntry(i,'actions'),actionEntry);difficulties.push(textureScope.controlTextureEntry(i,'difficulty'))}
assert.equal(new Set(difficulties.map(e=>e.texture)).size,12);assert.equal(canvasCount,13);assert.equal(textureCount,13);assert.equal(textureScope.controlTextures.filter(e=>e.kind==='actions').length,1);assert.equal(actionEntry.canvas.height,60);
console.log('Passed: exact packed geometry without retained upload copies, shared button pulses while paused and independent difficulty textures.');

// All faces settle before the one initial refresh, including failed images.
const pendingFaces=[],readyScope={difficultyArt:{a:1,b:1,c:1,d:1,e:1},difficultyFaceImages:{},difficultyFaceSource:kind=>kind,
 Image:class {constructor(){pendingFaces.push(this)}}};vm.createContext(readyScope);
const readyLine=source.split('\n').find(line=>line.startsWith('const difficultyFacesReady='));
vm.runInContext(readyLine+'\nthis.ready=difficultyFacesReady;',readyScope);let readyCount=0;const ready=readyScope.ready.then(()=>readyCount++);
for(const image of pendingFaces.slice(0,4))image.onload();await Promise.resolve();assert.equal(readyCount,0);
pendingFaces[4].onerror();await ready;assert.equal(readyCount,1);pendingFaces[4].onload();await Promise.resolve();assert.equal(readyCount,1);
console.log('Passed: exact-time animation caches, lazy GPU allocation with retained picking data and one-shot face readiness.');

// The first complete icon draw must match all later redraws (Canvas state must not leak between calls).
let strokes=[],controlUploads=0;const paint={lineCap:'butt',lineJoin:'miter',clearRect(){strokes=[]},beginPath(){},arc(){},fill(){},drawImage(){},moveTo(){},lineTo(){},stroke(){strokes.push([this.lineCap,this.lineJoin,this.lineWidth,this.strokeStyle])}};
const controls={games:[{difficulties:{2:{link:'easy'},3:{link:'normal'}}}],difficultyLinks:['normal'],difficultyKind:link=>link,
 difficultyFaceImages:{easy:{complete:true,naturalWidth:68},normal:{complete:true,naturalWidth:68}},
 gl:{bindTexture(){},pixelStorei(){},texImage2D(){controlUploads++}}};vm.createContext(controls);vm.runInContext(declaration('drawControlTexture'),controls);
const entry={canvas:{width:600,height:130,getContext:()=>paint},i:0,kind:'difficulty',texture:{}};
controls.drawControlTexture(entry);const firstStrokes=JSON.stringify(strokes);controls.drawControlTexture(entry);assert.equal(JSON.stringify(strokes),firstStrokes,'Single initial draw must keep the established stroke appearance');
const refreshed=[];controls.controlTextures=[entry,{i:0,kind:'actions'},{i:1,kind:'difficulty'}];controls.objects=[];controls.drawControlTexture=e=>refreshed.push(e);vm.runInContext(source.split('\n').find(line=>line.startsWith('refreshStandControls=i=>')),controls);controls.refreshStandControls(0);assert.deepEqual(refreshed,[entry],'Changing difficulty must not upload action labels or another stand');
console.log('Passed: first-pass control strokes match redraws and difficulty changes update only their own texture.');

// Stand and motion packets must retain static overhangs, global props and original depth ties.
const spatialScope={Float32Array,Map,Set,objects:[],standGroups:[{anchor:[0,0,0],offset:[0,0,0]},{anchor:[20,0,0],offset:[0,0,0]}],layoutRevision:0,sceneIndex:null,eye:[0,0,5],yaw:0,pitch:0,zoom:1,animTime:2,benchmarkScene:1,
 identity:renderContext.identity,canvas:{width:600,height:600,getBoundingClientRect:()=>({left:0,top:0,width:600,height:600})},standSourcePoint:(group,p)=>p};
spatialScope.standOffset=i=>spatialScope.standGroups[i]?.offset||[0,0,0];vm.createContext(spatialScope);
vm.runInContext(['buildSceneIndex','getSceneIndex','rayStandGroups','pickObjectCandidates','pickWorldControl','geometryBounds','combinedBounds','objectMatrix','rayObjectBounds','camera','mul','benchmarkVisible'].map(declaration).join('\n'),spatialScope);
function pickPlane(x,z,controlHit=null,motion=null,group=0){const vertices=[x-1,-1,z,0,0,x+1,-1,z,1,0,x+1,1,z,1,1,x-1,-1,z,0,0,x+1,1,z,1,1,x-1,1,z,0,1];return {vertices,bounds:spatialScope.geometryBounds(vertices),group,motion,controlHit}}
let picked='';const back=pickPlane(0,0,()=>()=>picked='back'),front=pickPlane(0,1),far=pickPlane(20,0,null,()=>spatialScope.identity,1);
spatialScope.objects=[back,far,front];let index=spatialScope.getSceneIndex();assert.strictEqual(spatialScope.getSceneIndex(),index,'Index is reused between frames');
let groups=spatialScope.rayStandGroups(index,[0,0,-1]);assert(groups.has(0));assert(!groups.has(1));assert.equal(spatialScope.pickWorldControl(300,300),false,'A non-clickable prop must occlude the button');
front.controlHit=()=>null;spatialScope.sceneIndex=null;assert.equal(spatialScope.pickWorldControl(300,300),true,'Transparent control corners must let the rear button receive the ray');assert.equal(picked,'back');
front.controlHit=()=>()=>picked='front';spatialScope.sceneIndex=null;assert.equal(spatialScope.pickWorldControl(300,300,false),true);assert.equal(picked,'back','Hover cannot execute an action');spatialScope.pickWorldControl(300,300);assert.equal(picked,'front');
spatialScope.objects=[back,far,pickPlane(0,0,()=>()=>picked='tie',()=>spatialScope.identity)];spatialScope.sceneIndex=null;spatialScope.pickWorldControl(300,300);assert.equal(picked,'back','Coplanar controls retain source order across motion packets');
index=spatialScope.getSceneIndex();spatialScope.standGroups[0].offset=[10,0,0];spatialScope.layoutRevision++;assert.strictEqual(spatialScope.getSceneIndex(),index);assert.equal(index.buckets.get(0).worldBounds.center[0],10);assert.equal(spatialScope.pickWorldControl(300,300),false,'Layout changes must immediately update ray broad phase');
spatialScope.standGroups[0].offset=[0,0,0];spatialScope.layoutRevision++;
const overhang=pickPlane(-7,0);spatialScope.objects.push(overhang);const extended=spatialScope.getSceneIndex();assert.notStrictEqual(extended,index,'Late preview geometry refreshes the index');const bound=extended.buckets.get(0).bounds;assert(bound.center[0]-bound.extent[0]<=-8,'Static props outside the animated envelope stay included');
const globalProp=pickPlane(0,0,null,()=>spatialScope.identity,-1);spatialScope.objects.push(globalProp);index=spatialScope.getSceneIndex();assert(spatialScope.rayStandGroups(index,[1,0,0]).has(-1),'Global objects cannot use a stand envelope');
const alternate=pickPlane(0,0,null,()=>spatialScope.identity);alternate.benchmarkVariant=2;spatialScope.objects.push(alternate);index=spatialScope.getSceneIndex();groups=spatialScope.rayStandGroups(index,[0,0,-1]);const candidates=spatialScope.pickObjectCandidates(index,groups,[0,0,-1],new Map());assert(!candidates.includes(alternate));assert(candidates.includes(back)&&candidates.includes(globalProp));
assert.deepEqual(Array.from(candidates,o=>spatialScope.objects.indexOf(o)),Array.from(candidates,o=>spatialScope.objects.indexOf(o)).sort((a,b)=>a-b));
console.log('Passed: indexed picking preserves occlusion, transparent corners, depth ties, late geometry, moved stands and benchmark variants.');

// An idle scene does not rewrite HUD values or read layout dimensions every frame.
let hudWrites=0,sizeReads=0,viewports=0;const tracked=values=>new Proxy(values,{set(target,key,value){hudWrites++;target[key]=value;return true}});
const hud={visitorMarker:{style:tracked({})},visitorView:{},locationView:{},mapContent:{hidden:false},eye:[0,1.7,5],yaw:0,layoutRevision:0,stands:[[0,0,0]],mapPoint:(x,z)=>[x+50,z+50],loc:tracked({textContent:''}),renderSize:{dirty:true},devicePixelRatio:1,renderScale:100,renderLimit:2048,resolutionLabel:tracked({textContent:''}),limitLabel:tracked({hidden:false,textContent:''})};
let cssWidth=800,cssHeight=600;hud.canvas={width:0,height:0,get clientWidth(){sizeReads++;return cssWidth},get clientHeight(){sizeReads++;return cssHeight}};hud.gl={get drawingBufferWidth(){return hud.canvas.width},get drawingBufferHeight(){return hud.canvas.height},viewport(){viewports++}};
vm.createContext(hud);vm.runInContext(['updateVisitorMarker','updateLocationLabel','actualRenderStatus','updateRenderSize','invalidateRenderSize'].map(declaration).join('\n'),hud);
hud.updateVisitorMarker();hud.updateLocationLabel();hud.updateRenderSize();assert.equal(sizeReads,2);let writes=hudWrites;
for(let i=0;i<120;i++){hud.updateVisitorMarker();hud.updateLocationLabel();hud.updateRenderSize()}assert.equal(hudWrites,writes);assert.equal(sizeReads,2);assert.equal(viewports,1);
hud.eye[0]=.001;hud.updateLocationLabel();assert.equal(hudWrites,writes,'Subpixel movement keeps the same formatted location text');
hud.mapContent.hidden=true;hud.eye[0]=2;hud.yaw=1;hud.updateVisitorMarker();assert.equal(hudWrites,writes);hud.mapContent.hidden=false;hud.updateVisitorMarker();assert.equal(hud.visitorMarker.style.left,'52%');assert(hud.visitorMarker.style.transform.includes('rotate(-57.'));
hud.updateLocationLabel();const beforeMove=hud.loc.textContent;hud.stands[0]=[20,0,0];hud.layoutRevision++;hud.updateLocationLabel();assert.notEqual(hud.loc.textContent,beforeMove,'Nearest stand is refreshed after a layout change');
hud.devicePixelRatio=2;hud.updateRenderSize();assert.equal(hud.canvas.width,1200);assert.equal(sizeReads,2,'DPR changes reuse measured CSS dimensions');
for(const scale of [100,75,50,25,10,1000,500,400,200]){hud.renderScale=scale;hud.updateRenderSize();const ratio=1.5*scale/100,limit=Math.min(1,2048/Math.max(cssWidth*ratio,cssHeight*ratio));assert.equal(hud.canvas.width,Math.max(1,Math.round(cssWidth*ratio*limit)));assert.equal(hud.canvas.height,Math.max(1,Math.round(cssHeight*ratio*limit)));}
cssWidth=360;cssHeight=640;hud.renderScale=100;hud.invalidateRenderSize();hud.updateRenderSize();assert.equal(sizeReads,4);assert.equal(hud.canvas.width,540);assert.equal(hud.canvas.height,960);assert.equal(hud.limitLabel.hidden,true);
console.log('Passed: idle HUD writes and layout reads are eliminated; map reopen, layout changes, DPR, all quality levels and portrait resize stay correct.');

// Primitive templates must preserve every original double, including seams and signed zero.
let trigCalls=0;const templateMath=Object.create(Math);templateMath.sin=x=>{trigCalls++;return Math.sin(x)};templateMath.cos=x=>{trigCalls++;return Math.cos(x)};
const primitives={Math:templateMath,angularTemplates:new Map(),sphereTemplates:new Map(),meshes:[],mesh(vertices,color){this.meshes.push({vertices,color})}};
primitives.mesh=(vertices,color)=>primitives.meshes.push({vertices,color});vm.createContext(primitives);
vm.runInContext(['circleTemplate','sphereTemplate','sphereVertices','ball','evolutionBall','benchmarkRing','benchmarkCable','exhibitRing'].map(declaration).join('\n'),primitives);
function sameDoubles(actual,expected){assert.equal(actual.length,expected.length);for(let i=0;i<expected.length;i++)assert(Object.is(actual[i],expected[i]),'Coordinate/UV differs at '+i+': '+actual[i]+' vs '+expected[i])}
function sphereReference(x,y,z,rx,ry,rz,lat,lon,translated=true){const result=[],point=(a,b)=>{const theta=a*Math.PI/lat,phi=b*Math.PI*2/lon,px=rx*Math.sin(theta)*Math.cos(phi),pz=rz*Math.sin(theta)*Math.sin(phi);return [translated?x+px:px,y+ry*Math.cos(theta),translated?z+pz:pz,b/lon,a/lat]};for(let a=0;a<lat;a++)for(let b=0;b<lon;b++)result.push(...point(a,b),...point(a+1,b+1),...point(a+1,b),...point(a,b),...point(a,b+1),...point(a+1,b+1));return result}
for(const args of [[1.123,-2.7,.031,.8,.19,.31],[0,0,0,1,1,1],[-0,-0,-0,0,0,0],[-11.7,2.58,-21.3,-.45,.66,.12]]){primitives.ball(...args,[1,.5,.2]);sameDoubles(primitives.meshes.at(-1).vertices,sphereReference(...args,8,12))}
for(const style of [2,3])for(const r of [0,.125,.78]){primitives.evolutionBall(r,style,[1,1,1]);sameDoubles(primitives.meshes.at(-1).vertices,sphereReference(0,r,0,r,r,r,style===2?4:12,style===2?6:20,false))}
const template=primitives.sphereTemplate(8,12),oldTrig=trigCalls;assert.strictEqual(primitives.sphereTemplate(8,12),template);primitives.ball(7,3,1,.1,.2,.3,[1,1,1]);assert.equal(trigCalls,oldTrig,'A repeated sphere uses no trigonometry');assert.equal(primitives.sphereTemplates.size,3);assert.equal(template.order.length,8*12*6);
function cableReference(points,r){const vertices=[];for(let k=1;k<points.length;k++){const a=points[k-1],b=points[k],d=b.map((v,j)=>v-a[j]),len=Math.hypot(...d);if(len<1e-5)continue;const n=d.map(v=>v/len),helper=Math.abs(n[1])>.9?[1,0,0]:[0,1,0],u=[n[1]*helper[2]-n[2]*helper[1],n[2]*helper[0]-n[0]*helper[2],n[0]*helper[1]-n[1]*helper[0]],ul=Math.hypot(...u);for(let j=0;j<3;j++)u[j]/=ul;const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],point=(base,angle)=>[...base.map((x,j)=>x+r*(Math.cos(angle)*u[j]+Math.sin(angle)*v[j])),0,0];for(let j=0;j<8;j++){const s=j*Math.PI/4,t=(j+1)*Math.PI/4;vertices.push(...point(a,s),...point(b,s),...point(b,t),...point(a,s),...point(b,t),...point(a,t))}}return vertices}
for(const points of [[],[[0,0,0]],[[0,0,0],[0,0,0],[0,1,0],[1,.3,-2]],[[1,0,0],[2,0,0],[2,0,1]],[[1,2,3],[1,2.000001,3],[1,3,3]]]){primitives.benchmarkCable(points,.027,[1,1,1]);sameDoubles(primitives.meshes.at(-1).vertices,cableReference(points,.027))}
const cableTrig=trigCalls;primitives.benchmarkCable([[0,0,0],[1,2,3]],.5,[1,1,1]);assert.equal(trigCalls,cableTrig,'Changing a tube radius reuses its angle table');
const ringReference=[];for(let k=0;k<36;k++){const a=k*Math.PI/18,b=(k+1)*Math.PI/18,p=(angle,r)=>[1.2+Math.cos(angle)*r,-.3+Math.sin(angle)*r,2.7,0,0];ringReference.push(...p(a,.8),...p(b,.8),...p(b,.775),...p(a,.8),...p(b,.775),...p(a,.775))}primitives.benchmarkRing(1.2,-.3,2.7,.8,[1,1,1]);sameDoubles(primitives.meshes.at(-1).vertices,ringReference);
const exhibitPoints=[];for(let k=0;k<=48;k++){const a=k*Math.PI/24;exhibitPoints.push([1+Math.cos(a)*.8,.3+Math.sin(a)*.4*Math.sin(.27),2+Math.sin(a)*.4*Math.cos(.27)])}primitives.exhibitRing(1,.3,2,.8,.4,[1,1,1],.018,.27);sameDoubles(primitives.meshes.at(-1).vertices,cableReference(exhibitPoints,.018));
console.log('Passed: shared primitive templates retain exact double coordinates, UV seams, poles, signed zero, tube frames and degenerate paths without repeated trigonometry.');
