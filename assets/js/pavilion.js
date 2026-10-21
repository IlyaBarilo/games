(async () => {
await window.PAVILION_LOADING?.painted;
try {
const games=window.GAMES_CATALOG.games.filter(g=>g.available),canvas=document.getElementById('scene'),jump=document.getElementById('jump'),loc=document.getElementById('location');
window.PAVILION_LOADING?.start(games.length);
function preloadPreviews(entries){return entries.map(game=>new Promise(resolve=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=game.imageUrl}))}
// Fetch artwork while the interface, shaders and models are being prepared.
const previewImages=preloadPreviews(games);
const travelPanel=document.querySelector('.travel'),viewStatus=document.getElementById('view-status'),mapPanel=document.querySelector('.minimap');travelPanel.append(viewStatus);
const mapToggle=document.getElementById('map-toggle'),mapContent=document.getElementById('map-content');
let refreshVisitor=()=>{};
function setMapCollapsed(collapsed){mapContent.hidden=collapsed;mapPanel.classList.toggle('is-collapsed',collapsed);mapToggle.setAttribute('aria-expanded',String(!collapsed));const label=collapsed?'Показать карту':'Свернуть карту';mapToggle.setAttribute('aria-label',label);mapToggle.title=label;}
try{setMapCollapsed(localStorage.getItem('pavilion-map-collapsed')==='1')}catch{}
mapToggle.onclick=()=>{const collapsed=!mapContent.hidden;setMapCollapsed(collapsed);if(!collapsed){updateStandMap();refreshVisitor()}try{localStorage.setItem('pavilion-map-collapsed',collapsed?'1':'0')}catch{}};
const helpToggle=document.getElementById('help-toggle'),helpContent=document.getElementById('help-content'),helpPanel=document.querySelector('.brand');
function setHelpCollapsed(collapsed){helpContent.hidden=collapsed;helpPanel.classList.toggle('is-collapsed',collapsed);helpToggle.setAttribute('aria-expanded',String(!collapsed));const label=collapsed?'Показать подсказки':'Свернуть подсказки';helpToggle.setAttribute('aria-label',label);helpToggle.title=label;}
try{setHelpCollapsed(localStorage.getItem('pavilion-help-collapsed')==='1')}catch{}
helpToggle.onclick=()=>{const collapsed=!helpContent.hidden;setHelpCollapsed(collapsed);try{localStorage.setItem('pavilion-help-collapsed',collapsed?'1':'0')}catch{}};
function positionMapBelowControls(){const top=Math.ceil(travelPanel.getBoundingClientRect().bottom+8)+'px';if(mapPanel.style.top!==top)mapPanel.style.top=top}
const controlsObserver=new ResizeObserver(positionMapBelowControls);controlsObserver.observe(travelPanel);controlsObserver.observe(document.querySelector('.hud'));window.addEventListener('resize',positionMapBelowControls);positionMapBelowControls();
// Stand-group layout begin. Edit only standLayout to rearrange the exhibition.
const hall={left:-18,right:18,back:-46,front:10,height:5.5};
const walkBounds={left:hall.left+1,right:hall.right-1,back:hall.back+1,front:hall.front-2};
const hallWidth=hall.right-hall.left,hallDepth=hall.front-hall.back,hallCenterZ=(hall.back+hall.front)/2;
const hallLights={left:Math.ceil((hall.left+2)/12)*12,right:Math.floor((hall.right-2)/12)*12,back:Math.ceil(hall.back/9)*9+3,front:Math.floor((hall.front-6)/9)*9+3};
function mapPoint(x,z){return [(x-hall.left)/hallWidth*100,(z-hall.back)/hallDepth*100]}
const standAnchors=[[-4,0,-3],[4,0,-3],[-4,0,-12],[4,0,-12],[0,0,-18],[-8,0,-24],[8,0,-24],[-8,0,-32],[0,0,-32],[8,0,-32],[0,0,-25.5],[-12,0,-10]];
const standLayout={"snake3d-turns":[-11,0,-4],"tictac":[0,0,-28],"tictac-robots":[11,0,-4],"8march-shariki":[-11,0,-40],"snake-evolution":[0,0,-16],"interactive-screen-benchmark":[0,0,-40],"zvezdny-kurer":[-11,0,-16],"staya-svetlyachkov":[-11,0,-28],"bashnya-oblakov":[11,0,-28],"bashnya-do-oblakov":[11,0,-40],"podvodnaya-ekspeditsiya":[11,0,-16],"tictac-sea":[0,0,-4]};

const pavilionThemes=[
 {id:'snakes',label:'Змейки',color:'#8ac99a',games:['snake3d-turns','snake-evolution']},
 {id:'logic',label:'Логика и технологии',color:'#a8b9ed',games:['tictac','tictac-robots','interactive-screen-benchmark']},
 {id:'sea',label:'Морские приключения',color:'#78d7dd',games:['tictac-sea','podvodnaya-ekspeditsiya']},
 {id:'light',label:'Свет и праздник',color:'#e8bd92',games:['staya-svetlyachkov','8march-shariki']},
 {id:'flight',label:'Полёт и высота',color:'#e0d386',games:['bashnya-oblakov','bashnya-do-oblakov','zvezdny-kurer']}
];
const standViewDistance=8.8,mainAisles=[-6,5],crossAisles=[4,-9,-21,-33,-43.5];
function standTheme(id){return pavilionThemes.find(theme=>theme.games.includes(id))}
function standViewPoint(i){const p=standGroups[i]?.position;return p?[p[0],1.7,p[2]+standViewDistance]:[0,1.7,6]}
function layoutSignature(){return JSON.stringify(standGroups.map(group=>[group.id,...group.position]))}
function pointSegmentDistance2(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,u=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length)):0;return (p[0]-a[0]-u*dx)**2+(p[1]-a[1]-u*dz)**2}
function contourBlocksSegment(a,b,shape,padding){
 const bounds=shape.bounds;if(Math.max(a[0],b[0])<bounds.left-padding||Math.min(a[0],b[0])>bounds.right+padding||Math.max(a[1],b[1])<bounds.back-padding||Math.min(a[1],b[1])>bounds.front+padding)return false;
 let inside=false;const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 for(let i=0,j=shape.points.length-1;i<shape.points.length;j=i++){
  const c=shape.points[j],d=shape.points[i];if((c[1]>a[1])!==(d[1]>a[1])&&a[0]<(d[0]-c[0])*(a[1]-c[1])/(d[1]-c[1])+c[0])inside=!inside;
  if(Math.min(pointSegmentDistance2(a,c,d),pointSegmentDistance2(b,c,d),pointSegmentDistance2(c,a,b),pointSegmentDistance2(d,a,b))<=padding*padding)return true;
  if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return true;
 }return inside;
}
function footprintShape(points){return {points,bounds:{left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),back:Math.min(...points.map(p=>p[1])),front:Math.max(...points.map(p=>p[1]))}}}
function standFootprintBlocked(a,b,padding=.25){return standGroups.some(group=>{const p=group.position,localA=[a[0]-p[0],a[1]-p[2]],localB=[b[0]-p[0],b[1]-p[2]],bounds=group.bounds,shapes=group.footprints||(group.reservedFootprints??=[footprintShape([[bounds.left,bounds.back],[bounds.right,bounds.back],[bounds.right,bounds.front],[bounds.left,bounds.front]])]);return shapes.some(shape=>contourBlocksSegment(localA,localB,shape,padding))})}
function insideStandFootprint(x,z,padding=.25){return standFootprintBlocked([x,z],[x,z],padding)}
function standFootprint(points,index=activeStandGroup){const group=standGroups[index];if(group){group.footprints??=[];group.footprints.push(footprintShape(points.map(p=>[p[0]-group.anchor[0],p[1]-group.anchor[2]])))}return points;}

const standGroups=games.map((game,i)=>{const anchor=[...standAnchors[i]],position=[...(standLayout[game.id]||anchor)];return {id:game.id,anchor,position,offset:position.map((v,j)=>v-anchor[j]),children:[],obstacles:[],bounds:{left:game.id==='tictac-robots'?-3.85:-3.1,right:3.1,back:-1.75,front:3.75},light:[0,4.7,2]}});
let activeStandGroup=-1,layoutRevision=0,standMoveHooks=()=>{},auditStandBounds=()=>{};
let benchmarkScene=1,activeBenchmarkVariant=0,refreshBenchmarkControls=()=>{};
function benchmarkVisible(item){return !item.benchmarkVariant||item.benchmarkVariant===benchmarkScene}
const noStandOffset=[0,0,0];
function standOffset(i){return standGroups[i]?.offset||noStandOffset}
function withStandGroup(i,build){const previous=activeStandGroup;activeStandGroup=i;try{return build()}finally{activeStandGroup=previous}}
function standSourcePoint(i,point){const delta=standOffset(i);return point.map((v,j)=>v-delta[j])}
function updateStandMap(){document.querySelectorAll('.map-floor [data-zone]').forEach(button=>{const i=Number(button.dataset.zone);const home=button.dataset.zone==='home';if(!home&&!standGroups[i])return;const pos=home?[0,0,5.8]:standGroups[i].position,point=mapPoint(pos[0],pos[2]+(home?0:1));if(!home){const theme=standTheme(games[i].id);button.title=games[i].title+' · '+theme.label;button.style.borderColor=theme.color;button.style.setProperty('--theme-color',theme.color);}button.style.left='calc('+point[0]+'% - '+button.offsetWidth/2+'px)';button.style.top='calc('+point[1]+'% - '+button.offsetHeight/2+'px)';button.style.right='auto';button.style.bottom='auto'})}
// Validate the whole proposed arrangement before changing any group.
function applyStandPositions(positions){
 if(!Array.isArray(positions)||positions.length!==standGroups.length)throw Error('Неверный состав расстановки');
 for(const [i,p] of positions.entries()){
  if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)||p[1]!==0)throw Error('Неверные координаты стенда');
  const b=standGroups[i].bounds,[x,,z]=p;
  if(x+b.left<hall.left+.15||x+b.right>hall.right-.15||z+b.back<hall.back+.15||z+b.front>hall.front-.15)throw Error('Стенд выходит за пределы зала');
  for(let j=0;j<i;j++){const q=standGroups[j].bounds,o=positions[j];if(x+b.left<o[0]+q.right+.15&&x+b.right>o[0]+q.left-.15&&z+b.back<o[2]+q.front+.15&&z+b.front>o[2]+q.back-.15)throw Error('Площадки стендов пересекаются')}
 }
 positions.forEach((p,i)=>{const g=standGroups[i];p.forEach((v,j)=>{g.position[j]=v;g.offset[j]=v-g.anchor[j]})});
 layoutRevision++;updateStandMap();standMoveHooks();
}
function standIndex(id){const i=standGroups.findIndex(g=>g.id===id);if(i<0)throw Error('Неизвестный стенд: '+id);return i}
function setStandPosition(id,x,z){const i=standIndex(id),positions=standGroups.map(g=>[...g.position]);positions[i]=[x,0,z];applyStandPositions(positions);return {id,position:[...standGroups[i].position]}}
function swapStands(first,second){const a=standIndex(first),b=standIndex(second);if(a===b)throw Error('Выберите два разных стенда');const positions=standGroups.map(g=>[...g.position]);[positions[a],positions[b]]=[positions[b],positions[a]];applyStandPositions(positions)}
const layoutStorageKey='pavilion-layout-v1',baseLayoutSignature=JSON.stringify(standGroups.map(g=>[g.id,...standLayout[g.id]]));
function saveStandLayout(){try{localStorage.setItem(layoutStorageKey,JSON.stringify({base:baseLayoutSignature,stands:standGroups.map(g=>({id:g.id,position:[...g.position]}))}));return true}catch{return false}}
function restoreStandLayout(){try{
 const saved=JSON.parse(localStorage.getItem(layoutStorageKey));if(!saved||saved.base!==baseLayoutSignature||!Array.isArray(saved.stands)||saved.stands.length!==standGroups.length)return false;
 const ids=new Set(saved.stands.map(g=>g.id)),slots=new Set();if(ids.size!==standGroups.length)return false;
 const positions=standGroups.map(g=>{const p=saved.stands.find(item=>item.id===g.id)?.position,key=JSON.stringify(p);if(!Object.values(standLayout).some(slot=>JSON.stringify(slot)===key)||slots.has(key))throw Error('Неверное место стенда');slots.add(key);return p});
 applyStandPositions(positions);return true;
 }catch{return false}}
function resetStandLayout(){applyStandPositions(standGroups.map(g=>[...standLayout[g.id]]));try{localStorage.removeItem(layoutStorageKey);return true}catch{return false}}
restoreStandLayout();updateStandMap();window.addEventListener('resize',updateStandMap);
window.PAVILION_LAYOUT=Object.freeze({audit:()=>auditStandBounds(),moveStand:setStandPosition,swapStands,reset:resetStandLayout,save:saveStandLayout,getStands:()=>standGroups.map(g=>({id:g.id,position:[...g.position],objects:g.children.length,obstacles:g.obstacles.length}))});
// Stand-group layout end.
const stands=standGroups.map(group=>group.position),keys=new Set();let eye=[0,1.7,6],yaw=0,pitch=0,last=0,drag=null,travel=null,sensitivity=4;let stickX=0,stickY=0,destination=null,zoom=1,zoomTarget=1,sideIndex=0,renderScale=100;const renderScales=[100,75,50,25,10,1000,500,400,200],fpsTimes=[];let lastFpsLabel=0;function setRenderScale(scale){renderScale=renderScales.includes(scale)?scale:100;document.getElementById('render-percent').textContent=renderScale+'%';document.getElementById('render-quality').setAttribute('aria-label','Разрешение 3D '+renderScale+' процентов. Переключить режим');fpsTimes.length=0;lastFpsLabel=0;document.getElementById('render-fps').textContent='—fps'}document.getElementById('render-quality').onclick=()=>setRenderScale(renderScales[(renderScales.indexOf(renderScale)+1)%renderScales.length]);function recordFps(t){fpsTimes.push(t);while(fpsTimes.length>2&&fpsTimes[0]<t-5000)fpsTimes.shift();if(t-lastFpsLabel>=250&&fpsTimes.length>1){const elapsed=t-fpsTimes[0];document.getElementById('render-fps').textContent=(elapsed>0?Math.round((fpsTimes.length-1)*1000/elapsed):0)+'fps';lastFpsLabel=t}}document.addEventListener('visibilitychange',()=>{fpsTimes.length=0;lastFpsLabel=0});function setZoom(value){zoomTarget=Math.max(1,Math.min(2,value));document.getElementById('zoom-level').textContent='Масштаб ×'+Number(zoomTarget.toFixed(2))+' · колесо / два пальца'};canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoomTarget+(e.deltaY<0?.1:-.1))},{passive:false});const walkHint=document.getElementById('walkhint');function hint(text){walkHint.hidden=!text;walkHint.textContent=text}function cancelWalk(){stopDemo();travel=null;destination=null;hint('')}function stopStick(){stickX=stickY=0;document.getElementById('stick').style.transform='';document.getElementById('joystick').classList.remove('active')}const reduced=matchMedia('(prefers-reduced-motion: reduce)');document.getElementById('sensitivity').oninput=e=>sensitivity=Number(e.target.value);const fullscreenButton=document.getElementById('fullscreen');
function fullscreenLabel(){const active=!!document.fullscreenElement,label=active?'Обычный экран':'На весь экран';fullscreenButton.setAttribute('aria-pressed',String(active));fullscreenButton.setAttribute('aria-label',label);fullscreenButton.title=label;}
fullscreenButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{fullscreenButton.setAttribute('aria-label','Полноэкранный режим недоступен');fullscreenButton.title='Откройте павильон в отдельном окне, чтобы включить полный экран'}};
document.addEventListener('fullscreenchange',fullscreenLabel);fullscreenLabel();
for(const theme of pavilionThemes){const group=document.createElement('optgroup');group.label=theme.label;for(const id of theme.games){const i=games.findIndex(game=>game.id===id);if(i<0)continue;const option=document.createElement('option');option.value=i;option.textContent=games[i].title;group.append(option)}jump.append(group)}
const mapLegend=document.createElement('div');mapLegend.className='map-legend';mapLegend.setAttribute('aria-label','Темы павильона');for(const theme of pavilionThemes){const item=document.createElement('span');item.style.setProperty('--theme-color',theme.color);item.textContent=theme.label;mapLegend.append(item)}mapContent.append(mapLegend);
const info=document.getElementById('game-info'),difficultyLinks=games.map(g=>g.link),screenPanels=[],podiumPanels=[];function openInfo(i){cancelWalk();stopStick();keys.clear();savePavilionState();const g=games[i];location.href=g.detailsUrl?g.detailsUrl:'game-info.html?id='+encodeURIComponent(g.id)}document.getElementById('info-close').onclick=()=>info.close();info.addEventListener('click',e=>{if(e.target===info){const r=info.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)info.close()}});
// Original vector faces, shared by scene textures and accessible HTML controls.
const difficultyArt={
 calm:'<path d="M-17-5Q-11-9-5-5M5-5Q11-9 17-5M-10 12Q0 20 10 12" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/>',
 easy:'<path d="M-17-5Q-11-12-5-5M5-5Q11-12 17-5M-12 9Q0 23 12 9" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="-19" cy="7" rx="4" ry="2.5" fill="#f2a44c"/><ellipse cx="19" cy="7" rx="4" ry="2.5" fill="#f2a44c"/>',
 normal:'<path d="M-17-13H-6M6-13H17" fill="none" stroke="#754a22" stroke-width="3" stroke-linecap="round"/><ellipse cx="-11" cy="-4" rx="3" ry="4.5" fill="#54391c"/><ellipse cx="11" cy="-4" rx="3" ry="4.5" fill="#54391c"/><path d="M-10 13Q0 15 10 13" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/>',
 hard:'<path d="M-19-15L-6-10M6-10L19-15" fill="none" stroke="#54391c" stroke-width="4" stroke-linecap="round"/><ellipse cx="-11" cy="-3" rx="3" ry="4" fill="#54391c"/><ellipse cx="11" cy="-3" rx="3" ry="4" fill="#54391c"/><path d="M-12 16Q0 1 12 16Z" fill="#74422c"/><path d="M-7 13Q0 8 7 13" fill="none" stroke="#fff4d3" stroke-width="2.5" stroke-linecap="round"/><path d="M23-20Q14-8 23-7Q32-8 23-20" fill="#66cbe4"/>',
 expert:'<path d="M-24-9H24" stroke="#182f41" stroke-width="4" stroke-linecap="round"/><path d="M-21-10H-3V-1Q-4 7-12 7Q-21 7-21-1ZM3-10H21V-1Q21 7 12 7Q4 7 3-1Z" fill="#18354d" stroke="#102839" stroke-width="2"/><path d="M-3-5Q0-8 3-5" fill="none" stroke="#102839" stroke-width="3"/><path d="M-17-6H-10M7-6H14" stroke="#6fb8d7" stroke-width="2" stroke-linecap="round"/><path d="M-11 14Q1 23 14 10" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/>'
};
function difficultyKind(link){const mode=new URL(link,document.baseURI).searchParams.get('diff');const numeric={1:'easy',2:'calm',3:'normal',4:'hard',5:'expert'};if(numeric[mode])return numeric[mode];return mode==='simple'||mode==='easy'?'easy':Object.hasOwn(difficultyArt,mode)?mode:'normal'}
function difficultyFaceSource(kind){return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-34 -34 68 68"><defs><radialGradient id="skin" cx="35%" cy="25%" r="80%"><stop stop-color="#fff39a"/><stop offset=".6" stop-color="#ffda55"/><stop offset="1" stop-color="#f1a92e"/></radialGradient></defs><circle r="29" fill="url(#skin)" stroke="#d8952b" stroke-width="1.5"/>'+difficultyArt[kind]+'</svg>')}
const difficultyFaceImages={};
const difficultyFacesReady=Promise.all(Object.keys(difficultyArt).map(kind=>new Promise(resolve=>{const image=new Image();image.onload=image.onerror=()=>resolve();difficultyFaceImages[kind]=image;image.src=difficultyFaceSource(kind)})));
function difficultySymbol(link){const image=document.createElement('img');image.src=difficultyFaceSource(difficultyKind(link));image.alt='';image.width=28;image.height=28;return image}
function difficultyButtons(i,container){const g=games[i];if(!g.difficulties)return;const group=document.createElement('div');group.className='difficulty-buttons';group.setAttribute('aria-label','Сложность — '+g.title);Object.values(g.difficulties).forEach(d=>{const b=document.createElement('button');b.type='button';b.dataset.difficulty=d.link;b.append(difficultySymbol(d.link));b.title=d.label;b.setAttribute('aria-label',g.title+' — '+d.label);b.setAttribute('aria-pressed',d.link===difficultyLinks[i]);b.onclick=()=>setDifficulty(i,d.link);group.append(b)});container.append(group)}
let refreshStandControls=()=>{};
function setDifficulty(i,link){difficultyLinks[i]=link;document.querySelectorAll('[data-panel-game="'+i+'"]').forEach(p=>{p.querySelectorAll('[data-difficulty]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.difficulty===link));const a=p.querySelector('.play');if(a)a.href=link});refreshStandControls(i)}
games.forEach((g,i)=>{const panel=document.createElement('section');panel.className='screen-panel';panel.dataset.panelGame=i;panel.setAttribute('aria-label','Экран — '+g.title);const title=document.createElement('h3');title.textContent=g.title;panel.append(title);difficultyButtons(i,panel);const actions=document.createElement('div');actions.className='screen-actions';const play=document.createElement('a');play.className='play';play.href=difficultyLinks[i];play.target='_self';play.textContent='▶ Играть';play.setAttribute('aria-label','Играть — '+g.title);const details=document.createElement('button');details.textContent='ⓘ Информация';details.setAttribute('aria-label','Информация — '+g.title);details.onclick=()=>openInfo(i);for(const button of [play,details]){const caption=document.createElement('span');caption.className='button-caption';caption.textContent=button.textContent;button.replaceChildren(caption)}actions.append(play,details);const podium=document.createElement('section');podium.className='podium-controls';podium.dataset.panelGame=i;podium.setAttribute('aria-label','Кнопки перед телевизором — '+g.title);podium.append(actions);document.getElementById('screen-controls').append(panel,podium);screenPanels.push(panel);podiumPanels.push(podium);panel.querySelectorAll('[data-difficulty]').forEach(b=>{const d=Object.values(g.difficulties).find(d=>d.link===b.dataset.difficulty);b.replaceChildren(difficultySymbol(d.link))})});


function savePavilionState(){try{const state={layout:layoutSignature(),eye:[...eye],yaw,pitch,zoom,zoomTarget,sensitivity,renderScale,benchmarkScene,difficultyLinks:[...difficultyLinks],jump:jump.value,lighting:document.getElementById('lighting').getAttribute('aria-pressed')==='true',animated:document.getElementById('animate').getAttribute('aria-pressed')==='true'};history.replaceState({...history.state,pavilion:state},'')}catch{}}
function restorePavilionState(){const s=history.state?.pavilion;if(!s||!Array.isArray(s.eye)||s.eye.length!==3||!s.eye.every(Number.isFinite))return;keys.clear();stopStick();cancelWalk();const changedLayout=s.layout!==layoutSignature(),savedIndex=s.jump==='home'?-1:Number(s.jump),point=changedLayout?standViewPoint(savedIndex):s.eye;eye=[Math.max(walkBounds.left,Math.min(walkBounds.right,point[0])),1.7,Math.max(walkBounds.back,Math.min(walkBounds.front,point[2]))];yaw=!changedLayout&&Number.isFinite(s.yaw)?s.yaw:0;pitch=!changedLayout&&Number.isFinite(s.pitch)?Math.max(-1.5,Math.min(1.5,s.pitch)):0;zoom=zoomTarget=Number.isFinite(s.zoomTarget)?Math.max(1,Math.min(2,s.zoomTarget)):1;setZoom(zoomTarget);setRenderScale(s.renderScale);const savedBenchmarkScene=s.benchmarkScene===4?2:s.benchmarkScene;if(savedBenchmarkScene===1||savedBenchmarkScene===2){benchmarkScene=savedBenchmarkScene;refreshBenchmarkControls()}if(Number.isFinite(s.sensitivity)){sensitivity=s.sensitivity;document.getElementById('sensitivity').value=sensitivity}if(Array.isArray(s.difficultyLinks))s.difficultyLinks.forEach((link,i)=>{const g=games[i];if(g&&(link===g.link||Object.values(g.difficulties||{}).some(d=>d.link===link)))setDifficulty(i,link)});if(document.getElementById('lighting').getAttribute('aria-pressed')!==String(s.lighting))document.getElementById('lighting').click();if(document.getElementById('animate').getAttribute('aria-pressed')!==String(s.animated))document.getElementById('animate').click();if([...jump.options].some(o=>o.value===s.jump))jump.value=s.jump;keepSafeDistance()}
document.addEventListener('click',e=>{const a=e.target.closest('a.play');if(a){cancelWalk();stopStick();keys.clear();savePavilionState()}},true);window.addEventListener('pagehide',savePavilionState);window.addEventListener('pageshow',e=>{if(e.persisted){restorePavilionState();last=0}});

function go(value){cancelWalk();stopStick();keys.clear();const home=value==='home',i=Number(value);if(!home&&(!Number.isInteger(i)||!stands[i]))return;const target=standViewPoint(home?-1:i),route=findRoute(eye[0],eye[2],target[0],target[2]);if(!route){hint('Свободный проход к стенду не найден.');return}destination=[target[0],target[2]];travel={kind:'walk',route:roundWalkRoute([eye[0],eye[2]],route),index:0,faceIndex:home?-1:i,speed:reduced.matches?6:10};jump.value=value;hint('Идём к '+(home?'входу':'стенду')+' по проходу · Esc — отменить');canvas.focus({preventScroll:true})}jump.onchange=()=>go(jump.value);document.getElementById('reset').onclick=()=>go('home');document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>go(b.dataset.zone));

canvas.onkeydown=e=>{if(e.code==='KeyR'){e.preventDefault();go('home');return}if(e.code==='Escape'){cancelWalk();return}if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){cancelWalk();keys.add(e.code);e.preventDefault()}};window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());canvas.onblur=()=>keys.clear();
const joystick=document.getElementById('joystick');function updateStick(e){const r=joystick.getBoundingClientRect(),radius=r.width*.30,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(radius,Math.hypot(dx,dy));stickX=dx/len;stickY=-dy/len;if(Math.hypot(stickX,stickY)<.12)stickX=stickY=0;document.getElementById('stick').style.transform='translate('+stickX*radius+'px,'+(-stickY*radius)+'px)'}joystick.onpointerdown=e=>{e.preventDefault();cancelWalk();keys.clear();joystick.setPointerCapture(e.pointerId);joystick.classList.add('active');updateStick(e)};joystick.onpointermove=e=>{if(joystick.hasPointerCapture(e.pointerId))updateStick(e)};joystick.onpointerup=joystick.onpointercancel=joystick.onlostpointercapture=stopStick;joystick.onkeydown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();cancelWalk();keys.add(e.code)}};joystick.onkeyup=e=>keys.delete(e.code);joystick.onblur=()=>{keys.clear();stopStick()};window.addEventListener('blur',stopStick);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelWalk();stopStick()}});

