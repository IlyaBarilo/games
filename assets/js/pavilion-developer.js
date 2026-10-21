(async () => {
 if(window.PAVILION_LOADING && !await window.PAVILION_LOADING.initialized)return;
 const layout=window.PAVILION_LAYOUT,toggle=document.getElementById('developer-toggle'),panel=document.getElementById('developer-panel'),status=document.getElementById('developer-status'),map=document.querySelector('.map-floor'),mapTitle=document.querySelector('.map-title');
 const games=window.GAMES_CATALOG.games.filter(game=>game.available),normalMapTitle=mapTitle.textContent;
 let drag=null,suppressClick=null;
 function marker(element){const button=element?.closest('.map-floor button[data-zone]');return button&&button.dataset.zone!=='home'?button:null}
 function gameFor(button){return games[Number(button.dataset.zone)]}
 function clearDrag(){
  if(!drag)return;const current=drag;drag=null;
  current.source.classList.remove('map-drag-source');current.target?.classList.remove('map-drop-target');current.ghost?.remove();
  if(current.moved)suppressClick=[current.source,current.target];
  try{if(current.source.hasPointerCapture(current.pointerId))current.source.releasePointerCapture(current.pointerId)}catch{}
 }
 function cancelDrag(){if(drag?.moved)status.textContent='Перетаскивание отменено.';clearDrag()}
 function setOpen(open){cancelDrag();panel.hidden=!open;toggle.setAttribute('aria-pressed',String(open));map.classList.toggle('map-editing',open);mapTitle.textContent=open?'Карта · перетащите стенд на другой':normalMapTitle;if(open)document.getElementById('developer-close').focus({preventScroll:true});else toggle.focus({preventScroll:true})}
 function exchange(source,target){
  try{const a=gameFor(source),b=gameFor(target);layout.swapStands(a.id,b.id);const saved=layout.save();status.textContent='Сцены '+String(Number(source.dataset.zone)+1).padStart(2,'0')+' «'+a.title+'» и «'+b.title+'» поменялись местами. '+(saved?'Сохранено в этом браузере.':'Сохранение недоступно: расстановка действует до закрытия страницы.')}
  catch(error){status.textContent=error.message}
 }
 toggle.onclick=()=>setOpen(panel.hidden);document.getElementById('developer-close').onclick=()=>setOpen(false);
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false)}});
 map.addEventListener('pointerdown',event=>{
  suppressClick=null;if(panel.hidden||event.button!==0)return;
  if(drag||!event.isPrimary){cancelDrag();return}
  const source=marker(event.target);if(!source)return;
  drag={source,pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false,target:null,ghost:null};
  try{source.setPointerCapture(event.pointerId)}catch{}
 });
 map.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointerId)return;
  if(!drag.moved){if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
   drag.moved=true;drag.source.classList.add('map-drag-source');
   const rect=drag.source.getBoundingClientRect(),ghost=drag.source.cloneNode(true);ghost.removeAttribute('data-zone');ghost.removeAttribute('id');ghost.className='map-drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.tabIndex=-1;ghost.style.cssText='width:'+rect.width+'px;height:'+rect.height+'px;';document.body.append(ghost);drag.ghost=ghost;
   status.textContent='Отпустите над другим стендом, чтобы обменять сцены. Esc — отменить.';
  }
  event.preventDefault();drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';
  const hovered=marker(document.elementFromPoint(event.clientX,event.clientY)),target=hovered!==drag.source?hovered:null;
  if(target!==drag.target){drag.target?.classList.remove('map-drop-target');drag.target=target;target?.classList.add('map-drop-target')}
 });
 map.addEventListener('pointerup',event=>{
  if(!drag||event.pointerId!==drag.pointerId)return;
  const source=drag.source,moved=drag.moved,hit=marker(document.elementFromPoint(event.clientX,event.clientY)),target=hit!==source?hit:null;
  clearDrag();if(!moved)return;suppressClick=[source,target];event.preventDefault();if(target&&!panel.hidden)exchange(source,target);else status.textContent='Перетаскивание отменено: отпустите стенд над другим стендом.';
 });
 map.addEventListener('pointercancel',cancelDrag);map.addEventListener('lostpointercapture',event=>{if(drag?.pointerId===event.pointerId)cancelDrag()});
 // A completed drag must not also trigger the marker's normal navigation click.
 map.addEventListener('click',event=>{if(suppressClick&&event.detail!==0&&suppressClick.includes(marker(event.target))){suppressClick=null;event.preventDefault();event.stopImmediatePropagation()}},true);
 map.addEventListener('dragstart',event=>{if(!panel.hidden)event.preventDefault()});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();event.stopImmediatePropagation();cancelDrag()}},true);
 window.addEventListener('blur',cancelDrag);window.addEventListener('resize',cancelDrag);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag()});
 document.getElementById('developer-reset').onclick=()=>{cancelDrag();const saved=layout.reset();status.textContent='Исходная расстановка восстановлена.'+(saved?'':' Браузер не разрешил очистить сохранённую расстановку.')};
})();
