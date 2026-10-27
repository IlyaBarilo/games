import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../assets/js/pavilion.js', import.meta.url), 'utf8');
const start = source.indexOf('const pavilionStateUrl=');
const end = source.indexOf('function go(', start);
assert(start >= 0 && end > start);
const stateSource = source.slice(start, end);
const storage = new Map();
const href = 'https://example.test/collection/index.html';
const gameReferrer = 'https://example.test/collection/game.html?diff=hard';
function visit({url=href, historyState=null, storageDenied=false, historyDenied=false, layout='layout-v1', navigationType='navigate', referrer=gameReferrer, legacy=false}={}) {
    const events = new Map();
    const controls = new Map();
    const control = id => {
        if (!controls.has(id)) controls.set(id, {
            pressed: 'false', value: '',
            getAttribute() { return this.pressed; },
            click() { this.pressed = String(this.pressed !== 'true'); }
        });
        return controls.get(id);
    };
    const scope = {
        URL, location: {href:url},
        performance: legacy ? {navigation:{type:navigationType==='reload'?1:navigationType==='back_forward'?2:0}} : {getEntriesByType:()=>[{type:navigationType}]},
        window: {addEventListener:(name,listener)=>events.set(name,listener)},
        last:0,
        history: { state: historyState, replaceState(state) {
            if (historyDenied) throw Error('History unavailable');
            this.state = state;
        }},
        sessionStorage: {
            getItem(key) { if(storageDenied) throw Error('Storage denied'); return storage.get(key) ?? null; },
            setItem(key,value) { if(storageDenied) throw Error('Storage denied'); storage.set(key,value); }
        },
        document: {getElementById:control, referrer, addEventListener(){}},
        layoutSignature:()=>layout,
        eye:[0,1.7,6], yaw:0, pitch:0, zoom:1, zoomTarget:1, sensitivity:4, renderScale:100,
        benchmarkScene:1, difficultyLinks:['game.html'],
        games:[{link:'game.html',detailsUrl:'content/games/example.html',difficulties:{hard:{link:'game.html?diff=hard'}}}],
        jump:{value:'home',options:[{value:'home'},{value:'0'}]},
        keys:new Set(['KeyW']), stickX:1, travel:{},
        walkBounds:{left:-50,right:50,back:-50,front:50},
        stopStick(){scope.stickX=0;}, cancelWalk(){scope.travel=null;},
        standViewPoint:()=>[12,1.7,10], keepSafeDistance(){},
        setZoom(value){scope.zoomTarget=value;},
        setRenderScale(value){scope.renderScale=value;},
        setDifficulty(i,link){scope.difficultyLinks[i]=link;},
        refreshBenchmarkControls(){}
    };
    vm.createContext(scope);
    vm.runInContext(stateSource, scope);
    return {scope, events, ready(){vm.runInContext('pavilionStateReady=true',scope);}};
}
const first = visit();
first.ready();
Object.assign(first.scope,{eye:[12.25,1.7,-8.5],yaw:1.25,pitch:-.3,zoom:1.6,zoomTarget:1.6,sensitivity:3,renderScale:75,benchmarkScene:2,difficultyLinks:['game.html?diff=hard']});
first.scope.jump.value='0';
first.scope.savePavilionState();
const saved = JSON.parse(JSON.stringify(first.scope.history.state.pavilion));
const snapshot = scope => JSON.parse(JSON.stringify({
    eye:scope.eye,yaw:scope.yaw,pitch:scope.pitch,zoomTarget:scope.zoomTarget,
    sensitivity:scope.sensitivity,renderScale:scope.renderScale,benchmarkScene:scope.benchmarkScene,
    difficultyLinks:scope.difficultyLinks,jump:scope.jump.value
}));
const expected = snapshot(first.scope);
for (const options of [
    {}, // Return link: new document and empty history entry.
    {historyState:{pavilion:saved},navigationType:'back_forward',referrer:''}, // Back without BFCache or a referrer.
    {navigationType:'back_forward',referrer:'',legacy:true}, // Older browser navigation API.
    {referrer:'https://example.test/collection/content/games/example.html'},
    {referrer:'https://example.test/collection/game-info.html?id=example'},
    {url:'https://example.test/collection/'}, // Root URL and index.html are the same pavilion.
    {url:href+'?app=1#games'} // Launch/display flags do not reset a visit.
]) {
    const returned = visit(options);
    returned.scope.restorePavilionState();
    assert.deepEqual(snapshot(returned.scope),expected);
    assert.equal(returned.scope.keys.size,0);
    assert.equal(returned.scope.stickX,0);
    assert.equal(returned.scope.travel,null);
}
// A stored position must never turn an ordinary visit or reload into a return.
for (const options of [
    {referrer:''},
    {referrer:'',historyState:{pavilion:saved}},
    {referrer:href},
    {referrer:'https://outside.test/collection/game.html'},
    {referrer:'https://example.test/another/game.html'},
    {referrer:'invalid-referrer'},
    {navigationType:'reload',historyState:{pavilion:saved}},
    {navigationType:'reload',referrer:'',historyState:{pavilion:saved}},
    {navigationType:'reload',legacy:true,historyState:{pavilion:saved}}
]) {
    const fresh=visit(options);
    fresh.scope.restorePavilionState();
    assert.deepEqual(Array.from(fresh.scope.eye),[0,1.7,6],'Fresh navigation and reload must start at the entrance');
    assert.equal(fresh.scope.yaw,0);
    assert.equal(fresh.scope.pitch,0);
    assert.equal(fresh.scope.zoomTarget,1);
}
// A cached document still has the timing entry for its ORIGINAL load (possibly a reload).
const cached=visit({navigationType:'reload',referrer:'',historyState:{pavilion:saved}});
cached.scope.restorePavilionState();
assert.deepEqual(Array.from(cached.scope.eye),[0,1.7,6]);
cached.ready();
Object.assign(cached.scope,{eye:[-6,1.7,11],yaw:-.7,pitch:.2});
const beforeGame=snapshot(cached.scope);
cached.events.get('pagehide')();
cached.scope.eye=[0,1.7,6];
cached.scope.last=123;
cached.events.get('pageshow')({persisted:true});
assert.deepEqual(snapshot(cached.scope),beforeGame,'BFCache return must restore the point of departure after an initial reload');
assert.equal(cached.scope.last,0);
first.scope.savePavilionState();
const earlyExit = visit();
earlyExit.scope.savePavilionState();
assert.equal(earlyExit.scope.history.state,null);
assert.deepEqual(JSON.parse([...storage.values()][0]).state,saved,'Leaving while loading must preserve the previous position');
const older = {...saved,eye:[-3,1.7,4],yaw:-1};
const historyVisit=visit({historyState:{other:42,pavilion:older},navigationType:'back_forward',referrer:''});
historyVisit.scope.restorePavilionState();
assert.deepEqual(Array.from(historyVisit.scope.eye),older.eye,'Back restores its own entry, not the most recent session position');
historyVisit.ready();
historyVisit.scope.savePavilionState();
assert.equal(historyVisit.scope.history.state.other,42);
first.scope.savePavilionState();
const unavailableHistory=visit({historyDenied:true});
unavailableHistory.scope.restorePavilionState();
unavailableHistory.ready();
unavailableHistory.scope.savePavilionState();
assert.deepEqual(snapshot(unavailableHistory.scope),expected);
const unavailableStorage=visit({storageDenied:true,historyState:{pavilion:saved},navigationType:'back_forward',referrer:''});
unavailableStorage.scope.restorePavilionState();
unavailableStorage.ready();
assert.doesNotThrow(()=>unavailableStorage.scope.savePavilionState());
assert.deepEqual(snapshot(unavailableStorage.scope),expected);
for (const options of [
    {storageDenied:true,historyDenied:true},
    {url:'https://example.test/another/index.html'},
    {url:href+'?gamespaceIndexSession=another'}
]) {
    const fresh=visit(options);
    assert.doesNotThrow(()=>fresh.scope.restorePavilionState());
    assert.deepEqual(Array.from(fresh.scope.eye),[0,1.7,6]);
    fresh.ready();
    assert.doesNotThrow(()=>fresh.scope.savePavilionState());
}
const changed=visit({layout:'layout-v2',historyState:{pavilion:saved}});
changed.scope.restorePavilionState();
assert.deepEqual(Array.from(changed.scope.eye),[12,1.7,10],'Changed layouts retain the safe stand viewpoint');
assert.equal(changed.scope.yaw,0);
storage.clear();
first.scope.savePavilionState();
const key=[...storage.keys()][0];
assert(!Object.hasOwn(JSON.parse(storage.get(key)),'savedAt'),'New saves need no timestamp');
for (const stored of [
    {v:1,state:saved},
    {v:1,savedAt:Date.now()-25*60*60*1000,state:saved},
    {v:1,savedAt:Date.now()-30*24*60*60*1000,state:saved}
]) {
    storage.set(key,JSON.stringify(stored));
    const returned=visit();
    returned.scope.restorePavilionState();
    assert.deepEqual(snapshot(returned.scope),expected,'Session position must survive regardless of its age');
}
for (const invalid of [
    '{broken',
    JSON.stringify({v:2,savedAt:Date.now(),state:saved}),
    JSON.stringify({v:1,savedAt:Date.now(),state:{...saved,eye:[null,1.7,6]}})
]) {
    storage.set(key,invalid);
    const fresh=visit();
    assert.doesNotThrow(()=>fresh.scope.restorePavilionState());
    assert.deepEqual(Array.from(fresh.scope.eye),[0,1.7,6]);
}
assert(source.includes("window.addEventListener('pagehide',savePavilionState)"));
assert(source.includes('if(e.persisted&&pavilionStateReady){restorePavilionState(true);last=0}'));
assert(source.includes('restorePavilionState();keepSafeDistance();pavilionStateReady=true;'));
console.log('Passed: pavilion fresh visits/reloads start at entrance; content links, Back and BFCache restore departure; no expiry, isolated visits and unavailable/corrupt storage.');

