
/* Панели остаются в DOM: переключение не теряет введенные значения. */
function selectJobPane(key){const card=document.querySelector('#modal .job-card');if(!card)return;card.querySelectorAll('[data-job-pane]').forEach(p=>p.hidden=p.dataset.jobPane!==key);card.querySelectorAll('[data-job-tab]').forEach(b=>{const active=b.dataset.jobTab===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});const foot=document.querySelector('#modal .dialogfoot');foot?.querySelectorAll('[data-act="job-start"],[data-act="job-finish"]').forEach(b=>b.hidden=b.dataset.act==='job-start'?key!=='plan':key!=='release')}
const drawBeforeJobTabs=drawDialog;
drawDialog=function(){drawBeforeJobTabs();if(dialogType==='job'){selectJobPane(J(dialogId)?.status==='В работе'?'release':'plan');const related=document.querySelector('#modal .dialogbody>.entity-note');if(related)document.querySelector('[data-job-pane="plan"]')?.append(related)}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-job-tab]');if(b)selectJobPane(b.dataset.jobTab)});
document.addEventListener('keydown',e=>{const b=e.target.closest('[data-job-tab]');if(!b||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...b.parentElement.querySelectorAll('[data-job-tab]')],i=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectJobPane(tabs[next].dataset.jobTab);tabs[next].focus()});

// Expanded menu and collapsed flyout share the same process order.
for(const group of navSections){const section=[...document.querySelectorAll('.sidebar .nav-group')].find(d=>d.querySelector('.nav-section-label')?.textContent===group.name),nav=section?.querySelector('.nav');if(!nav)continue;for(const key of group.pages){const existing=[...document.querySelectorAll('.sidebar .nav-group [data-page]')].find(b=>b.dataset.page===key);if(existing)nav.append(existing);else{const b=document.createElement('button');b.dataset.page=key;b.textContent=names[key]||key;nav.append(b)}}}
syncNavigation();
