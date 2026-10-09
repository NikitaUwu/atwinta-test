// Entity names are the entry point; remove redundant "Open" action columns.
function cleanEntityAccess(root){
 if(!root)return;
 for(const b of [...root.querySelectorAll('button')]){
  const label=b.textContent.trim(),act=b.dataset.act||'',id=b.dataset.id;
  if(!/^Открыть(?:\s|$)/i.test(label))continue;
  const type=act.startsWith('open-')?act.slice(5):null,x=type?entityFind(type,id):null;
  const container=b.closest('tr,.lane-head,.route-head,.sheet,.side-panel')||b.parentElement;
  const duplicate=[...container.querySelectorAll('button[data-act]')].find(z=>z!==b&&z.dataset.act===act&&z.dataset.id===id&&!/^Открыть(?:\s|$)/i.test(z.textContent.trim()));
  if(duplicate){duplicate.classList.add('entity-name-link');duplicate.title='Карточка справа';b.remove();continue}
  if(label==='Открыть'&&act==='day-open'){const date=b.closest('tr')?.querySelector('td b');if(date){const a=document.createElement('button');a.className='link entity-name-link';a.dataset.act=act;a.dataset.id=id;a.textContent=date.textContent;a.title='Наряды на выбранный день';date.replaceWith(a);b.remove();continue}}
  if(label==='Открыть'&&x){const cell=b.closest('td'),name=cell?.querySelector('b,strong')||b.closest('tr')?.querySelector('td b,td strong');if(name){const link=document.createElement('button');link.type='button';link.className='link entity-name-link';link.dataset.act=act;link.dataset.id=id;link.textContent=name.textContent;link.title='Карточка справа';name.replaceWith(link);b.remove();continue}b.textContent=x.name||x.company||x.text||('№'+x.id);b.classList.add('link','entity-name-link');b.title='Карточка справа';continue}
  b.textContent=label.replace(/^Открыть\s*/i,'');if(!b.textContent.trim())b.textContent='Подробнее';
 }
 root.querySelectorAll('button[data-act^="open-"].link').forEach(b=>{if(entityFind(b.dataset.act.slice(5),b.dataset.id)){b.classList.add('entity-name-link');b.title='Карточка справа'}});
 root.querySelectorAll('[data-entity-open]').forEach(row=>{row.title='Нажмите название или строку — карточка справа';row.setAttribute('aria-label','Карточка: '+(row.querySelector('.entity-name-link')?.textContent||row.dataset.entityId))});
 // An empty action column has no meaning once names themselves are clickable.
 root.querySelectorAll('table').forEach(t=>{if(t.tHead?.rows.length!==1)return;const header=t.tHead.rows[0];for(let i=header.cells.length-1;i>=0;i--){const rows=[...t.tBodies].flatMap(body=>[...body.rows]);if(rows.length&&rows.every(r=>r.cells.length===header.cells.length&&!r.cells[i].textContent.trim()&&!r.cells[i].querySelector('button,input,select'))){rows.forEach(r=>r.deleteCell(i));header.deleteCell(i)}}});
}
const clearAccessRenderBefore=render;render=function(){clearAccessRenderBefore();cleanEntityAccess($('#app'))};
const clearAccessDrawBefore=drawDialog;drawDialog=function(){clearAccessDrawBefore();cleanEntityAccess($('#modalContent'))};
const clearNotificationBefore=openNotification;openNotification=function(id){clearNotificationBefore(id);cleanEntityAccess($('#modalContent'))};
render();
