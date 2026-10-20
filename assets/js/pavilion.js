const games=window.GAMES_CATALOG.games.filter(g=>g.available),canvas=document.getElementById('scene'),jump=document.getElementById('jump'),loc=document.getElementById('location');
const travelPanel=document.querySelector('.travel'),zoomHint=document.getElementById('zoom-level'),mapPanel=document.querySelector('.minimap');travelPanel.append(zoomHint);
function positionMapBelowControls(){mapPanel.style.top=Math.ceil(travelPanel.getBoundingClientRect().bottom+8)+'px'}
const controlsObserver=new ResizeObserver(positionMapBelowControls);controlsObserver.observe(travelPanel);controlsObserver.observe(document.querySelector('.hud'));window.addEventListener('resize',positionMapBelowControls);positionMapBelowControls();
// Stand-group layout begin. Edit only standLayout to rearrange the exhibition.
const standAnchors=[[-4,0,-3],[4,0,-3],[-4,0,-12],[4,0,-12]];
const standLayout={'snake3d-turns':[-4,0,-3],'tictac':[4,0,-3],'tictac-robots':[-4,0,-12],'8march-shariki':[4,0,-12]};
const standGroups=games.map((game,i)=>{const anchor=[...standAnchors[i]],position=[...(standLayout[game.id]||anchor)];return {id:game.id,anchor,position,offset:position.map((v,j)=>v-anchor[j]),children:[],obstacles:[],bounds:{left:-3.1,right:3.1,back:-1.75,front:3.75},light:[0,4.7,2]}});
let activeStandGroup=-1,layoutRevision=0,standMoveHooks=()=>{};
const noStandOffset=[0,0,0];
function standOffset(i){return standGroups[i]?.offset||noStandOffset}
function withStandGroup(i,build){const previous=activeStandGroup;activeStandGroup=i;try{return build()}finally{activeStandGroup=previous}}
function standSourcePoint(i,point){const delta=standOffset(i);return point.map((v,j)=>v-delta[j])}
function updateStandMap(){document.querySelectorAll('.map-floor [data-zone]').forEach(button=>{const i=Number(button.dataset.zone);if(button.dataset.zone==='home'||!standGroups[i])return;const pos=standGroups[i].position;button.style.left='calc('+((pos[0]+10)/20*100)+'% - '+button.offsetWidth/2+'px)';button.style.top='calc('+((pos[2]+1+20)/28*100)+'% - '+button.offsetHeight/2+'px)';button.style.right='auto';button.style.bottom='auto'})}
function setStandPosition(id,x,z){const group=standGroups.find(g=>g.id===id);if(!group)throw Error('Неизвестный стенд: '+id);if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Координаты должны быть числами');const b=group.bounds;if(x+b.left< -9.85||x+b.right>9.85||z+b.back< -20.85||z+b.front>9.85)throw Error('Стенд выходит за пределы зала');for(const other of standGroups){if(other===group)continue;const q=other.bounds;if(x+b.left<other.position[0]+q.right+.15&&x+b.right>other.position[0]+q.left-.15&&z+b.back<other.position[2]+q.front+.15&&z+b.front>other.position[2]+q.back-.15)throw Error('Площадки стендов пересекаются')}
 group.position[0]=x;group.position[2]=z;group.offset[0]=x-group.anchor[0];group.offset[2]=z-group.anchor[2];layoutRevision++;updateStandMap();standMoveHooks();return {id:group.id,position:[...group.position]};}