let hoverPosition=null,hoverStamp=0,updateWorldCursor=()=>{};
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen')hoverPosition=[e.clientX,e.clientY]});
canvas.addEventListener('pointerleave',()=>{hoverPosition=null;canvas.style.cursor=''});
window.addEventListener('blur',()=>{hoverPosition=null;canvas.style.cursor=''});
const pointers=new Map();let pinch=null;function beginPinch(){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:zoomTarget};drag=null}canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{if(e.button!==0)return;cancelWalk();canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){beginPinch();return}drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false}};canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){if(!pinch)beginPinch();const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch.distance>0)setZoom(pinch.zoom*distance/pinch.distance);return}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8;const r=canvas.getBoundingClientRect(),aspect=r.width/r.height,f=(Math.min(1/Math.tan(Math.PI/6),aspect*1.25)*zoom),perPixel=2/(r.height*f),scale=sensitivity/2;yaw+=dx*perPixel*scale;pitch=Math.max(-1.5,Math.min(1.5,pitch-dy*perPixel*scale));drag.x=e.clientX;drag.y=e.clientY};canvas.onpointerup=e=>{if(e.button!==0||!pointers.has(e.pointerId))return;const click=!pinch&&drag&&!drag.moved;pointers.delete(e.pointerId);if(pinch){if(pointers.size<2){pinch=null;const p=[...pointers.values()][0];drag=p?{x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true}:null}return}drag=null;if(click&&typeof pickStand==='function')pickStand(e.clientX,e.clientY)};function cancelPointer(e){pointers.delete(e.pointerId);pinch=null;drag=null}canvas.onpointercancel=canvas.onlostpointercapture=cancelPointer;window.addEventListener('blur',()=>{pointers.clear();pinch=null;drag=null});

const gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){document.getElementById('error').hidden=false;window.PAVILION_LOADING?.fail('В этом браузере недоступен 3D-павильон. Игры можно открыть в GameSpace.')}else{const renderLimit=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0],gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1]);
const parallelCompile=gl.getExtension('KHR_parallel_shader_compile'),programShaders=[];
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);programShaders.push(s);return s}
function waitForShaderProgram(gl,program,shaders,extension){
 return new Promise((resolve,reject)=>{function poll(){try{
  if(gl.isContextLost()){reject(new Error('Контекст WebGL потерян при загрузке павильона.'));return}
  if(extension&&!gl.getProgramParameter(program,extension.COMPLETION_STATUS_KHR)){requestAnimationFrame(poll);return}
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const logs=shaders.filter(shader=>!gl.getShaderParameter(shader,gl.COMPILE_STATUS)).map(shader=>gl.getShaderInfoLog(shader)).filter(Boolean);reject(new Error(logs.join('\n')||gl.getProgramInfoLog(program)||'Не удалось подготовить графику павильона.'));return}
  resolve();
 }catch(error){reject(error)}}poll()});
}
let lighting=true;document.getElementById('lighting').onclick=e=>{lighting=!lighting;const button=e.currentTarget,label=lighting?'Свет включён. Приглушить':'Свет приглушён. Включить';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',lighting)};const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec2 uv;attribute vec3 normal;attribute vec3 tint;varying vec3 shade;uniform mat4 m;uniform mat4 model;varying vec2 t;varying vec3 world;varying vec3 norm;varying float depth;void main(){vec4 wp=model*vec4(p,1.);gl_Position=m*wp;shade=tint;t=uv;world=wp.xyz;norm=mat3(model)*normal;depth=gl_Position.w;}'));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 shade;uniform vec3 lightPositions[12];uniform vec4 hallLightBounds;uniform sampler2D tex;uniform float textured;uniform float power;uniform float emission;uniform float clipBelowY;varying vec2 t;varying vec3 world;varying vec3 norm;varying float depth;vec3 lamp(vec3 pos,vec3 tint){vec3 d=pos-world;float len=length(d);return tint*max(dot(normalize(norm),normalize(d)),0.)*5.0/(1.+.16*len*len);}void main(){if(world.y<clipBelowY)discard;vec4 pixel=vec4(1.);if(textured>.5)pixel=texture2D(tex,t);if(textured>.5&&pixel.a<.1)discard;vec3 c=mix(shade,pixel.rgb,textured);vec3 light=vec3(.36)+vec3(.18)*max(dot(normalize(norm),normalize(vec3(.3,1.,.4))),0.);light+=power*(lamp(lightPositions[0],vec3(.75,1.,.65))+lamp(lightPositions[1],vec3(1.,.72,.38))+lamp(lightPositions[2],vec3(.42,.78,1.))+lamp(lightPositions[3],vec3(1.,.48,.75))+lamp(lightPositions[4],vec3(.65,1.,.86))+lamp(lightPositions[5],vec3(.68,.65,1.))+lamp(lightPositions[6],vec3(.65,.72,1.))+lamp(lightPositions[7],vec3(.75,1.,.48))+lamp(lightPositions[8],vec3(.65,.88,1.))+lamp(lightPositions[9],vec3(1.,.78,.42))+lamp(lightPositions[10],vec3(.42,1.,.88))+lamp(lightPositions[11],vec3(.65,.91,.78)));vec3 hallLamp=vec3(clamp(floor(world.x/12.+.5)*12.,hallLightBounds.x,hallLightBounds.y),4.7,clamp(floor((world.z-3.)/9.+.5)*9.+3.,hallLightBounds.z,hallLightBounds.w));light+=power*.6*lamp(hallLamp,vec3(.60,.80,.92));c*=mix(light,vec3(1.15),max(emission,textured*.78));float fog=clamp((depth-12.)/44.,0.,.6);gl_FragColor=vec4(mix(c,vec3(.045,.08,.12),fog),1.);}'));gl.linkProgram(pr);canvas.dataset.hallSize=hallWidth+'×'+hallDepth;
// Locations are queried only after model preparation and program completion.
let attrP,attrUV,mat,modelLoc,lightPositionLocation,attrTint,attrNormal,power,emit,clipBelowY,windowTexturedLocation,lightLayoutRevision=-1;
function initializeShaderProgram(){
 gl.useProgram(pr);gl.uniform4fv(gl.getUniformLocation(pr,'hallLightBounds'),new Float32Array([hallLights.left,hallLights.right,hallLights.back,hallLights.front]));
 attrP=gl.getAttribLocation(pr,'p');attrUV=gl.getAttribLocation(pr,'uv');attrTint=gl.getAttribLocation(pr,'tint');attrNormal=gl.getAttribLocation(pr,'normal');
 mat=gl.getUniformLocation(pr,'m');modelLoc=gl.getUniformLocation(pr,'model');lightPositionLocation=gl.getUniformLocation(pr,'lightPositions[0]');windowTexturedLocation=gl.getUniformLocation(pr,'textured');power=gl.getUniformLocation(pr,'power');emit=gl.getUniformLocation(pr,'emission');clipBelowY=gl.getUniformLocation(pr,'clipBelowY');
 gl.enable(gl.DEPTH_TEST);gl.clearColor(.035,.075,.105,1);
}
function mul(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r}
function camera(){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),r=[cy,0,sy],u=[-sy*sp,cp,cy*sp],b=[-sy*cp,-sp,cy*cp],dot=v=>v[0]*eye[0]+v[1]*eye[1]+v[2]*eye[2];const view=[r[0],u[0],b[0],0,r[1],u[1],b[1],0,r[2],u[2],b[2],0,-dot(r),-dot(u),-dot(b),1];const aspect=canvas.width/canvas.height,f=(Math.min(1/Math.tan(Math.PI/6),aspect*1.25)*zoom);return mul([f/aspect,0,0,0,0,f,0,0,0,0,-1.002,-1,0,0,-.2002,0],view)}
let emissive=0,motion=null,waterline=null;const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);let animTime=0,animated=!matchMedia('(prefers-reduced-motion: reduce)').matches;const animButton=document.getElementById('animate');function animLabel(){animButton.textContent=animated?'Анимация: включена':'Анимация: пауза';animButton.setAttribute('aria-pressed',animated)}animLabel();animButton.onclick=()=>{animated=!animated;animLabel()};function transform(x,y,z,angle=0){const c=Math.cos(angle),s=Math.sin(angle);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,x,y,z,1])}function pivotZ(x,y,z,a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,x-c*x+s*y,y-s*x-c*y,0,1])}let activePlatform=-1;const objects=[];function pickStand(clientX,clientY){if(pickWorldControl(clientX,clientY))return;const r=canvas.getBoundingClientRect(),px=(clientX-r.left)/r.width*2-1,py=1-(clientY-r.top)/r.height*2,m=camera();let hit=-1,depth=Infinity;function project(x,y,z){const w=m[3]*x+m[7]*y+m[11]*z+m[15];return {x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,w}}stands.forEach(([x,y,z],i)=>{const points=[project(x-1.65,.3,z+.3),project(x+1.65,.3,z+.3),project(x+1.65,3.5,z+.3),project(x-1.65,3.5,z+.3)];if(points.some(p=>p.w<=.1)||eye[2]<z+.3)return;const inside=px>=Math.min(...points.map(p=>p.x))&&px<=Math.max(...points.map(p=>p.x))&&py>=Math.min(...points.map(p=>p.y))&&py<=Math.max(...points.map(p=>p.y));if(inside&&points[0].w<depth){hit=i;depth=points[0].w}});if(hit>=0){go(String(hit));return}pickFloor(clientX,clientY)}
// Cache shared poses for an exact animation time; callers treat results as read-only.
function cacheAnimationState(compute){
 let time=NaN;const values=new Map();
 return (t,key=0)=>{if(t!==time){time=t;values.clear()}if(!values.has(key))values.set(key,compute(t,key));return values.get(key)};
}
function objectMatrix(object,time,cache=null){
 if(cache){let group=cache.get(object.group);if(!group){group=new Map();cache.set(object.group,group)}const key=object.motion||null;if(!group.has(key))group.set(key,objectMatrix(object,time));return group.get(key)}
 const model=object.motion?object.motion(time):identity,delta=standOffset(object.group);
 if(!delta[0]&&!delta[1]&&!delta[2])return model;
 const result=new Float32Array(model);result[12]+=delta[0];result[13]+=delta[1];result[14]+=delta[2];return result;
}
function combinedBounds(parts){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const {bounds:{center,extent}} of parts)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],center[j]-extent[j]);hi[j]=Math.max(hi[j],center[j]+extent[j])}
 return {center:lo.map((n,j)=>(n+hi[j])/2),extent:lo.map((n,j)=>(hi[j]-n)/2)};
}
function viewFrustum(matrix){
 const planes=new Float32Array(24);let k=0;
 for(let axis=0;axis<3;axis++)for(const sign of [1,-1])for(let column=0;column<4;column++)planes[k++]=matrix[column*4+3]+sign*matrix[column*4+axis];
 return planes;
}
function boundsInView(bounds,model,planes){
 // Transform the whole bounding box, including rotation and nonuniform scale.
 // An intersecting box stays visible: this only rejects boxes wholly outside a plane.
 const c=bounds.center,e=bounds.extent;
 const x=model[0]*c[0]+model[4]*c[1]+model[8]*c[2]+model[12],y=model[1]*c[0]+model[5]*c[1]+model[9]*c[2]+model[13],z=model[2]*c[0]+model[6]*c[1]+model[10]*c[2]+model[14];
 const rx=Math.abs(model[0])*e[0]+Math.abs(model[4])*e[1]+Math.abs(model[8])*e[2],ry=Math.abs(model[1])*e[0]+Math.abs(model[5])*e[1]+Math.abs(model[9])*e[2],rz=Math.abs(model[2])*e[0]+Math.abs(model[6])*e[1]+Math.abs(model[10])*e[2];
 for(let k=0;k<24;k+=4)if(planes[k]*x+planes[k+1]*y+planes[k+2]*z+planes[k+3]+Math.abs(planes[k])*rx+Math.abs(planes[k+1])*ry+Math.abs(planes[k+2])*rz<-.001)return false;
 return true;
}
function geometryBounds(v){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let k=0;k<v.length;k+=5)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],v[k+j]);hi[j]=Math.max(hi[j],v[k+j])}return {center:lo.map((n,j)=>(n+hi[j])/2),extent:lo.map((n,j)=>(hi[j]-n)/2)}}
// Write upload data directly; keep only original coordinates for exact picking and later rebuilds.
// Small immutable angle/topology tables are shared by all decorative models.
const angularTemplates=new Map(),sphereTemplates=new Map();
function circleTemplate(segments,divisor,multiple=1){
 const key=segments+':'+divisor+':'+multiple;
 if(!angularTemplates.has(key)){const values=new Float64Array((segments+1)*2);for(let k=0;k<=segments;k++){const a=k*Math.PI*multiple/divisor;values[k*2]=Math.cos(a);values[k*2+1]=Math.sin(a)}angularTemplates.set(key,values)}
 return angularTemplates.get(key);
}
function sphereTemplate(lat,lon){
 const key=lat+':'+lon;
 if(!sphereTemplates.has(key)){const order=new Uint16Array(lat*lon*6);let n=0;for(let a=0;a<lat;a++)for(let b=0;b<lon;b++){const p=a*(lon+1)+b,q=p+lon+1;for(const index of [p,q+1,q,p,p+1,q+1])order[n++]=index}sphereTemplates.set(key,{latitude:circleTemplate(lat,lat),longitude:circleTemplate(lon,lon,2),order})}
 return sphereTemplates.get(key);
}
function sphereVertices(x,y,z,rx,ry,rz,lat,lon,translateXZ=true){
 const template=sphereTemplate(lat,lon),points=new Float64Array((lat+1)*(lon+1)*5);let offset=0;
 for(let a=0;a<=lat;a++)for(let b=0;b<=lon;b++){
  const sin=template.latitude[a*2+1],cos=template.latitude[a*2],px=rx*sin*template.longitude[b*2],pz=rz*sin*template.longitude[b*2+1];
  // Evolution meshes omit X/Z translation; preserve their original signed zero as well.
  points[offset++]=translateXZ?x+px:px;points[offset++]=y+ry*cos;points[offset++]=translateXZ?z+pz:pz;points[offset++]=b/lon;points[offset++]=a/lat;
 }
 const vertices=new Float64Array(template.order.length*5);offset=0;
 for(const index of template.order)for(let j=0;j<5;j++)vertices[offset++]=points[index*5+j];
 return vertices;
}
function writeRenderVertices(vertices,data,offset=0,color=null){
 for(let i=0;i<vertices.length;i+=15){
  const ux=vertices[i+5]-vertices[i],uy=vertices[i+6]-vertices[i+1],uz=vertices[i+7]-vertices[i+2],vx=vertices[i+10]-vertices[i],vy=vertices[i+11]-vertices[i+1],vz=vertices[i+12]-vertices[i+2];
  const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz)||1;
  for(let k=0;k<3;k++){for(let j=0;j<5;j++)data[offset++]=vertices[i+k*5+j];data[offset++]=nx/len;data[offset++]=ny/len;data[offset++]=nz/len;if(color)for(let j=0;j<3;j++)data[offset++]=color[j]}
 }
 return offset;
}
function mesh(vertices,color,texture){const group=activeStandGroup>=0?activeStandGroup:activePlatform,item={buffer:null,vertices,group,platform:group,bounds:geometryBounds(vertices),n:vertices.length/5,color,texture,emission:emissive,motion,waterline,benchmarkVariant:activeBenchmarkVariant};objects.push(item);if(group>=0)standGroups[group].children.push(item)}
function quad(a,b,c,d,color,texture){mesh([...a,0,0,...b,1,0,...c,1,1,...a,0,0,...c,1,1,...d,0,1],color,texture)}
function box(x,y,z,w,h,d,color){const a=x-w/2,b=x+w/2,c=y,dY=y+h,e=z-d/2,f=z+d/2;quad([a,c,f],[b,c,f],[b,dY,f],[a,dY,f],color);quad([b,c,e],[a,c,e],[a,dY,e],[b,dY,e],color.map(v=>v*.65));quad([a,c,e],[a,c,f],[a,dY,f],[a,dY,e],color.map(v=>v*.8));quad([b,c,f],[b,c,e],[b,dY,e],[b,dY,f],color.map(v=>v*.75));quad([a,dY,f],[b,dY,f],[b,dY,e],[a,dY,e],color.map(v=>Math.min(1,v*1.2)));quad([a,c,e],[b,c,e],[b,c,f],[a,c,f],color.map(v=>v*.55))}
function texture(image){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);if(image)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function gameSign(title,subtitle,x,z){
 const q=document.createElement('canvas').getContext('2d');
 function wrap(text,font){q.font=font;const lines=[];let line='';for(const word of text.split(/\s+/)){const candidate=line?line+' '+word:word;if(line&&q.measureText(candidate).width>950){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);return lines}
 const titleLines=wrap(title,'bold 62px Segoe UI'),subtitleLines=wrap(subtitle,'46px Segoe UI'),pixels=32+titleLines.length*76+4+subtitleLines.length*54;
 label(title,x,3.48,z+.25,3.25,pixels*3.25/1024,'#d0f5e4',subtitle,{titleLines,subtitleLines});
}
function label(text,x,y,z,w,h,color='#d0f5e4',subtitle='',layout=null){
// Solid sign housing, opaque back and illuminated edge, with a readable front face.
box(x,y-.035,z-.105,w+.10,h+.07,.19,[.11,.20,.25]);
raisedFrame(x,y-.035,z-.010,w+.10,h+.07,.025,.025,[.34,.64,.61]);
const c=document.createElement('canvas');c.width=1024;c.height=Math.max(1,Math.round(c.width*h/w));const q=c.getContext('2d');q.fillStyle='#102632';q.fillRect(0,0,c.width,c.height);q.textAlign='center';q.textBaseline='middle';
function line(value,cy,size,weight,tint){q.font=weight+' '+size+'px Segoe UI';const fitted=Math.min(size,size*(c.width-54)/Math.max(1,q.measureText(value).width));q.font=weight+' '+fitted+'px Segoe UI';q.fillStyle=tint;q.fillText(value,c.width/2,cy)}
if(layout){let cy=16+38;q.font='bold 62px Segoe UI';q.fillStyle=color;for(const value of layout.titleLines){q.fillText(value,512,cy);cy+=76}cy+=4-38+27;q.font='46px Segoe UI';q.fillStyle='#a9c9c7';for(const value of layout.subtitleLines){q.fillText(value,512,cy);cy+=54}}else{line(text,c.height*(subtitle?.33:.5),c.height*(subtitle?.38:.55),'bold',color);if(subtitle)line(subtitle,c.height*.70,c.height*.27,'normal','#a9c9c7')}quad([x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z],[1,1,1],texture(c));objects[objects.length-1].oneSided=true}
// Hall geometry and navigation share one set of bounds.
quad([hall.left,0,hall.front],[hall.right,0,hall.front],[hall.right,0,hall.back],[hall.left,0,hall.back],[.10,.17,.20]);
for(let z=Math.ceil(hall.back/2)*2;z<=hall.front;z+=2)box(0,.005,z,hallWidth,.012,.025,[.20,.32,.35]);
for(let x=hall.left;x<=hall.right;x+=2)box(x,.005,hallCenterZ,.025,.012,hallDepth,[.20,.32,.35]);
box(hall.left,0,hallCenterZ,.25,6,hallDepth,[.12,.21,.26]);box(hall.right,0,hallCenterZ,.25,6,hallDepth,[.12,.21,.26]);box(0,0,hall.back,hallWidth,6,.25,[.10,.19,.24]);
for(let z=hall.back+2;z<hall.front-2;z+=6){box(hall.left+.5,0,z,.35,5,.35,[.28,.39,.43]);box(hall.right-.5,0,z,.35,5,.35,[.28,.39,.43]);box(0,5,z,hallWidth-1,.12,.16,[.42,.65,.65])}
for(const x of mainAisles)box(x,.02,hallCenterZ,.06,.02,hallDepth-2,[.43,.65,.59]);
for(const z of crossAisles)box(0,.02,z,hallWidth-4,.02,.045,[.30,.46,.44]);

const zoneFloorColors=[[.20,.34,.20],[.39,.28,.16],[.14,.28,.37],[.35,.19,.32],[.14,.31,.28],[.22,.20,.38],[.16,.20,.38],[.16,.30,.23],[.22,.32,.40],[.36,.27,.18],[.10,.28,.33],[.18,.32,.29]];
function screenBezel(x,z,color,bodyColor){
 // A single shell: the bezel owns the sides and back, with no overlapping body box.
 const outer=[[-1.675,.30],[1.675,.30],[1.675,3.44],[-1.675,3.44]],inner=[[-1.5,.38],[1.5,.38],[1.5,3.25],[-1.5,3.25]],p=(v,depth)=>[x+v[0],v[1],z+depth];
 for(let k=0;k<4;k++){const j=(k+1)%4,a=outer[k],b=outer[j],c=inner[j],d=inner[k];
  quad(p(a,.285),p(b,.285),p(c,.285),p(d,.285),color);
  quad(p(a,-.25),p(b,-.25),p(b,.285),p(a,.285),bodyColor.map(v=>v*.8));
  quad(p(d,.24),p(d,.285),p(c,.285),p(c,.24),color.map(v=>v*.65));
 }
 quad(p(outer[1],-.25),p(outer[0],-.25),p(outer[3],-.25),p(outer[2],-.25),bodyColor.map(v=>v*.65));
 quad(p(inner[0],.24),p(inner[1],.24),p(inner[2],.24),p(inner[3],.24),bodyColor);
}
standAnchors.forEach(([x,y,z],i)=>withStandGroup(i,()=>{const zone=zoneFloorColors[i];if(i<6){box(x,0,z,3.7,.3,1.7,zone);screenBezel(x,z,zone.map(v=>Math.min(1,v*1.5)),zone);}else themedScreenHousing(i,x,z,zone);const theme=standTheme(games[i].id);label(theme.label.toUpperCase(),x,4.60,z+.10,4.5,.30,theme.color);gameSign(games[i].title,['САД ЧЕТЫРЁХ СЕЗОНОВ','ЛОГИКА / РИСК / ХОД','РОБОСКЛАД / СЕКТОР 03','ПРАЗДНИЧНЫЕ ПОЖЕЛАНИЯ','ОТ ТЕРМИНАЛА ДО ФРУКТОВОГО САДА','КАСАНИЯ / МУЛЬТИТАЧ / FPS','КОСМОС / ТРАЕКТОРИЯ / ДОСТАВКА','СВЕТЛЯЧКИ / ЛУННЫЙ ЦВЕТОК','ПРЫЖКИ / ОБЛАКА / ЗВЁЗДЫ','БЛОКИ / ТЕЛЕЖКА / КРАН','РИФ / ОБРАЗЦЫ / СОНАР','КРЕСТИКИ / ЦИФРЫ / КРАКЕН'][i],x,z);previewImages[i].then(img=>{if(img)withStandGroup(i,()=>{const c=document.createElement('canvas');c.width=768;c.height=736;const q=c.getContext('2d');q.fillStyle='#10212b';q.fillRect(0,0,768,736);const s=Math.max(768/img.width,736/img.height);q.drawImage(img,(768-img.width*s)/2,(736-img.height*s)/2,img.width*s,img.height*s);quad([x-1.5,.38,z+.27],[x+1.5,.38,z+.27],[x+1.5,3.25,z+.27],[x-1.5,3.25,z+.27],[1,1,1],texture(c));});window.PAVILION_LOADING?.previewDone()}).catch(error=>{window.PAVILION_LOADING?.fail();console.error(error)})}));
// Subscribers own pending loads; release promises that would retain decoded images.
previewImages.length=0;

// Decorative geometry belongs only to this local showcase prototype.
const props=[];function prop(x,z,r){const group=activeStandGroup>=0?activeStandGroup:activePlatform,p={x,z,r,group,benchmarkVariant:activeBenchmarkVariant};props.push(p);if(group>=0)standGroups[group].obstacles.push(p)}
function ball(x,y,z,rx,ry,rz,color){mesh(sphereVertices(x,y,z,rx,ry,rz,8,12),color)}
function tree(x,z,size,scale=1){box(x,0,z,.55*scale,.45,.55*scale,[.21,.24,.19]);box(x,.4,z,.22*scale,size,.22*scale,[.38,.21,.12]);ball(x,size+.5,z,.75*scale,.85*scale,.7*scale,[.19,.45,.22]);ball(x-.35*scale,size+.35,z+.3*scale,.48*scale,.55*scale,.5*scale,[.27,.57,.25]);ball(x+.4*scale,size+.55,z,.55*scale,.65*scale,.55*scale,[.33,.62,.28]);prop(x,z,.85*scale)}
function raisedFrame(x,y,z,w,h,inset,depth,color){
 // One extruded ring: shared corner coordinates, no overlapping trim bars.
 const outer=[[-w/2,0],[w/2,0],[w/2,h],[-w/2,h]],inner=[[-w/2+inset,inset],[w/2-inset,inset],[w/2-inset,h-inset],[-w/2+inset,h-inset]],p=(v,d)=>[x+v[0],y+v[1],z+d];
 for(let k=0;k<4;k++){const j=(k+1)%4,a=outer[k],b=outer[j],c=inner[j],d=inner[k];
  quad(p(a,depth),p(b,depth),p(c,depth),p(d,depth),color);
  quad(p(a,0),p(b,0),p(b,depth),p(a,depth),color.map(v=>v*.78));
  quad(p(d,depth),p(c,depth),p(c,0),p(d,0),color.map(v=>v*.65));
 }
}
function crate(x,y,z){box(x,y,z,.9,.85,.9,[.26,.40,.50]);raisedFrame(x,y+.10,z+.45,.74,.63,.05,.03,[.68,.82,.84])}
// Ceiling coffers, rail lights, wall ribs and a welcome plinth.
quad([hall.left,hall.height,hall.back],[hall.right,hall.height,hall.back],[hall.right,hall.height,hall.front],[hall.left,hall.height,hall.front],[.12,.19,.25]);
for(let z=hall.back+3;z<=hall.front-3;z+=3){box(hall.left+.25,.6,z,.15,3.6,1.6,[.18,.27,.33]);box(hall.right-.25,.6,z,.15,3.6,1.6,[.18,.27,.33])}
for(const [i,[x,z,tint]] of [[-4,-1,[.75,1,.65]],[4,-1,[1,.72,.38]],[-4,-10,[.42,.78,1]],[4,-10,[1,.48,.75]],[0,-16,[.65,1,.86]],[-8,-22,[.68,.65,1]],[8,-22,[.65,.72,1]],[-8,-30,[.75,1,.48]],[0,-30,[.65,.88,1]],[8,-30,[1,.78,.42]]].entries())if(i<6)withStandGroup(i,()=>{box(x,4.9,z,3,.15,1.3,[.16,.22,.28]);emissive=1;box(x,4.85,z,2.7,.04,1,[...tint]);emissive=0;box(x-1.5,4.9,z,.06,.6,.06,[.45,.52,.56]);box(x+1.5,4.9,z,.06,.6,.06,[.45,.52,.56]);});
emissive=1;box(hall.left+.5,.12,hallCenterZ,.07,.05,hallDepth-2,[.35,.62,.68]);box(hall.right-.5,.12,hallCenterZ,.07,.05,hallDepth-2,[.35,.62,.68]);emissive=0;
standAnchors.slice(6).forEach(([x,y,z],j)=>withStandGroup(j+6,()=>{for(const side of [-1,1]){box(x+side*2.5,5.12,z+.3,.07,.35,.07,[.22,.29,.34]);box(x+side*2.5,5.04,z+.3,.35,.10,.35,[.24,.33,.40]);emissive=1;box(x+side*2.5,5.025,z+.3,.24,.025,.24,[.75,.86,.92]);emissive=0}}));
// General ceiling lights also illuminate the free areas reserved for future stands.
for(let x=hallLights.left;x<=hallLights.right;x+=12)for(let z=hallLights.back;z<=hallLights.front;z+=9){
 if(stands.some(s=>Math.hypot(s[0]-x,s[2]+2-z)<2)||standGroups.slice(6).some(g=>Math.abs(g.position[0]-x)<3.1&&z>g.position[2]-1.75&&z<g.position[2]+3.75))continue;
 box(x,4.9,z,2.4,.15,1.0,[.16,.22,.28]);emissive=1;box(x,4.86,z,2.15,.04,.78,[.64,.83,.96]);emissive=0;
 for(const side of [-1,1])box(x+side*1.05,5.05,z,.045,hall.height-5.05,.045,[.38,.52,.58]);
}
// The far end is occupied by the evolution stand.
// Distinct floor materials and perimeter frames. Keep the central aisle clear.
const colors=zoneFloorColors;
standAnchors.slice(0,6).forEach(([x,y,z],i)=>withStandGroup(i,()=>{const tint=i===0?[.50,.76,.35]:i===1?[.91,.58,.20]:i===2?[.30,.68,.84]:[.91,.46,.70];if([1,2,5].includes(i)){const contour=standFootprint(roundedPlatformContour(x,z+1,6.2,5.5,.42));softPlatform(contour,.06,colors[i]);emissive=.35;platformTrim(contour,.062,tint);emissive=0}else{box(x,.025,z+1,6.2,.035,5.5,colors[i]);emissive=.6;box(x,.08,z+3.70,6.2,.025,.06,tint);emissive=0}}));
// Snake: garden beds, trees, fruit and a sculpted snake on the side lawn.
activePlatform=0;tree(-6.4,-1.5,1.45,.70);tree(-1.6,-1.7,1.6,.70);tree(-1.6,-3.7,1.3,.70);for(let k=0;k<5;k++){box(-6.65,.1,-2-k*.45,.8,.22,.34,[.20,.38,.19]);ball(-6.65,.42,-2-k*.45,.15,.15,.15,k%2?[.72,.21,.14]:[.79,.61,.13])}
function snakePose(t,lag){const a=t*.52-lag;const x=-4.5+1.45*Math.cos(a),z=-.28+.38*Math.sin(a);const angle=Math.atan2(-1.45*Math.sin(a),.38*Math.cos(a));return transform(x,0,z,angle)}
for(let k=8;k>=0;k--){const lag=k*.19;motion=t=>snakePose(t,lag);ball(0,.26,0,k===0?.30:.22,k===0?.24:.20,k===0?.32:.22,k===0?[.54,.88,.32]:[.30,.73,.27]);if(k===0){emissive=.3;ball(-.13,.38,.19,.038,.038,.038,[.025,.05,.02]);ball(.13,.38,.19,.038,.038,.038,[.025,.05,.02]);emissive=0}}motion=null;

activePlatform=1;
// Decorative board: two legal games, alternating X and O victories.
const boardRounds=[[[0,'x'],[3,'o'],[1,'x'],[4,'o'],[2,'x']],[[0,'x'],[3,'o'],[1,'x'],[4,'o'],[8,'x'],[5,'o']]],boardRoundSeconds=10;
function displayBoardState(t){const round=Math.floor(t/boardRoundSeconds)%2,phase=t%boardRoundSeconds;return {round,phase,moves:boardRounds[round],winner:round===0?'x':'o'}}
function displayPieceAmount(state,cell,kind){const index=state.moves.findIndex(move=>move[0]===cell&&move[1]===kind);if(index<0)return 0;const appear=Math.max(0,Math.min(1,(state.phase-(.65+index*.90))/.38)),clear=Math.max(0,Math.min(1,(9.6-state.phase)/.65));return (1-Math.pow(1-appear,3))*clear}
box(6,.05,-.9,1.5,.65,1.5,[.36,.27,.18]);for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(5.5+col*.5,.7,-1.4+row*.5,.46,.08,.46,(col+row)%2?[.75,.64,.40]:[.52,.43,.29]);
const boardPieceHeight=.16;
function displayPieceMotion(cell,kind){return t=>{const state=displayBoardState(t),amount=displayPieceAmount(state,cell,kind),scale=Math.max(.0001,amount),m=transform(5.5+(cell%3)*.5,.78+boardPieceHeight/2+.12*(1-amount)*amount,-1.4+Math.floor(cell/3)*.5,kind==='x'?Math.PI/4:0);for(const j of [0,1,2,4,5,6,8,9,10])m[j]*=scale;return m}}
function displayRing(){
 // A straight extrusion, matching the cross height, without a torus bevel.
 const n=48,outer=.168,inner=.116,half=boardPieceHeight/2,color=[.59,.89,.81],p=(r,a,y)=>[r*Math.cos(a),y,r*Math.sin(a)];
 for(let j=0;j<n;j++){const a=j/n*Math.PI*2,b=(j+1)/n*Math.PI*2;
  quad(p(outer,a,half),p(inner,a,half),p(inner,b,half),p(outer,b,half),color);
  quad(p(outer,b,-half),p(inner,b,-half),p(inner,a,-half),p(outer,a,-half),color.map(v=>v*.65));
  quad(p(outer,a,-half),p(outer,a,half),p(outer,b,half),p(outer,b,-half),color.map(v=>v*.9));
  quad(p(inner,b,-half),p(inner,b,half),p(inner,a,half),p(inner,a,-half),color.map(v=>v*.75));
 }
}
for(let cell=0;cell<9;cell++)for(const kind of ['x','o']){motion=displayPieceMotion(cell,kind);if(kind==='x'){box(0,-boardPieceHeight/2,0,.34,boardPieceHeight,.065,[.96,.88,.48]);for(const side of [-1,1])box(0,-boardPieceHeight/2,side*.10125,.065,boardPieceHeight,.1375,[.96,.88,.48])}else displayRing()}
// The winning line grows only after the final piece has settled.
for(const round of [0,1]){motion=t=>{const state=displayBoardState(t),winAt=.65+(state.moves.length-1)*.90+.38,show=state.round===round?Math.max(0,Math.min(1,(state.phase-winAt)/.35))*Math.max(0,Math.min(1,(9.6-state.phase)/.65)):0,m=transform(6,.78+boardPieceHeight+.015,-1.4+round*.5);m[0]=Math.max(.0001,show);m[5]=m[10]=Math.max(.0001,show*(1+.09*Math.sin(t*4)));return m};emissive=.7;box(0,0,0,1.32,.035,.065,round===0?[1,.78,.25]:[.42,1,.80]);emissive=0}motion=null;prop(6,-.9,1.15);
// The mine gently turns and breathes while its bottom stays at the pedestal height.
box(2,.25,-.4,1.35,.3,1.35,[.43,.32,.21]);
function decorativeMinePose(t){const scale=1+.012*Math.sin(t*1.7),m=transform(2,1.05+.5*(scale-1),-.4,.075*Math.sin(t*.85));for(const j of [0,1,2,4,5,6,8,9,10])m[j]*=scale;return m}
motion=decorativeMinePose;ball(0,0,0,.5,.5,.5,[.20,.22,.25]);for(let k=0;k<6;k++){const a=k*Math.PI/3;ball(Math.cos(a)*.51,Math.sin(a)*.51,0,.12,.12,.12,[.65,.33,.16])}motion=null;prop(2,-.4,.85);

// Robots: storage racks, crates, pipes and a freestanding robot.
activePlatform=2;
// Keep the rack clear of the display; static scenery may extend past the floor tile.
const rackStart=objects.length,rackX=-6.90;
for(let z=-13;z<=-11;z+=2){box(rackX-.75,0,z,.1,2.8,.1,[.35,.48,.55]);box(rackX+.75,0,z,.1,2.8,.1,[.35,.48,.55]);for(let y=.3;y<2.6;y+=1.1){box(rackX,y,z,1.7,.1,1.2,[.30,.40,.49]);crate(rackX,y+.10,z)}}
objects.slice(rackStart).forEach(o=>o.allowPlatformOverflow=true);
prop(rackX,-12,1.1);const driveRadiusX=.70,driveRadiusZ=.38,driveRate=.32,driveSamples=1024,driveArc=[0];
for(let k=1;k<=driveSamples;k++){const a=(k-1)/driveSamples*Math.PI*2,b=k/driveSamples*Math.PI*2;driveArc.push(driveArc[k-1]+Math.hypot(driveRadiusX*(Math.cos(b)-Math.cos(a)),driveRadiusZ*(Math.sin(b)-Math.sin(a))))}
let cachedDriveTime=-1,cachedDrive;function robotDrive(t){if(t===cachedDriveTime)return cachedDrive;cachedDriveTime=t;const q=t*driveRate,turns=Math.floor(q/(Math.PI*2)),a=q-turns*Math.PI*2,k=a/(Math.PI*2)*driveSamples,j=Math.floor(k),distance=turns*driveArc[driveSamples]+driveArc[j]+(driveArc[j+1]-driveArc[j])*(k-j);let heading=Math.atan2(-driveRadiusX*Math.sin(a),driveRadiusZ*Math.cos(a));if(a>Math.PI)heading-=Math.PI*2;heading-=turns*Math.PI*2;return cachedDrive={x:-2.6+driveRadiusX*Math.cos(a),z:-9.5+driveRadiusZ*Math.sin(a),heading,distance}}
function robotPose(t){const p=robotDrive(t);return transform(p.x,0,p.z,p.heading)}
function pivotX(x,y,z,a){const c=Math.cos(a),sn=Math.sin(a);return new Float32Array([1,0,0,0,0,c,sn,0,0,-sn,c,0,0,y-c*y+sn*z,z-sn*y-c*z,1])}
// Beep: low cream/green chassis on four wheels, matching the game's robot.
motion=robotPose;box(0,.24,0,.86,.14,.94,[.23,.35,.28]);box(0,.38,0,.76,.54,.82,[.79,.79,.63]);box(0,.86,0,.65,.08,.70,[.88,.87,.71]);
box(0,.57,.424,.60,.28,.035,[.13,.25,.22]);emissive=.8;box(-.14,.66,.448,.09,.09,.012,[.64,.92,.80]);box(.14,.66,.448,.09,.09,.012,[.64,.92,.80]);emissive=0;
box(0,.42,.426,.40,.10,.035,[.49,.62,.46]);box(-.30,.87,.30,.10,.055,.09,[.99,.94,.70]);box(.30,.87,.30,.10,.055,.09,[.99,.94,.70]);
label('БИП',0,.425,.450,.32,.075,'#243e30');
function wheel(cx,cy,cz){const vertices=[],r=.23,n=20;for(let j=0;j<n;j++){const a=j/n*Math.PI*2,b=(j+1)/n*Math.PI*2,A=[cx-.085,cy+Math.sin(a)*r,cz+Math.cos(a)*r],B=[cx-.085,cy+Math.sin(b)*r,cz+Math.cos(b)*r],C=[cx+.085,B[1],B[2]],D=[cx+.085,A[1],A[2]];for(const v of [A,B,C,A,C,D,[cx-.085,cy,cz],B,A,[cx+.085,cy,cz],D,C])vertices.push(...v,0,0)}mesh(vertices,[.14,.23,.19]);box(cx,cy-.065,cz,.185,.13,.13,[.46,.57,.43]);for(let k=0;k<10;k++){const a=k/10*Math.PI*2,base=motion;motion=t=>mul(base(t),pivotX(cx,cy,cz,a));box(cx,cy+.221,cz,.18,.018,.055,k%2?[.39,.49,.38]:[.24,.34,.27]);motion=base}}
for(const side of [-1,1])for(const axle of [-.30,.30]){const cx=side*.44;motion=t=>{const p=robotDrive(t),angle=(p.distance-cx*p.heading)/.23;return mul(robotPose(t),pivotX(cx,.23,axle,angle))};wheel(cx,.23,axle)}motion=null;
// A two-link mechanical arm with joints and a gripper, inspired by RoboArt.arm.
const armBaseX=-6.10,armZ=-8.85;
box(armBaseX,.06,armZ,.72,.16,.72,[.23,.34,.28]);box(armBaseX,.22,armZ,.36,.32,.36,[.51,.63,.48]);
let cachedArmTime=-1,cachedArm;function armPoints(t){if(t===cachedArmTime)return cachedArm;cachedArmTime=t;const base=[armBaseX,.60],tip=[-5.00,.94+.27*Math.sin(t*.75)],dx=tip[0]-base[0],dy=tip[1]-base[1],d=Math.hypot(dx,dy),h=Math.sqrt(1.0-d*d/4);return cachedArm={base,tip,elbow:[(base[0]+tip[0])/2-dy/d*h,(base[1]+tip[1])/2+dx/d*h]}}
function armLink(which,width,color){motion=t=>{const p=armPoints(t),a=which===0?p.base:p.elbow,b=which===0?p.elbow:p.tip;return mul(transform(a[0],a[1],armZ),pivotZ(0,0,0,Math.atan2(b[1]-a[1],b[0]-a[0])))};box(.50,-width/2,0,1.0,width,.22,color);box(.50,-width*.20,.12,.72,width*.40,.025,[.94,.88,.65]);}
armLink(0,.23,[.83,.66,.33]);armLink(1,.18,[.77,.64,.36]);
for(const [joint,r] of [['base',.23],['elbow',.18]]){motion=t=>{const p=armPoints(t)[joint];return transform(p[0],p[1],armZ)};ball(0,0,0,r,r,.17,[.88,.76,.47]);ball(0,0,.16,r*.50,r*.50,.045,[.34,.48,.37]);}
motion=t=>{const p=armPoints(t).tip;return transform(p[0],p[1],armZ)};
box(0,-.04,0,.37,.16,.25,[.83,.69,.37]);emissive=.4;box(0,.11,.13,.18,.035,.02,[.55,.90,.72]);emissive=0;
// Each finger is one extruded L profile, without overlapping box surfaces.
function gripperFinger(side){
 const profile=[[.1825,-.08],[.2575,-.08],[.2575,-.34],[.085,-.34],[.085,-.275],[.1825,-.275]],point=(p,z)=>[side*p[0],p[1],z];
 function face(a,b,c,d,color){if(side<0)quad(d,c,b,a,color);else quad(a,b,c,d,color)}
 for(const z of [-.08,.08]){
  function patch(l,r,b,t,color){const a=[l,b],bb=[r,b],c=[r,t],d=[l,t];if(z>0)face(point(a,z),point(bb,z),point(c,z),point(d,z),color);else face(point(d,z),point(c,z),point(bb,z),point(a,z),color)}
  patch(.1825,.2575,-.275,-.08,[.46,.63,.49]);patch(.085,.2575,-.34,-.275,[.72,.80,.62]);
 }
 for(let j=0;j<profile.length;j++){const a=profile[j],b=profile[(j+1)%profile.length];face(point(a,-.08),point(b,-.08),point(b,.08),point(a,.08),[.48,.63,.47])}
}
for(const side of [-1,1]){gripperFinger(side);ball(side*.16,-.12,0,.065,.065,.095,[.34,.48,.37]);}
motion=null;prop(armBaseX,armZ,.48);prop(-5.0,armZ,.36);
activePlatform=3;
// Congratulations: coloured balloons, strings and gift boxes.
for(let k=0;k<6;k++){
 const x=5.85+(k%2)*.48,z=-13+(k%3)*1.5,y=2.1+(k%3)*.35,anchor=.12,knot=y-.43,c=k===1?[.94,.16,.22]:k===2?[.30,.78,.32]:[[.89,.37,.61],[.26,.78,.86],[.93,.74,.37]][k%3];
 motion=t=>pivotZ(x,anchor,z,.07*Math.sin(t*.8+k*.9)+.025*Math.sin(t*1.3+k));
 ball(x,y,z,.30,.43,.30,c);ball(x,knot,z,.035,.045,.035,c);box(x,anchor,z,.012,knot-anchor,.012,[.80,.82,.83]);motion=null;
 box(x,0,z,.20,.12,.20,[.45,.36,.40]);ball(x,anchor,z,.025,.025,.025,[.80,.82,.83]);
}prop(6.1,-11.5,.65);
// Gifts left of the screen, with ribbons and a small lid.
box(1.9,.08,-10.0,.70,.65,.70,[.76,.37,.58]);box(1.9,.10,-9.64,.08,.65,.025,[.96,.82,.54]);box(1.9,.73,-10.0,.75,.07,.75,[.84,.46,.65]);box(1.9,.80,-10.0,.08,.02,.75,[.96,.82,.54]);
box(2.55,.08,-10.15,.45,.40,.45,[.28,.66,.73]);box(2.55,.10,-9.91,.055,.40,.025,[.96,.82,.54]);box(2.55,.48,-10.15,.49,.06,.49,[.39,.75,.80]);prop(2.1,-10.05,.70);
// Two additional balloons are tied to the gift lids at the front left.
for(const [k,x,z,anchor,y,c] of [[0,1.9,-10.0,.82,2.18,[.65,.35,.88]],[1,2.55,-10.15,.54,2.45,[.98,.48,.18]]]){
 const knot=y-.43;motion=t=>pivotZ(x,anchor,z,.045*Math.sin(t*.85+k*1.7));
 ball(x,y,z,.30,.43,.30,c);ball(x,knot,z,.035,.045,.035,c);box(x,anchor,z,.012,knot-anchor,.012,[.80,.82,.83]);motion=null;
 ball(x,anchor,z,.025,.025,.025,[.80,.82,.83]);
}

activePlatform=4;
// Four moving miniature snakes represent successive visual eras.
const evolutionFields=[[-2.25,'1980'],[-.75,'1994'],[.75,'2003'],[2.25,'2026+']];
function evolutionGlyph(character){const c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d');q.font='bold 54px Consolas,monospace';q.fillStyle='#9dfca6';q.textAlign='center';q.textBaseline='middle';q.fillText(character,32,34);return texture(c)}
const terminalGlyphs={head:evolutionGlyph('O'),body:evolutionGlyph('#'),food:evolutionGlyph('*')};
function evolutionBall(r,style,color){const lat=style===2?4:12,lon=style===2?6:20;mesh(sphereVertices(0,r,0,r,r,r,lat,lon,false),color)}
function evolutionPose(style,segment,t){
 const center=evolutionFields[style][0],phase=t*.65-segment*.22+style*.9;let x,z,angle;
 if(style<2){const q=((phase%4)+4)%4;
  if(q<1){x=-.34+.68*q;z=.43;angle=Math.PI/2}
  else if(q<2){x=.34;z=.43-.86*(q-1);angle=Math.PI}
  else if(q<3){x=.34-.68*(q-2);z=-.43;angle=-Math.PI/2}
  else{x=-.34;z=-.43+.86*(q-3);angle=0}
  if(style===0){x=Math.round(x/.085)*.085;z=Math.round(z/.085)*.085}
 }else{const a=phase*Math.PI/2;x=.32*Math.cos(a);z=.43*Math.sin(a);angle=Math.atan2(-.32*Math.sin(a),.43*Math.cos(a))}
 return transform(center+x,.36,-16+z,angle);
}
for(const [style,[x,year]] of evolutionFields.entries()){
 const dark=style===0?[.025,.10,.075]:style===1?[.13,.25,.14]:[.15,.29,.26];
 box(x,.06,-16,1.25,.30,1.40,[.16,.27,.25]);
 quad([x-.60,.361,-15.32],[x+.60,.361,-15.32],[x+.60,.361,-16.68],[x-.60,.361,-16.68],dark);
 label(year,x,.13,-15.29,.62,.15,'#c5f3bd');prop(x,-16,.65);
 for(let segment=6;segment>=0;segment--){
  motion=t=>evolutionPose(style,segment,t);
  if(style===0){const r=.08;quad([-r,.004,r],[r,.004,r],[r,.004,-r],[-r,.004,-r],[1,1,1],segment===0?terminalGlyphs.head:terminalGlyphs.body);objects[objects.length-1].oneSided=true}
  else if(style===1){const size=segment===0?.17:.135;box(0,0,0,size,.12,size,segment===0?[.65,.91,.37]:[.38,.71,.27]);if(segment===0){box(-.045,.085,.086,.025,.025,.006,[.04,.09,.04]);box(.045,.085,.086,.025,.025,.006,[.04,.09,.04])}}
  else{const head=segment===0,r=head?.105:.079;const color=style===2?(head?[.48,.84,.69]:[.25,.58,.43]):head?[.63,.89,.33]:segment%2?[.36,.71,.29]:[.43,.78,.31];evolutionBall(r,style,color);if(head){ball(-.043,.145,.073,.027,.030,.018,[.97,1,.88]);ball(.043,.145,.073,.027,.030,.018,[.97,1,.88]);ball(-.043,.145,.090,.011,.014,.006,[.025,.05,.025]);ball(.043,.145,.090,.011,.014,.006,[.025,.05,.025])}}
 }
 motion=null;
 if(style===0){const r=.08;quad([x+.32-r,.366,-15.60+r],[x+.32+r,.366,-15.60+r],[x+.32+r,.366,-15.60-r],[x+.32-r,.366,-15.60-r],[1,1,1],terminalGlyphs.food)}
 else if(style===1)box(x,.36,-16,.10,.10,.10,[.87,.36,.65]);
 else{ball(x+.40,.43,-15.57,.07,.07,.07,[.91,.19,.13]);box(x+.40,.495,-15.57,.015,.05,.015,[.35,.23,.12])}
}
activePlatform=5;
// Benchmark decor variants are real geometry belonging to the same movable stand.
function benchmarkVariant(value,build){const previous=activeBenchmarkVariant;activeBenchmarkVariant=value;try{build()}finally{activeBenchmarkVariant=previous;motion=null;emissive=0}}
function benchmarkRing(x,y,z,r,color,width=.025){
 const angles=circleTemplate(36,18),vertices=new Float64Array(36*30);let offset=0;
 for(let k=0;k<36;k++)for(const [j,radius] of [[k,r],[k+1,r],[k+1,r-width],[k,r],[k+1,r-width],[k,r-width]]){vertices[offset++]=x+angles[j*2]*radius;vertices[offset++]=y+angles[j*2+1]*radius;vertices[offset++]=z;vertices[offset++]=0;vertices[offset++]=0}
 mesh(vertices,color);
}
function benchmarkCable(points,r,color){
 const angles=circleTemplate(8,4),vertices=new Array(Math.max(0,points.length-1)*8*30);let offset=0;
 for(let k=1;k<points.length;k++){
  const a=points[k-1],b=points[k],d=b.map((v,j)=>v-a[j]),len=Math.hypot(...d);if(len<1e-5)continue;
  const n=d.map(v=>v/len),helper=Math.abs(n[1])>.9?[1,0,0]:[0,1,0],u=[n[1]*helper[2]-n[2]*helper[1],n[2]*helper[0]-n[0]*helper[2],n[0]*helper[1]-n[1]*helper[0]],ul=Math.hypot(...u);for(let j=0;j<3;j++)u[j]/=ul;
  const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],ends=new Float64Array(2*9*3);
  for(let end=0;end<2;end++){const base=end?b:a;for(let j=0;j<=8;j++)for(let axis=0;axis<3;axis++)ends[end*27+j*3+axis]=base[axis]+r*(angles[j*2]*u[axis]+angles[j*2+1]*v[axis])}
  for(let j=0;j<8;j++)for(const index of [j,9+j,10+j,j,10+j,j+1]){for(let axis=0;axis<3;axis++)vertices[offset++]=ends[index*3+axis];vertices[offset++]=0;vertices[offset++]=0}
 }
 vertices.length=offset;mesh(vertices,color);
}
function benchmarkDisplay(x,y,z,w,h,title,retro=false){
 const casing=retro?[.46,.45,.32]:[.12,.23,.31],depth=retro?.50:.20;
 // Both cases end at z: the display and its bezel must stay in front of the housing.
 box(x,y-.07,z-depth/2,w+.12,h+.14,depth,casing);
 raisedFrame(x,y-.015,z+.007,w+.025,h+.03,.025,.025,retro?[.58,.65,.44]:[.34,.72,.81]);
 const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const q=c.getContext('2d');q.fillStyle=retro?'#0b201b':'#071c2a';q.fillRect(0,0,c.width,c.height);q.strokeStyle=retro?'#244638':'#163d50';q.lineWidth=1;
 for(let k=1;k<10;k++){q.beginPath();q.moveTo(k*c.width/10,0);q.lineTo(k*c.width/10,c.height);q.stroke();q.beginPath();q.moveTo(0,k*c.height/10);q.lineTo(c.width,k*c.height/10);q.stroke()}
 const touch=title==='КАСАНИЯ';q.fillStyle=retro?'#c0e998':'#8ae4fc';q.font='bold 34px Segoe UI';q.fillText(title,24,49);q.font='23px Segoe UI';q.fillText(retro?'СИГНАЛ / ВРЕМЯ':touch?'ДВА КАСАНИЯ':'ГРАФИК КАДРОВ',24,c.height-20);
 if(touch){
  for(const [px,py,tint] of [[.30,.45,'#62e2f5'],[.71,.65,'#c5a0ff']]){q.strokeStyle=tint;q.lineWidth=6;for(const r of [25,48]){q.beginPath();q.arc(c.width*px,c.height*py,r,0,Math.PI*2);q.stroke()}q.beginPath();q.moveTo(c.width*px-65,c.height*py);q.lineTo(c.width*px+65,c.height*py);q.moveTo(c.width*px,c.height*py-65);q.lineTo(c.width*px,c.height*py+65);q.lineWidth=2;q.stroke()}
 }else{
  q.strokeStyle=retro?'#b6ee7f':'#6be6f5';q.lineWidth=5;q.beginPath();for(let k=0;k<=100;k++){const px=22+k/100*(c.width-44),py=c.height*.53+Math.sin(k/100*Math.PI*4)*c.height*.17;if(k===0)q.moveTo(px,py);else q.lineTo(px,py)}q.stroke();
 }
 quad([x-w/2,y,z+.04],[x+w/2,y,z+.04],[x+w/2,y+h,z+.04],[x-w/2,y+h,z+.04],[1,1,1],texture(c));objects.at(-1).oneSided=true;
 if(touch){for(const k of [0,1]){motion=t=>transform(x+(k? .21:-.18)*w+Math.sin(t*.65+k)*w*.035,y+h*(k?.35:.55)+Math.cos(t*.7+k)*h*.025,z+.067);emissive=.8;ball(0,0,0,.032,.032,.024,k?[.77,.60,1]:[.35,.94,1]);motion=null;emissive=0}}
 else{motion=t=>{const phase=(t*.22)%1;return transform(x-w*.45+phase*w*.90,y+h*.47-Math.sin(phase*Math.PI*4)*h*.17,z+.065)};emissive=.8;ball(0,0,0,.025,.025,.025,retro?[.76,1,.43]:[.49,1,1]);motion=null;emissive=0}

}
benchmarkVariant(1,()=>{
 softPlatform(roundedPlatformContour(-8,-23,6.10,5.4,.42),.10,[.12,.23,.30],.063,.025);
 for(const side of [-1,1]){
  const x=-8+side*2.35,z=-22.7;
  box(x,.10,z,1.12,.13,.85,[.13,.30,.36]);box(x,.23,z,.14,.72,.16,[.37,.55,.62]);box(x,.88,z,1.04,.10,.58,[.17,.30,.39]);
  benchmarkDisplay(x,1.02,z+.16,.88,1.22,side<0?'КАСАНИЯ':'ВРЕМЯ КАДРА');prop(x,z,.72);
  // Touch rings rise only a little above their own low console.
  const px=x,pz=-21.7;box(px,.10,pz,.94,.43,.76,[.12,.25,.33]);box(px,.53,pz,.86,.035,.68,[.21,.46,.52]);label(side<0?'МУЛЬТИТАЧ':'ОТКЛИК ЭКРАНА',px,.23,pz+.395,.77,.16,'#a3eaf5');prop(px,pz,.61);
  for(let k=0;k<2;k++){motion=t=>{const p=(t*.45+k*.5)%1,scale=.75+p*.4,m=transform(px+(k? .18:-.18),.57,pz);m[0]=m[10]=scale;return m};emissive=.75;const vertices=[];for(let j=0;j<32;j++){const a=j*Math.PI/16,b=(j+1)*Math.PI/16;for(const [angle,r] of [[a,.14],[b,.14],[b,.12],[a,.14],[b,.12],[a,.12]])vertices.push(Math.cos(angle)*r,0,Math.sin(angle)*r,0,0)}mesh(vertices,side<0?[.32,.88,.98]:[.75,.59,1]);motion=null;emissive=0}
  emissive=.6;box(-8+side*2.85,.104,-23,.025,.014,4.8,[.30,.75,.85]);emissive=0;
 }
 // Central sensor surface stays below the line of sight to Play / Info.
 box(-8,.10,-21.5,1.45,.26,.78,[.13,.27,.34]);box(-8,.36,-21.5,1.31,.035,.66,[.23,.49,.55]);label('СЕНСОРНАЯ ПАНЕЛЬ',-8,.18,-21.09,1.12,.14,'#b1eff4');prop(-8,-21.5,.85);
 for(let k=0;k<3;k++){motion=t=>transform(-8+(k-1)*.36,.43+.025*Math.sin(t*1.5+k),-21.5);emissive=.8;ball(0,0,0,.045,.035,.045,[.45,.92,.96]);motion=null;emissive=0}
});
benchmarkVariant(2,()=>{
 const benchContour=roundedPlatformContour(-8,-23,6.10,5.4,.42);softPlatform(benchContour,.095,[.21,.16,.13],.063,.025);
 for(let k=0;k<10;k++){const x=-10.74+k*.61,plank=platformSlice(benchContour,x-.29,x+.29);softPlatform(plank,.12,k%2?[.31,.23,.16]:[.35,.26,.18],.095,.008);}
 for(const side of [-1,1]){
  const x=-8+side*2.30,z=-22.55;
  for(const dx of [-.47,.47])for(const dz of [-.55,.55])box(x+dx,.12,z+dz,.085,.66,.085,[.20,.25,.23]);
  box(x,.78,z,1.15,.11,1.35,[.48,.32,.19]);box(x,.68,z+.48,1.04,.09,.09,[.28,.22,.16]);prop(x,z,.88);
  if(side<0){
   benchmarkDisplay(x,1.06,z+.12,.84,.72,'ОСЦИЛЛОГРАФ',true);
   // Front controls and connected probes make the oscilloscope recognizable.
   box(x,.89,z+.105,.96,.16,.13,[.46,.45,.32]);
   for(let k=0;k<3;k++){const sx=x-.28+k*.28;benchmarkRing(sx,.94,z+.165,.046,[.75,.76,.57],.010);ball(sx,.94,z+.176,.030,.030,.030,[.29,.36,.29]);box(sx,.935,z+.206,.009,.023,.008,[.89,.88,.64])}
   for(const [dx,tint] of [[-.31,[.86,.39,.17]],[.31,[.22,.65,.68]]]){
    benchmarkRing(x+dx,.92,z+.181,.029,[.17,.24,.22],.010);
    benchmarkCable([[x+dx,.92,z+.185],[x+dx,.91,z+.45],[x+dx*.6,.91,z+.50]],.014,tint);
    benchmarkCable([[x+dx*.6,.91,z+.50],[x+dx*.6,.91,z+.62]],.026,[.19,.26,.24]);
   }
  }
  else{
   box(x,.89,z,1.0,.73,.55,[.39,.43,.33]);
   for(let k=0;k<2;k++){
    const gx=x+(k? .235:-.235),gy=1.31,gz=z+.29;
    box(gx,1.10,gz,.39,.39,.035,[.76,.75,.57]);
    const dial=document.createElement('canvas');dial.width=dial.height=512;const q=dial.getContext('2d');q.fillStyle='#d4d3b5';q.fillRect(0,0,512,512);q.strokeStyle='#34483a';q.fillStyle='#263d31';q.textAlign='center';q.textBaseline='middle';
    for(let j=0;j<=10;j++){const a=(-150+j*12)*Math.PI/180,r=j%5===0?170:180;q.lineWidth=j%5===0?7:4;q.beginPath();q.moveTo(256+Math.cos(a)*r,288+Math.sin(a)*r);q.lineTo(256+Math.cos(a)*200,288+Math.sin(a)*200);q.stroke();if(j%5===0){q.font='bold 45px Segoe UI';q.fillText(String(j),256+Math.cos(a)*130,288+Math.sin(a)*130)}}
    q.font='bold 70px Segoe UI';q.fillText(k?'мА':'V',256,345);q.font='bold 24px Segoe UI';q.fillText(k?'ТОК':'НАПРЯЖЕНИЕ',256,414);
    quad([gx-.175,gy-.175,gz+.030],[gx+.175,gy-.175,gz+.030],[gx+.175,gy+.175,gz+.030],[gx-.175,gy+.175,gz+.030],[1,1,1],texture(dial));objects.at(-1).oneSided=true;
    benchmarkRing(gx,gy,gz+.045,.168,[.15,.24,.21],.015);
    motion=t=>pivotZ(gx,gy,gz+.060,Math.sin(t*.8+k)*.75);box(gx,gy,gz+.060,.012,.14,.012,[.85,.32,.17]);motion=null;
    ball(gx,1.00,gz+.05,.042,.042,.025,[.18,.25,.23]);
   }
   label('БЛОК ПИТАНИЯ',x,1.64,z+.29,.91,.13,'#d8e6b2');
  }
  // Task lamp, supported on the workbench; all cable runs stay inside the platform.
  const lampX=-8+side*2.75;benchmarkCable([[lampX,.87,z-.32],[lampX,2.30,z-.32],[x,2.30,z-.32]],.025,[.24,.29,.27]);
  box(x,2.26,z-.28,.62,.085,.36,[.27,.30,.25]);emissive=1;box(x,2.249,z-.28,.54,.012,.28,[1,.73,.32]);emissive=0;
  const cable=[];for(let k=0;k<=18;k++){const t=k/18;cable.push([-8+side*(2.75-.38*t),.15+.015*Math.sin(t*Math.PI*2),-24.85+t*3.0])}benchmarkCable(cable,.022,side<0?[.75,.39,.15]:[.26,.56,.55]);
 }
 // A compact instrument case and coiled lead between the two benches.
 box(-8,.12,-21.65,1.10,.31,.64,[.30,.35,.28]);box(-8,.43,-21.65,1.14,.045,.68,[.41,.44,.33]);label('НАБОР ЩУПОВ',-8,.21,-21.30,.94,.13,'#e3d8b1');prop(-8,-21.65,.72);
 const lead=[];for(let k=0;k<=60;k++){const a=k/60*Math.PI*5;lead.push([-8+Math.cos(a)*.30,.50,-21.65+Math.sin(a)*.20])}benchmarkCable(lead,.016,[.15,.24,.22]);
});
// Detailed exhibits for the four new games. All motion uses the pavilion clock.
function exhibitClamp(v){return Math.max(0,Math.min(1,v))}
function exhibitEase(v){v=exhibitClamp(v);return v*v*(3-2*v)}
function exhibitPose(x,y,z,sx=1,sy=sx,sz=sx,angle=0){const m=transform(x,y,z,angle);for(const j of [0,1,2])m[j]*=sx;for(const j of [4,5,6])m[j]*=sy;for(const j of [8,9,10])m[j]*=sz;return m}
function exhibitBeam(a,b,r,color){benchmarkCable([a,b],r,color)}
function exhibitRing(x,y,z,rx,rz,color,width=.018,tilt=0){const angles=circleTemplate(48,24),sin=Math.sin(tilt),cos=Math.cos(tilt),points=[];for(let k=0;k<=48;k++)points.push([x+angles[k*2]*rx,y+angles[k*2+1]*rz*sin,z+angles[k*2+1]*rz*cos]);benchmarkCable(points,width,color)}
function exhibitDeck(x,z,rx,rz,height,color,n=12){const vertices=[];for(let k=0;k<n;k++){const a=k*Math.PI*2/n,b=(k+1)*Math.PI*2/n,p=[x+Math.cos(a)*rx,height,z+Math.sin(a)*rz],q=[x+Math.cos(b)*rx,height,z+Math.sin(b)*rz];vertices.push(x,height,z,0,0,...q,0,0,...p,0,0);quad([p[0],.06,p[2]],[q[0],.06,q[2]],q,p,color.map(v=>v*.72))}mesh(vertices,color)}
// Smooth exhibit bases share closed geometry and a narrow bevel.
function roundedPlatformContour(x,z,w,d,r,steps=12){
 const points=[],hx=w/2,hz=d/2;for(const [cx,cz,start]of [[hx-r,hz-r,0],[-hx+r,hz-r,Math.PI/2],[-hx+r,-hz+r,Math.PI],[hx-r,-hz+r,Math.PI*1.5]])for(let k=0;k<=steps;k++){const a=start+k/steps*Math.PI/2;points.push([x+cx+Math.cos(a)*r,z+cz+Math.sin(a)*r])}return points;
}
function ovalPlatformContour(x,z,rx,rz,segments=96){return Array.from({length:segments},(_,k)=>{const a=k*Math.PI*2/segments;return [x+Math.cos(a)*rx,z+Math.sin(a)*rz]})}
function cloudPlatformContour(x,z,rx,rz){
 const r=.70,w=rx*2-r*2,d=rz*2-r*2,arc=Math.PI*r/2;
 const segments=[
  [w,u=>[rx-r-w*u,rz,0,1]],
  [arc,u=>{const a=Math.PI/2+u*Math.PI/2;return [-rx+r+r*Math.cos(a),rz-r+r*Math.sin(a),Math.cos(a),Math.sin(a)]}],
  [d,u=>[-rx,rz-r-d*u,-1,0]],
  [arc,u=>{const a=Math.PI+u*Math.PI/2;return [-rx+r+r*Math.cos(a),-rz+r+r*Math.sin(a),Math.cos(a),Math.sin(a)]}],
  [w,u=>[-rx+r+w*u,-rz,0,-1]],
  [arc,u=>{const a=Math.PI*1.5+u*Math.PI/2;return [rx-r+r*Math.cos(a),-rz+r+r*Math.sin(a),Math.cos(a),Math.sin(a)]}],
  [d,u=>[rx,-rz+r+d*u,1,0]],
  [arc,u=>{const a=u*Math.PI/2;return [rx-r+r*Math.cos(a),rz-r+r*Math.sin(a),Math.cos(a),Math.sin(a)]}]
 ];
 const perimeter=segments.reduce((sum,part)=>sum+part[0],0),points=[];
 for(let k=0;k<192;k++){const u=k/192;let distance=u*perimeter,point;for(const [length,sample]of segments){if(distance<=length){point=sample(distance/length);break}distance-=length}const wave=.075*(.5+.5*Math.cos(u*Math.PI*22))+.012*(.5+.5*Math.sin(u*Math.PI*14));points.push([x+point[0]-point[2]*wave,z+point[1]-point[3]*wave])}return points;
}
function platformSlice(points,left,right){
 let output=points;for(const [edge,sign]of [[left,1],[right,-1]]){const input=output;output=[];for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],insideA=(a[0]-edge)*sign>=-1e-9,insideB=(b[0]-edge)*sign>=-1e-9;if(insideA)output.push(a);if(insideA!==insideB){const u=(edge-a[0])/(b[0]-a[0]);output.push([edge,a[1]+(b[1]-a[1])*u])}}}return output;
}
function softPlatformGeometry(points,height,bottom=.025,bevel=.04){
 const center=points.reduce((p,q)=>[p[0]+q[0]/points.length,p[1]+q[1]/points.length],[0,0]),inset=(p,amount)=>{const d=Math.hypot(p[0]-center[0],p[1]-center[1]);return p.map((v,i)=>v+(center[i]-v)*Math.min(.45,amount/d))},rise=Math.min(.018,(height-bottom)/4),buffers={top:[],edge:[],side:[],bottom:[]};
 const rings=[points.map(p=>[...inset(p,bevel*.5),bottom]),points.map(p=>[...p,bottom+rise]),points.map(p=>[...p,height-rise]),points.map(p=>[...inset(p,bevel),height])];
 const point=p=>[p[0],p[2],p[1]],tri=(buffer,a,b,c)=>buffer.push(...a,0,0,...b,0,0,...c,0,0);
 for(let k=0;k<points.length;k++){const next=(k+1)%points.length;tri(buffers.top,[center[0],height,center[1]],point(rings[3][next]),point(rings[3][k]));tri(buffers.bottom,[center[0],bottom,center[1]],point(rings[0][k]),point(rings[0][next]));for(let level=0;level<3;level++){const buffer=level===1?buffers.side:buffers.edge,a=point(rings[level][k]),b=point(rings[level+1][k]),c=point(rings[level+1][next]),d=point(rings[level][next]);tri(buffer,a,b,c);tri(buffer,a,c,d)}}return buffers;
}
function softPlatform(points,height,color,bottom=.025,bevel=.04){const geometry=softPlatformGeometry(points,height,bottom,bevel);mesh(geometry.top,color);mesh(geometry.edge,color.map(v=>Math.min(1,v*1.05)));mesh(geometry.side,color.map(v=>v*.70));mesh(geometry.bottom,color.map(v=>v*.48))}
function platformTrim(points,y,color,inset=.085,width=.023){const center=points.reduce((p,q)=>[p[0]+q[0]/points.length,p[1]+q[1]/points.length],[0,0]),vertices=[],p=(i,d)=>{const a=points[i],len=Math.hypot(a[0]-center[0],a[1]-center[1]);return [a[0]+(center[0]-a[0])*d/len,y,a[1]+(center[1]-a[1])*d/len]};for(let i=0;i<points.length;i++){const j=(i+1)%points.length;vertices.push(...p(i,inset),0,0,...p(j,inset+width),0,0,...p(j,inset),0,0,...p(i,inset),0,0,...p(i,inset+width),0,0,...p(j,inset+width),0,0)}mesh(vertices,color)}
function exhibitPlatform(points,height,color){const center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]),v=[];for(let k=0;k<points.length;k++){const a=points[k],b=points[(k+1)%points.length];v.push(center[0],height,center[1],0,0,b[0],height,b[1],0,0,a[0],height,a[1],0,0);quad([a[0],.06,a[1]],[b[0],.06,b[1]],[b[0],height,b[1]],[a[0],height,a[1]],color.map(c=>c*.72))}mesh(v,color)}
function exhibitLeaf(x,y,z,dx,dy,dz,w,color){const len=Math.hypot(dx,dz)||1,px=-dz/len,pz=dx/len,v=[];function point(u,side){const width=Math.pow(Math.sin(u*Math.PI),.7)*w;return [x+dx*u+px*width*side,y+dy*u+Math.sin(u*Math.PI)*(.10-side*side*.06),z+dz*u+pz*width*side]}for(let k=0;k<7;k++){const a=k/7,b=(k+1)/7;for(const side of [-1,1])for(const tri of [[point(a,0),point(a,side),point(b,side)],[point(a,0),point(b,side),point(b,0)]])for(const p of tri)v.push(...p,0,0)}mesh(v,color);const spine=[];for(let k=0;k<=7;k++)spine.push(point(k/7,0));benchmarkCable(spine,.008,color.map(v=>Math.min(1,v*1.3)))}
function exhibitStar(x,y,z,r,color){const v=[];for(let k=0;k<10;k++){const a=k*Math.PI/5+Math.PI/2,b=(k+1)*Math.PI/5+Math.PI/2,ra=k%2?r*.45:r,rb=k%2?r:r*.45;v.push(x,y,z+.035,0,0,x+Math.cos(a)*ra,y+Math.sin(a)*ra,z,0,0,x+Math.cos(b)*rb,y+Math.sin(b)*rb,z,0,0)}mesh(v,color)}
function exhibitCloud(x,y,z,s=1){for(const [dx,dy,dz,r] of [[-.32,0,0,.30],[0,.08,0,.39],[.35,0,0,.27],[-.08,-.035,.16,.32]])ball(x+dx*s,y+dy*s,z+dz*s,r*s,.19*s,r*.75*s,[.82,.91,.98])}
function themedScreenHousing(i,x,z,zone){
 // Keep the launch faces fixed, while giving each screen a different structure.
 const trim=i===6?[.26,.44,.58]:i===7?[.26,.34,.17]:i===8?[.69,.88,.96]:i===10?[.19,.53,.57]:i===11?[.56,.44,.29]:[.47,.40,.27];
 screenBezel(x,z,trim,zone);
 if(i===6){
  for(const side of [-1,1]){exhibitBeam([x+side*1.81,.25,z],[x+side*1.81,3.25,z],.095,[.28,.34,.43]);exhibitBeam([x+side*1.81,3.25,z],[x+side*1.42,3.61,z],.095,[.28,.34,.43]);for(let k=0;k<7;k++){box(x+side*1.74,.48+k*.37,z+.32,.09,.16,.025,[.61,.74,.78]);emissive=.7;box(x+side*1.62,.53+k*.37,z+.307,.025,.055,.018,[.33,.80,1]);emissive=0}}
  box(x,.09,z,3.8,.19,1.15,[.17,.22,.30]);label('ОРБИТАЛЬНЫЙ ПОЧТАМТ',x,.17,z+.59,2.1,.12,'#8bdfff');
 }else if(i===7){
  for(const side of [-1,1]){exhibitBeam([x+side*1.69,.13,z+.16],[x+side*1.76,3.53,z+.13],.09,[.30,.23,.13]);for(let k=0;k<7;k++)exhibitLeaf(x+side*1.73,.38+k*.44,z+.27,-side*.26,.18,.12,.10,[.28,.49,.21]);}
  for(let k=0;k<7;k++)ball(x-1.53+k*.51,.19,z,.36,.20,.36,[.22,.32,.18]);
 }else if(i===8){
  for(let k=0;k<5;k++)exhibitCloud(x-1.4+k*.7,.20,z,.74);
  for(const side of [-1,1]){exhibitBeam([x+side*1.65,.40,z+.12],[x+side*1.65,3.39,z+.12],.028,[.58,.84,.94]);exhibitCloud(x+side*1.65,3.28,z,.38)}
 }else if(i===10){
  for(const side of [-1,1]){box(x+side*1.72,.14,z,.13,3.29,.23,[.28,.48,.51]);for(let k=0;k<7;k++){emissive=.4;box(x+side*1.65,.5+k*.41,z+.30,.025,.10,.015,[.50,.94,.85]);emissive=0}}
  box(x,.08,z,3.68,.22,1.05,[.16,.32,.36]);label('4 ОБРАЗЦА → НА СТАНЦИЮ',x,.11,z+.54,2.85,.18,'#b7f6e2');
 }else if(i===11){
  box(x,.08,z,3.68,.22,1.05,[.30,.33,.26]);label('ЛИНИЯ / ЦИФРЫ / КРАКЕН',x,.11,z+.54,2.85,.18,'#f3dba2');
 }else{
  for(const side of [-1,1]){box(x+side*1.76,.12,z,.13,3.35,.27,[.74,.54,.25]);for(let k=0;k<7;k++)box(x+side*1.76,.25+k*.43,z+.15,.17,.065,.04,[.24,.27,.29]);}
  box(x,.08,z,3.8,.21,1.10,[.33,.37,.38]);for(let k=0;k<12;k++)box(x-1.65+k*.30,.12,z+.57,.15,.11,.028,k%2?[.94,.70,.20]:[.12,.17,.20]);
 }
}
// Courier: launch, curved transfer, autopilot approach, parcel delivery, return.
function courierSceneState(t){const p=(t%16)/16;let u;if(p<.12)u=0;else if(p<.46)u=exhibitEase((p-.12)/.34);else if(p<.64)u=1;else u=1-exhibitEase((p-.64)/.36);const a=Math.sin(Math.PI*u);const heading=p<.12?-Math.PI/2+Math.PI*exhibitEase(p/.12):p>=.64?-Math.PI/2:p>=.52?Math.PI/2-Math.PI*exhibitEase((p-.52)/.12):Math.PI/2;return {x:5.72+4.55*u,y:.99+3.52*Math.pow(a,.62),z:-22.65-.72*a,u,heading,returning:p>=.64,parcelY:.80-.34*exhibitEase((p-.46)/.06),parcel:p<.52,delivered:p>=.52&&p<.94}}
activePlatform=6;
softPlatform(standFootprint(roundedPlatformContour(8,-23,6.06,4.96,.55),activePlatform),.13,[.12,.18,.27]);
// Keep stripes and edge lights inside the actual eight-sided deck, including their thickness.
function courierDeckHalfWidth(z){const u=Math.min(1,Math.abs(z+23)/2.48),corner=Math.SQRT1_2;return 3.03*(u<=corner?1-(1-corner)*u/corner:corner*(1-u)/(1-corner))}
for(let k=0;k<7;k++){
 const z=-24.8+k*.65,width=2*(Math.min(courierDeckHalfWidth(z-.008),courierDeckHalfWidth(z+.008))-.10);box(8,.135,z,width,.012,.016,[.26,.38,.47]);
 const lightZ=-24.6+k*.60,lightX=Math.min(2.78,courierDeckHalfWidth(lightZ-.08)-.10,courierDeckHalfWidth(lightZ+.08)-.10);for(const side of [-1,1])box(8+side*lightX,.14,lightZ,.08,.02,.16,[.48,.66,.73]);
}
for(const side of [-1,1]){const x=8+side*2.28;exhibitDeck(x,-22.65,.66,.61,.43,[.22,.30,.39]);exhibitRing(x,.45,-22.65,.51,.47,[.31,.85,1],.024);for(let k=0;k<4;k++){const a=k*Math.PI/2;box(x+Math.cos(a)*.49,.48,-22.65+Math.sin(a)*.45,.065,.12,.065,[.89,.73,.37])}label(side<0?'01 · ОТПРАВКА':'02 · ДОСТАВКА',x,.23,-22.02,1.0,.12,'#a6e7f8');prop(x,-22.65,.70)}
ball(10.24,2.5,-24,.59,.59,.59,[.40,.46,.79]);
for(const r of [.74,.82])exhibitRing(10.24,2.5,-24,r,r*.58,[.73,.65,.84],.035,.48);
for(let k=0;k<4;k++){const y=2.20+k*.17,r=Math.sqrt(.59*.59-(y-2.5)**2);exhibitRing(10.24,y,-24,r,r,[.56,.54,.83],.015)}
exhibitBeam([10.24,.16,-24],[10.24,1.88,-24],.035,[.32,.41,.52]);prop(10.24,-24,.76);
// Antenna and stacked cargo make the departure side a working dock.
for(let k=0;k<3;k++){box(5.5,.14+k*.23,-24.22,.52,.22,.45,[.39+k*.1,.43+k*.07,.48]);box(5.5,.18+k*.23,-23.985,.06,.15,.015,[.94,.66,.28])}
exhibitBeam([5.45,.14,-24.75],[5.45,3.0,-24.75],.045,[.38,.48,.58]);exhibitRing(5.45,3.02,-24.75,.37,.37,[.48,.79,.92],.035,Math.PI/2);exhibitBeam([5.45,3.02,-24.75],[5.45,3.13,-24.42],.025,[.65,.77,.82]);
for(let k=0;k<23;k++){const u=k/22,a=Math.sin(Math.PI*u);emissive=.65;ball(5.72+4.55*u,1.08+3.52*Math.pow(a,.62),-22.65-.72*a,.018,.018,.018,[.38,.73,.95]);emissive=0}
const courierMotion=t=>{const q=courierSceneState(t);return transform(q.x,q.y,q.z,q.heading)};
motion=courierMotion;
ball(0,.10,0,.17,.14,.34,[.83,.87,.92]);ball(0,.16,.10,.13,.10,.15,[.20,.63,.82]);box(0,.03,-.08,.60,.035,.22,[.29,.48,.67]);for(const side of [-1,1]){box(side*.23,-.02,-.08,.09,.10,.24,[.55,.64,.71]);emissive=.9;ball(side*.23,.02,-.23,.035,.04,.08,[.34,.84,1]);emissive=0}motion=null;
motion=t=>{const q=courierSceneState(t);return exhibitPose(q.x,q.u>.999?q.parcelY:q.y-.19,q.z,q.parcel?1:.001)};box(0,0,0,.18,.16,.18,[.95,.61,.20]);box(0,.01,.095,.04,.14,.015,[1,.86,.52]);motion=null;
motion=t=>exhibitPose(10.27,.46,-22.65,courierSceneState(t).delivered?1:.001);box(0,0,0,.26,.22,.24,[.95,.61,.20]);box(0,.01,.125,.055,.20,.015,[1,.86,.52]);motion=null;
// Fireflies: a bent tree, a web obstacle and a moonflower receiving the whole swarm.
activePlatform=7;
softPlatform(standFootprint(ovalPlatformContour(-8,-31,3.04,2.47),activePlatform),.12,[.13,.23,.17]);
for(const [x,z,s] of [[-10.25,-31.6,.9],[-5.7,-30.6,1],[-9.9,-29.7,.72]]){softPlatform(standFootprint(ovalPlatformContour(x,z,.67*s,.57*s,64),activePlatform),.23,[.22,.34,.20],.025,.025);prop(x,z,.60*s)}
const trunk=[[-10.45,.13,-32.1],[-10.56,1.1,-32.15],[-10.34,2.05,-32.05],[-10.45,3.12,-32.2],[-9.98,4.15,-32.25]];
benchmarkCable(trunk,.17,[.25,.20,.13]);benchmarkCable(trunk.map(p=>[p[0]+.045,p[1],p[2]+.14]),.024,[.43,.34,.20]);
for(const [dx,dz] of [[-.35,.5],[.45,.4],[.18,-.6]])benchmarkCable([trunk[1],[-10.45+dx*.6,.28,-32.1+dz*.6],[-10.45+dx,.15,-32.1+dz]],.09,[.25,.20,.13]);
const crown=[[-9.98,4.15,-32.25],[-8.9,4.48,-32.22],[-7.8,4.52,-32.13],[-6.7,4.15,-32.10]];benchmarkCable(crown,.08,[.31,.25,.15]);
for(let k=0;k<12;k++){const u=k/11;exhibitLeaf(-10+3.35*u,4.1+Math.sin(u*Math.PI)*.36,-32.15,(k%2?.32:-.22),.22,(k%2?-.44:.40),.16,[.22,.42+k%3*.035,.22])}
// Silk spokes are a real obstacle around which the swarm climbs.
const webX=-10.20,webY=2.45,webZ=-31.72;
for(let k=0;k<8;k++){const a=k*Math.PI/4;exhibitBeam([webX,webY,webZ],[webX+Math.cos(a)*.52,webY+Math.sin(a)*.68,webZ],.006,[.57,.68,.65])}
for(const r of [.23,.46,.70,1]){const ps=[];for(let k=0;k<=8;k++){const a=k*Math.PI/4;ps.push([webX+Math.cos(a)*.52*r,webY+Math.sin(a)*.68*r,webZ])}benchmarkCable(ps,.006,[.57,.68,.65])}
softPlatform(standFootprint(ovalPlatformContour(-5.8,-30.7,.82,.68,64),activePlatform),.30,[.12,.28,.29],.025,.025);exhibitRing(-5.8,.31,-30.7,.66,.52,[.34,.59,.48],.012);
function moonflowerPose(t){const p=t%16,arrival=exhibitEase((p-7)/1.5)*(1-exhibitEase((p-11)/2)),angle=Math.sin(t*1.7)*.012+arrival*(Math.sin(t*4.2)*.018-.018);return pivotZ(-5.8,.31,0,angle)}
function moonflowerHead(t){const m=moonflowerPose(t),x=-5.82,y=1.70;return [m[0]*x+m[4]*y+m[12],m[1]*x+m[5]*y+m[13],-30.7]}
function moonflowerStemPoint(u){const v=1-u;return [v*v*v*-5.8+3*v*v*u*-6.08+3*v*u*u*-5.63+u*u*u*-5.82,v*v*v*.31+3*v*v*u*.67+3*v*u*u*1.19+u*u*u*1.62,-30.7]}
function moonflowerStemVertices(){
 const rings=[],vertices=[],sides=12,steps=28;
 for(let k=0;k<=steps;k++){const u=k/steps,p=moonflowerStemPoint(u),a=moonflowerStemPoint(Math.max(0,u-.001)),b=moonflowerStemPoint(Math.min(1,u+.001)),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),r=.045-u*.010;const ring=[];for(let j=0;j<sides;j++){const angle=j*Math.PI*2/sides;ring.push([p[0]-dy/length*Math.cos(angle)*r,p[1]+dx/length*Math.cos(angle)*r,p[2]+Math.sin(angle)*r])}rings.push(ring)}
 const tri=(a,b,c)=>vertices.push(...a,0,0,...b,0,0,...c,0,0);
 for(let k=0;k<steps;k++)for(let j=0;j<sides;j++){const next=(j+1)%sides;tri(rings[k][j],rings[k+1][next],rings[k+1][j]);tri(rings[k][j],rings[k][next],rings[k+1][next])}
 for(let j=0;j<sides;j++){const next=(j+1)%sides;tri(moonflowerStemPoint(0),rings[0][next],rings[0][j]);tri(moonflowerStemPoint(1),rings[steps][j],rings[steps][next])}return vertices;
}
motion=moonflowerPose;mesh(moonflowerStemVertices(),[.28,.49,.22]);
for(let k=0;k<8;k++){const a=k*Math.PI/4;ball(-5.82+Math.cos(a)*.31,1.70+Math.sin(a)*.31,-30.7,.24,.24,.09,[.78,.85,.98])}
emissive=.7;ball(-5.82,1.70,-30.57,.17,.17,.10,[1,.95,.56]);emissive=0;
for(const [u,dx,dy,dz,w,tint]of [[.34,-.42,.23,.26,.19,[.28,.49,.22]],[.53,.45,.22,-.22,.19,[.31,.55,.23]]])exhibitLeaf(...moonflowerStemPoint(u),dx,dy,dz,w,tint);
motion=null;
for(const [x,z] of [[-10.35,-29.8],[-6,-32.6],[-7,-29.4]])for(let k=0;k<7;k++){const a=k*Math.PI*2/7;exhibitLeaf(x,.13,z,Math.cos(a)*.43,.24,Math.sin(a)*.40,.085,[.23,.41,.21])}
for(let k=0;k<8;k++){const x=-10.45+(k%3)*.20,z=-29.6-Math.floor(k/3)*.20;box(x,.13,z,.035,.14,.035,[.70,.67,.46]);ball(x,.30,z,.10,.065,.10,k%2?[.69,.40,.25]:[.77,.65,.38])}
const moonflowerHeads=cacheAnimationState(moonflowerHead);
function fireflyScenePose(t,k){const head=moonflowerHeads(t),cycle=t%16,forward=exhibitClamp((cycle-1-k*.025)/7),u=cycle<11?forward:1-exhibitEase((cycle-11)/5),route=[[-10.13,1.10,-30.7],[-10.80,2.1,-30.3],[-10.50,3.35,-30.3],[-9.8,4.15,-31.4],[-7.9,4.45,-31.5],[-5.85,4.15,-31.3],[-5.40,2.5,-30.6],[head[0],head[1],head[2]+.23]],part=Math.min(6,Math.floor(u*7)),f=exhibitEase(u*7-part),a=route[part],b=route[part+1],gather=exhibitEase((cycle-8)/1.4)*(1-exhibitEase((cycle-11)/1.2)),angle=k*2.399963+t*.35,r=.16+(k%3)*.08;return [a[0]+(b[0]-a[0])*f+Math.sin(k*2.4+t*2)*.12*(1-gather)+Math.cos(angle)*r*gather,a[1]+(b[1]-a[1])*f+Math.cos(k*1.7+t*1.3)*.12*(1-gather)+Math.sin(angle)*r*.72*gather,a[2]+(b[2]-a[2])*f+Math.sin(k*1.3+t)*(.12*(1-gather)+.07*gather)]}
const fireflyPoses=cacheAnimationState(fireflyScenePose);
function fireflyWing(side,rear){
 const length=rear?.064:.090,width=rear?.020:.027,z=rear?-.026:.015,center=[side*(.014+length/2),.012,z],rim=[];
 for(let k=0;k<=16;k++){const a=k*Math.PI/8;rim.push([side*(.014+length*(1+Math.cos(a))/2),.004,z+Math.sin(a)*width*(.8+.2*Math.cos(a))])}
 const vertices=[];for(let k=0;k<16;k++){const a=side>0?rim[k+1]:rim[k],b=side>0?rim[k]:rim[k+1];vertices.push(...center,0,0,...a,0,0,...b,0,0)}mesh(vertices,rear?[.54,.72,.76]:[.68,.84,.85]);
 benchmarkCable(rim,.0008,[.38,.59,.61]);for(const k of [2,5,8,11,14])exhibitBeam([side*.014,.006,z],rim[k],.0006,[.45,.66,.66]);
}
for(let k=0;k<24;k++){
 const bodyMotion=t=>{const p=fireflyPoses(t,k);return transform(...p)};
 motion=bodyMotion;ball(0,0,0,.022,.030,.029,[.24,.30,.13]);ball(0,.012,.032,.020,.020,.020,[.26,.32,.14]);for(const side of [-1,1]){ball(side*.011,.020,.048,.004,.005,.004,[.06,.12,.09]);exhibitBeam([side*.008,.026,.040],[side*.020,.047,.055],.0018,[.32,.40,.20])}
 emissive=.9;ball(0,-.026,-.020,.035,.035,.043,[.85,1,.34]);emissive=0;
 for(const side of [-1,1])for(const rear of [false,true]){motion=t=>{const p=fireflyPoses(t,k),angle=side*(.20+Math.sin(t*32+k*1.7+(rear?.45:0))*.75);return mul(transform(...p),pivotZ(0,0,0,angle))};fireflyWing(side,rear)}motion=null;
}
motion=t=>{const p=moonflowerHeads(t),s=1+.18*Math.sin(t*2);return exhibitPose(p[0],p[1]-.01,p[2],s,1,s)};emissive=.6;exhibitRing(0,0,0,.28,.28,[1,.87,.39],.012,Math.PI/2);emissive=0;motion=null;
// Cloud tower: connected jumping route, a compressing spring and collected stars.
activePlatform=8;
softPlatform(standFootprint(cloudPlatformContour(0,-30.955,3.04,2.525),activePlatform),.10,[.26,.43,.53],.025,.05);
for(const [x,z,s] of [[-2.25,-30.4,1.05],[1.95,-31.7,1.3],[.1,-32.5,1.3]])exhibitCloud(x,.24,z,s);
const cloudRoute=[[-2.25,.65,-30.2],[-2.35,1.6,-30.7],[-2.20,2.65,-31],[-2.1,3.65,-31.5],[0,4.37,-30.8],[2.15,3.65,-31.5],[2.28,2.55,-31],[2.2,1.55,-30.6],[2.18,.65,-30.1],[0,.28,-29.45]];
for(const [k,p] of cloudRoute.entries()){if(k===1||k===9)continue;exhibitCloud(...p,k===4?.82:k===9?.60:.74)}
function cloudSceneState(t){const phase=(t%12)/1.2,k=Math.floor(phase),u=phase-k,a=cloudRoute[k],b=cloudRoute[(k+1)%cloudRoute.length],q=exhibitEase(u),compression=k===0&&u>.80?1-(u-.80)*2.1:k===1&&u<.22?.58+u/.22*.42:1;if(k>=8){const r=(k-8+u)/2,v=exhibitEase(r);return {k,u,x:2.18-4.43*v,y:.97-.70*Math.sin(Math.PI*r),z:-30.1-.1*v+.65*Math.sin(Math.PI*r)}}return {k,u,x:a[0]+(b[0]-a[0])*q,y:a[1]+(b[1]-a[1])*q+.32+Math.sin(Math.PI*u)*(k===3||k===4?.35:.40)-.285*(1-compression),z:a[2]+(b[2]-a[2])*q}}
function cloudSpringCompression(t){const q=cloudSceneState(t);return q.k===0&&q.u>.80?1-(q.u-.80)*2.1:q.k===1&&q.u<.22?.58+q.u/.22*.42:1}
exhibitCloud(-2.35,1.43,-30.7,.74);
motion=t=>exhibitPose(-2.35,1.49,-30.7,1,cloudSpringCompression(t),1);const coil=[];for(let k=0;k<=48;k++){const a=k/48*Math.PI*8;coil.push([Math.cos(a)*.12,k/48*.24,Math.sin(a)*.12])}benchmarkCable(coil,.017,[.91,.62,.28]);box(0,.24,0,.38,.045,.34,[.91,.64,.28]);motion=null;
for(const k of [2,4,6]){const p=cloudRoute[k];motion=t=>{const q=cloudSceneState(t),visible=q.k<k||q.k===9;const s=visible?1:.001;return exhibitPose(p[0],p[1]+.48,p[2],s,s,s,Math.sin(t)*.3)};emissive=.6;exhibitStar(0,0,0,.13,[1,.81,.27]);emissive=0;motion=null}
const cloudHeroMotion=t=>{const q=cloudSceneState(t);return transform(q.x,q.y,q.z)};
motion=cloudHeroMotion;box(0,0,0,.17,.19,.12,[.22,.52,.76]);ball(0,.28,0,.105,.11,.095,[.95,.73,.48]);ball(0,.355,-.015,.11,.055,.09,[.29,.20,.13]);for(const side of [-1,1]){box(side*.055,-.11,0,.065,.12,.07,[.21,.28,.38]);box(side*.06,-.13,.025,.085,.045,.12,[.86,.47,.22]);exhibitBeam([side*.08,.15,0],[side*.15,.24,0],.026,[.95,.73,.48])}box(0,.23,.094,.10,.032,.01,[.23,.25,.29]);motion=null;
motion=t=>{const q=cloudSceneState(t);return mul(transform(q.x,q.y+.17,q.z-.06),pivotZ(0,0,0,Math.sin(t*5)*.16))};exhibitLeaf(0,0,0,-.22,-.13,-.16,.13,[.87,.29,.23]);motion=null;
for(const [x,z] of [[-2.55,-32.6],[2.55,-32.6]]){const ps=[];for(let k=0;k<=32;k++){const u=k/32;ps.push([x+Math.sin(u*Math.PI*3)*.19,.35+u*3.4,z+Math.cos(u*Math.PI*3)*.20])}benchmarkCable(ps,.015,[.62,.83,.91]);prop(x,z,.36)}
// Construction: one coherent cycle shared by the cart, hoist, load and growing tower.
function constructionSceneState(t){const cycle=t%56,layer=Math.floor(cycle/14),p=cycle%14,from=7.0,pickup=9.85,tower=5.72,deck=.50+layer*.26;let cart=from;if(p<3)cart=from+(pickup-from)*exhibitEase(p/3);else if(p<5)cart=pickup;else cart=pickup+(from-pickup)*exhibitEase((p-5)/3);let hx=pickup,hy=.53;if(p>=3&&p<5.5)hy=.53+(4.0-.53)*exhibitEase((p-3)/2.5);else if(p>=5.5&&p<8){hy=4.0;hx=pickup+(tower-pickup)*exhibitEase((p-5.5)/2.5)}else if(p>=8&&p<10.5){hx=tower;hy=4.0+(deck-4.0)*exhibitEase((p-8)/2.5)}else if(p>=10.5&&p<12){hx=tower;hy=deck+(4.0-deck)*exhibitEase((p-10.5)/1.5)}else if(p>=12){hx=tower+(pickup-tower)*exhibitEase(p-12);hy=4.0+(.53-4.0)*exhibitEase(p-13)}const load=p<3?[cart,.53,-29.8]:p<10.5?[hx,hy,-29.8]:[tower,deck,-29.8];return {layer,p,cart,hx,hy,load,placed:layer+(p>=10.5?1:0)}}
activePlatform=9;
softPlatform(standFootprint(roundedPlatformContour(8,-30.99,6.08,4.88,.48),activePlatform),.14,[.30,.31,.29]);
// Road has curbs, sleepers and dashed lane markings, with an open viewing edge.
box(8,.15,-29.8,4.55,.055,.83,[.15,.20,.23]);for(let k=0;k<12;k++)box(5.94+k*.37,.211,-29.4,.19,.012,.04,[.82,.70,.39]);
for(const x of [5.5,10.65]){box(x,.15,-31.5,.65,.20,1.3,[.37,.39,.37]);prop(x,-31.5,.63)}
// Steel lattice mast and long triangulated jib.
for(const x of [10.35,10.75])for(const z of [-31.45,-31.05])exhibitBeam([x,.34,z],[x,4.6,z],.045,[.90,.60,.20]);
for(let k=0;k<10;k++){const y=.35+k*.42;for(const z of [-31.45,-31.05])exhibitBeam([10.35,y,z],[10.75,y+.42,z],.025,[.84,.50,.16]);exhibitBeam([10.35,y,-31.45],[10.35,y+.42,-31.05],.025,[.84,.50,.16])}
for(const y of [4.55,4.92])for(const z of [-30.0,-29.6])exhibitBeam([5.45,y,z],[10.78,y,z],.045,[.93,.66,.24]);
for(let k=0;k<12;k++){const x=5.45+k*.44;for(const z of [-30.0,-29.6])exhibitBeam([x,4.55,z],[x+.44,4.92,z],.024,[.84,.53,.18]);}
exhibitBeam([10.55,4.6,-31.25],[10.55,4.7,-29.8],.08,[.90,.60,.20]);box(10.55,3.50,-30.7,.66,.52,.62,[.88,.66,.28]);box(10.55,3.61,-30.378,.51,.30,.025,[.20,.43,.53]);prop(10.55,-30.65,.65);
for(let k=0;k<5;k++){const x=5.6+k*.12;box(x,.15,-32.5,.08,.30,.46,[.49,.47,.38]);}for(let k=0;k<3;k++)box(9.8,.15+k*.13,-32.6,.55,.12,.41,[.61,.57,.44]);
for(const x of [5.6,10.5]){box(x,.16,-28.95,.055,.48,.055,[.64,.67,.64]);box(x,.44,-28.95,.72,.13,.055,[.94,.70,.27]);for(let k=0;k<4;k++)box(x-.27+k*.18,.445,-28.915,.08,.12,.015,[.19,.23,.24]);prop(x,-28.95,.42)}
label('ПРИЁМ БЛОКОВ',9.83,.25,-29.30,.91,.13,'#ffd991');label('СБОРКА БАШНИ',5.72,.25,-29.30,.91,.13,'#ffd991');
exhibitDeck(5.72,-29.8,.62,.57,.48,[.45,.47,.43],4);prop(5.72,-29.8,.67);
const cartMotion=t=>transform(constructionSceneState(t).cart,.30,-29.8);
motion=cartMotion;
box(0,0,0,.62,.13,.45,[.92,.62,.22]);box(0,.13,0,.72,.045,.53,[.42,.49,.50]);
for(let plank=0;plank<5;plank++)box(-.276+plank*.138,.175,0,.128,.030,.49,[.62,.55,.39]);
for(const side of [-1,1]){box(side*.29,.12,0,.035,.12,.47,[.92,.62,.22]);box(0,-.035,side*.19,.65,.055,.045,[.24,.30,.32]);exhibitBeam([side*.21,-.03,-.25],[side*.21,-.03,.25],.028,[.44,.49,.49]);for(const z of [-.19,.19])ball(side*.27,.209,z,.012,.008,.012,[.78,.83,.79]);box(side*.36,.045,0,.065,.06,.34,[.16,.21,.23])}
benchmarkCable([[-.35,.08,-.17],[-.46,.23,-.17],[-.46,.23,.17],[-.35,.08,.17]],.016,[.38,.45,.44]);motion=null;
for(const side of [-1,1])for(const z of [-.25,.25]){motion=t=>{const q=constructionSceneState(t);return mul(transform(q.cart+side*.21,.27,-29.8+z),pivotZ(0,0,0,-q.cart/.10))};ball(0,0,0,.10,.10,.055,[.11,.15,.18]);ball(0,0,.057,.062,.062,.008,[.52,.58,.56]);ball(0,0,-.057,.062,.062,.008,[.52,.58,.56]);for(const z of [-.068,.068]){ball(0,0,z,.020,.020,.008,[.25,.31,.32]);for(let bolt=0;bolt<4;bolt++){const a=bolt*Math.PI/2;ball(Math.cos(a)*.041,Math.sin(a)*.041,z,.007,.007,.004,[.80,.83,.77])}}motion=null}
motion=t=>{const q=constructionSceneState(t);return transform(q.hx,4.55,-29.8)};box(0,0,0,.40,.16,.48,[.31,.37,.39]);for(const x of [-.15,.15])ball(x,.13,0,.08,.08,.09,[.17,.22,.25]);motion=null;
motion=t=>{const q=constructionSceneState(t);return exhibitPose(q.hx,q.hy+.38,-29.8,1,Math.max(.02,4.55-q.hy-.38),1)};box(0,0,0,.018,1,.018,[.49,.54,.56]);motion=null;
motion=t=>{const q=constructionSceneState(t);return transform(q.hx,q.hy+.28,-29.8)};benchmarkCable([[0,.10,0],[0,0,0],[.08,-.04,0],[.13,.025,0]],.022,[.35,.40,.42]);motion=null;
function constructionCrate(tint){
 box(0,0,0,.62,.24,.55,tint);
 for(const side of [-1,1]){
  box(side*.20,-.020,0,.080,.020,.55,[.42,.33,.23]);
  for(const y of [.012,.112,.212])box(0,y,side*.281,.61,.012,.012,[.55,.40,.25]);
  for(const x of [-.245,.245])box(x,.014,side*.289,.032,.212,.018,[.91,.76,.49]);
  box(side*.312,.014,0,.014,.212,.035,[.91,.76,.49]);
  box(side*.18,.241,0,.028,.009,.566,[.34,.39,.38]);
  for(const z of [-.280,.280])box(side*.18,.002,z,.028,.238,.009,[.34,.39,.38]);
 }
 for(const side of [-1,1]){const z=side*.301;exhibitBeam([-.032,.095,z],[0,.145,z],.004,[.96,.86,.60]);exhibitBeam([0,.145,z],[.032,.095,z],.004,[.96,.86,.60]);exhibitBeam([0,.075,z],[0,.145,z],.004,[.96,.86,.60]);}
}
for(let k=0;k<4;k++){motion=t=>{const q=constructionSceneState(t);return exhibitPose(5.72,.50+k*.26,-29.8,k<q.placed?1:.001)};constructionCrate(k%2?[.72,.39,.24]:[.83,.62,.33]);motion=null}
motion=t=>{const q=constructionSceneState(t);return exhibitPose(...q.load,q.p<10.5?1:.001)};constructionCrate([.83,.62,.33]);motion=null;
motion=t=>{const q=constructionSceneState(t);return exhibitPose(...q.load,q.p>=3&&q.p<10.5?1:.001)};for(const x of [-.22,.22])for(const z of [-.20,.20])exhibitBeam([x,.245,z],[0,.28,0],.007,[.42,.47,.45]);motion=null;
// A shared motion footprint keeps the side delivery lane clear while visitors walk.
prop(8.4,-29.8,1.12);
activePlatform=-1;
// End detailed exhibits.
// Underwater expedition: a miniature reef maze, collection, sonar and return to base.
function expeditionExhibitState(t){const p=((t%18.4)+18.4)%18.4,route=[[2,3],[4,3],[4,0],[0,0],[0,3],[0,6],[4,6],[4,3],[2,3]],k=p>=16?7:Math.floor(p/2),u=p>=16?1:exhibitEase((p-k*2)/2),a=route[k],b=route[k+1];return {p,x:-2.80+(a[0]+(b[0]-a[0])*u)*.22,y:1.08+(a[1]+(b[1]-a[1])*u)*.28,z:-24.34,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),collected:[p>=4,p>=6,p>=10,p>=12],sonar:p>=6.8&&p<10.5,docked:p>=16}}
activePlatform=10;
softPlatform(standFootprint(ovalPlatformContour(0,-24.55,3.07,2.62),activePlatform),.13,[.11,.27,.30],.025,.025);
exhibitDeck(0,-23.45,1.65,.81,.18,[.22,.43,.43],20);
for(let k=0;k<15;k++){const a=k*2.4,x=Math.cos(a)*(1.15+(k%3)*.22),z=-23.45+Math.sin(a)*.65;ball(x,.22,z,.14,.055,.09,[.40,.56,.47])}
// Pressure-hull arch and an instrument mast leave the screen and controls clear.
const hullArch=[];for(let k=0;k<=24;k++){const a=k/24*Math.PI;hullArch.push([Math.cos(a)*1.93,3.13+Math.sin(a)*1.05,-25.7])}benchmarkCable(hullArch,.11,[.25,.43,.48]);
for(const side of [-1,1]){exhibitBeam([side*1.93,.16,-25.7],[side*1.93,3.13,-25.7],.11,[.25,.43,.48]);for(let k=0;k<8;k++)ball(side*1.78,.45+k*.37,-25.15,.035,.035,.025,[.69,.77,.71]);}
benchmarkCable([[1.25,4.02,-25.7],[1.25,4.55,-25.7],[1.65,4.55,-25.7]],.055,[.46,.59,.58]);box(1.72,4.48,-25.7,.23,.14,.22,[.31,.47,.48]);emissive=.6;ball(1.84,4.55,-25.7,.04,.045,.045,[.52,1,.81]);emissive=0;
// An upright cutaway tank shows the collection route beside the game preview.
box(-2.35,.70,-24.66,1.32,2.50,.13,[.08,.20,.27]);
for(const x of [-3.00,-1.70])exhibitBeam([x,.73,-24.53],[x,3.21,-24.53],.033,[.45,.68,.69]);
for(const y of [.73,3.21])exhibitBeam([-3.00,y,-24.53],[-1.70,y,-24.53],.033,[.45,.68,.69]);
label('РИФ / 4 ОБРАЗЦА',-2.35,3.22,-24.46,1.20,.14,'#a2f4e6');
const reefCells=[];for(let row=0;row<7;row++)for(let col=0;col<5;col++){const open=col===0||col===4||row===0||row===6||row===3;const x=-2.80+col*.22,y=1.08+row*.28;reefCells.push({col,row,x,y,open});if(!open){box(x,y-.105,-24.53,.19,.21,.12,[.14,.36,.38]);ball(x,y,-24.43,.055,.05,.03,[.26,.48,.40])}else{emissive=.3;ball(x,y,-24.49,.017,.017,.017,[.55,.85,.76]);emissive=0}}
// Four rare samples vanish when collected and reappear for the next demonstration.
for(const [j,[col,row]] of [[4,0],[0,0],[0,6],[4,6]].entries()){
 motion=t=>{const q=expeditionExhibitState(t);return exhibitPose(-2.80+col*.22,1.08+row*.28,-24.38,q.collected[j]?.001:1)};
 emissive=.65;exhibitStar(0,0,0,.075,[1,.77,.33]);emissive=0;motion=null;
}
// The central research station unlocks after the fourth sample.
box(-2.36,1.82,-24.47,.25,.20,.05,[.31,.58,.61]);
motion=t=>{const q=expeditionExhibitState(t);return exhibitPose(-2.36,1.92,-24.40,q.docked?1.45:1)};emissive=.7;ball(0,0,0,.05,.05,.025,[.45,1,.81]);emissive=0;motion=null;
function expeditionHeadingPose(q){return Math.cos(q.angle)<-.5?exhibitPose(q.x,q.y,q.z,-1,1,1):mul(transform(q.x,q.y,q.z),pivotZ(0,0,0,q.angle))}
const expeditionSubMotion=t=>expeditionHeadingPose(expeditionExhibitState(t));
motion=expeditionSubMotion;
ball(0,0,0,.113,.066,.066,[.98,.71,.24]);box(-.06,-.045,0,.09,.025,.11,[.81,.45,.17]);box(-.01,.05,0,.055,.042,.045,[.94,.65,.24]);exhibitBeam([-.01,.07,0],[-.01,.105,0],.009,[.66,.72,.65]);
for(const x of [-.045,.025]){ball(x,.009,.065,.023,.023,.009,[.23,.50,.60]);emissive=.6;ball(x,.013,.074,.012,.012,.003,[.56,.91,1]);emissive=0}box(-.125,-.04,0,.02,.08,.075,[.34,.49,.48]);motion=null;
// A shark follows the submarine; during the sonar pulse it retreats along the corridor.
function expeditionSharkPose(t){const q=expeditionExhibitState(t),retreat=q.sonar?1.25*Math.sin((q.p-6.8)/3.7*Math.PI):0,s=expeditionExhibitState(t-2.65-retreat);return {x:q.docked?Math.max(s.x,-2.05):s.x,y:s.y,z:-24.33,angle:s.angle,scanning:q.sonar}}
motion=t=>expeditionHeadingPose(expeditionSharkPose(t));
ball(0,0,0,.11,.047,.042,[.39,.67,.72]);exhibitLeaf(-.02,.02,0,-.025,.10,0,.035,[.35,.62,.69]);exhibitLeaf(-.10,0,0,-.06,.07,.01,.035,[.35,.62,.69]);exhibitLeaf(-.10,0,0,-.06,-.07,.01,.035,[.35,.62,.69]);ball(.073,.017,.039,.010,.010,.006,[.06,.17,.21]);motion=null;
for(let k=0;k<2;k++){
 motion=t=>{const q=expeditionExhibitState(t),r=((q.p-6.8)/1.1+k*.5)%1,s=q.sonar?.35+Math.max(0,r)*1.15:.001;return exhibitPose(q.x,q.y,q.z+.025,s,s,s)};
 emissive=.75;exhibitRing(0,0,0,.14,.14,[.39,1,.80],.008,Math.PI/2);emissive=0;motion=null;
}
prop(-2.35,-24.65,.73);
// A research buoy on the front sea bed displays the samples already delivered.
box(0,.18,-23.45,.80,.18,.64,[.23,.45,.48]);exhibitRing(0,.37,-23.45,.32,.25,[.42,.94,.79],.018);box(0,.36,-23.45,.08,.10,.08,[.36,.64,.62]);
for(let k=0;k<4;k++){motion=t=>{const q=expeditionExhibitState(t);return exhibitPose(-.27+k*.18,.24,-23.10,q.collected[k]?1:.16)};emissive=.6;ball(0,0,0,.045,.045,.035,[1,.79,.32]);emissive=0;motion=null;}
prop(0,-23.45,.47);
// Tall branching coral, sea fans and a floating jellyfish give the reef its silhouette.
for(const [x,z,height,tint] of [[2.4,-24.7,1.55,[.78,.38,.38]],[1.30,-26.15,1.0,[.79,.57,.31]],[-1.30,-26.15,.68,[.43,.60,.42]]]){
 ball(x,.21,z,.48,.14,.35,[.37,.49,.41]);prop(x,z,.54);
 for(let j=0;j<4;j++){const a=j*.95-1.4,dx=Math.sin(a)*.36,dz=Math.cos(a)*.25;benchmarkCable([[x,.25,z],[x+dx*.3,height*.55,z+dz*.3],[x+dx,height+.25,z+dz]],.045,tint);for(const side of [-1,1])benchmarkCable([[x+dx*.3,height*.55,z+dz*.3],[x+dx+side*.13,height*.82,z+dz],[x+dx+side*.17,height*.98,z+dz]],.027,tint);ball(x+dx,height+.25,z+dz,.065,.08,.065,tint)}
}
for(const [x,z] of [[1.50,-22.8],[-1.50,-22.8]]){for(let k=0;k<6;k++){const a=k*Math.PI/3;exhibitLeaf(x,.15,z,Math.cos(a)*.39,.25,Math.sin(a)*.32,.10,[.27,.49,.36])}prop(x,z,.46)}
const jellyMotion=t=>transform(2.30,2.40+Math.sin(t*.7)*.19,-24.45);
motion=jellyMotion;ball(0,0,0,.28,.16,.24,[.65,.59,.84]);emissive=.35;exhibitRing(0,-.055,0,.26,.23,[.78,.72,.98],.018);emissive=0;motion=null;
for(let k=0;k<6;k++){motion=t=>transform(2.30+Math.sin(t*1.4+k)*.035,2.35+Math.sin(t*.7)*.19,-24.45);const a=k*Math.PI/3;benchmarkCable([[Math.cos(a)*.17,0,Math.sin(a)*.16],[Math.cos(a)*.20,-.22,Math.sin(a)*.18],[Math.cos(a)*.12,-.50,Math.sin(a)*.11]],.010,[.64,.63,.87]);motion=null;}
for(let k=0;k<12;k++){motion=t=>{const u=((t*.10+k/12)%1);return transform(2.1+Math.sin(k*1.4+t*.35)*.24,.3+u*3.8,-25.6+Math.cos(k)*.27)};emissive=.4;exhibitRing(0,0,0,.018+(k%3)*.009,.018+(k%3)*.009,[.43,.79,.85],.004,Math.PI/2);emissive=0;motion=null;}
activePlatform=-1;
// End underwater exhibit.
// Lagoon: numbered clues, a safe four-in-a-row demonstration and an animated kraken.
// Lagoon diorama: models follow the mantle, curling arms and rigged hull of the game.
function lagoonShotTime(gun){return 7.1+gun*.85}
function lagoonActionState(t){const p=((t%24)+24)%24,retreatAt=lagoonShotTime(2)+.15,rise=exhibitEase((p-3)/1.8)*(1-exhibitEase((p-retreatAt)/1.35));return {p,rise}}
function lagoonKrakenPose(t){const q=lagoonActionState(t);return transform(-10.05,.065-(1-q.rise)*1.52,-8.2,-Math.PI/4)}
const krakenPoses=cacheAnimationState(lagoonKrakenPose);
function lagoonCurvePoint(points,u){const v=Math.min(.999999,Math.max(0,u))*(points.length-1),j=Math.floor(v),a=v-j,out=[];for(let k=0;k<3;k++){const p0=points[Math.max(0,j-1)][k],p1=points[j][k],p2=points[Math.min(points.length-1,j+1)][k],p3=points[Math.min(points.length-1,j+2)][k];out[k]=.5*((2*p1)+(-p0+p2)*a+(2*p0-5*p1+4*p2-p3)*a*a+(-p0+3*p1-3*p2+p3)*a*a*a)}return out}
function lagoonArmCurve(t,arm){const a=arm*Math.PI/4+.1,c=Math.cos(a),s=Math.sin(a),wave=Math.sin(t*.8+arm*.75),w=.7+.3*Math.sin(t*.5+arm*1.7),radial=.88+.16*Math.sin(arm*1.8),height=.72+.28*(1+Math.sin(arm*2.3)),points=[[.65,.12,0],[1.2,-.15,.08*wave],[2.15,.25+w*.6,.23*wave],[3,1.1+w*.9,.32*wave],[3.15,2.35+w*.55,.27*wave],[2.58,2.65+wave*.3,-.1],[2.33,2.13+wave*.35,-.22]].map(([r,y,z],j)=>{r*=j>1?radial:1;z+=Math.sin(t*.62+arm*2+j*.8)*.2*j/6;return [(c*r-s*z)*.27,Math.max(.015,y*height*.27),(s*r+c*z)*.27]});return points}
const lagoonArmCurves=cacheAnimationState(lagoonArmCurve);
function lagoonArmPoint(t,arm,u){return lagoonCurvePoint(lagoonArmCurves(t,arm),u)}
function lagoonSegmentPose(a,b){const d=b.map((v,j)=>v-a[j]),len=Math.hypot(...d)||1,y=d.map(v=>v/len),h=Math.abs(y[2])>.9?[1,0,0]:[0,0,1],x=[y[1]*h[2]-y[2]*h[1],y[2]*h[0]-y[0]*h[2],y[0]*h[1]-y[1]*h[0]],xl=Math.hypot(...x)||1;for(let j=0;j<3;j++)x[j]/=xl;const z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];return new Float32Array([...x,0,...d,0,...z,0,...a,1])}
function lagoonShipState(t){const a=t*Math.PI/12,dx=.23*Math.cos(a),dz=-.5*Math.sin(a);return {x:-13.6+.23*Math.sin(a),z:-7.9+.5*Math.cos(a),yaw:Math.atan2(dx,dz),y:.20+Math.sin(t*1.6)*.025}}
function lagoonShipPose(t){const q=lagoonShipState(t);return mul(exhibitPose(q.x,q.y,q.z,.25,.25,.25,q.yaw),pivotZ(0,0,0,Math.sin(t*1.6)*.035))}
function lagoonShotState(t,gun){const q=lagoonActionState(t),age=q.p-lagoonShotTime(gun),fired=t-age,ship=lagoonShipState(fired),target=[-10.98,.16,-7.9+gun*.2],side=Math.sign((target[0]-ship.x)*Math.cos(ship.yaw)-(target[2]-ship.z)*Math.sin(ship.yaw))||1,local=[side*.86,.36,-.9+gun*.7],start=[ship.x+(Math.cos(ship.yaw)*local[0]+Math.sin(ship.yaw)*local[2])*.25,ship.y+local[1]*.25,ship.z+(-Math.sin(ship.yaw)*local[0]+Math.cos(ship.yaw)*local[2])*.25],u=exhibitClamp(age/.9),point=start.map((v,j)=>v+(target[j]-v)*u);point[1]+=Math.sin(u*Math.PI)*.46;return {age,start,target,point,flying:age>=0&&age<.9,flash:age>=0&&age<.15,splash:age>=.9&&age<1.75}}
const lagoonShots=cacheAnimationState(lagoonShotState);
function lagoonFloatState(t,k){const p=((t-k*2.1)%12+12)%12,amount=exhibitEase(p/.8)*(1-exhibitEase((p-7.5)/1.2));return {p,amount,y:-.22+amount*.35+Math.sin(t*1.5+k)*.004*amount}}
// Flat, broken arcs catch the same light as the surface, without dark tube edges.
function lagoonWaterArc(x,z,rx,rz,start,end,width,color=[.11,.392,.40]){const n=Math.max(8,Math.ceil((end-start)*12)),v=[];for(let j=0;j<n;j++){const a=start+(end-start)*j/n,b=start+(end-start)*(j+1)/n,point=(angle,r)=>[x+Math.cos(angle)*(rx+r),0,z+Math.sin(angle)*(rz+r)],p=point(a,-width),q=point(b,-width),r=point(b,width),u=point(a,width);for(const t of [p,q,r,p,r,u])v.push(...t,0,0)}mesh(v,color)}
function lagoonRipple(rx,rz){for(const [a,b] of [[.15,1.55],[2.15,3.75],[4.4,5.7]])lagoonWaterArc(0,0,rx,rz,a,b,.0028)}
function lagoonChamferBar(w,h,d,r,color){const x=w/2,z=d/2,p=[[-x+r,-z],[-x,-z+r],[-x,z-r],[-x+r,z],[x-r,z],[x,z-r],[x,-z+r],[x-r,-z]],v=[];for(let k=0;k<p.length;k++){const a=p[k],b=p[(k+1)%p.length],a0=[a[0],0,a[1]],b0=[b[0],0,b[1]],at=[a[0],h,a[1]],bt=[b[0],h,b[1]];for(const t of [[0,h,0],at,bt,[0,0,0],b0,a0,a0,b0,bt,a0,bt,at])v.push(...t,0,0)}mesh(v,color)}
function lagoonTokenTorus(y,r,tube,color,start=0,end=Math.PI*2){const v=[],segments=Math.max(2,Math.ceil((end-start)*24/Math.PI)),point=(a,b)=>[Math.cos(a)*(r+Math.cos(b)*tube),y+Math.sin(b)*tube,Math.sin(a)*(r+Math.cos(b)*tube)];for(let j=0;j<segments;j++)for(let k=0;k<10;k++){const a=start+(end-start)*j/segments,b=start+(end-start)*(j+1)/segments,c=k*Math.PI/5,d=(k+1)*Math.PI/5;for(const t of [point(a,c),point(a,d),point(b,d),point(a,c),point(b,d),point(b,c)])v.push(...t,0,0)}mesh(v,color)}
function lagoonFigurePose(t,k){const q=lagoonFloatState(t,k),x=-12.45+(k%2)*.72,z=-7.45+Math.floor(k/2)*.46;return mul(transform(x,q.y,z,Math.sin(t*.3+k)*.12),pivotZ(0,0,0,Math.sin(t*1.2+k)*.025))}

