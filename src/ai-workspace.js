// Full-page companion to the contextual AI panel. UI state is kept in memory only.
const aiWorkspaceSessions=new Map();
function aiWorkspaceActive(){return page==='ai-assistant'||partnerKind()&&portalUI[partnerKind()==='client'?'clientTab':'supplierTab']==='assistant'}
function aiWorkspaceKey(){
 const role=aiPreviewRole();return role+':'+(role==='client'?portalUI.companyId:role==='supplier'?portalUI.supplierId:'team');
}
function aiWorkspaceSession(){
 const key=aiWorkspaceKey();if(!aiWorkspaceSessions.has(key))aiWorkspaceSessions.set(key,{selected:0,draft:'',context:''});
 return aiWorkspaceSessions.get(key);
}
function aiWorkspaceScope(){
 const role=aiPreviewRole();
 return role==='client'?portalCompany()?.name||'Компания клиента':role==='supplier'?portalSupplier(portalUI.supplierId)?.name||'Компания поставщика':role==='buyer'?'Снабжение предприятия':'Команда предприятия';
}
// Fixed examples of future interpretation, not NLP or a query over service data.
function aiWorkspaceUnderstanding(role,index){
 const scenarios={
  client:[
   {task:'Узнать готовность заказа и срок доставки.',subject:'Ваш заказ',period:'До получения заказа',clarify:'О каком заказе речь? Можно указать его номер в сообщении.'},
   {task:'Повторить прошлую закупку с более ранней доставкой.',subject:'Предыдущий заказ и доступные товары',period:'Желаемая дата получения',clarify:'Какой заказ повторить и к какой дате нужна доставка?'}
  ],
  supplier:[
   {task:'Найти ваши поставки без подтверждения покупателя.',subject:'Ваши заказы покупателя',period:'Текущие согласования'},
   {task:'Оценить перенос отгрузки и необходимость согласования.',subject:'Ваша отгрузка',period:'Понедельник — точную дату нужно уточнить',clarify:'Какую отгрузку переносим и какой понедельник вы имеете в виду?'}
  ],
  buyer:[
   {task:'Сравнить закупку пшеницы по полной стоимости.',subject:'Предложения пшеницы и условия доставки',period:'Актуальные предложения',clarify:'Какой объём нужен, куда и к какой дате доставить?'},
   {task:'Выявить задания, которым может не хватить сырья.',subject:'Остатки, потребность нарядов и поставка',period:'До ответа поставщика в понедельник',clarify:'О каком поставщике и сырье речь? Ответ в понедельник ещё не означает поставку в этот день.'}
  ],
  manager:[
   {task:'Проверить, хватит ли пшеницы на заказы в Юргу.',subject:'Пшеница и заказы с доставкой в Юргу',period:'До ожидаемого поступления сырья',clarify:'Когда ожидается поступление? Ответ поставщика в понедельник не определяет дату поставки.'},
   {task:'Оценить влияние переноса заказа на исполнение.',subject:'Заказ, связанные наряды и рейсы',period:'Новая дата исполнения',clarify:'Какой заказ и на какую дату переносим?'}
  ]
 };
 return scenarios[role]?.[index];
}
function aiWorkspaceContent(){
 const state=aiWorkspaceSession(),examples=aiPreviewExamples(),selected=state.selected===null?null:examples[state.selected];
 const role=aiPreviewRole(),understanding=selected?aiWorkspaceUnderstanding(role,state.selected):null;
 const narrow=matchMedia('(max-width:900px)').matches;
 const history=examples.map((x,i)=>({x,i})).filter(({x})=>[x.title,x.question].join(' ').toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
 return `<div class="ai-workspace-intro"><span class="ai-preview-eyebrow">${aiSpark} ИИ · макет рабочего раздела</span><p>Примеры показывают будущий вид анализа. ИИ и расчёты не подключены.</p></div><div class="ai-workspace-layout">
 <details class="ai-workspace-history" ${narrow?'':'open'}><summary>История диалогов</summary><div class="ai-workspace-history-body"><button type="button" class="ai-workspace-new" data-ai-workspace="new">${aiSpark} Новый диалог</button><span class="ai-preview-label">Демонстрационные диалоги</span><nav aria-label="История ИИ-диалогов">${history.map(({x,i})=>`<button type="button" data-ai-workspace="sample" data-ai-index="${i}" ${state.selected===i?'aria-current="true"':''}><strong>${esc(x.title)}</strong><span>Пример · ${esc(aiWorkspaceScope())}</span></button>`).join('')||'<p class="ai-workspace-muted">По вашему поиску диалогов нет.</p>'}</nav><p class="ai-workspace-history-note">История пока состоит из примеров. Сохранение переписки появится после подключения сервиса.</p></div></details>
 <section class="ai-workspace-conversation" aria-label="Диалог с ИИ-помощником"><header class="ai-workspace-conversation-head"><div><span class="ai-preview-label">${selected?'Демонстрационный диалог':'Новый диалог'}</span><h2>${esc(selected?.title||'Что хотите выяснить?')}</h2></div><span class="ai-workspace-role">${esc({client:'Клиент',supplier:'Поставщик',buyer:'Закупщик',manager:'Команда'}[role])}</span></header>
 <div class="ai-workspace-messages" aria-live="polite">${selected?`<div class="ai-workspace-user-message"><span>Ваш вопрос · пример</span><p>${esc(selected.question)}</p></div><article class="ai-workspace-answer"><div class="ai-workspace-answer-heading">${aiSpark}<strong>Помощник</strong><span>Пример ответа</span></div><p>${esc(selected.text)}</p>${understanding?.clarify?`<aside class="ai-workspace-clarification"><strong>Пример уточнения перед расчётом</strong><p>${esc(understanding.clarify)}</p></aside>`:''}<dl class="ai-workspace-result-metrics">${selected.metrics.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><section class="ai-workspace-evidence"><h3>${role==='buyer'?'Сравнение предложений':role==='manager'?'Связанные объекты и последствия':'Связанные заказы и поставки'}</h3><p>Место для подробной таблицы. Значения не рассчитаны.</p><div class="ai-workspace-table-wrap" tabindex="0" role="region" aria-label="Пример таблицы результата"><table><thead><tr><th>${role==='buyer'?'Предложение':'Объект'}</th><th>${role==='buyer'?'Стоимость с доставкой':'Состояние'}</th><th>${role==='buyer'?'Срок':'Следующее действие'}</th></tr></thead><tbody><tr><td>Будет найден</td><td>Не рассчитано</td><td>Нужно уточнить</td></tr></tbody></table></div></section><section class="ai-workspace-source-list"><h3>На чём будет основан ответ</h3><ul>${selected.sources.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><small>Источники показаны как пример; данные не запрашиваются.</small></section><div class="ai-workspace-answer-actions"><button type="button" disabled>${esc(selected.next)}</button><button type="button" disabled>Сохранить результат</button></div></article>`:`<section class="ai-workspace-welcome">${aiSpark}<h2>Задайте вопрос по данным сервиса</h2><p>Можно разобраться в сроках, сравнить условия или оценить последствия изменений.</p><div>${examples.map((x,i)=>`<button type="button" data-ai-workspace="sample" data-ai-index="${i}">${esc(x.question)}</button>`).join('')}</div></section>`}</div>
 <footer class="ai-workspace-composer"><label for="ai-workspace-question">Ваш вопрос</label><textarea id="ai-workspace-question" rows="3" placeholder="Опишите задачу своими словами">${esc(state.draft)}</textarea><div><span>Свободные вопросы пока не обрабатываются</span><button type="button" disabled>Отправить</button></div></footer></section>
 <details class="ai-workspace-context" ${narrow?'':'open'}><summary>Как помощник понял вопрос</summary><div class="ai-workspace-context-body"><div class="ai-workspace-context-scope"><span>Компания из текущего кабинета</span><strong>${esc(aiWorkspaceScope())}</strong></div>${state.context?`<div class="ai-workspace-entry"><span>Открыто из</span><p class="ai-workspace-context-name">${esc(state.context)}</p></div>`:''}${understanding?`<span class="ai-preview-label">Пример понимания вопроса</span><p class="ai-workspace-task">${esc(understanding.task)}</p><dl class="ai-workspace-understanding"><div><dt>О чём речь</dt><dd>${esc(understanding.subject)}</dd></div><div><dt>Какие сроки важны</dt><dd>${esc(understanding.period)}</dd></div></dl>`:'<p class="ai-workspace-muted">Объекты и сроки будут определяться из вашего вопроса и переписки.</p>'}<small>Если помощник понял вас неверно, уточните обычным сообщением. При неоднозначности он задаст вопрос.</small><div class="ai-workspace-access-note">${role==='client'?'Только ваши заявки, заказы и условия.':role==='supplier'?'Только ваши предложения, заказы и отгрузки.':'Доступ к данным определяется правами сотрудника.'}</div></div></details></div>`;
}
function aiWorkspaceOpen(context='',fromPanel=false){
 const role=aiPreviewRole(),sample=aiPreviewSample;
 if(aiPreviewDialog.open)aiPreviewDialog.close();if(portalDialog.open)portalDialog.close();if($('#modal').open)$('#modal').close();
 closeControlPopup();closeNavFlyout();query='';
 if(role==='client'||role==='supplier')portalUI[role==='client'?'clientTab':'supplierTab']='assistant';
 else{aiAssistantInternalRole=role==='buyer'?'buyer':'manager';page='ai-assistant'}
 const state=aiWorkspaceSession();if(context)state.context=context;if(fromPanel)state.selected=sample;
 render();const title=partnerKind()?partnerRoot.querySelector('.partner-page-head h1'):$('#app .page-heading h1');
 if(title){title.tabIndex=-1;title.focus({preventScroll:true})}
}
const aiWorkspaceClientBefore=partnerClientContent;
partnerClientContent=function(){return portalUI.clientTab==='assistant'?aiWorkspaceContent():aiWorkspaceClientBefore()};
const aiWorkspaceSupplierBefore=partnerSupplierContent;
partnerSupplierContent=function(){return portalUI.supplierTab==='assistant'?aiWorkspaceContent():aiWorkspaceSupplierBefore()};
const aiWorkspaceViewBefore=view;
view=function(){return page==='ai-assistant'?aiWorkspaceContent():aiWorkspaceViewBefore()};

// A direct entry in the expanded menu and the collapsed navigation rail.
const aiWorkspaceNav=document.createElement('nav');aiWorkspaceNav.className='nav ai-workspace-navigation';aiWorkspaceNav.setAttribute('aria-label','ИИ-помощник');
aiWorkspaceNav.innerHTML=`<button type="button" data-ai-workspace="open">${aiSpark}<span>ИИ-помощник</span></button>`;sidebarStats.before(aiWorkspaceNav);
navRail.insertAdjacentHTML('beforeend',`<button type="button" data-ai-workspace="open" aria-label="ИИ-помощник" title="ИИ-помощник">${aiSpark}<span class="rail-marker" aria-hidden="true"></span></button>`);

// Keep quick questions in the drawer, with a continuation on the full page.
const aiWorkspacePanelBefore=aiPreviewAssistantBody;
aiPreviewAssistantBody=function(){return aiWorkspacePanelBefore().replace('<footer class="ai-preview-composer">',`<footer class="ai-preview-composer"><button type="button" class="ai-workspace-expand" data-ai-workspace="expand">Открыть полный раздел</button>`)};
function aiWorkspaceDecorate(){
 const active=!!aiWorkspaceActive();document.body.classList.toggle('ai-workspace-mode',active);
 document.querySelectorAll('.sidebar [data-ai-workspace="open"]').forEach(b=>{b.classList.toggle('active',page==='ai-assistant');if(page==='ai-assistant')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 if(!active)return;
 if(partnerKind()){
  const head=partnerRoot.querySelector('.partner-page-head');head.querySelector('p').textContent='Диалоги, расчёты и связанные данные';head.querySelectorAll('button').forEach(b=>b.remove());
  const search=partnerRoot.querySelector('#partner-search');search.placeholder='Поиск по диалогам';search.setAttribute('aria-label','Поиск по диалогам');
 }else{
  $('#crumb').textContent='ИИ-помощник';
  const head=$('#app .page-heading');if(head){
   const note=head.querySelector('p'),eyebrow=head.querySelector('.eyebrow');
   if(note)note.textContent='Диалоги, расчёты и связанные данные';
   else head.querySelector('h1')?.insertAdjacentHTML('afterend','<p>Диалоги, расчёты и связанные данные</p>');
   if(eyebrow)eyebrow.textContent='Помощник по данным сервиса';
  }
  const search=$('#search');if(search){search.placeholder='Поиск по диалогам';search.setAttribute('aria-label','Поиск по диалогам')}
 }
}
document.addEventListener('click',event=>{
 const control=event.target.closest('[data-ai-workspace]');if(!control)return;event.preventDefault();const action=control.dataset.aiWorkspace;
 if(action==='open')return aiWorkspaceOpen();
 if(action==='expand')return aiWorkspaceOpen(aiPreviewContext,true);
 if(!aiWorkspaceActive())return;
 const state=aiWorkspaceSession();
 if(action==='new'){state.selected=null;state.draft='';state.context='';query='';render();$('#ai-workspace-question').focus()}
 if(action==='sample'){
  state.selected=Number(control.dataset.aiIndex);state.draft='';state.context='';render();
  const button=document.querySelector(`.ai-workspace-history [data-ai-index="${state.selected}"]`);
  if(button&&button.getClientRects().length)button.focus({preventScroll:true});
  else{const title=document.querySelector('.ai-workspace-conversation-head h2');title.tabIndex=-1;title.focus({preventScroll:true})}
 }
});
document.addEventListener('input',event=>{if(event.target.id==='ai-workspace-question')aiWorkspaceSession().draft=event.target.value});
const aiWorkspaceRenderBefore=render;
render=function(){aiWorkspaceRenderBefore();aiWorkspaceDecorate()};
render();