updateStandMap();window.addEventListener('resize',updateStandMap);
window.PAVILION_LAYOUT=Object.freeze({moveStand:setStandPosition,getStands:()=>standGroups.map(g=>({id:g.id,position:[...g.position],objects:g.children.length,obstacles:g.obstacles.length}))});
// Stand-group layout end.
const stands=standGroups.map(group=>group.position),keys=new Set();let eye=[0,1.7,6],yaw=0,pitch=0,selected=-1,last=0,drag=null,travel=null,sensitivity=4;let stickX=0,stickY=0,destination=null,zoom=1,zoomTarget=1,sideIndex=0,renderScale=100;const renderScales=[100,75,50,25,10,1000,500,200],fpsTimes=[];let lastFpsLabel=0;function setRenderScale(scale){renderScale=renderScales.includes(scale)?scale:100;document.getElementById('render-percent').textContent=renderScale+'%';document.getElementById('render-quality').setAttribute('aria-label','Разрешение 3D '+renderScale+' процентов. Переключить режим');fpsTimes.length=0;lastFpsLabel=0;document.getElementById('render-fps').textContent='—fps'}document.getElementById('render-quality').onclick=()=>setRenderScale(renderScales[(renderScales.indexOf(renderScale)+1)%renderScales.length]);function recordFps(t){fpsTimes.push(t);while(fpsTimes.length>2&&fpsTimes[0]<t-5000)fpsTimes.shift();if(t-lastFpsLabel>=250&&fpsTimes.length>1){const elapsed=t-fpsTimes[0];document.getElementById('render-fps').textContent=(elapsed>0?Math.round((fpsTimes.length-1)*1000/elapsed):0)+'fps';lastFpsLabel=t}}document.addEventListener('visibilitychange',()=>{fpsTimes.length=0;lastFpsLabel=0});function setZoom(value){zoomTarget=Math.max(1,Math.min(2,value));document.getElementById('zoom-level').textContent='Масштаб ×'+Number(zoomTarget.toFixed(2))+' · колесо / два пальца'};canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoomTarget+(e.deltaY<0?.1:-.1))},{passive:false});const walkHint=document.getElementById('walkhint');function hint(text){walkHint.hidden=!text;walkHint.textContent=text}function cancelWalk(){travel=null;destination=null;hint('')}function stopStick(){stickX=stickY=0;document.getElementById('stick').style.transform='';document.getElementById('joystick').classList.remove('active')}const reduced=matchMedia('(prefers-reduced-motion: reduce)');document.getElementById('sensitivity').oninput=e=>sensitivity=Number(e.target.value);document.getElementById('panel-toggle').onclick=e=>{const open=document.querySelector('.panel').classList.toggle('expanded');e.target.setAttribute('aria-expanded',open);e.target.textContent=open?'Свернуть':'Подробнее'};document.getElementById('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{document.getElementById('fullscreen').textContent='Откройте отдельно ↗'}};document.addEventListener('fullscreenchange',()=>document.getElementById('fullscreen').textContent=document.fullscreenElement?'Обычный экран':'На весь экран');
games.forEach((g,i)=>{const o=document.createElement('option');o.value=i;o.textContent=g.title;jump.append(o)});
const info=document.getElementById('game-info'),difficultyLinks=games.map(g=>g.link),screenPanels=[],podiumPanels=[];function openInfo(i){cancelWalk();stopStick();keys.clear();savePavilionState();const g=games[i];location.href=g.detailsUrl?g.detailsUrl:'game-info.html?id='+encodeURIComponent(g.id)}document.getElementById('info-close').onclick=()=>info.close();info.addEventListener('click',e=>{if(e.target===info){const r=info.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)info.close()}});
// Original vector faces, shared by scene textures and accessible HTML controls.
const difficultyArt={
 easy:'<path d="M-17-5Q-11-12-5-5M5-5Q11-12 17-5M-12 9Q0 23 12 9" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="-19" cy="7" rx="4" ry="2.5" fill="#f2a44c"/><ellipse cx="19" cy="7" rx="4" ry="2.5" fill="#f2a44c"/>',
 normal:'<path d="M-17-13H-6M6-13H17" fill="none" stroke="#754a22" stroke-width="3" stroke-linecap="round"/><ellipse cx="-11" cy="-4" rx="3" ry="4.5" fill="#54391c"/><ellipse cx="11" cy="-4" rx="3" ry="4.5" fill="#54391c"/><path d="M-10 13Q0 15 10 13" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/>',
 hard:'<path d="M-19-15L-6-10M6-10L19-15" fill="none" stroke="#54391c" stroke-width="4" stroke-linecap="round"/><ellipse cx="-11" cy="-3" rx="3" ry="4" fill="#54391c"/><ellipse cx="11" cy="-3" rx="3" ry="4" fill="#54391c"/><path d="M-12 16Q0 1 12 16Z" fill="#74422c"/><path d="M-7 13Q0 8 7 13" fill="none" stroke="#fff4d3" stroke-width="2.5" stroke-linecap="round"/><path d="M23-20Q14-8 23-7Q32-8 23-20" fill="#66cbe4"/>',
 expert:'<path d="M-24-9H24" stroke="#182f41" stroke-width="4" stroke-linecap="round"/><path d="M-21-10H-3V-1Q-4 7-12 7Q-21 7-21-1ZM3-10H21V-1Q21 7 12 7Q4 7 3-1Z" fill="#18354d" stroke="#102839" stroke-width="2"/><path d="M-3-5Q0-8 3-5" fill="none" stroke="#102839" stroke-width="3"/><path d="M-17-6H-10M7-6H14" stroke="#6fb8d7" stroke-width="2" stroke-linecap="round"/><path d="M-11 14Q1 23 14 10" fill="none" stroke="#54391c" stroke-width="3.5" stroke-linecap="round"/>'
};
function difficultyKind(link){const mode=new URL(link,document.baseURI).searchParams.get('diff');return mode==='simple'||mode==='easy'?'easy':Object.hasOwn(difficultyArt,mode)?mode:'normal'}
function difficultyFaceSource(kind){return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-34 -34 68 68"><defs><radialGradient id="skin" cx="35%" cy="25%" r="80%"><stop stop-color="#fff39a"/><stop offset=".6" stop-color="#ffda55"/><stop offset="1" stop-color="#f1a92e"/></radialGradient></defs><circle r="29" fill="url(#skin)" stroke="#d8952b" stroke-width="1.5"/>'+difficultyArt[kind]+'</svg>')}
const difficultyFaceImages={};
for(const kind of Object.keys(difficultyArt)){const image=new Image();image.onload=()=>games.forEach((_,i)=>refreshStandControls(i));image.src=difficultyFaceSource(kind);difficultyFaceImages[kind]=image}
function difficultySymbol(link){const image=document.createElement('img');image.src=difficultyFaceSource(difficultyKind(link));image.alt='';image.width=28;image.height=28;return image}
function difficultyButtons(i,container){const g=games[i];if(!g.difficulties)return;const group=document.createElement('div');group.className='difficulty-buttons';group.setAttribute('aria-label','Сложность — '+g.title);Object.values(g.difficulties).forEach(d=>{const b=document.createElement('button');b.type='button';b.dataset.difficulty=d.link;b.append(difficultySymbol(d.link));b.title=d.label;b.setAttribute('aria-label',g.title+' — '+d.label);b.setAttribute('aria-pressed',d.link===difficultyLinks[i]);b.onclick=()=>setDifficulty(i,d.link);group.append(b)});container.append(group)}
let refreshStandControls=()=>{};
function setDifficulty(i,link){difficultyLinks[i]=link;document.querySelectorAll('[data-panel-game="'+i+'"]').forEach(p=>{p.querySelectorAll('[data-difficulty]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.difficulty===link));const a=p.querySelector('.play');if(a)a.href=link});refreshStandControls(i)}
games.forEach((g,i)=>{const panel=document.createElement('section');panel.className='screen-panel';panel.dataset.panelGame=i;panel.setAttribute('aria-label','Экран — '+g.title);const title=document.createElement('h3');title.textContent=g.title;panel.append(title);difficultyButtons(i,panel);const actions=document.createElement('div');actions.className='screen-actions';const play=document.createElement('a');play.className='play';play.href=difficultyLinks[i];play.target='_self';play.textContent='▶ Играть';play.setAttribute('aria-label','Играть — '+g.title);const details=document.createElement('button');details.textContent='ⓘ Информация';details.setAttribute('aria-label','Информация — '+g.title);details.onclick=()=>openInfo(i);for(const button of [play,details]){const caption=document.createElement('span');caption.className='button-caption';caption.textContent=button.textContent;button.replaceChildren(caption)}actions.append(play,details);const podium=document.createElement('section');podium.className='podium-controls';podium.dataset.panelGame=i;podium.setAttribute('aria-label','Кнопки перед телевизором — '+g.title);podium.append(actions);document.getElementById('screen-controls').append(panel,podium);screenPanels.push(panel);podiumPanels.push(podium);panel.querySelectorAll('[data-difficulty]').forEach(b=>{const d=Object.values(g.difficulties).find(d=>d.link===b.dataset.difficulty);b.replaceChildren(difficultySymbol(d.link))})});

function show(i){if(selected===i)return;selected=i;const a=document.getElementById('actions');a.replaceChildren();a.dataset.panelGame=i;if(i<0){document.getElementById('category').textContent='КОЛЛЕКЦИЯ / 4 ИГРЫ';document.getElementById('title').textContent='Исследуйте павильон';document.getElementById('description').textContent='Запуск и информация — на кнопках перед телевизором. Сложность — кружками на экране.';return}const g=games[i];document.getElementById('category').textContent=g.section==='holidays'?'ПРАЗДНИЧНЫЕ ИГРЫ':'ГОЛОВОЛОМКИ И ИГРЫ';document.getElementById('title').textContent=g.title;document.getElementById('description').textContent=g.description;difficultyButtons(i,a);const play=document.createElement('a');play.className='play';play.textContent='Играть ↗';play.href=difficultyLinks[i];play.target='_self';a.append(play);if(g.detailsUrl){const story=document.createElement('a');story.className='story';story.textContent='История создания ↗';story.href=g.detailsUrl;story.target='_blank';story.rel='noopener';a.append(story)}}

function savePavilionState(){try{const state={eye:[...eye],yaw,pitch,zoom,zoomTarget,sensitivity,renderScale,difficultyLinks:[...difficultyLinks],jump:jump.value,expanded:document.querySelector('.panel').classList.contains('expanded'),lighting:document.getElementById('lighting').getAttribute('aria-pressed')==='true',animated:document.getElementById('animate').getAttribute('aria-pressed')==='true'};history.replaceState({...history.state,pavilion:state},'')}catch{}}
function restorePavilionState(){const s=history.state?.pavilion;if(!s||!Array.isArray(s.eye)||s.eye.length!==3||!s.eye.every(Number.isFinite))return;keys.clear();stopStick();cancelWalk();eye=[Math.max(-9,Math.min(9,s.eye[0])),1.7,Math.max(-19,Math.min(8,s.eye[2]))];yaw=Number.isFinite(s.yaw)?s.yaw:0;pitch=Number.isFinite(s.pitch)?Math.max(-1.5,Math.min(1.5,s.pitch)):0;zoom=zoomTarget=Number.isFinite(s.zoomTarget)?Math.max(1,Math.min(2,s.zoomTarget)):1;setZoom(zoomTarget);setRenderScale(s.renderScale);if(Number.isFinite(s.sensitivity)){sensitivity=s.sensitivity;document.getElementById('sensitivity').value=sensitivity}if(Array.isArray(s.difficultyLinks))s.difficultyLinks.forEach((link,i)=>{const g=games[i];if(g&&(link===g.link||Object.values(g.difficulties||{}).some(d=>d.link===link)))setDifficulty(i,link)});const panel=document.querySelector('.panel');panel.classList.toggle('expanded',!!s.expanded);const b=document.getElementById('panel-toggle');b.textContent=s.expanded?'Свернуть':'Подробнее';b.setAttribute('aria-expanded',!!s.expanded);if(document.getElementById('lighting').getAttribute('aria-pressed')!==String(s.lighting))document.getElementById('lighting').click();if(document.getElementById('animate').getAttribute('aria-pressed')!==String(s.animated))document.getElementById('animate').click();if([...jump.options].some(o=>o.value===s.jump))jump.value=s.jump;selected=-2;keepSafeDistance()}
document.addEventListener('click',e=>{const a=e.target.closest('a.play');if(a){cancelWalk();stopStick();keys.clear();savePavilionState()}},true);window.addEventListener('pagehide',savePavilionState);window.addEventListener('pageshow',e=>{if(e.persisted){restorePavilionState();last=0}});

function go(value){cancelWalk();stopStick();keys.clear();const home=value==='home',i=Number(value);if(!home&&(!Number.isInteger(i)||!stands[i]))return;const target=home?[0,1.7,6]:[stands[i][0],1.7,stands[i][2]+5.8];if(reduced.matches){eye=target;yaw=0;pitch=0;show(home?-1:i)}else{const normalized=Math.atan2(Math.sin(yaw),Math.cos(yaw));travel={from:[...eye],to:target,yaw:normalized,pitch,elapsed:0,duration:.85};yaw=normalized}jump.value=value;canvas.focus({preventScroll:true})}jump.onchange=()=>go(jump.value);document.getElementById('reset').onclick=()=>go('home');document.querySelectorAll('[data-zone]').forEach(b=>b.onclick=()=>go(b.dataset.zone));

canvas.onkeydown=e=>{if(e.code==='KeyR'){e.preventDefault();go('home');return}if(e.code==='Escape'){cancelWalk();return}if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){cancelWalk();keys.add(e.code);e.preventDefault()}};window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());canvas.onblur=()=>keys.clear();
const joystick=document.getElementById('joystick');function updateStick(e){const r=joystick.getBoundingClientRect(),radius=r.width*.30,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.max(radius,Math.hypot(dx,dy));stickX=dx/len;stickY=-dy/len;if(Math.hypot(stickX,stickY)<.12)stickX=stickY=0;document.getElementById('stick').style.transform='translate('+stickX*radius+'px,'+(-stickY*radius)+'px)'}joystick.onpointerdown=e=>{e.preventDefault();cancelWalk();keys.clear();joystick.setPointerCapture(e.pointerId);joystick.classList.add('active');updateStick(e)};joystick.onpointermove=e=>{if(joystick.hasPointerCapture(e.pointerId))updateStick(e)};joystick.onpointerup=joystick.onpointercancel=joystick.onlostpointercapture=stopStick;joystick.onkeydown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();cancelWalk();keys.add(e.code)}};joystick.onkeyup=e=>keys.delete(e.code);joystick.onblur=()=>{keys.clear();stopStick()};window.addEventListener('blur',stopStick);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelWalk();stopStick()}});