activePlatform=11;
softPlatform(standFootprint(ovalPlatformContour(-12,-9,3.02,2.45),activePlatform),.13,[.10,.38,.39]);
softPlatform(standFootprint(ovalPlatformContour(-9.8,-10.62,.85,.74,64),activePlatform),.23,[.63,.57,.37],.025,.025);
for(let k=0;k<18;k++){const a=k*Math.PI/9+(k===4?-Math.PI/18:k===5?Math.PI/18:0);ball(-12+Math.cos(a)*2.72,.16,-9+Math.sin(a)*2.16,.14,.025,.09,[.65,.84,.73]);}
for(const side of [-1,1]){const x=-12+side*1.79;box(x,.15,-10,.15,3.21,.22,[.41,.28,.17]);for(let k=0;k<6;k++){const points=[];for(let j=0;j<=24;j++){const a=j*Math.PI/6;points.push([x+Math.cos(a)*.09,.46+k*.48+j*.002,-10+Math.sin(a)*.14])}benchmarkCable(points,.012,[.74,.64,.40]);}}
// Eight curled arms, heavy eye sockets, a narrow beak and mottled green mantle.
waterline=.135;motion=krakenPoses;
ball(0,.40,-.015,.34,.44,.39,[.12,.205,.23]);ball(0,.63,-.035,.30,.23,.34,[.15,.25,.27]);
for(const side of [-1,1]){ball(side*.32,.36,-.04,.10,.21,.27,[.10,.19,.21]);for(let j=0;j<4;j++)exhibitBeam([side*.28,.22+j*.052,.09],[side*.37,.24+j*.052,.16],.010,[.13,.26,.25]);ball(side*.19,.43,.31,.135,.10,.075,[.08,.19,.19]);ball(side*.19,.43,.365,.092,.060,.035,[.95,.53,.16]);ball(side*.19,.425,.397,.014,.053,.009,[.025,.07,.075]);ball(side*.19-.026,.45,.406,.007,.009,.004,[1,.97,.81]);ball(side*.19,.493,.355,.14,.034,.063,[.24,.40,.38]);ball(side*.19,.366,.338,.11,.021,.055,[.26,.42,.40]);}
ball(0,.16,.35,.072,.083,.055,[.10,.18,.19]);
for(let k=0;k<26;k++){const a=k*2.399,y=.22+k%7*.078,r=Math.sqrt(Math.max(0,1-((y-.4)/.44)**2));ball(Math.sin(a)*r*.345,y,-.015+Math.cos(a)*r*.395,.014+k%3*.003,.011,.014,[.22,.34,.34]);}motion=null;
for(let arm=0;arm<8;arm++)for(let j=0;j<12;j++){const u=j/12,r=.085*(1-u)**.82+.006;motion=t=>mul(krakenPoses(t),lagoonSegmentPose(lagoonArmPoint(t,arm,u),lagoonArmPoint(t,arm,(j+1)/12)));exhibitBeam([0,0,0],[0,1,0],r,arm%2?[.115,.205,.225]:[.135,.23,.245]);if(j>1){exhibitRing(0,.52,r*.87,r*.41,.12,[.65,.43,.38],.009,Math.PI/2);ball(0,.52,r*.93,r*.25,.075,.008,[.30,.18,.23]);}motion=null;}
waterline=null;
for(let k=0;k<2;k++){motion=t=>{const q=lagoonActionState(t),a=((q.p+k*1.3)%2.6)/2.6,r=q.rise>.03?.55+a*.35:.0001;return exhibitPose(-10.05,.138,-8.2,r,1,r)};lagoonRipple(.80,.65);motion=null;}
prop(-10.05,-8.2,1.05);
// Two-masted pirate ship: curved hull, stern cabin, deck boards, rails and three guns per side.
function lagoonHullHalf(u){return .83*Math.pow(Math.sin(Math.PI*(.17+u*.83)),.68)}
motion=lagoonShipPose;
for(let j=0;j<22;j++){const u=j/22,v=(j+1)/22,z=-1.65+u*3.85,zz=-1.65+v*3.85;for(let side=0;side<10;side++){const a=side*Math.PI/10,b=(side+1)*Math.PI/10,point=(k,theta)=>[-Math.cos(theta)*lagoonHullHalf(k),.64+k**5*.22-Math.sin(theta)*(.88-k*.23),-1.65+k*3.85];quad(point(u,a),point(u,b),point(v,b),point(v,a),j%2?[.46,.29,.16]:[.40,.25,.14]);}quad([-lagoonHullHalf(u),.64+u**5*.22,z],[-lagoonHullHalf(v),.64+v**5*.22,zz],[lagoonHullHalf(v),.64+v**5*.22,zz],[lagoonHullHalf(u),.64+u**5*.22,z],[.76,.58,.33]);exhibitBeam([-lagoonHullHalf(u),.65+u**5*.22,z],[lagoonHullHalf(u),.65+u**5*.22,z],.010,[.41,.27,.16]);}

