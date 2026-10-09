const uiInfo=(label,text)=>label!=='Демонстрационные данные'?'':`<button type="button" class="info-button" data-info="${esc(text)}" aria-label="Пояснение: ${esc(label)}" aria-describedby="agro-info-tooltip">i</button>`;
const uiTooltip=document.createElement('div');uiTooltip.id='agro-info-tooltip';uiTooltip.className='info-tooltip';uiTooltip.setAttribute('role','tooltip');uiTooltip.hidden=true;document.body.append(uiTooltip);
let uiInfoOwner=null,uiInfoPinned=false,uiInfoTimer;
function uiInfoClose(){uiTooltip.hidden=true;uiInfoOwner=null;uiInfoPinned=false}
function uiInfoShow(button){clearTimeout(uiInfoTimer);uiInfoOwner=button;uiTooltip.textContent=button.dataset.info;uiTooltip.hidden=false;uiTooltip.style.zIndex=$('#modal').open?'9999':'100';
 // Tooltips in an open native dialog must live in its top-layer subtree.
 const parent=$('#modal').open&&$('#modal').contains(button)?$('#modal'):document.body;if(uiTooltip.parentElement!==parent)parent.append(uiTooltip);
 const r=button.getBoundingClientRect(),w=uiTooltip.offsetWidth,h=uiTooltip.offsetHeight;uiTooltip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left))+'px';uiTooltip.style.top=(r.bottom+h+12<innerHeight?r.bottom+8:Math.max(8,r.top-h-8))+'px'}
document.addEventListener('mouseover',e=>{const b=e.target.closest('.info-button');if(b&&!uiInfoPinned)uiInfoShow(b);if(e.target.closest('.info-tooltip'))clearTimeout(uiInfoTimer)});
document.addEventListener('mouseout',e=>{if(e.target.closest('.info-button,.info-tooltip')&&!uiInfoPinned)uiInfoTimer=setTimeout(uiInfoClose,180)});
document.addEventListener('focusin',e=>{const b=e.target.closest('.info-button');if(b)uiInfoShow(b)});
document.addEventListener('focusout',e=>{if(e.target.closest('.info-button')&&!uiInfoPinned)uiInfoClose()});
document.addEventListener('click',e=>{const b=e.target.closest('.info-button');if(b){if(uiInfoPinned&&uiInfoOwner===b)uiInfoClose();else{uiInfoShow(b);uiInfoPinned=true}return}if(!e.target.closest('.info-tooltip'))uiInfoClose()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')uiInfoClose()});
window.addEventListener('resize',uiInfoClose);window.addEventListener('scroll',uiInfoClose,true);

const demoMark=document.createElement('button');demoMark.type='button';demoMark.className='mark info-button demo-mark';demoMark.dataset.info='Это демонстрационная версия сервиса. Заказы, компании, отгрузки и история операций — учебные примеры. Каталог сырья и рецептуры загружены из предоставленных файлов БЭКС. Изменения сохраняются локально в этом браузере и не синхронизируются с другими устройствами. Внешние реестры, реальные оплаты и отправка сообщений не подключены. «Сбросить демо» возвращает исходное состояние и удаляет внесённые здесь изменения.';demoMark.setAttribute('aria-label','Демонстрационная площадка: дополнительное описание');demoMark.setAttribute('aria-describedby','agro-info-tooltip');demoMark.innerHTML='<b>Демонстрационная площадка</b><span>Данные сохранены в этом браузере</span>';$('.top .mark').replaceWith(demoMark);

// Keep the screen description available without a second full header row.
const renderBeforeCompactHelp=render;render=function(){renderBeforeCompactHelp();uiInfoClose();const heading=document.querySelector('.page-heading'),title=heading?.querySelector('h1'),description=heading?.querySelector('p');if(title&&description){const line=document.createElement('div');line.className='page-title-line';title.before(line);line.append(title);description.remove()}};