let hoverPosition=null,hoverStamp=0,updateWorldCursor=()=>{};
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen')hoverPosition=[e.clientX,e.clientY]});
canvas.addEventListener('pointerleave',()=>{hoverPosition=null;canvas.style.cursor=''});
window.addEventListener('blur',()=>{hoverPosition=null;canvas.style.cursor=''});
const pointers=new Map();let pinch=null;function beginPinch(){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:zoomTarget};drag=null}canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{if(e.button!==0)return;cancelWalk();canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){beginPinch();return}drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false}};canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){if(!pinch)beginPinch();const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch.distance>0)setZoom(pinch.zoom*distance/pinch.distance);return}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8;const r=canvas.getBoundingClientRect(),aspect=r.width/r.height,f=(Math.min(1/Math.tan(Math.PI/6),aspect*1.25)*zoom),perPixel=2/(r.height*f),scale=sensitivity/2;yaw+=dx*perPixel*scale;pitch=Math.max(-1.5,Math.min(1.5,pitch-dy*perPixel*scale));drag.x=e.clientX;drag.y=e.clientY};canvas.onpointerup=e=>{if(e.button!==0||!pointers.has(e.pointerId))return;const click=!pinch&&drag&&!drag.moved;pointers.delete(e.pointerId);if(pinch){if(pointers.size<2){pinch=null;const p=[...pointers.values()][0];drag=p?{x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true}:null}return}drag=null;if(click&&typeof pickStand==='function')pickStand(e.clientX,e.clientY)};function cancelPointer(e){pointers.delete(e.pointerId);pinch=null;drag=null}canvas.onpointercancel=canvas.onlostpointercapture=cancelPointer;window.addEventListener('blur',()=>{pointers.clear();pinch=null;drag=null});

const gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){document.getElementById('error').hidden=false}else{const renderLimit=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0],gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1]);
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
let lighting=true;document.getElementById('lighting').onclick=e=>{lighting=!lighting;e.target.textContent=lighting?'Свет: включён':'Свет: приглушён';e.target.setAttribute('aria-pressed',lighting)};const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,'attribute vec3 p;attribute vec2 uv;attribute vec3 normal;attribute vec3 tint;varying vec3 shade;uniform mat4 m;uniform mat4 model;varying vec2 t;varying vec3 world;varying vec3 norm;varying float depth;void main(){vec4 wp=model*vec4(p,1.);gl_Position=m*wp;shade=tint;t=uv;world=wp.xyz;norm=mat3(model)*normal;depth=gl_Position.w;}'));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 shade;uniform vec3 lightPositions[4];uniform sampler2D tex;uniform float textured;uniform float power;uniform float emission;varying vec2 t;varying vec3 world;varying vec3 norm;varying float depth;vec3 lamp(vec3 pos,vec3 tint){vec3 d=pos-world;float len=length(d);return tint*max(dot(normalize(norm),normalize(d)),0.)*5.0/(1.+.16*len*len);}void main(){vec4 pixel=vec4(1.);if(textured>.5)pixel=texture2D(tex,t);if(textured>.5&&pixel.a<.1)discard;vec3 c=mix(shade,pixel.rgb,textured);vec3 light=vec3(.36)+vec3(.18)*max(dot(normalize(norm),normalize(vec3(.3,1.,.4))),0.);light+=power*(lamp(lightPositions[0],vec3(.75,1.,.65))+lamp(lightPositions[1],vec3(1.,.72,.38))+lamp(lightPositions[2],vec3(.42,.78,1.))+lamp(lightPositions[3],vec3(1.,.48,.75)));c*=mix(light,vec3(1.15),max(emission,textured*.78));float fog=clamp((depth-12.)/44.,0.,.6);gl_FragColor=vec4(mix(c,vec3(.045,.08,.12),fog),1.);}'));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(pr));gl.useProgram(pr);
const attrP=gl.getAttribLocation(pr,'p'),attrUV=gl.getAttribLocation(pr,'uv'),mat=gl.getUniformLocation(pr,'m'),col=gl.getUniformLocation(pr,'color'),textured=gl.getUniformLocation(pr,'textured');const modelLoc=gl.getUniformLocation(pr,'model');const lightPositionLocation=gl.getUniformLocation(pr,'lightPositions[0]');let lightLayoutRevision=-1;const attrTint=gl.getAttribLocation(pr,'tint');const attrNormal=gl.getAttribLocation(pr,'normal'),power=gl.getUniformLocation(pr,'power'),emit=gl.getUniformLocation(pr,'emission');gl.enable(gl.DEPTH_TEST);gl.clearColor(.035,.075,.105,1);
function mul(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r}
function camera(){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),r=[cy,0,sy],u=[-sy*sp,cp,cy*sp],b=[-sy*cp,-sp,cy*cp],dot=v=>v[0]*eye[0]+v[1]*eye[1]+v[2]*eye[2];const view=[r[0],u[0],b[0],0,r[1],u[1],b[1],0,r[2],u[2],b[2],0,-dot(r),-dot(u),-dot(b),1];const aspect=canvas.width/canvas.height,f=(Math.min(1/Math.tan(Math.PI/6),aspect*1.25)*zoom);return mul([f/aspect,0,0,0,0,f,0,0,0,0,-1.002,-1,0,0,-.2002,0],view)}
let emissive=0,motion=null;const identity=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);let animTime=0,animated=!matchMedia('(prefers-reduced-motion: reduce)').matches;const animButton=document.getElementById('animate');function animLabel(){animButton.textContent=animated?'Анимация: включена':'Анимация: пауза';animButton.setAttribute('aria-pressed',animated)}animLabel();animButton.onclick=()=>{animated=!animated;animLabel()};function transform(x,y,z,angle=0){const c=Math.cos(angle),s=Math.sin(angle);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,x,y,z,1])}function pivotZ(x,y,z,a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,x-c*x+s*y,y-s*x-c*y,0,1])}let activePlatform=-1;const objects=[];function pickStand(clientX,clientY){if(pickWorldControl(clientX,clientY))return;const r=canvas.getBoundingClientRect(),px=(clientX-r.left)/r.width*2-1,py=1-(clientY-r.top)/r.height*2,m=camera();let hit=-1,depth=Infinity;function project(x,y,z){const w=m[3]*x+m[7]*y+m[11]*z+m[15];return {x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w,y:(m[1]*x+m[5]*y+m[9]*z+m[13])/w,w}}stands.forEach(([x,y,z],i)=>{const points=[project(x-1.65,.3,z+.3),project(x+1.65,.3,z+.3),project(x+1.65,3.5,z+.3),project(x-1.65,3.5,z+.3)];if(points.some(p=>p.w<=.1)||eye[2]<z+.3)return;const inside=px>=Math.min(...points.map(p=>p.x))&&px<=Math.max(...points.map(p=>p.x))&&py>=Math.min(...points.map(p=>p.y))&&py<=Math.max(...points.map(p=>p.y));if(inside&&points[0].w<depth){hit=i;depth=points[0].w}});if(hit>=0){go(String(hit));return}pickFloor(clientX,clientY)}
function objectMatrix(object,time,cache=null){let model=identity;if(object.motion){if(cache){if(!cache.has(object.motion))cache.set(object.motion,object.motion(time));model=cache.get(object.motion)}else model=object.motion(time)}const delta=standOffset(object.group);if(!delta[0]&&!delta[1]&&!delta[2])return model;const result=new Float32Array(model);result[12]+=delta[0];result[13]+=delta[1];result[14]+=delta[2];return result}
function geometryBounds(v){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let k=0;k<v.length;k+=5)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],v[k+j]);hi[j]=Math.max(hi[j],v[k+j])}return {center:lo.map((n,j)=>(n+hi[j])/2),extent:lo.map((n,j)=>(hi[j]-n)/2)}}
function mesh(vertices,color,texture){const expanded=[];for(let i=0;i<vertices.length;i+=15){const a=vertices.slice(i,i+3),b=vertices.slice(i+5,i+8),c=vertices.slice(i+10,i+13),u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...n)||1;for(let k=0;k<3;k++)expanded.push(...vertices.slice(i+k*5,i+k*5+5),...n.map(v=>v/len))}const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(expanded),gl.STATIC_DRAW);const group=activeStandGroup>=0?activeStandGroup:activePlatform,item={buffer,vertices,expanded,group,platform:group,bounds:geometryBounds(vertices),n:expanded.length/8,color,texture,emission:emissive,motion};objects.push(item);if(group>=0)standGroups[group].children.push(item)}
function quad(a,b,c,d,color,texture){mesh([...a,0,0,...b,1,0,...c,1,1,...a,0,0,...c,1,1,...d,0,1],color,texture)}
function box(x,y,z,w,h,d,color){const a=x-w/2,b=x+w/2,c=y,dY=y+h,e=z-d/2,f=z+d/2;quad([a,c,f],[b,c,f],[b,dY,f],[a,dY,f],color);quad([b,c,e],[a,c,e],[a,dY,e],[b,dY,e],color.map(v=>v*.65));quad([a,c,e],[a,c,f],[a,dY,f],[a,dY,e],color.map(v=>v*.8));quad([b,c,f],[b,c,e],[b,dY,e],[b,dY,f],color.map(v=>v*.75));quad([a,dY,f],[b,dY,f],[b,dY,e],[a,dY,e],color.map(v=>Math.min(1,v*1.2)))}
function texture(image){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
function gameSign(title,subtitle,x,z){
 const q=document.createElement('canvas').getContext('2d');
 function wrap(text,font){q.font=font;const lines=[];let line='';for(const word of text.split(/\s+/)){const candidate=line?line+' '+word:word;if(line&&q.measureText(candidate).width>950){lines.push(line);line=word}else line=candidate}if(line)lines.push(line);return lines}
 const titleLines=wrap(title,'bold 62px Segoe UI'),subtitleLines=wrap(subtitle,'46px Segoe UI'),pixels=32+titleLines.length*76+4+subtitleLines.length*54;
 label(title,x,3.48,z+.25,3.25,pixels*3.25/1024,'#d0f5e4',subtitle,{titleLines,subtitleLines});
}
function label(text,x,y,z,w,h,color='#d0f5e4',subtitle='',layout=null){
// Solid sign housing, opaque back and illuminated edge, with a readable front face.
box(x,y-.035,z-.105,w+.10,h+.07,.19,[.11,.20,.25]);
box(x,y-.035,z+.002,w+.10,.025,.025,[.34,.64,.61]);
box(x,y+h+.01,z+.002,w+.10,.025,.025,[.34,.64,.61]);
box(x-w/2-.04,y-.01,z+.002,.025,h+.02,.025,[.34,.64,.61]);
box(x+w/2+.04,y-.01,z+.002,.025,h+.02,.025,[.34,.64,.61]);const c=document.createElement('canvas');c.width=1024;c.height=Math.max(1,Math.round(c.width*h/w));const q=c.getContext('2d');q.fillStyle='#102632';q.fillRect(0,0,c.width,c.height);q.textAlign='center';q.textBaseline='middle';
function line(value,cy,size,weight,tint){q.font=weight+' '+size+'px Segoe UI';const fitted=Math.min(size,size*(c.width-54)/Math.max(1,q.measureText(value).width));q.font=weight+' '+fitted+'px Segoe UI';q.fillStyle=tint;q.fillText(value,c.width/2,cy)}
if(layout){let cy=16+38;q.font='bold 62px Segoe UI';q.fillStyle=color;for(const value of layout.titleLines){q.fillText(value,512,cy);cy+=76}cy+=4-38+27;q.font='46px Segoe UI';q.fillStyle='#a9c9c7';for(const value of layout.subtitleLines){q.fillText(value,512,cy);cy+=54}}else{line(text,c.height*(subtitle?.33:.5),c.height*(subtitle?.38:.55),'bold',color);if(subtitle)line(subtitle,c.height*.70,c.height*.27,'normal','#a9c9c7')}quad([x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z],[1,1,1],texture(c));objects[objects.length-1].oneSided=true}
quad([-10,0,10],[10,0,10],[10,0,-21],[-10,0,-21],[.10,.17,.20]);for(let z=-20;z<=10;z+=2)box(0,.005,z,20,.012,.025,[.20,.32,.35]);for(let x=-10;x<=10;x+=2)box(x,.005,-5,.025,.012,30,[.20,.32,.35]);box(-10,0,-5,.25,6,30,[.12,.21,.26]);box(10,0,-5,.25,6,30,[.12,.21,.26]);box(0,0,-21,20,6,.25,[.10,.19,.24]);
for(let z=-19;z<8;z+=6){box(-9.5,0,z,.35,5,.35,[.28,.39,.43]);box(9.5,0,z,.35,5,.35,[.28,.39,.43]);box(0,5,z,19,.12,.16,[.42,.65,.65])}box(0,.02,-5,.07,.025,25,[.62,.87,.65]);
label('КОЛЛЕКЦИЯ / ИЛЬЯ БАРИЛО',0,4,-20.7,12,.9);
const zoneFloorColors=[[.20,.34,.20],[.39,.28,.16],[.14,.28,.37],[.35,.19,.32]];
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
standAnchors.forEach(([x,y,z],i)=>withStandGroup(i,()=>{const zone=zoneFloorColors[i];box(x,0,z,3.7,.3,1.7,zone);screenBezel(x,z,zone.map(v=>Math.min(1,v*1.5)),zone);gameSign(games[i].title,['САД ЧЕТЫРЁХ СЕЗОНОВ','ЛОГИКА / РИСК / ХОД','РОБОСКЛАД / СЕКТОР 03','ПРАЗДНИЧНЫЕ ПОЖЕЛАНИЯ'][i],x,z);const img=new Image();img.onload=()=>withStandGroup(i,()=>{const c=document.createElement('canvas');c.width=768;c.height=736;const q=c.getContext('2d');q.fillStyle='#10212b';q.fillRect(0,0,768,736);const s=Math.max(768/img.width,736/img.height);q.drawImage(img,(768-img.width*s)/2,(736-img.height*s)/2,img.width*s,img.height*s);quad([x-1.5,.38,z+.27],[x+1.5,.38,z+.27],[x+1.5,3.25,z+.27],[x-1.5,3.25,z+.27],[1,1,1],texture(c))});img.src=games[i].imageUrl}));

// Decorative geometry belongs only to this local showcase prototype.
const props=[];function prop(x,z,r){const group=activeStandGroup>=0?activeStandGroup:activePlatform,p={x,z,r,group};props.push(p);if(group>=0)standGroups[group].obstacles.push(p)}
function ball(x,y,z,rx,ry,rz,color){const vertices=[],lat=8,lon=12;function p(a,b){const theta=a*Math.PI/lat,phi=b*Math.PI*2/lon;return [x+rx*Math.sin(theta)*Math.cos(phi),y+ry*Math.cos(theta),z+rz*Math.sin(theta)*Math.sin(phi),b/lon,a/lat]}for(let a=0;a<lat;a++)for(let b=0;b<lon;b++)vertices.push(...p(a,b),...p(a+1,b+1),...p(a+1,b),...p(a,b),...p(a,b+1),...p(a+1,b+1));mesh(vertices,color)}
function tree(x,z,size,scale=1){box(x,0,z,.55*scale,.45,.55*scale,[.21,.24,.19]);box(x,.4,z,.22*scale,size,.22*scale,[.38,.21,.12]);ball(x,size+.5,z,.75*scale,.85*scale,.7*scale,[.19,.45,.22]);ball(x-.35*scale,size+.35,z+.3*scale,.48*scale,.55*scale,.5*scale,[.27,.57,.25]);ball(x+.4*scale,size+.55,z,.55*scale,.65*scale,.55*scale,[.33,.62,.28]);prop(x,z,.85*scale)}
function crate(x,y,z){box(x,y,z,.9,.85,.9,[.26,.40,.50]);box(x,y+.1,z+.46,.65,.05,.03,[.68,.82,.84]);box(x,y+.68,z+.46,.65,.05,.03,[.68,.82,.84]);box(x-.35,y+.1,z+.47,.04,.6,.02,[.50,.66,.73]);box(x+.35,y+.1,z+.47,.04,.6,.02,[.50,.66,.73])}
// Ceiling coffers, rail lights, wall ribs and a welcome plinth.
quad([-10,5.5,-21],[10,5.5,-21],[10,5.5,10],[-10,5.5,10],[.12,.19,.25]);
for(let z=-18;z<=7;z+=3){box(-9.75,.6,z,.15,3.6,1.6,[.18,.27,.33]);box(9.75,.6,z,.15,3.6,1.6,[.18,.27,.33])}
for(const [i,[x,z,tint]] of [[-4,-1,[.75,1,.65]],[4,-1,[1,.72,.38]],[-4,-10,[.42,.78,1]],[4,-10,[1,.48,.75]]].entries())withStandGroup(i,()=>{box(x,4.9,z,3,.15,1.3,[.16,.22,.28]);emissive=1;box(x,4.85,z,2.7,.04,1,[...tint]);emissive=0;box(x-1.5,4.9,z,.06,.6,.06,[.45,.52,.56]);box(x+1.5,4.9,z,.06,.6,.06,[.45,.52,.56]);});
emissive=1;box(-9.5,.12,-5,.07,.05,28,[.35,.62,.68]);box(9.5,.12,-5,.07,.05,28,[.35,.62,.68]);emissive=0;
box(0,0,-18.5,3,.35,1.2,[.22,.30,.36]);label('ИГРЫ / ИДЕИ / ИИ',0,.45,-18,4,.55);
// Four distinct floor materials and perimeter frames. Keep the central aisle clear.
const colors=zoneFloorColors;
standAnchors.forEach(([x,y,z],i)=>withStandGroup(i,()=>{box(x,.025,z+1,6.2,.035,5.5,colors[i]);const tint=i===0?[.50,.76,.35]:i===1?[.91,.58,.20]:i===2?[.30,.68,.84]:[.91,.46,.70];emissive=.6;box(x,.08,z+3.70,6.2,.025,.06,tint);emissive=0;}));
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
function displayPieceMotion(cell,kind){return t=>{const state=displayBoardState(t),amount=displayPieceAmount(state,cell,kind),scale=Math.max(.0001,amount),m=transform(5.5+(cell%3)*.5,.815+.12*(1-amount)*amount,-1.4+Math.floor(cell/3)*.5,kind==='x'?Math.PI/4:0);for(const j of [0,1,2,4,5,6,8,9,10])m[j]*=scale;return m}}
function displayRing(){const vertices=[],major=24,tube=6,radius=.142,thickness=.026;function point(a,b){const u=a/major*Math.PI*2,v=b/tube*Math.PI*2;return [(radius+thickness*Math.cos(v))*Math.cos(u),thickness*Math.sin(v),(radius+thickness*Math.cos(v))*Math.sin(u),a/major,b/tube]}for(let a=0;a<major;a++)for(let b=0;b<tube;b++)vertices.push(...point(a,b),...point(a+1,b+1),...point(a+1,b),...point(a,b),...point(a,b+1),...point(a+1,b+1));mesh(vertices,[.59,.89,.81])}
for(let cell=0;cell<9;cell++)for(const kind of ['x','o']){motion=displayPieceMotion(cell,kind);if(kind==='x'){box(0,-.025,0,.34,.05,.065,[.96,.88,.48]);box(0,-.025,0,.065,.05,.34,[.96,.88,.48])}else displayRing()}
// The winning line grows only after the final piece has settled.
for(const round of [0,1]){motion=t=>{const state=displayBoardState(t),winAt=.65+(state.moves.length-1)*.90+.38,show=state.round===round?Math.max(0,Math.min(1,(state.phase-winAt)/.35))*Math.max(0,Math.min(1,(9.6-state.phase)/.65)):0,m=transform(6,.791,-1.4+round*.5);m[0]=Math.max(.0001,show);m[5]=m[10]=Math.max(.0001,show*(1+.09*Math.sin(t*4)));return m};emissive=.7;box(0,0,0,1.32,.012,.035,round===0?[1,.78,.25]:[.42,1,.80]);emissive=0}motion=null;prop(6,-.9,1.15);
// The mine gently turns and breathes while its bottom stays at the pedestal height.
box(2,.25,-.4,1.35,.3,1.35,[.43,.32,.21]);
function decorativeMinePose(t){const scale=1+.012*Math.sin(t*1.7),m=transform(2,1.05+.5*(scale-1),-.4,.075*Math.sin(t*.85));for(const j of [0,1,2,4,5,6,8,9,10])m[j]*=scale;return m}
motion=decorativeMinePose;ball(0,0,0,.5,.5,.5,[.20,.22,.25]);for(let k=0;k<6;k++){const a=k*Math.PI/3;ball(Math.cos(a)*.51,Math.sin(a)*.51,0,.12,.12,.12,[.65,.33,.16])}motion=null;prop(2,-.4,.85);

// Robots: storage racks, crates, pipes and a freestanding robot.
activePlatform=2;for(let z=-13;z<=-11;z+=2){box(-6.7,0,z,.1,2.8,.1,[.35,.48,.55]);box(-5.2,0,z,.1,2.8,.1,[.35,.48,.55]);for(let y=.3;y<2.6;y+=1.1){box(-5.95,y,z,1.7,.1,1.2,[.30,.40,.49]);crate(-5.95,y+.12,z)}}prop(-6,-12,1.1);const driveRadiusX=.70,driveRadiusZ=.38,driveRate=.32,driveSamples=1024,driveArc=[0];
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
box(1.9,.08,-10.0,.70,.65,.70,[.76,.37,.58]);box(1.9,.10,-9.64,.08,.65,.025,[.96,.82,.54]);box(1.9,.73,-10.0,.75,.07,.75,[.84,.46,.65]);box(1.9,.81,-10.0,.08,.02,.75,[.96,.82,.54]);
box(2.55,.08,-10.15,.45,.40,.45,[.28,.66,.73]);box(2.55,.10,-9.91,.055,.40,.025,[.96,.82,.54]);box(2.55,.48,-10.15,.49,.06,.49,[.39,.75,.80]);prop(2.1,-10.05,.70);
// Two additional balloons are tied to the gift lids at the front left.
for(const [k,x,z,anchor,y,c] of [[0,1.9,-10.0,.82,2.18,[.65,.35,.88]],[1,2.55,-10.15,.54,2.45,[.98,.48,.18]]]){
 const knot=y-.43;motion=t=>pivotZ(x,anchor,z,.045*Math.sin(t*.85+k*1.7));
 ball(x,y,z,.30,.43,.30,c);ball(x,knot,z,.035,.045,.035,c);box(x,anchor,z,.012,knot-anchor,.012,[.80,.82,.83]);motion=null;
 ball(x,anchor,z,.025,.025,.025,[.80,.82,.83]);
}

activePlatform=-1;
function blocked(x,z){const robot=robotDrive(animTime),delta=standOffset(2);return Math.hypot(x-robot.x-delta[0],z-robot.z-delta[2])<.97||props.some(p=>{const d=standOffset(p.group);return Math.hypot(x-p.x-d[0],z-p.z-d[2])<p.r+.25})||stands.some(s=>Math.abs(x-s[0])<2.1&&z-s[2]>-1.2&&z-s[2]<3.15)}

// Intersect the camera ray with the floor plane. Walking follows a collision-free grid route.
function nearestWalkTarget(x,z){x=Math.max(-9,Math.min(9,x));z=Math.max(-19,Math.min(8,z));const route=!blocked(x,z)&&findRoute(eye[0],eye[2],x,z);if(route)return {x,z,route,snapped:false};const candidates=[];for(let dx=-4;dx<=4.001;dx+=.2)for(let dz=-4;dz<=4.001;dz+=.2){const xx=x+dx,zz=z+dz;if(xx< -9||xx>9||zz< -19||zz>8||blocked(xx,zz))continue;candidates.push({x:xx,z:zz,d:dx*dx+dz*dz})}candidates.sort((a,b)=>a.d-b.d);for(const p of candidates){const route=findRoute(eye[0],eye[2],p.x,p.z);if(route)return {...p,route,snapped:true}}return null}
function frontZoneFor(x,z){return stands.findIndex(s=>Math.abs(x-s[0])<=1.85&&z-s[2]>=0&&z-s[2]<=3.75)}
function pickFloor(clientX,clientY){const r=canvas.getBoundingClientRect(),a=canvas.width/canvas.height,f=(Math.min(1/Math.tan(Math.PI/6),a*1.25)*zoom),sx=((clientX-r.left)/r.width*2-1)*a/f,sy=(1-(clientY-r.top)/r.height*2)/f;const cy=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),dx=cy*sx-s*sp*sy+s*cp,dy=cp*sy+sp,dz=s*sx+cy*sp*sy-cy*cp;if(dy>=-.015)return;const distance=-eye[1]/dy,x=eye[0]+dx*distance,z=eye[2]+dz*distance;if(Math.hypot(x-eye[0],z-eye[2])>35)return;const target=nearestWalkTarget(x,z);if(!target){hint('Свободный проход рядом не найден.');return}keys.clear();stopStick();destination=[target.x,target.z];const clickedZone=frontZoneFor(x,z),faceIndex=clickedZone>=0&&frontZoneFor(target.x,target.z)===clickedZone?clickedZone:-1;travel={kind:'walk',route:roundWalkRoute([eye[0],eye[2]],target.route),index:0,faceIndex};hint(target.snapped?'Идём к ближайшей доступной точке · Esc — отменить':'Идём к выбранной точке · Esc — отменить')}