// A solid transom meets the hull and deck at exactly the same rim.
const lagoonSternWidth=lagoonHullHalf(0),lagoonStern=[];for(let j=0;j<10;j++){const a=j*Math.PI/10,b=(j+1)*Math.PI/10;lagoonStern.push(0,.25,-1.65,0,0,-Math.cos(b)*lagoonSternWidth,.64-Math.sin(b)*.88,-1.65,0,0,-Math.cos(a)*lagoonSternWidth,.64-Math.sin(a)*.88,-1.65,0,0)}lagoonStern.push(0,.25,-1.65,0,0,-lagoonSternWidth,.64,-1.65,0,0,lagoonSternWidth,.64,-1.65,0,0);mesh(lagoonStern,[.43,.28,.16]);
for(const y of [.18,.37,.56])exhibitBeam([-lagoonSternWidth*.80,y,-1.659],[lagoonSternWidth*.80,y,-1.659],.018,[.68,.46,.24]);
for(const side of [-1,1]){const rail=[];for(let j=0;j<=22;j++){const u=j/22;rail.push([side*lagoonHullHalf(u),.94+u**5*.22,-1.65+u*3.85]);if(j%2===0)exhibitBeam([side*lagoonHullHalf(u),.65+u**5*.22,-1.65+u*3.85],rail.at(-1),.026,[.69,.48,.24]);}benchmarkCable(rail,.027,[.78,.59,.31]);for(let gun=0;gun<3;gun++){const z=-.9+gun*.7,x=side*lagoonHullHalf((z+1.65)/3.85);box(x,.26,z,.12,.25,.30,[.12,.17,.16]);exhibitBeam([x,.37,z],[x+side*.30,.37,z],.067,[.16,.22,.22]);const lip=[];for(let k=0;k<=24;k++){const a=k*Math.PI/12;lip.push([x+side*.30,.37+Math.cos(a)*.080,z+Math.sin(a)*.080])}benchmarkCable(lip,.014,[.60,.45,.23]);}}
box(0,.64,-1.10,1.12,.74,.88,[.20,.29,.26]);box(0,1.38,-1.10,1.28,.10,1,[.72,.53,.30]);for(const x of [-.35,0,.35]){box(x,.99,-1.56,.26,.28,.035,[.78,.59,.31]);box(x,1.02,-1.585,.17,.19,.018,[.95,.77,.39]);}
for(const [z,h,w] of [[-.18,3.75,2.05],[1,2.95,1.56]]){exhibitBeam([0,.65,z],[0,h+.65,z],.047,[.44,.29,.16]);for(const [top,height,width] of [[h*.76,h*.48,w],[h*.98,h*.18,w*.67]]){const y=top+.65;exhibitBeam([-width*.57,y,z],[width*.57,y,z],.034,[.46,.31,.18]);for(let j=0;j<9;j++){const a=j/9,b=(j+1)/9,px=(v,down)=>[(v-.5)*width,y-down*height,z+Math.sin(v*Math.PI)*.22*Math.sin(down*Math.PI)];for(let row=0;row<5;row++)quad(px(a,row/5),px(b,row/5),px(b,(row+1)/5),px(a,(row+1)/5),j%3===0?[.86,.82,.64]:[.95,.90,.72]);}for(const side of [-1,1])benchmarkCable([[side*.64,.70,z+.25],[side*.38,h*.44,z-.04],[side*.1,h*.77+.65,z]],.014,[.42,.34,.23]);}for(let k=1;k<8;k++){const y=.7+k*.4;exhibitBeam([-.58*(1-k/10),y,z],[.58*(1-k/10),y,z],.016,[.49,.36,.23]);}}
benchmarkCable([[0,.48,2.05],[0,1,2.85],[0,1.13,3.05]],.045,[.52,.35,.17]);for(const side of [-1,1])exhibitBeam([side*.6,.9,.8],[0,1.13,3.05],.014,[.49,.38,.25]);
exhibitBeam([0,3.95,-.18],[0,5.13,-.18],.027,[.40,.28,.18]);quad([0,4.95,-.18],[.95,4.88,-.14],[.88,4.32,-.10],[0,4.38,-.18],[.075,.13,.13]);ball(.43,4.65,-.19,.13,.14,.025,[.91,.87,.67]);box(.43,4.47,-.19,.15,.12,.04,[.91,.87,.67]);for(const side of [-1,1]){exhibitBeam([.24,4.46+side*.15,-.22],[.67,4.46-side*.15,-.22],.024,[.91,.87,.67]);ball(.43+side*.045,4.66,-.22,.026,.032,.009,[.08,.12,.12]);}motion=null;
prop(-13.6,-7.9,.95);
// Wake follows the stern; each shot starts at the moving hull and splashes short of the kraken.
for(let k=0;k<3;k++){motion=t=>{const q=lagoonShipState(t-k*.15);return transform(q.x,.138,q.z,q.yaw)};lagoonWaterArc(0,-.34-k*.035,.10+k*.015,.06,Math.PI,Math.PI*2,.0035,[.115,.39,.40]);motion=null;}
for(let gun=0;gun<3;gun++){
 motion=t=>{const q=lagoonShots(t,gun);return exhibitPose(...q.point,q.flying?1:.0001)};ball(0,0,0,.034,.034,.034,[.15,.20,.19]);motion=null;
 motion=t=>{const q=lagoonShots(t,gun);return exhibitPose(...q.start,q.flash?.7+q.age*3:.0001)};emissive=.8;ball(0,0,0,.09,.06,.07,[1,.72,.27]);emissive=0;motion=null;
 for(let k=0;k<3;k++){motion=t=>{const q=lagoonShots(t,gun),age=q.age-k*.07,show=age>0&&age<1.15;return exhibitPose(q.start[0]+exhibitClamp(age/1.15)*1.15*.18,q.start[1]+exhibitClamp(age/1.15)*1.15*.23,q.start[2]+Math.sin(k*2)*exhibitClamp(age/1.15)*1.15*.13,show?(.45+age*.8)*(1-age/1.15):.0001)};ball(0,0,0,.10,.09,.10,[.75,.76,.64]);motion=null;}
 motion=t=>{const q=lagoonShots(t,gun),age=q.age-.9,s=q.splash?Math.sin(age/.85*Math.PI):.0001;return exhibitPose(q.target[0],.15,q.target[2],Math.max(.0001,s),Math.max(.0001,s),Math.max(.0001,s))};for(let j=0;j<7;j++){const a=j*Math.PI*2/7;exhibitBeam([Math.cos(a)*.05,0,Math.sin(a)*.05],[Math.cos(a)*.17,.16+j%3*.04,Math.sin(a)*.17],.014,[.72,.90,.79]);}motion=null;
}
// Coral cross with ivory end caps; golden ring, cream lower rim and eight rope ties.
waterline=.135;
for(let k=0;k<4;k++){
 if(k%2===0){for(const angle of [-Math.PI/4,Math.PI/4]){const pose=t=>mul(lagoonFigurePose(t,k),transform(0,0,0,angle));motion=pose;lagoonChamferBar(.14,.07,.49,.019,[.58,.43,.29]);motion=t=>mul(pose(t),transform(0,.035,0));lagoonChamferBar(.13,.085,.47,.018,[.58,.245,.20]);motion=pose;box(0,.122,0,.024,.005,.32,[.70,.39,.28]);for(const end of [-1,1]){box(0,.035,end*.185,.136,.086,.037,[.67,.49,.31]);ball(0,.125,end*.185,.011,.004,.011,[.30,.21,.13]);}motion=null;}}
 else{motion=t=>lagoonFigurePose(t,k);lagoonTokenTorus(.044,.1705,.066,[.64,.52,.35]);lagoonTokenTorus(.1045,.1705,.066,[.72,.48,.21]);for(let j=0;j<4;j++){const a=j*Math.PI/2;lagoonTokenTorus(.1045,.1705,.067,[.72,.58,.40],a-.12,a+.12);}exhibitRing(0,.099,0,.250,.250,[.36,.31,.19],.006);for(let j=0;j<8;j++){const a=j*Math.PI/4;exhibitBeam([Math.cos(a)*.214,.1045,Math.sin(a)*.214],[Math.cos(a)*.253,.099,Math.sin(a)*.253],.006,[.36,.31,.19]);}motion=null;}
}
waterline=null;
for(let k=0;k<4;k++){motion=t=>{const q=lagoonFloatState(t,k),u=q.p<1.8?q.p/1.8:q.p>7.5&&q.p<9.3?(q.p-7.5)/1.8:-1,r=u>=0?.65+u*.40:.0001;return exhibitPose(-12.45+(k%2)*.72,.138,-7.45+Math.floor(k/2)*.46,r,1,r)};lagoonRipple(.30,.26);motion=null;}

