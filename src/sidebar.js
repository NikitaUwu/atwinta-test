// Collapsible navigation: section rail with access to every child screen.
const navSections=[
 {name:'Продажи',icon:'M4 4h16v16H4zM8 8h8M8 12h8M8 16h4',pages:['companies','clients','orders','sales','revenue']},
 {name:'Снабжение',icon:'M3 9l9-6 9 6v12H3V9zm5 12v-9h8v9M8 16h8',pages:['raw','purchases']},
 {name:'Производство',icon:'M3 21V10l6 3V7l6 3V3h6v18H3zm4-4h2m4 0h2m3 0h1',pages:['needs','production','days','shifts','stock','recipes','prodreport']},
 {name:'Логистика',icon:'M2 5h12v12H2zm12 4h4l4 5v3h-8M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4m11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4',pages:['shipments','trips']},
 {name:'Процесс',icon:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m-3-14a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01',pages:['guide']}
];
const navSvg=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
let navCollapsed=localStorage.getItem('agro-nav-collapsed')===null?matchMedia('(max-width:760px)').matches:localStorage.getItem('agro-nav-collapsed')==='true',navOpenGroup=null;
const navToggle=document.createElement('button');navToggle.id='nav-toggle';navToggle.className='nav-toggle';navToggle.setAttribute('aria-controls','nav-rail');navToggle.innerHTML=navSvg('M4 6h16M4 12h16M4 18h16');$('.brand').append(navToggle);
const navRail=document.createElement('nav');navRail.id='nav-rail';navRail.className='nav-rail';navRail.setAttribute('aria-label','Основные разделы');navRail.innerHTML=navSections.map((g,i)=>`<button type="button" data-nav-section="${i}" aria-label="${g.name}" title="${g.name}" aria-expanded="false" aria-controls="nav-flyout">${navSvg(g.icon)}<span class="rail-marker" aria-hidden="true"></span></button>`).join('');$('.brand').after(navRail);
const navFlyout=document.createElement('div');navFlyout.id='nav-flyout';navFlyout.className='nav-flyout';navFlyout.hidden=true;document.body.append(navFlyout);
const navBackdrop=document.createElement('button');navBackdrop.className='nav-backdrop';navBackdrop.setAttribute('aria-label','Закрыть меню');navBackdrop.tabIndex=-1;document.body.append(navBackdrop);
function syncNavigation(){document.body.classList.toggle('nav-collapsed',navCollapsed);navToggle.setAttribute('aria-expanded',String(!navCollapsed));navToggle.setAttribute('aria-label',navCollapsed?'Развернуть меню':'Свернуть меню');navToggle.title=navCollapsed?'Развернуть меню':'Свернуть меню';navRail.querySelectorAll('button[data-nav-section]').forEach(b=>{const i=Number(b.dataset.navSection),active=navSections[i].pages.includes(page);b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');b.setAttribute('aria-expanded',String(navOpenGroup===i))});document.querySelectorAll('.sidebar .nav [data-page],.nav-flyout [data-page]').forEach(b=>{if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
function closeNavFlyout(focus=false){const index=navOpenGroup;navOpenGroup=null;navFlyout.hidden=true;syncNavigation();if(focus&&index!==null)navRail.querySelector(`[data-nav-section="${index}"]`).focus()}
function setNavCollapsed(value){closeNavFlyout();navCollapsed=value;localStorage.setItem('agro-nav-collapsed',String(value));syncNavigation()}
function openNavGroup(index){if(navOpenGroup===index){closeNavFlyout(true);return}navOpenGroup=index;const g=navSections[index];navFlyout.innerHTML=`<div class="flyout-heading"><b>${g.name}</b><button type="button" class="flyout-close" aria-label="Закрыть раздел">×</button></div><nav aria-label="${g.name}">${g.pages.map(p=>`<button type="button" data-page="${p}" class="${page===p?'active':''}">${esc(names[p]||p)}</button>`).join('')}</nav>`;navFlyout.hidden=false;const box=navRail.querySelector(`[data-nav-section="${index}"]`).getBoundingClientRect();navFlyout.style.left=Math.min(box.right+14,innerWidth-navFlyout.offsetWidth-8)+'px';navFlyout.style.top=Math.max(8,Math.min(box.top,innerHeight-navFlyout.offsetHeight-8))+'px';syncNavigation();(navFlyout.querySelector(`[data-page="${page}"]`)||navFlyout.querySelector('[data-page]')).focus()}
navToggle.addEventListener('click',()=>setNavCollapsed(!navCollapsed));navBackdrop.addEventListener('click',()=>setNavCollapsed(true));navRail.addEventListener('click',e=>{const b=e.target.closest('[data-nav-section]');if(b)openNavGroup(Number(b.dataset.navSection))});
document.addEventListener('click',e=>{if(e.target.closest('.flyout-close'))closeNavFlyout(true);else if(e.target.closest('[data-page]')){closeNavFlyout();if(matchMedia('(max-width:760px)').matches&&!navCollapsed)setNavCollapsed(true)}else if(!e.target.closest('.nav-flyout,.nav-rail'))closeNavFlyout()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(navOpenGroup!==null){closeNavFlyout(true);e.preventDefault()}else if(matchMedia('(max-width:760px)').matches&&!navCollapsed){setNavCollapsed(true);navToggle.focus()}}});
window.addEventListener('resize',()=>closeNavFlyout());
const renderWithSidebar=render;render=function(){const side=$('.sidebar'),offset=side.scrollTop;renderWithSidebar();syncNavigation();side.scrollTop=offset};render();

// Operational snapshot uses the current calendar day, independently of screen filters.
function sidebarCalendarDay(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
const sidebarStats=document.createElement('section');sidebarStats.className='sidebar-stats';sidebarStats.setAttribute('aria-label','Показатели на сегодня');$('.sidebar .sidefoot').before(sidebarStats);
function renderSidebarStats(){
 const day=sidebarCalendarDay(),asOf=d=>!d||d.slice(0,10)<=day;
 const actual=sum(S.tasks.filter(t=>t.sent&&t.sentAt&&asOf(t.sentAt)),t=>t.qty*(t.unitPrice??P(t.p)?.price??0)),target=Number(S.target)||0,pct=target>0?Math.round(actual/target*100):null;
 const approvals=S.purchases.filter(p=>p.status==='Черновик'&&asOf(p.date)).length;
 const jobs=S.jobs.filter(j=>asOf(j.created)&&asOf(j.date));
 const working=jobs.filter(j=>j.status==='В работе').length,queued=jobs.filter(j=>j.status==='Очередь').length;
 const waiting=new Set(S.tasks.filter(t=>!t.sent&&asOf(t.date)&&O(t.order)?.lines.some(l=>l.qty>l.sent)).map(t=>t.order)).size;
 sidebarStats.innerHTML=`<div class="sidebar-stats-date">На сегодня · ${day.split('-').reverse().join('.')}</div>
 <button class="sidebar-stat" data-page="sales"><span>Продажи</span><strong>${pct===null?'План не задан':pct+'%'}</strong><small>Выполнение плана</small><div class="sidebar-stat-progress" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,pct||0))}%"></i></div><small>${rub(actual)} / ${rub(target)}<br>Общий план · факт на сегодня</small></button>
 <button class="sidebar-stat" data-page="purchases"><span>Снабжение</span><strong>${approvals}</strong><small>Заявки на согласование</small></button>
 <button class="sidebar-stat" data-page="production"><span>Производство</span><div class="sidebar-stat-pair"><small>В работе <b>${working}</b></small><small>В очереди <b>${queued}</b></small></div></button>
 <button class="sidebar-stat" data-page="shipments"><span>Ждут отгрузки</span><strong>${waiting} <small>заказов</small></strong></button>`;
}
const renderWithSidebarStats=render;render=function(){renderWithSidebarStats();renderSidebarStats()};render();
setInterval(()=>{if(sidebarStats.dataset.day!==sidebarCalendarDay()){renderSidebarStats();sidebarStats.dataset.day=sidebarCalendarDay()}},30000);