function roundWalkRoute(start,route){const points=[start,...route],out=[];for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]);if(ab<.01||bc<.01)continue;let radius=Math.min(.75,ab*.4,bc*.4),curve=null;for(let attempt=0;attempt<6;attempt++){const entry=[b[0]+(a[0]-b[0])*radius/ab,b[1]+(a[1]-b[1])*radius/ab],exit=[b[0]+(c[0]-b[0])*radius/bc,b[1]+(c[1]-b[1])*radius/bc],candidate=[entry];for(let k=1;k<=12;k++){const t=k/12;candidate.push([(1-t)*(1-t)*entry[0]+2*(1-t)*t*b[0]+t*t*exit[0],(1-t)*(1-t)*entry[1]+2*(1-t)*t*b[1]+t*t*exit[1]])}let prev=out.at(-1)||start,valid=true;for(const p of candidate){if(!clearLine(prev,p)){valid=false;break}prev=p}if(valid){curve=candidate;break}radius*=.5}out.push(...(curve||[b]))}if(route.length)out.push(route.at(-1));return out}
function findRoute(sx,sz,tx,tz){const step=.4,minX=-9,minZ=-19,nx=46,nz=68,toCell=(x,z)=>[Math.max(0,Math.min(nx-1,Math.round((x-minX)/step))),Math.max(0,Math.min(nz-1,Math.round((z-minZ)/step)))],world=(x,z)=>[minX+x*step,minZ+z*step],start=toCell(sx,sz),goal=toCell(tx,tz),key=(x,z)=>z*nx+x,valid=(x,z)=>x>=0&&x<nx&&z>=0&&z<nz&&!blocked(...world(x,z)),open=[key(...start)],cost=new Map([[key(...start),0]]),parent=new Map(),closed=new Set(),end=key(...goal);let visits=0;while(open.length&&visits++<nx*nz){let best=0;for(let i=1;i<open.length;i++){const value=k=>cost.get(k)+Math.hypot(k%nx-goal[0],Math.floor(k/nx)-goal[1]);if(value(open[i])<value(open[best]))best=i}const current=open.splice(best,1)[0];if(current===end){const route=[[tx,tz]];let k=end;while(k!==key(...start)){route.push(world(k%nx,Math.floor(k/nx)));k=parent.get(k)}route.push([sx,sz]);route.reverse();const simple=[route[0]];for(let i=1;i<route.length;){let far=i;for(let j=i+1;j<route.length;j++){if(!clearLine(simple[simple.length-1],route[j]))break;far=j}simple.push(route[far]);i=far+1}return simple.slice(1)}closed.add(current);const x=current%nx,z=Math.floor(current/nx);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const xx=x+dx,zz=z+dz,k=key(xx,zz);if(closed.has(k)||!valid(xx,zz)||(dx&&dz&&(!valid(x+dx,z)||!valid(x,z+dz))))continue;const g=cost.get(current)+Math.hypot(dx,dz);if(g<(cost.get(k)??Infinity)){cost.set(k,g);parent.set(k,current);if(!open.includes(k))open.push(k)}}}return null}
function clearLine(a,b){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.12);for(let i=1;i<=n;i++)if(blocked(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n))return false;return true}
motion=()=>destination?transform(destination[0],.10,destination[1]):transform(0,-100,0);emissive=.8;for(let k=0;k<32;k++){const a=k*Math.PI/16,b=(k+1)*Math.PI/16;quad([Math.cos(a)*.22,0,Math.sin(a)*.22],[Math.cos(b)*.22,0,Math.sin(b)*.22],[Math.cos(b)*.29,0,Math.sin(b)*.29],[Math.cos(a)*.29,0,Math.sin(a)*.29],[.78,.98,.56])}motion=null;emissive=0;