// The island remains a fixed visual link to the original game.
benchmarkCable([[-9.70,.23,-10.65],[-9.66,1.1,-10.66],[-9.87,1.94,-10.66],[-9.65,2.80,-10.65]],.065,[.49,.35,.20]);for(let k=0;k<9;k++){const a=k*Math.PI*2/9;exhibitLeaf(-9.65,2.8,-10.65,Math.cos(a)*.55,.05,Math.sin(a)*.47,.13,[.29,.51,.26]);}for(const x of [-9.78,-9.61])ball(x,2.70,-10.55,.075,.08,.07,[.41,.30,.18]);prop(-9.70,-10.65,.75);
activePlatform=-1;
// End lagoon exhibit.



function blocked(x,z){const robot=robotDrive(animTime),delta=standOffset(2);return Math.hypot(x-robot.x-delta[0],z-robot.z-delta[2])<.97||props.some(p=>{if(!benchmarkVisible(p))return false;const d=standOffset(p.group);return Math.hypot(x-p.x-d[0],z-p.z-d[2])<p.r+.25})||insideStandFootprint(x,z)}

// Intersect the camera ray with the floor plane. Walking follows a collision-free grid route.
function nearestWalkTarget(x,z){x=Math.max(walkBounds.left,Math.min(walkBounds.right,x));z=Math.max(walkBounds.back,Math.min(walkBounds.front,z));const route=!blocked(x,z)&&findRoute(eye[0],eye[2],x,z);if(route)return {x,z,route,snapped:false};const candidates=[];for(let dx=-4;dx<=4.001;dx+=.2)for(let dz=-4;dz<=4.001;dz+=.2){const xx=x+dx,zz=z+dz;if(xx<walkBounds.left||xx>walkBounds.right||zz<walkBounds.back||zz>walkBounds.front||blocked(xx,zz))continue;candidates.push({x:xx,z:zz,d:dx*dx+dz*dz})}candidates.sort((a,b)=>a.d-b.d);for(const p of candidates){const route=findRoute(eye[0],eye[2],p.x,p.z);if(route)return {...p,route,snapped:true}}return null}
function frontZoneFor(x,z){return stands.findIndex(s=>Math.abs(x-s[0])<=2.5&&z-s[2]>=0&&z-s[2]<=standViewDistance+.8)}
function pickFloor(clientX,clientY){const r=canvas.getBoundingClientRect(),a=canvas.width/canvas.height,f=(Math.min(1/Math.tan(Math.PI/6),a*1.25)*zoom),sx=((clientX-r.left)/r.width*2-1)*a/f,sy=(1-(clientY-r.top)/r.height*2)/f;const cy=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),dx=cy*sx-s*sp*sy+s*cp,dy=cp*sy+sp,dz=s*sx+cy*sp*sy-cy*cp;if(dy>=-.015)return;const distance=-eye[1]/dy,x=eye[0]+dx*distance,z=eye[2]+dz*distance;if(Math.hypot(x-eye[0],z-eye[2])>Math.hypot(hallWidth,hallDepth))return;const target=nearestWalkTarget(x,z);if(!target){hint('Свободный проход рядом не найден.');return}keys.clear();stopStick();destination=[target.x,target.z];const clickedZone=frontZoneFor(x,z),faceIndex=clickedZone>=0&&frontZoneFor(target.x,target.z)===clickedZone?clickedZone:-1;travel={kind:'walk',route:roundWalkRoute([eye[0],eye[2]],target.route),index:0,faceIndex};hint(target.snapped?'Идём к ближайшей доступной точке · Esc — отменить':'Идём к выбранной точке · Esc — отменить')}