function panelOccluded(i){const target=[stands[i][0],.94,stands[i][2]+.32],d=target.map((v,k)=>v-eye[k]);return stands.some((s,j)=>{if(i===j)return false;const lo=[s[0]-1.8,0,s[2]-.8],hi=[s[0]+1.8,3.5,s[2]+.8];let near=0,far=.995;for(let k=0;k<3;k++){if(Math.abs(d[k])<.00001){if(eye[k]<lo[k]||eye[k]>hi[k])return false}else{let a=(lo[k]-eye[k])/d[k],b=(hi[k]-eye[k])/d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false}}return far>0&&near<.995})}function projectControls(panel,m,r,origin,u,v,width,height,i){const [ox,oy,oz]=origin,w=r.width/2,h=r.height/2,clip=p=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[3]*p[0]+m[7]*p[1]+m[11]*p[2]],a=clip(u),b=clip(v),o=clip(origin);o[0]+=m[12];o[1]+=m[13];o[2]+=m[15];panel.hidden=o[2]<.3||eye[2]<stands[i][2]+.35||panelOccluded(i);if(panel.hidden)return;const col=c=>[w*(c[0]+c[2]),h*(c[2]-c[1]),0,c[2]],ac=col(a),bc=col(b),oc=col(o);oc[0]+=r.left*o[2];oc[1]+=r.top*o[2];panel.style.transform='matrix3d('+[...ac,...bc,0,0,1,0,...oc].join(',')+')';panel.style.zIndex=Math.max(1,1000-Math.round(o[2]));if(panel.classList.contains('podium-controls')){const cx=ac[0]*300+bc[0]*70+oc[0],cy=ac[1]*300+bc[1]*70+oc[1],cw=ac[3]*300+bc[3]*70+oc[3],dx=Math.hypot((cx+ac[0])/(cw+ac[3])-cx/cw,(cy+ac[1])/(cw+ac[3])-cy/cw),dy=Math.hypot((cx+bc[0])/(cw+bc[3])-cx/cw,(cy+bc[1])/(cw+bc[3])-cy/cw),ratio=Math.max(.7,Math.min(5,dx/Math.max(.0001,dy)));panel.querySelectorAll('.button-caption').forEach(s=>{s.style.transform='translateY('+(-4*ratio)+'px) scaleY('+ratio+')';s.style.fontSize=Math.min(28,110/ratio)+'px'})}const x=(o[0]/o[2]+1)*w,y=(1-o[1]/o[2])*h;panel.inert=x< -400||x>r.width+400||y< -300||y>r.height+300}
function placeScreenControls(){const m=camera(),r=canvas.getBoundingClientRect();stands.forEach(([x,y,z],i)=>{projectControls(screenPanels[i],m,r,[x-1.5,1.25,z+.32],[3/600,0,0],[0,-.65/130,0],600,130,i);projectControls(podiumPanels[i],m,r,[x-1.5,.725,z+.63],[3/600,0,0],[0,-.26/140,.148/140],600,140,i)})}

function keepSafeDistance(){for(const s of stands){if(Math.abs(eye[0]-s[0])<2.1&&eye[2]-s[2]>-1.2&&eye[2]-s[2]<3.15){eye[2]=s[2]+3.25}}}

// Controls belong to the scene: depth testing hides them behind foreground objects.
document.getElementById('screen-controls').hidden=true;
document.getElementById('screen-controls').setAttribute('aria-hidden','true');
const controlTextures=[];
function controlCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rounded(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
function drawControlTexture(entry){const {canvas:c,i,kind}=entry,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.textBaseline='middle';
 if(kind==='difficulty'){
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
 // The fixed base shares the cap footprint and rests on the platform.
 const point=(u,v)=>[x-1.5+u/600*3,.725-v/60*.26-.060,z+.63+v/60*.148-.100];
 const a=point(left,3),b=point(right,3),c=point(right,57),d=point(left,57),lower=v=>[v[0],.30,v[2]];
 quad(d,c,b,a,[.20,.32,.34]);for(const [u,v] of [[a,b],[b,c],[c,d],[d,a]])quad(lower(u),lower(v),v,u,[.11,.19,.22]);
}
function actionBody(x,z,left,right,tint){
 const point=(u,v)=>[x-1.5+u/600*3,.725-v/60*.26-.003,z+.63+v/60*.148];
 const a=point(left,3),b=point(right,3),c=point(right,57),d=point(left,57),lower=v=>[v[0],v[1]-.085,v[2]-.035];
 quad(d,c,b,a,tint);for(const [u,v] of [[a,b],[b,c],[c,d],[d,a]])quad(lower(u),lower(v),v,u,tint.map(c=>c*.62));
}

const buttonPresses=new Map();let pendingButton=false;
function pressButton(i,key,action){if(pendingButton)return;buttonPresses.set(i+':'+key,performance.now());pendingButton=true;setTimeout(()=>{pendingButton=false;action()},110)}
function buttonMotion(i,key,kind,link){
 return ()=>{const elapsed=performance.now()-(buttonPresses.get(i+':'+key)??-1e6),pulse=elapsed>=0&&elapsed<280?Math.sin(Math.PI*elapsed/280):0;
  const selected=kind==='difficulty'&&difficultyLinks[i]===link;
  return kind==='difficulty'?transform(0,0,-(.042*pulse)):transform(0,-.022*pulse,-.038*pulse);
 };
}
function controlFace(x,z,i,entry,left,right,top,bottom,key,link){
 const kind=entry.kind,v=(u,t)=>kind==='difficulty'?[x-1.5+u/600*3,1.25-t/130*.65,z+.400]:[x-1.5+u/600*3,.725-t/60*.26,z+.63+t/60*.148];
 const a=v(left,bottom),b=v(right,bottom),c=v(right,top),d=v(left,top),h=entry.canvas.height;
 mesh([...a,left/600,1-bottom/h,...b,right/600,1-bottom/h,...c,right/600,1-top/h,...a,left/600,1-bottom/h,...c,right/600,1-top/h,...d,left/600,1-top/h],[1,1,1],entry.texture);
 const obj=objects[objects.length-1];obj.oneSided=true;obj.emission=1;obj.motion=buttonMotion(i,key,kind,link);
 obj.controlHit=world=>{const m=obj.motion(),p=world.map((n,j)=>n-m[12+j]),u=(p[0]-(x-1.5))/3*600;
  if(kind==='difficulty'){const t=(1.25-p[1])/.65*130,cx=(left+right)/2;if(Math.hypot(u-cx,t-65)>53)return null;return ()=>pressButton(i,key,()=>setDifficulty(i,link))}
  const t=(.725-p[1])/.26*60;if(u<left||u>right||t<3||t>57)return null;
  return ()=>pressButton(i,key,()=>key==='play'?podiumPanels[i].querySelector('.play').click():openInfo(i));
 };
}
standAnchors.forEach(([x,y,z],i)=>withStandGroup(i,()=>{
 for(const kind of ['difficulty','actions']){
  const ds=Object.values(games[i].difficulties||{});if(kind==='difficulty'&&!ds.length)continue;
  const c=controlCanvas(600,kind==='difficulty'?130:60),entry={canvas:c,i,kind,texture:texture(c)};controlTextures.push(entry);drawControlTexture(entry);
  if(kind==='difficulty')ds.forEach((d,j)=>{
   const cx=300+(j-(ds.length-1)/2)*112,key='diff'+j,from=objects.length;
   difficultyBody(x+(j-(ds.length-1)/2)*.56,.925,z+.322,.248);
   objects.slice(from).forEach(o=>{o.motion=buttonMotion(i,key,kind,d.link);o.difficultyLink=d.link;o.standIndex=i});
   controlFace(x,z,i,entry,cx-54,cx+54,8,130,key,d.link);
  });else for(const [left,right,key,tint] of [[3,287,'play',[.43,.64,.32]],[313,597,'info',[.22,.38,.44]]]){
   actionSeat(x,z,left,right);const from=objects.length;actionBody(x,z,left,right,tint);objects.slice(from).forEach(o=>o.motion=buttonMotion(i,key,kind));
   controlFace(x,z,i,entry,left,right,3,57,key);
  }
 }
}));
refreshStandControls=i=>{controlTextures.filter(e=>e.i===i).forEach(drawControlTexture);for(const o of objects)if(o.standIndex===i){const active=o.difficultyLink===difficultyLinks[i];o.color=active?[.72,.94,.29]:[.25,.43,.46];o.emission=active?.65:0}};
games.forEach((g,i)=>refreshStandControls(i));
function rayObjectBounds(o,m,d,nearest){
 const b=o.bounds,c=b.center,e=b.extent;let near=.05,far=nearest;
 for(let j=0;j<3;j++){const center=m[j]*c[0]+m[j+4]*c[1]+m[j+8]*c[2]+m[j+12],radius=Math.abs(m[j])*e[0]+Math.abs(m[j+4])*e[1]+Math.abs(m[j+8])*e[2]+.00001,delta=center-eye[j];
  if(Math.abs(d[j])<1e-9){if(Math.abs(delta)>radius)return false;continue}
  let a=(delta-radius)/d[j],z=(delta+radius)/d[j];if(a>z)[a,z]=[z,a];near=Math.max(near,a);far=Math.min(far,z);if(near>far)return false;
 }return true;
}
function pickWorldControl(clientX,clientY,activate=true){
 const r=canvas.getBoundingClientRect(),a=canvas.width/canvas.height,f=Math.min(1/Math.tan(Math.PI/6),a*1.25)*zoom,sx=((clientX-r.left)/r.width*2-1)*a/f,sy=(1-(clientY-r.top)/r.height*2)/f,cy=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),d=[cy*sx-sn*sp*sy+sn*cp,cp*sy+sp,sn*sx+cy*sp*sy-cy*cp];
 // Screen bounds reject empty hover regions before the detailed occlusion test.
 const projection=camera(),px=(clientX-r.left)/r.width*2-1,py=1-(clientY-r.top)/r.height*2;
 const candidate=objects.some(o=>{if(!o.controlHit)return false;const model=objectMatrix(o,animTime);let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let k=0;k<o.vertices.length;k+=5){const v=o.vertices,x=model[0]*v[k]+model[4]*v[k+1]+model[8]*v[k+2]+model[12],y=model[1]*v[k]+model[5]*v[k+1]+model[9]*v[k+2]+model[13],z=model[2]*v[k]+model[6]*v[k+1]+model[10]*v[k+2]+model[14],w=projection[3]*x+projection[7]*y+projection[11]*z+projection[15];if(w<=.1)return false;const sx=(projection[0]*x+projection[4]*y+projection[8]*z+projection[12])/w,sy=(projection[1]*x+projection[5]*y+projection[9]*z+projection[13])/w;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy)}
  return px>=minX&&px<=maxX&&py>=minY&&py<=maxY;
 });if(!candidate)return false;
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,j)=>v-b[j]);let nearest=Infinity,action=null;
 const hitModels=new Map();for(const o of objects){const m=objectMatrix(o,animTime,hitModels);if(!rayObjectBounds(o,m,d,nearest))continue;const v=o.vertices,point=k=>[m[0]*v[k]+m[4]*v[k+1]+m[8]*v[k+2]+m[12],m[1]*v[k]+m[5]*v[k+1]+m[9]*v[k+2]+m[13],m[2]*v[k]+m[6]*v[k+1]+m[10]*v[k+2]+m[14]];
  for(let k=0;k<v.length;k+=15){const a=point(k),b=point(k+5),c=point(k+10),e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-8||(o.oneSided&&det<0))continue;const q=sub(eye,a),u=dot(q,h)/det;if(u<0||u>1)continue;const cr=cross(q,e1),w=dot(d,cr)/det;if(w<0||u+w>1)continue;const t=dot(e2,cr)/det;if(t<.05||t>=nearest)continue;const hit=eye.map((v,j)=>v+d[j]*t),candidate=o.controlHit?o.controlHit(standSourcePoint(o.group,hit)):null;if(o.controlHit&&!candidate)continue;nearest=t;action=candidate;
  }
 }
 if(action){if(activate)action();return true}return false;
}


// Retain original objects for precise picking; batch only their render geometry.
let renderItems=[],batchedObjectCount=-1;const motionIds=new WeakMap();let nextMotionId=1;
function rebuildRenderBatches(){
 for(const o of renderItems)if(o.batched)gl.deleteBuffer(o.buffer);
 const groups=new Map(),individual=[];
 for(const o of objects){
  // Selectable faces and difficulty bodies can change material at runtime.
  if(o.controlHit||o.standIndex!==undefined||o.texture){individual.push(o);continue}
  let id=0;if(o.motion){if(!motionIds.has(o.motion))motionIds.set(o.motion,nextMotionId++);id=motionIds.get(o.motion)}
  const key=o.group+':'+id+':'+o.emission+':'+!!o.oneSided;
  if(!groups.has(key))groups.set(key,{parts:[],group:o.group,motion:o.motion,emission:o.emission,oneSided:o.oneSided});groups.get(key).parts.push(o);
 }
 const batches=[];for(const group of groups.values()){
  const data=new Float32Array(group.parts.reduce((n,o)=>n+o.n*11,0));let offset=0;
  for(const o of group.parts)for(let k=0;k<o.expanded.length;k+=8){for(let j=0;j<8;j++)data[offset++]=o.expanded[k+j];for(let j=0;j<3;j++)data[offset++]=o.color[j]}
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  batches.push({...group,parts:undefined,buffer,n:data.length/11,batched:true,texture:null});
 }
 renderItems=[...batches,...individual];batchedObjectCount=objects.length;
 canvas.dataset.sourceDraws=objects.length;canvas.dataset.renderDraws=renderItems.length;
}
function renderScene(){
 if(batchedObjectCount!==objects.length)rebuildRenderBatches();
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(mat,false,camera());gl.uniform1f(power,lighting?1.:.15);if(lightLayoutRevision!==layoutRevision){gl.uniform3fv(lightPositionLocation,new Float32Array(standGroups.flatMap(g=>[g.position[0]+g.light[0],g.position[1]+g.light[1],g.position[2]+g.light[2]])));lightLayoutRevision=layoutRevision}
 gl.enableVertexAttribArray(attrP);gl.enableVertexAttribArray(attrUV);gl.enableVertexAttribArray(attrNormal);
 const models=new Map();let previousEmission=null,previousTextured=null,previousTexture=null,previousCull=null;
 for(const o of renderItems){
  const model=objectMatrix(o,animTime,models);gl.uniformMatrix4fv(modelLoc,false,model);
  gl.bindBuffer(gl.ARRAY_BUFFER,o.buffer);const stride=o.batched?44:32;
  gl.vertexAttribPointer(attrP,3,gl.FLOAT,false,stride,0);gl.vertexAttribPointer(attrUV,2,gl.FLOAT,false,stride,12);gl.vertexAttribPointer(attrNormal,3,gl.FLOAT,false,stride,20);
  if(o.batched){gl.enableVertexAttribArray(attrTint);gl.vertexAttribPointer(attrTint,3,gl.FLOAT,false,44,32)}else{gl.disableVertexAttribArray(attrTint);gl.vertexAttrib3fv(attrTint,o.color)}
  if(previousEmission!==o.emission){gl.uniform1f(emit,o.emission);previousEmission=o.emission}
  const textured=!!o.texture;if(previousTextured!==textured){gl.uniform1f(windowTexturedLocation,textured?1:0);previousTextured=textured}
  if(textured&&previousTexture!==o.texture){gl.bindTexture(gl.TEXTURE_2D,o.texture);previousTexture=o.texture}
  const cull=!!o.oneSided;if(previousCull!==cull){if(cull){gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK)}else gl.disable(gl.CULL_FACE);previousCull=cull}
  gl.drawArrays(gl.TRIANGLES,0,o.n);
 }
}
const windowTexturedLocation=textured;