function roundWalkRoute(start,route){const points=[start,...route],out=[];for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]);if(ab<.01||bc<.01)continue;let radius=Math.min(.75,ab*.4,bc*.4),curve=null;for(let attempt=0;attempt<6;attempt++){const entry=[b[0]+(a[0]-b[0])*radius/ab,b[1]+(a[1]-b[1])*radius/ab],exit=[b[0]+(c[0]-b[0])*radius/bc,b[1]+(c[1]-b[1])*radius/bc],candidate=[entry];for(let k=1;k<=12;k++){const t=k/12;candidate.push([(1-t)*(1-t)*entry[0]+2*(1-t)*t*b[0]+t*t*exit[0],(1-t)*(1-t)*entry[1]+2*(1-t)*t*b[1]+t*t*exit[1]])}let prev=out.at(-1)||start,valid=true;for(const p of candidate){if(!clearLine(prev,p)){valid=false;break}prev=p}if(valid){curve=candidate;break}radius*=.5}out.push(...(curve||[b]))}if(route.length)out.push(route.at(-1));return out}
function findRoute(sx,sz,tx,tz){
 const from=[sx,sz],to=[tx,tz];if(blocked(sx,sz)||blocked(tx,tz))return null;if(clearLine(from,to))return [to];
 const step=.4,minX=walkBounds.left,minZ=walkBounds.back,nx=Math.floor((walkBounds.right-minX)/step)+1,nz=Math.floor((walkBounds.front-minZ)/step)+1,key=(x,z)=>z*nx+x,world=k=>[minX+(k%nx)*step,minZ+Math.floor(k/nx)*step],cache=new Map();
 const valid=(x,z)=>{if(x<0||x>=nx||z<0||z>=nz)return false;const k=key(x,z);if(!cache.has(k))cache.set(k,!blocked(...world(k)));return cache.get(k)};
 const connect=p=>{const cx=Math.round((p[0]-minX)/step),cz=Math.round((p[1]-minZ)/step),near=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(valid(cx+dx,cz+dz)){const k=key(cx+dx,cz+dz),q=world(k);near.push({k,q,d:Math.hypot(q[0]-p[0],q[1]-p[1])})}near.sort((a,b)=>a.d-b.d);return near.find(q=>clearLine(p,q.q))?.k};
 const start=connect(from),end=connect(to);if(start==null||end==null)return null;
 const goal=world(end),open=[start],cost=new Map([[start,0]]),parent=new Map(),closed=new Set(),score=k=>cost.get(k)+Math.hypot(world(k)[0]-goal[0],world(k)[1]-goal[1])/step;
 while(open.length){let best=0;for(let i=1;i<open.length;i++)if(score(open[i])<score(open[best]))best=i;const current=open.splice(best,1)[0];
  if(current===end){const route=[to];let k=end;while(true){route.push(world(k));if(k===start)break;k=parent.get(k)}route.push(from);route.reverse();const simple=[from];for(let i=1;i<route.length;){let far=i;if(!clearLine(simple.at(-1),route[i]))return null;for(let j=i+1;j<route.length;j++){if(!clearLine(simple.at(-1),route[j]))break;far=j}simple.push(route[far]);i=far+1}return simple.slice(1)}
  closed.add(current);const x=current%nx,z=Math.floor(current/nx);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const xx=x+dx,zz=z+dz,k=key(xx,zz);if(closed.has(k)||!valid(xx,zz)||(dx&&dz&&(!valid(x+dx,z)||!valid(x,z+dz)))||!clearLine(world(current),world(k)))continue;const g=cost.get(current)+Math.hypot(dx,dz);if(g<(cost.get(k)??Infinity)){cost.set(k,g);parent.set(k,current);if(!open.includes(k))open.push(k)}}
 }return null;
}
// Demo tour begin. The tour uses the same paths and collision checks as manual walking.
const demoButton=document.getElementById('demo-toggle');
const demo={active:false,order:[],cursor:0,target:-1,phase:'idle',remaining:0};
function demoViewPoint(i){const p=standViewPoint(i);return [p[0],p[1],p[2]-(i<6?.9:1.2)]}
function demoOrder(){
 const rows=[...new Set(stands.map(p=>p[2]))].sort((a,b)=>b-a),order=[];
 rows.forEach((z,row)=>order.push(...stands.map((p,i)=>({p,i})).filter(item=>item.p[2]===z).sort((a,b)=>(row%2?-1:1)*(a.p[0]-b.p[0])).map(item=>item.i)));
 let nearest=0,distance=Infinity;order.forEach((i,k)=>{const p=standViewPoint(i),d=Math.hypot(p[0]-eye[0],p[2]-eye[2]);if(d<distance){distance=d;nearest=k}});
 return [...order.slice(nearest),...order.slice(0,nearest)];
}
function refreshDemoState(){
 demoButton.setAttribute('aria-pressed',String(demo.active));demoButton.querySelector('span').textContent=demo.active?'Остановить демо':'Демо-прогулка';
 demoButton.title=demo.active?'Остановить автоматическую прогулку. Ручное управление также останавливает демо.':'Автоматическая прогулка с остановками у игровых сцен';
 canvas.dataset.demoState=demo.active?demo.phase:'off';canvas.dataset.demoTarget=demo.active?String(demo.target+1).padStart(2,'0'):'';
}
function stopDemo(){if(!demo.active)return;demo.active=false;demo.phase='idle';demo.remaining=0;refreshDemoState()}
function nextDemoStand(){
 for(let attempt=0;attempt<demo.order.length;attempt++){
  const i=demo.order[demo.cursor];demo.cursor=(demo.cursor+1)%demo.order.length;const p=demoViewPoint(i);
  if(blocked(p[0],p[2]))continue;const route=findRoute(eye[0],eye[2],p[0],p[2]);if(!route)continue;
  demo.target=i;demo.phase='walking';destination=[p[0],p[2]];travel={kind:'walk',route:roundWalkRoute([eye[0],eye[2]],route),index:0,faceIndex:i};jump.value=String(i);
  hint('Демо · идём к сцене «'+games[i].title+'» · Esc — остановить');refreshDemoState();return;
 }
 cancelWalk();hint('Демо остановлено: свободный маршрут к стендам не найден.');
}
function startDemo(){cancelWalk();stopStick();keys.clear();keepSafeDistance();setZoom(1);demo.order=demoOrder();demo.cursor=0;demo.active=true;nextDemoStand()}
function updateDemo(dt){
 if(!demo.active)return;
 pitch+=((demo.phase==='viewing'?.10:0)-pitch)*(1-Math.exp(-dt*3));
 if(travel)return;
 if(demo.phase==='walking'){demo.phase='viewing';demo.remaining=14;hint('Демо · осматриваем «'+games[demo.target].title+'» · Esc — остановить');refreshDemoState();return}
 demo.remaining-=dt;if(demo.remaining<=0)nextDemoStand();
}
if(demoButton){demoButton.onclick=()=>{if(demo.active){cancelWalk();hint('Демо остановлено.')}else startDemo()};refreshDemoState()}
// Navigation, scene interaction and editing always hand control back to the visitor.
document.addEventListener('pointerdown',event=>{if(demo.active&&event.target.closest('#scene,#joystick,#jump,#reset,.map-floor,#screen-controls,#developer-toggle,#developer-panel'))cancelWalk()},true);
document.addEventListener('click',event=>{if(demo.active&&event.target.closest('#screen-controls,#developer-toggle,#developer-panel'))cancelWalk()},true);
document.addEventListener('keydown',event=>{if(demo.active&&event.code==='Escape'){cancelWalk();event.preventDefault()}},true);
canvas.addEventListener('wheel',()=>{if(demo.active)cancelWalk()},{passive:true});
// Demo tour end.
function clearLine(a,b){if(standFootprintBlocked(a,b))return false;const robot=robotDrive(animTime),delta=standOffset(2);if(pointSegmentDistance2([robot.x+delta[0],robot.z+delta[2]],a,b)<.97**2)return false;return !props.some(p=>{if(!benchmarkVisible(p))return false;const d=standOffset(p.group);return pointSegmentDistance2([p.x+d[0],p.z+d[2]],a,b)<(p.r+.25)**2})}
motion=()=>destination?transform(destination[0],.10,destination[1]):transform(0,-100,0);emissive=.8;for(let k=0;k<32;k++){const a=k*Math.PI/16,b=(k+1)*Math.PI/16;quad([Math.cos(a)*.22,0,Math.sin(a)*.22],[Math.cos(b)*.22,0,Math.sin(b)*.22],[Math.cos(b)*.29,0,Math.sin(b)*.29],[Math.cos(a)*.29,0,Math.sin(a)*.29],[.78,.98,.56])}motion=null;emissive=0;

function panelOccluded(i){const target=[stands[i][0],.94,stands[i][2]+.32],d=target.map((v,k)=>v-eye[k]);return stands.some((s,j)=>{if(i===j)return false;const lo=[s[0]-1.8,0,s[2]-.8],hi=[s[0]+1.8,3.5,s[2]+.8];let near=0,far=.995;for(let k=0;k<3;k++){if(Math.abs(d[k])<.00001){if(eye[k]<lo[k]||eye[k]>hi[k])return false}else{let a=(lo[k]-eye[k])/d[k],b=(hi[k]-eye[k])/d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false}}return far>0&&near<.995})}function projectControls(panel,m,r,origin,u,v,width,height,i){const [ox,oy,oz]=origin,w=r.width/2,h=r.height/2,clip=p=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[3]*p[0]+m[7]*p[1]+m[11]*p[2]],a=clip(u),b=clip(v),o=clip(origin);o[0]+=m[12];o[1]+=m[13];o[2]+=m[15];panel.hidden=o[2]<.3||eye[2]<stands[i][2]+.35||panelOccluded(i);if(panel.hidden)return;const col=c=>[w*(c[0]+c[2]),h*(c[2]-c[1]),0,c[2]],ac=col(a),bc=col(b),oc=col(o);oc[0]+=r.left*o[2];oc[1]+=r.top*o[2];panel.style.transform='matrix3d('+[...ac,...bc,0,0,1,0,...oc].join(',')+')';panel.style.zIndex=Math.max(1,1000-Math.round(o[2]));if(panel.classList.contains('podium-controls')){const cx=ac[0]*300+bc[0]*70+oc[0],cy=ac[1]*300+bc[1]*70+oc[1],cw=ac[3]*300+bc[3]*70+oc[3],dx=Math.hypot((cx+ac[0])/(cw+ac[3])-cx/cw,(cy+ac[1])/(cw+ac[3])-cy/cw),dy=Math.hypot((cx+bc[0])/(cw+bc[3])-cx/cw,(cy+bc[1])/(cw+bc[3])-cy/cw),ratio=Math.max(.7,Math.min(5,dx/Math.max(.0001,dy)));panel.querySelectorAll('.button-caption').forEach(s=>{s.style.transform='translateY('+(-4*ratio)+'px) scaleY('+ratio+')';s.style.fontSize=Math.min(28,110/ratio)+'px'})}const x=(o[0]/o[2]+1)*w,y=(1-o[1]/o[2])*h;panel.inert=x< -400||x>r.width+400||y< -300||y>r.height+300}
function placeScreenControls(){const m=camera(),r=canvas.getBoundingClientRect();stands.forEach(([x,y,z],i)=>{projectControls(screenPanels[i],m,r,[x-1.5,1.25,z+.32],[3/600,0,0],[0,-.65/130,0],600,130,i);projectControls(podiumPanels[i],m,r,[x-1.5,.725,z+.63],[3/600,0,0],[0,-.26/140,.148/140],600,140,i)})}

function keepSafeDistance(){if(!insideStandFootprint(eye[0],eye[2]))return;let nearest=0,distance=Infinity;standGroups.forEach((group,i)=>{const d=Math.hypot(eye[0]-group.position[0],eye[2]-group.position[2]);if(d<distance){distance=d;nearest=i}});eye=standViewPoint(nearest);yaw=0;pitch=0;}

// Controls belong to the scene: depth testing hides them behind foreground objects.
document.getElementById('screen-controls').hidden=true;
document.getElementById('screen-controls').setAttribute('aria-hidden','true');
const controlTextures=[];let actionControlTexture=null;
function controlCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function controlTextureEntry(i,kind){
 if(kind==='actions'&&actionControlTexture)return actionControlTexture;
 const entry={canvas:controlCanvas(600,kind==='difficulty'?130:60),i,kind,texture:texture(null)};controlTextures.push(entry);
 if(kind==='actions')actionControlTexture=entry;
 return entry;
}
function rounded(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
function drawControlTexture(entry){const {canvas:c,i,kind}=entry,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';
 if(kind==='difficulty'){ctx.lineCap='round';ctx.lineJoin='round';
  const ds=Object.values(games[i].difficulties||{});ds.forEach((d,j)=>{const x=300+(j-(ds.length-1)/2)*112,active=d.link===difficultyLinks[i];ctx.beginPath();ctx.arc(x,65,46,0,Math.PI*2);ctx.fillStyle=active?'#c8f294':'#214653';ctx.fill();ctx.strokeStyle=active?'#edffd5':'#9dc2c8';ctx.lineWidth=active?6:2;ctx.stroke();const face=difficultyFaceImages[difficultyKind(d.link)];if(face.complete&&face.naturalWidth)ctx.drawImage(face,x-34,31,68,68);if(active){ctx.beginPath();ctx.arc(x+26,91,8,0,Math.PI*2);ctx.fillStyle='#214833';ctx.fill();ctx.beginPath();ctx.moveTo(x+22,91);ctx.lineTo(x+25,94);ctx.lineTo(x+30,88);ctx.strokeStyle='#edffd5';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}});
 }else{
  rounded(ctx,3,3,284,54,0,'#c2e98e','#e7ffd0');rounded(ctx,313,3,284,54,0,'#214653','#86a8b1');ctx.font='bold 25px Arial';ctx.fillStyle='#203e24';ctx.fillText('▶ Играть',145,30);ctx.fillStyle='#edfaff';ctx.fillText('ⓘ Информация',455,30);
 }
 gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
}
function difficultyBody(cx,cy,z,r){
 const vertices=[],n=32;for(let j=0;j<n;j++){const a=j/n*Math.PI*2,b=(j+1)/n*Math.PI*2;
  const backA=[cx+Math.cos(a)*r,cy+Math.sin(a)*r,z],backB=[cx+Math.cos(b)*r,cy+Math.sin(b)*r,z],frontA=[cx+Math.cos(a)*(r-.018),cy+Math.sin(a)*(r-.018),z+.075],frontB=[cx+Math.cos(b)*(r-.018),cy+Math.sin(b)*(r-.018),z+.075];
  for(const v of [backA,backB,frontB,backA,frontB,frontA])vertices.push(...v,0,0);
 }mesh(vertices,[.25,.43,.46]);
 // Opaque rear disc: the icon is visible only from the screen side.
 const back=[];for(let j=0;j<n;j++){const a=j/n*Math.PI*2,b=(j+1)/n*Math.PI*2;for(const v of [[cx,cy,z],[cx+Math.cos(b)*r,cy+Math.sin(b)*r,z],[cx+Math.cos(a)*r,cy+Math.sin(a)*r,z]])back.push(...v,0,0)}mesh(back,[.10,.19,.23]);
}
function actionSeat(x,z,left,right){
 // Match the underside of the cap exactly, with a tiny overlap at the joint.
 const point=(u,v)=>[x-1.5+u/600*3,.725-v/60*.26-.003-.085+.001,z+.63+v/60*.148-.035];
 const a=point(left,3),b=point(right,3),c=point(right,57),d=point(left,57),lower=v=>[v[0],.30,v[2]];
 quad(d,c,b,a,[.20,.32,.34]);for(const [u,v] of [[a,b],[b,c],[c,d],[d,a]])quad(lower(u),lower(v),v,u,[.11,.19,.22]);
}
function actionBody(x,z,left,right,tint){
 const point=(u,v)=>[x-1.5+u/600*3,.725-v/60*.26-.003,z+.63+v/60*.148];
 const a=point(left,3),b=point(right,3),c=point(right,57),d=point(left,57),lower=v=>[v[0],v[1]-.085,v[2]-.035];
 quad(d,c,b,a,tint);for(const [u,v] of [[a,b],[b,c],[c,d],[d,a]])quad(lower(u),lower(v),v,u,tint.map(c=>c*.62));
}

const buttonPresses=new Map(),buttonMotions=new Map();let pendingButton=false;
function pressButton(i,key,action){if(pendingButton)return;buttonPresses.set(i+':'+key,performance.now());pendingButton=true;setTimeout(()=>{pendingButton=false;action()},110)}
function buttonMotion(i,key,kind){
 const id=i+':'+key,cacheKey=id+':'+kind;
 if(!buttonMotions.has(cacheKey))buttonMotions.set(cacheKey,()=>{
  const elapsed=performance.now()-(buttonPresses.get(id)??-1e6),pulse=elapsed>=0&&elapsed<280?Math.sin(Math.PI*elapsed/280):0;
  return kind==='difficulty'?transform(0,0,-(.042*pulse)):transform(0,-.022*pulse,0);
 });
 return buttonMotions.get(cacheKey);
}
function controlFace(x,z,i,entry,left,right,top,bottom,key,link){
 const kind=entry.kind,v=(u,t)=>kind==='difficulty'?[x-1.5+u/600*3,1.25-t/130*.65,z+.400]:[x-1.5+u/600*3,.725-t/60*.26,z+.63+t/60*.148];
 const a=v(left,bottom),b=v(right,bottom),c=v(right,top),d=v(left,top),h=entry.canvas.height;
 mesh([...a,left/600,1-bottom/h,...b,right/600,1-bottom/h,...c,right/600,1-top/h,...a,left/600,1-bottom/h,...c,right/600,1-top/h,...d,left/600,1-top/h],[1,1,1],entry.texture);
 const obj=objects[objects.length-1];obj.oneSided=true;obj.emission=1;obj.motion=buttonMotion(i,key,kind);
 obj.controlHit=world=>{const m=obj.motion(),p=world.map((n,j)=>n-m[12+j]),u=(p[0]-(x-1.5))/3*600;
  if(kind==='difficulty'){const t=(1.25-p[1])/.65*130,cx=(left+right)/2;if(Math.hypot(u-cx,t-65)>53)return null;return ()=>pressButton(i,key,()=>setDifficulty(i,link))}
  const t=(.725-p[1])/.26*60;if(u<left||u>right||t<3||t>57)return null;
  return ()=>pressButton(i,key,()=>key==='play'?podiumPanels[i].querySelector('.play').click():openInfo(i));
 };
}
standAnchors.forEach(([x,y,z],i)=>withStandGroup(i,()=>{
 for(const kind of ['difficulty','actions']){
  const ds=Object.values(games[i].difficulties||{});if(kind==='difficulty'&&!ds.length)continue;
  const entry=controlTextureEntry(i,kind);
  if(kind==='difficulty')ds.forEach((d,j)=>{
   const cx=300+(j-(ds.length-1)/2)*112,key='diff'+j,from=objects.length;
   difficultyBody(x+(j-(ds.length-1)/2)*.56,.925,z+.322,.248);
   objects.slice(from).forEach(o=>{o.motion=buttonMotion(i,key,kind);o.difficultyLink=d.link;o.standIndex=i});
   controlFace(x,z,i,entry,cx-54,cx+54,8,130,key,d.link);
  });else for(const [left,right,key,tint] of [[3,287,'play',[.43,.64,.32]],[313,597,'info',[.22,.38,.44]]]){
   actionSeat(x,z,left,right);const from=objects.length;actionBody(x,z,left,right,tint);objects.slice(from).forEach(o=>o.motion=buttonMotion(i,key,kind));
   controlFace(x,z,i,entry,left,right,3,57,key);
  }
 }
}));
refreshStandControls=i=>{controlTextures.filter(e=>e.i===i&&e.kind==='difficulty').forEach(drawControlTexture);for(const o of objects)if(o.standIndex===i){const active=o.difficultyLink===difficultyLinks[i];o.color=active?[.72,.94,.29]:[.25,.43,.46];o.emission=active?.65:0}};

// Physical benchmark selector, built in the same stand group as both variants.
const benchmarkSelectors=[];
function setBenchmarkScene(value){
 if(value!==1&&value!==2)return;benchmarkScene=value;cancelWalk();stopStick();keys.clear();refreshBenchmarkControls();hoverStamp=0;
 if(blocked(eye[0],eye[2])){const target=nearestWalkTarget(eye[0],eye[2]);if(target){eye[0]=target.x;eye[2]=target.z}else{const s=stands[5];eye[0]=s[0];eye[2]=s[2]+5.8}}
 auditStandBounds();savePavilionState();
}
withStandGroup(5,()=>{
 const x=-6.9,z=-21.05;box(x,.09,z,.72,.34,.26,[.14,.24,.29]);prop(x,z,.40);
 for(const [value,y,title] of [[1,.27,'1 · ЛАБ'],[2,.14,'2 · РЕТРО']]){
  const cx=x,front=z+.19,w=.62,h=.10,from=objects.length,key='benchmark'+value;
  box(cx,y,front-.035,w,h,.085,[.29,.44,.48]);objects.slice(from).forEach(o=>o.motion=buttonMotion(5,key,'difficulty'));
  const c=controlCanvas(480,77),tex=texture(c);
  quad([cx-w/2,y,front+.011],[cx+w/2,y,front+.011],[cx+w/2,y+h,front+.011],[cx-w/2,y+h,front+.011],[1,1,1],tex);
  const face=objects.at(-1);face.oneSided=true;face.emission=.9;face.motion=buttonMotion(5,key,'difficulty');face.controlHit=()=>()=>pressButton(5,key,()=>setBenchmarkScene(value));
  benchmarkSelectors.push({value,title,canvas:c,texture:tex});
 }
});
refreshBenchmarkControls=()=>{
 canvas.dataset.benchmarkScene=benchmarkScene;
 for(const entry of benchmarkSelectors){const q=entry.canvas.getContext('2d'),active=entry.value===benchmarkScene;q.clearRect(0,0,480,77);q.fillStyle=active?'#c6eca3':'#20434e';q.fillRect(0,0,480,77);q.fillStyle=active?'#243f2c':'#d2eaec';q.textAlign='center';q.textBaseline='middle';q.font='bold 56px Segoe UI';q.fillText(entry.title,240,36);if(active){q.fillStyle='#395d36';q.fillRect(50,68,380,4)}gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,entry.canvas)}
};refreshBenchmarkControls();
function rayObjectBounds(o,m,d,nearest){
 const b=o.bounds,c=b.center,e=b.extent;let near=.05,far=nearest;
 for(let j=0;j<3;j++){const center=m[j]*c[0]+m[j+4]*c[1]+m[j+8]*c[2]+m[j+12],radius=Math.abs(m[j])*e[0]+Math.abs(m[j+4])*e[1]+Math.abs(m[j+8])*e[2]+.00001,delta=center-eye[j];
  if(Math.abs(d[j])<1e-9){if(Math.abs(delta)>radius)return false;continue}
  let a=(delta-radius)/d[j],z=(delta+radius)/d[j];if(a>z)[a,z]=[z,a];near=Math.max(near,a);far=Math.min(far,z);if(near>far)return false;
 }return true;
}
// Full animation sweep, relative to each stand: room above the clouds and below
// the water, plus a margin around all moving props. Static geometry extends it
// exactly (including the robot rack). Keep this envelope when adding animations.
function buildSceneIndex(source,groups){
 const buckets=new Map(),controls=[],order=new Map();
 for(const [index,o] of source.entries()){
  order.set(o,index);if(o.controlHit)controls.push(o);
  let bucket=buckets.get(o.group);if(!bucket){bucket={group:o.group,parts:[],motions:new Map(),packets:[]};buckets.set(o.group,bucket)}bucket.parts.push(o);
  const motion=o.motion||null;let variants=bucket.motions.get(motion);if(!variants){variants=new Map();bucket.motions.set(motion,variants)}
  const variant=o.benchmarkVariant||0;let packet=variants.get(variant);if(!packet){packet={group:o.group,motion,benchmarkVariant:variant,parts:[]};variants.set(variant,packet);bucket.packets.push(packet)}packet.parts.push(o);
 }
 for(const bucket of buckets.values()){
  for(const packet of bucket.packets)packet.bounds=combinedBounds(packet.parts);
  const group=groups[bucket.group];if(group){
   const parts=bucket.parts.filter(o=>!o.motion);
   if(bucket.parts.some(o=>o.motion))parts.push({bounds:{center:[group.anchor[0],2,group.anchor[2]+.75],extent:[4.5,6,4.75]}});
   bucket.bounds=combinedBounds(parts);
  }
  delete bucket.parts;delete bucket.motions;
 }
 return {buckets,controls,order,count:source.length,revision:-1};
}
let sceneIndex=null;
function getSceneIndex(){
 if(!sceneIndex||sceneIndex.count!==objects.length)sceneIndex=buildSceneIndex(objects,standGroups);
 if(sceneIndex.revision!==layoutRevision){
  for(const bucket of sceneIndex.buckets.values())if(bucket.bounds){const delta=standOffset(bucket.group);bucket.worldBounds={center:bucket.bounds.center.map((v,j)=>v+delta[j]),extent:bucket.bounds.extent}}
  sceneIndex.revision=layoutRevision;
 }
 return sceneIndex;
}
function rayStandGroups(index,d){
 const groups=new Set();for(const bucket of index.buckets.values())if(!bucket.worldBounds||rayObjectBounds({bounds:bucket.worldBounds},identity,d,Infinity))groups.add(bucket.group);return groups;
}
function pickObjectCandidates(index,groups,d,models){
 const candidates=[];
 for(const group of groups)for(const packet of index.buckets.get(group).packets){
  if(!benchmarkVisible(packet))continue;
  const model=objectMatrix(packet,animTime,models);if(rayObjectBounds(packet,model,d,Infinity))candidates.push(...packet.parts);
 }
 // Keep original triangle depth ties and occlusion, including non-clickable props.
 return candidates.sort((a,b)=>index.order.get(a)-index.order.get(b));
}
function pickWorldControl(clientX,clientY,activate=true){
 const r=canvas.getBoundingClientRect(),a=canvas.width/canvas.height,f=Math.min(1/Math.tan(Math.PI/6),a*1.25)*zoom,sx=((clientX-r.left)/r.width*2-1)*a/f,sy=(1-(clientY-r.top)/r.height*2)/f,cy=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),d=[cy*sx-sn*sp*sy+sn*cp,cp*sy+sp,sn*sx+cy*sp*sy-cy*cp];
 // Screen bounds reject empty hover regions before the detailed occlusion test.
 const index=getSceneIndex(),groups=rayStandGroups(index,d),hitModels=new Map();
 const projection=camera(),px=(clientX-r.left)/r.width*2-1,py=1-(clientY-r.top)/r.height*2;
 const candidate=index.controls.some(o=>{if(!groups.has(o.group)||!benchmarkVisible(o))return false;const model=objectMatrix(o,animTime,hitModels);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let k=0;k<o.vertices.length;k+=5){const v=o.vertices,x=model[0]*v[k]+model[4]*v[k+1]+model[8]*v[k+2]+model[12],y=model[1]*v[k]+model[5]*v[k+1]+model[9]*v[k+2]+model[13],z=model[2]*v[k]+model[6]*v[k+1]+model[10]*v[k+2]+model[14],w=projection[3]*x+projection[7]*y+projection[11]*z+projection[15];if(w<=.1)return false;const sx=(projection[0]*x+projection[4]*y+projection[8]*z+projection[12])/w,sy=(projection[1]*x+projection[5]*y+projection[9]*z+projection[13])/w;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy)}
  return px>=minX&&px<=maxX&&py>=minY&&py<=maxY;
 });if(!candidate)return false;
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,j)=>v-b[j]);let nearest=Infinity,action=null;
 for(const o of pickObjectCandidates(index,groups,d,hitModels)){const m=objectMatrix(o,animTime,hitModels);if(!rayObjectBounds(o,m,d,nearest))continue;const v=o.vertices,point=k=>[m[0]*v[k]+m[4]*v[k+1]+m[8]*v[k+2]+m[12],m[1]*v[k]+m[5]*v[k+1]+m[9]*v[k+2]+m[13],m[2]*v[k]+m[6]*v[k+1]+m[10]*v[k+2]+m[14]];
  for(let k=0;k<v.length;k+=15){const a=point(k),b=point(k+5),c=point(k+10),e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-8||(o.oneSided&&det<0))continue;const q=sub(eye,a),u=dot(q,h)/det;if(u<0||u>1)continue;const cr=cross(q,e1),w=dot(d,cr)/det;if(w<0||u+w>1)continue;const t=dot(e2,cr)/det;if(t<.05||t>=nearest)continue;const hit=eye.map((v,j)=>v+d[j]*t),candidate=o.controlHit?o.controlHit(standSourcePoint(o.group,hit)):null;if(o.controlHit&&!candidate)continue;nearest=t;action=candidate;
  }
 }
 if(action){if(activate)action();return true}return false;
}