updateWorldCursor=t=>{if(!hoverPosition||t-hoverStamp<80)return;hoverStamp=t;canvas.style.cursor=drag||pinch||pointers.size?'grabbing':pickWorldControl(...hoverPosition,false)?'pointer':''};
function actualRenderStatus(baseWidth,baseHeight,scale,actualWidth,actualHeight){const targetWidth=Math.max(1,Math.round(baseWidth*scale/100)),targetHeight=Math.max(1,Math.round(baseHeight*scale/100));return {limited:actualWidth<targetWidth||actualHeight<targetHeight,effective:Number((100*Math.min(actualWidth/baseWidth,actualHeight/baseHeight)).toFixed(1))}}
function frame(t){const dt=Math.min((t-last)/1000,.04);last=t;if(!document.hidden){recordFps(t);updateWorldCursor(t);zoom+=(zoomTarget-zoom)*(1-Math.exp(-dt*12));if(animated)animTime+=dt;if(travel?.kind==='walk'){let remaining=0,previous=[eye[0],eye[2]];for(let i=travel.index;i<travel.route.length;i++){remaining+=Math.hypot(travel.route[i][0]-previous[0],travel.route[i][1]-previous[1]);previous=travel.route[i]}let look=[eye[0],eye[2]],ahead=.6;for(let i=travel.index;i<travel.route.length;i++){const p=travel.route[i],d=Math.hypot(p[0]-look[0],p[1]-look[1]);if(d>=ahead){look=[look[0]+(p[0]-look[0])*ahead/(d||1),look[1]+(p[1]-look[1])*ahead/(d||1)];break}ahead-=d;look=p}const desired=Math.atan2(look[0]-eye[0],-(look[1]-eye[2])),delta=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));if(remaining>.16)yaw+=delta*(1-Math.exp(-dt*8));let advance=6*Math.max(.2,Math.cos(delta))*Math.min(1,Math.max(.12,remaining/.6))*dt;while(travel&&advance>0&&travel.index<travel.route.length){const point=travel.route[travel.index],dx=point[0]-eye[0],dz=point[1]-eye[2],distance=Math.hypot(dx,dz);if(distance<.001){travel.index++;continue}const step=Math.min(distance,advance),x=eye[0]+dx/distance*step,z=eye[2]+dz/distance*step;if(blocked(x,z)){cancelWalk();hint('Проход занят. Выберите другую точку.');break}eye[0]=x;eye[2]=z;advance-=step;if(step>=distance-.00001)travel.index++;else break}if(travel&&travel.index>=travel.route.length){const i=travel.faceIndex;destination=null;if(i>=0&&frontZoneFor(eye[0],eye[2])===i){const angle=Math.atan2(stands[i][0]-eye[0],eye[2]-stands[i][2]),delta=Math.atan2(Math.sin(angle-yaw),Math.cos(angle-yaw));travel={kind:'face',fromYaw:yaw,toYaw:yaw+delta,elapsed:0,duration:Math.max(.25,Math.min(.75,Math.abs(delta)/2.5))};hint('Поворачиваемся к витрине')}else{travel=null;hint('')}}}else if(travel?.kind==='face'){travel.elapsed+=dt;const p=Math.min(1,travel.elapsed/travel.duration),s=p*p*(3-2*p);yaw=travel.fromYaw+(travel.toYaw-travel.fromYaw)*s;if(p===1){travel=null;hint('')}}else if(travel){travel.elapsed+=dt;const p=Math.min(1,travel.elapsed/travel.duration),s=p*p*(3-2*p);eye=travel.from.map((v,i)=>v+(travel.to[i]-v)*s);yaw=travel.yaw*(1-s);pitch=travel.pitch*(1-s);if(p===1)travel=null}const marker=document.getElementById('visitor');marker.style.left=((eye[0]+10)/20*100)+'%';marker.style.top=((eye[2]+20)/28*100)+'%';marker.style.transform='translate(-50%,-50%) rotate('+(-yaw*180/Math.PI)+'deg)';yaw+=stickX*dt*1.8;if(keys.has('ArrowLeft')||keys.has('KeyA'))yaw-=dt*1.6;if(keys.has('ArrowRight')||keys.has('KeyD'))yaw+=dt*1.6;let forward=stickY+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=0;const len=Math.max(1,Math.hypot(forward,side));forward/=len;side/=len;const nx=Math.max(-9,Math.min(9,eye[0]+(Math.sin(yaw)*forward+Math.cos(yaw)*side)*dt*3.8)),nz=Math.max(-19,Math.min(8,eye[2]+(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*dt*3.8));if(!travel){if(!blocked(nx,eye[2]))eye[0]=nx;if(!blocked(eye[0],nz))eye[2]=nz;}let near=-1,dist=6.5;stands.forEach((s,i)=>{const d=Math.hypot(s[0]-eye[0],s[2]+3-eye[2]);if(d<dist){near=i;dist=d}});show(near);loc.textContent='X '+eye[0].toFixed(1)+' · Z '+eye[2].toFixed(1)+' / '+(near<0?'ПРОГУЛКА':'СТЕНД 0'+(near+1));const dpr=Math.min(devicePixelRatio,1.5),requested=renderScale/100,limit=Math.min(1,renderLimit/Math.max(canvas.clientWidth*dpr*requested,canvas.clientHeight*dpr*requested)),w=Math.max(1,Math.round(canvas.clientWidth*dpr*requested*limit)),h=Math.max(1,Math.round(canvas.clientHeight*dpr*requested*limit));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}const resolution=gl.drawingBufferWidth+'×'+gl.drawingBufferHeight,resolutionLabel=document.getElementById('render-resolution');if(resolutionLabel.textContent!==resolution)resolutionLabel.textContent=resolution;const limitLabel=document.getElementById('render-limit'),status=actualRenderStatus(canvas.clientWidth*dpr,canvas.clientHeight*dpr,renderScale,gl.drawingBufferWidth,gl.drawingBufferHeight);limitLabel.hidden=!status.limited;if(status.limited){const message='· предел '+status.effective+'%';if(limitLabel.textContent!==message)limitLabel.textContent=message}renderScene();}requestAnimationFrame(frame)}
function auditPlatformBounds(){let violations=0;const examples=[];for(let k=0;k<=48;k++){const t=k*1.37;for(const o of objects){if(o.platform<0)continue;const base=stands[o.platform],m=objectMatrix(o,t),b=o.bounds,c=b.center,e=b.extent;for(const axis of [0,2]){const center=m[axis]*c[0]+m[axis+4]*c[1]+m[axis+8]*c[2]+m[axis+12],radius=Math.abs(m[axis])*e[0]+Math.abs(m[axis+4])*e[1]+Math.abs(m[axis+8])*e[2],lo=axis===0?base[0]-3.1:base[2]-1.75,hi=axis===0?base[0]+3.1:base[2]+3.75;if(center-radius<lo-.002||center+radius>hi+.002){violations++;if(examples.length<4)examples.push({zone:o.platform,axis,min:center-radius,max:center+radius,lo,hi})}}}}canvas.dataset.platformOverflows=violations;if(violations)console.warn('Platform bounds',examples)}
auditPlatformBounds();standMoveHooks=()=>{cancelWalk();keepSafeDistance();hoverStamp=0;auditPlatformBounds()};canvas.dataset.standGroups=standGroups.map(g=>g.id+':'+g.children.length).join(',');
restorePavilionState();keepSafeDistance();requestAnimationFrame(frame);
}