// Retain original objects for precise picking; batch only their render geometry.
const vertexArrays=gl.getExtension('OES_vertex_array_object');
const uintIndices=!!gl.getExtension('OES_element_index_uint');
// Share only bit-identical render attributes. Original triangles still drive exact picking.
function indexRenderVertices(data,allowUint32,minCount=0){
 if(data.length<minCount*11)return {vertices:data};
 const stride=11,count=data.length/stride,words=new Uint32Array(data.buffer,data.byteOffset,data.length),indices=new Uint32Array(count);
 let size=1;while(size<count*2)size*=2;
 const slots=new Uint32Array(size),mask=size-1;let unique=0;
 for(let i=0;i<count;i++){
  const offset=i*stride;let hash=2166136261;
  for(let j=0;j<stride;j++)hash=Math.imul(hash^words[offset+j],16777619);
  // Mix high Float32 bits down before choosing a power-of-two table slot.
  hash=Math.imul(hash^(hash>>>16),0x7feb352d);hash=Math.imul(hash^(hash>>>15),0x846ca68b);hash^=hash>>>16;
  let slot=hash&mask;
  while(slots[slot]){const first=slots[slot]-1,base=first*stride;let same=true;
   for(let j=0;j<stride;j++)if(words[base+j]!==words[offset+j]){same=false;break}
   if(same)break;slot=(slot+1)&mask;
  }
  if(!slots[slot]){slots[slot]=i+1;indices[i]=unique++}else indices[i]=indices[slots[slot]-1];
 }
 const indexBytes=unique<=65536?2:4;
 // Keep ordinary drawing when indexing has no memory benefit or needs an unavailable extension.
 if((indexBytes===4&&!allowUint32)||unique*stride*4+count*indexBytes>=data.byteLength)return {vertices:data};
 const vertices=new Float32Array(unique*stride),packed=new Uint32Array(vertices.buffer);let next=0;
 for(let i=0;i<count;i++)if(indices[i]===next){for(let j=0;j<stride;j++)packed[next*stride+j]=words[i*stride+j];next++}
 return {vertices,indices:indexBytes===2?new Uint16Array(indices):indices};
}
let renderItems=[],batchedObjectCount=-1;const motionIds=new WeakMap();let nextMotionId=1;
function rebuildRenderBatches(){
 // Preview images arrive after the geometry. Appending their individual quads
 // avoids uploading every unchanged static batch again for each loaded image.
 if(batchedObjectCount>=0&&objects.slice(batchedObjectCount).every(o=>o.controlHit||o.standIndex!==undefined||o.texture)){
  renderItems.push(...objects.slice(batchedObjectCount));batchedObjectCount=objects.length;canvas.dataset.sourceDraws=objects.length;canvas.dataset.renderDraws=renderItems.length;return;
 }
 if(vertexArrays)vertexArrays.bindVertexArrayOES(null);
 for(const o of renderItems)if(o.batched){gl.deleteBuffer(o.buffer);if(o.indexBuffer)gl.deleteBuffer(o.indexBuffer);if(o.vertexArray)vertexArrays.deleteVertexArrayOES(o.vertexArray)}
 const groups=new Map(),individual=[];
 for(const o of objects){
  // Selectable faces and difficulty bodies can change material at runtime.
  if(o.controlHit||o.standIndex!==undefined||o.texture){individual.push(o);continue}
  let id=0;if(o.motion){if(!motionIds.has(o.motion))motionIds.set(o.motion,nextMotionId++);id=motionIds.get(o.motion)}
  const key=o.group+':'+id+':'+o.emission+':'+!!o.oneSided+':'+o.benchmarkVariant+':'+o.waterline;
  if(!groups.has(key))groups.set(key,{parts:[],group:o.group,motion:o.motion,emission:o.emission,waterline:o.waterline,oneSided:o.oneSided,benchmarkVariant:o.benchmarkVariant});groups.get(key).parts.push(o);
 }
 const batches=[];for(const group of groups.values()){
  const data=new Float32Array(group.parts.reduce((n,o)=>n+o.n*11,0));let offset=0;
  for(const o of group.parts)offset=writeRenderVertices(o.vertices,data,offset,o.color);
  // Tiny batches keep one buffer; their index allocation would save very little.
  const geometry=indexRenderVertices(data,uintIndices,300),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,geometry.vertices,gl.STATIC_DRAW);
  let indexBuffer=null,indexType=null;if(geometry.indices){indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geometry.indices,gl.STATIC_DRAW);indexType=geometry.indices.BYTES_PER_ELEMENT===2?gl.UNSIGNED_SHORT:gl.UNSIGNED_INT}
  batches.push({...group,bounds:combinedBounds(group.parts),parts:undefined,buffer,indexBuffer,indexType,n:data.length/11,batched:true,texture:null});
 }
 renderItems=[...batches,...individual];batchedObjectCount=objects.length;
 canvas.dataset.sourceDraws=objects.length;canvas.dataset.renderDraws=renderItems.length;
}
function bindRenderGeometry(object){
 // Individual faces upload on first use. Batched parts never allocate a second GPU copy.
 if(!object.buffer){const data=new Float32Array(object.n*8);writeRenderVertices(object.vertices,data);object.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,object.buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW)}
 if(vertexArrays&&object.vertexArray){vertexArrays.bindVertexArrayOES(object.vertexArray);return}
 if(vertexArrays){object.vertexArray=vertexArrays.createVertexArrayOES();vertexArrays.bindVertexArrayOES(object.vertexArray)}
 gl.bindBuffer(gl.ARRAY_BUFFER,object.buffer);if(object.indexBuffer)gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,object.indexBuffer);const stride=object.batched?44:32;
 if(vertexArrays){gl.enableVertexAttribArray(attrP);gl.enableVertexAttribArray(attrUV);gl.enableVertexAttribArray(attrNormal)}
 gl.vertexAttribPointer(attrP,3,gl.FLOAT,false,stride,0);gl.vertexAttribPointer(attrUV,2,gl.FLOAT,false,stride,12);gl.vertexAttribPointer(attrNormal,3,gl.FLOAT,false,stride,20);
 if(object.batched){gl.enableVertexAttribArray(attrTint);gl.vertexAttribPointer(attrTint,3,gl.FLOAT,false,44,32)}else gl.disableVertexAttribArray(attrTint);
}
function renderScene(){
 if(batchedObjectCount!==objects.length)rebuildRenderBatches();
 const projection=camera(),frustum=viewFrustum(projection),index=getSceneIndex(),visibleGroups=new Set();
 for(const bucket of index.buckets.values())if(!bucket.worldBounds||boundsInView(bucket.worldBounds,identity,frustum))visibleGroups.add(bucket.group);
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(mat,false,projection);gl.uniform1f(power,lighting?1.:.15);if(lightLayoutRevision!==layoutRevision){gl.uniform3fv(lightPositionLocation,new Float32Array(standGroups.flatMap(g=>[g.position[0]+g.light[0],g.position[1]+g.light[1],g.position[2]+g.light[2]])));lightLayoutRevision=layoutRevision}
 if(!vertexArrays){gl.enableVertexAttribArray(attrP);gl.enableVertexAttribArray(attrUV);gl.enableVertexAttribArray(attrNormal)}
 const models=new Map();let previousModel=null,previousEmission=null,previousTextured=null,previousTexture=null,previousCull=null,previousWaterline=null;
 for(const o of renderItems){
  if(!visibleGroups.has(o.group)||!benchmarkVisible(o))continue;
  const model=objectMatrix(o,animTime,models);if(!boundsInView(o.bounds,model,frustum))continue;
  if(previousModel!==model){gl.uniformMatrix4fv(modelLoc,false,model);previousModel=model}
  bindRenderGeometry(o);if(!o.batched)gl.vertexAttrib3fv(attrTint,o.color);
  const level=o.waterline==null?-10000:o.waterline+standOffset(o.group)[1];if(previousWaterline!==level){gl.uniform1f(clipBelowY,level);previousWaterline=level}
  if(previousEmission!==o.emission){gl.uniform1f(emit,o.emission);previousEmission=o.emission}
  const textured=!!o.texture;if(previousTextured!==textured){gl.uniform1f(windowTexturedLocation,textured?1:0);previousTextured=textured}
  if(textured&&previousTexture!==o.texture){gl.bindTexture(gl.TEXTURE_2D,o.texture);previousTexture=o.texture}
  const cull=!!o.oneSided;if(previousCull!==cull){if(cull){gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK)}else gl.disable(gl.CULL_FACE);previousCull=cull}
  if(o.indexBuffer)gl.drawElements(gl.TRIANGLES,o.n,o.indexType,0);else gl.drawArrays(gl.TRIANGLES,0,o.n);
 }
 if(vertexArrays)vertexArrays.bindVertexArrayOES(null);
}


updateWorldCursor=t=>{if(!hoverPosition||t-hoverStamp<80)return;hoverStamp=t;canvas.style.cursor=drag||pinch||pointers.size?'grabbing':pickWorldControl(...hoverPosition,false)?'pointer':''};
function actualRenderStatus(baseWidth,baseHeight,scale,actualWidth,actualHeight){const targetWidth=Math.max(1,Math.round(baseWidth*scale/100)),targetHeight=Math.max(1,Math.round(baseHeight*scale/100));return {limited:actualWidth<targetWidth||actualHeight<targetHeight,effective:Number((100*Math.min(actualWidth/baseWidth,actualHeight/baseHeight)).toFixed(1))}}
const visitorMarker=document.getElementById('visitor'),visitorView={},locationView={};
function updateVisitorMarker(){
 if(mapContent.hidden)return;
 if(visitorView.x!==eye[0]||visitorView.z!==eye[2]){const point=mapPoint(eye[0],eye[2]);if(visitorView.x!==eye[0])visitorMarker.style.left=point[0]+'%';if(visitorView.z!==eye[2])visitorMarker.style.top=point[1]+'%';visitorView.x=eye[0];visitorView.z=eye[2]}
 if(visitorView.yaw!==yaw){visitorMarker.style.transform='translate(-50%,-50%) rotate('+(-yaw*180/Math.PI)+'deg)';visitorView.yaw=yaw}
}
refreshVisitor=updateVisitorMarker;
function updateLocationLabel(){
 if(locationView.x===eye[0]&&locationView.z===eye[2]&&locationView.revision===layoutRevision)return;
 locationView.x=eye[0];locationView.z=eye[2];locationView.revision=layoutRevision;
 let near=-1,dist=6.5;stands.forEach((s,i)=>{const d=Math.hypot(s[0]-eye[0],s[2]+3-eye[2]);if(d<dist){near=i;dist=d}});
 const text='X '+eye[0].toFixed(1)+' · Z '+eye[2].toFixed(1)+' / '+(near<0?'ПРОГУЛКА':'СТЕНД '+String(near+1).padStart(2,'0'));if(loc.textContent!==text)loc.textContent=text;
}
const resolutionLabel=document.getElementById('render-resolution'),limitLabel=document.getElementById('render-limit'),renderSize={dirty:true};
function invalidateRenderSize(){renderSize.dirty=true}
const canvasSizeObserver=new ResizeObserver(invalidateRenderSize);canvasSizeObserver.observe(canvas);window.addEventListener('resize',invalidateRenderSize);
function updateRenderSize(){
 const dpr=Math.min(devicePixelRatio,1.5);
 if(!renderSize.dirty&&renderSize.dpr===dpr&&renderSize.scale===renderScale)return;
 if(renderSize.dirty){renderSize.width=canvas.clientWidth;renderSize.height=canvas.clientHeight;renderSize.dirty=false}
 renderSize.dpr=dpr;renderSize.scale=renderScale;
 const baseWidth=renderSize.width*dpr,baseHeight=renderSize.height*dpr,requested=renderScale/100,limit=Math.min(1,renderLimit/Math.max(baseWidth*requested,baseHeight*requested)),w=Math.max(1,Math.round(baseWidth*requested*limit)),h=Math.max(1,Math.round(baseHeight*requested*limit));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
 const resolution=gl.drawingBufferWidth+'×'+gl.drawingBufferHeight;if(resolutionLabel.textContent!==resolution)resolutionLabel.textContent=resolution;
 const status=actualRenderStatus(baseWidth,baseHeight,renderScale,gl.drawingBufferWidth,gl.drawingBufferHeight);if(limitLabel.hidden!==!status.limited)limitLabel.hidden=!status.limited;
 if(status.limited){const message='· предел '+status.effective+'%';if(limitLabel.textContent!==message)limitLabel.textContent=message}
}
function frame(t){const dt=Math.min((t-last)/1000,.04);last=t;if(!document.hidden){recordFps(t);updateWorldCursor(t);zoom+=(zoomTarget-zoom)*(1-Math.exp(-dt*12));if(animated)animTime+=dt;if(travel?.speed)pitch*=Math.exp(-dt*8);updateDemo(dt);if(travel?.kind==='walk'){let remaining=0,previous=[eye[0],eye[2]];for(let i=travel.index;i<travel.route.length;i++){remaining+=Math.hypot(travel.route[i][0]-previous[0],travel.route[i][1]-previous[1]);previous=travel.route[i]}let look=[eye[0],eye[2]],ahead=.6;for(let i=travel.index;i<travel.route.length;i++){const p=travel.route[i],d=Math.hypot(p[0]-look[0],p[1]-look[1]);if(d>=ahead){look=[look[0]+(p[0]-look[0])*ahead/(d||1),look[1]+(p[1]-look[1])*ahead/(d||1)];break}ahead-=d;look=p}const desired=Math.atan2(look[0]-eye[0],-(look[1]-eye[2])),delta=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));if(remaining>.16)yaw+=delta*(1-Math.exp(-dt*8));let advance=(demo.active?3:(travel.speed||6))*Math.max(.2,Math.cos(delta))*Math.min(1,Math.max(.12,remaining/.6))*dt;while(travel&&advance>0&&travel.index<travel.route.length){const point=travel.route[travel.index],dx=point[0]-eye[0],dz=point[1]-eye[2],distance=Math.hypot(dx,dz);if(distance<.001){travel.index++;continue}const step=Math.min(distance,advance),x=eye[0]+dx/distance*step,z=eye[2]+dz/distance*step;if(blocked(x,z)){cancelWalk();hint('Проход занят. Выберите другую точку.');break}eye[0]=x;eye[2]=z;advance-=step;if(step>=distance-.00001)travel.index++;else break}if(travel&&travel.index>=travel.route.length){const i=travel.faceIndex;destination=null;if(i>=0&&frontZoneFor(eye[0],eye[2])===i){const angle=Math.atan2(stands[i][0]-eye[0],eye[2]-stands[i][2]),delta=Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw));travel={kind:'face',fromYaw:yaw,toYaw:yaw+delta,elapsed:0,duration:demo.active?Math.max(.7,Math.min(1.8,Math.abs(delta)/1.2)):Math.max(.25,Math.min(.75,Math.abs(delta)/2.5))};hint('Поворачиваемся к витрине')}else{travel=null;hint('')}}}else if(travel?.kind==='face'){travel.elapsed+=dt;const p=Math.min(1,travel.elapsed/travel.duration),s=p*p*(3-2*p);yaw=travel.fromYaw+(travel.toYaw-travel.fromYaw)*s;if(p===1){travel=null;hint('')}}else if(travel){travel.elapsed+=dt;const p=Math.min(1,travel.elapsed/travel.duration),s=p*p*(3-2*p);eye=travel.from.map((v,i)=>v+(travel.to[i]-v)*s);yaw=travel.yaw*(1-s);pitch=travel.pitch*(1-s);if(p===1)travel=null}updateVisitorMarker();yaw+=stickX*dt*1.8;if(keys.has('ArrowLeft')||keys.has('KeyA'))yaw-=dt*1.6;if(keys.has('ArrowRight')||keys.has('KeyD'))yaw+=dt*1.6;let forward=stickY+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=0;const len=Math.max(1,Math.hypot(forward,side));forward/=len;side/=len;const nx=Math.max(walkBounds.left,Math.min(walkBounds.right,eye[0]+(Math.sin(yaw)*forward+Math.cos(yaw)*side)*dt*3.8)),nz=Math.max(walkBounds.back,Math.min(walkBounds.front,eye[2]+(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*dt*3.8));if(!travel){if(!blocked(nx,eye[2]))eye[0]=nx;if(!blocked(eye[0],nz))eye[2]=nz;}updateLocationLabel();updateRenderSize();renderScene();window.PAVILION_LOADING?.frameRendered();}requestAnimationFrame(frame)}
function auditPlatformBounds(){let violations=0;const examples=[];for(let k=0;k<=48;k++){const t=k*1.37,models=new Map();for(const o of objects){if(!benchmarkVisible(o)||o.platform<0||o.allowPlatformOverflow)continue;const base=stands[o.platform],m=objectMatrix(o,t,models),b=o.bounds,c=b.center,e=b.extent;for(const axis of [0,2]){const center=m[axis]*c[0]+m[axis+4]*c[1]+m[axis+8]*c[2]+m[axis+12],radius=Math.abs(m[axis])*e[0]+Math.abs(m[axis+4])*e[1]+Math.abs(m[axis+8])*e[2],lo=axis===0?base[0]-3.1:base[2]-1.75,hi=axis===0?base[0]+3.1:base[2]+3.75;if(center-radius<lo-.002||center+radius>hi+.002){violations++;if(examples.length<4)examples.push({zone:o.platform,axis,min:center-radius,max:center+radius,lo,hi})}}}}canvas.dataset.platformOverflows=violations;if(violations)console.warn('Platform bounds',examples);return {violations,examples}}
auditStandBounds=()=>document.getElementById('developer-toggle').getAttribute('aria-pressed')==='true'?auditPlatformBounds():null;standMoveHooks=()=>{cancelWalk();stopStick();keys.clear();keepSafeDistance();hoverStamp=0;auditStandBounds();savePavilionState()};canvas.dataset.standGroups=standGroups.map(g=>g.id+':'+g.children.length).join(',');
// Model construction overlaps driver compilation; neither blocks image downloads.
await Promise.all([difficultyFacesReady,waitForShaderProgram(gl,pr,programShaders,parallelCompile)]);
initializeShaderProgram();
controlTextures.filter(entry=>entry.kind==='actions').forEach(drawControlTexture);
games.forEach((g,i)=>refreshStandControls(i));
restorePavilionState();keepSafeDistance();window.PAVILION_LOADING?.sceneInitialized();requestAnimationFrame(frame);
}

} catch(error) { window.PAVILION_LOADING?.fail(); console.error(error); }
})();
