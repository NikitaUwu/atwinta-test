// Separate partner interfaces over shared demo records. This is not authentication.
const partnerTabs={
 client:[['overview','Обзор'],['catalog','Каталог'],['requests','Мои заявки'],['orders','Заказы'],['documents','Документы'],['assistant','ИИ-помощник']],
 supplier:[['overview','Обзор'],['requests','Запросы покупателя'],['listings','Мои предложения'],['purchases','Заказы покупателя'],['deliveries','Отгрузки'],['documents','Документы'],['assistant','ИИ-помощник']]
};
const partnerRoot=document.createElement('div');partnerRoot.id='partner-space';partnerRoot.hidden=true;document.body.append(partnerRoot);
let partnerLastRoute='',partnerPaintedRole='';
function partnerKind(){return page==='client-portal'?'client':page==='supplier-portal'?'supplier':null}
function partnerRequest(id){return ensurePortalPrototype().requests.find(r=>r.id===id)}
function partnerHistory(x,text){(x.history||=[]).push({text,date:TODAY})}
function partnerEnsure(){
 const data=ensurePortalPrototype();data.requests.forEach((r,i)=>{r.number||='З-'+String(i+1).padStart(3,'0');r.origin||='client';r.history||=[{text:r.origin==='manager'?'Менеджер подготовил предложение':'Клиент отправил заявку',date:r.created}]});
 return data;
}
function partnerRequestActions(r,internal){
 if(internal){
  if(r.orderId)return portalButton('Заказ №'+r.orderId+' в CRM','crm-order',r.orderId);
  if(r.status==='Условия приняты')return portalButton('Создать заказ в CRM','request-convert',r.id,true);
  return portalButton(r.proposal?'Изменить предложение':'Предложить условия','request-propose',r.id,true);
 }
 return r.status==='Ожидает подтверждения клиента'?portalButton('Проверить условия','request-review',r.id,true):portalButton('История заявки','request-review',r.id);
}
portalRequestCard=function(r,internal=false){
 const c=S.companies.find(c=>String(c.id)===String(r.companyId)),p=r.proposal;
 return `<article class="proto-order" data-request-id="${esc(r.id)}"><div class="proto-order-top"><div><div class="proto-caption">${esc(r.number||'Заявка')} · ${r.origin==='manager'?'Предложение менеджера':'Заявка клиента'}${internal?' · '+esc(c?.name||'Компания'):''}</div><h3>${esc(P(p?.productId||r.productId)?.name||'Продукция')} · ${kg(p?.qty||r.qty)}</h3></div>${portalBadge(r.status,r.status==='Условия приняты'||r.orderId?'good':'warn')}</div><p>${p?'Предлагаемый':'Желаемый'} срок получения: ${portalDate(p?.due||r.due)} · ${esc(p?.delivery||r.delivery)}</p>${p?`<div class="proto-order-bottom"><span>${rub(p.price)} / кг · доставка ${rub(p.deliveryCost)}</span><strong>${rub(p.qty*p.price+p.deliveryCost)}</strong></div>`:''}${r.comment?`<p class="proto-caption">${esc(r.comment)}</p>`:''}<div class="proto-actions">${partnerRequestActions(r,internal)}</div></article>`;
};
function partnerTimeline(x){return `<ol class="partner-timeline">${(x.history||[]).map(h=>`<li><span>${portalDate(h.date)}</span><p>${esc(h.text)}</p></li>`).join('')}</ol>`}
function partnerReviewRequest(id){
 const r=partnerRequest(id);if(page!=='client-portal'||!r||String(r.companyId)!==String(portalUI.companyId))return;
 const p=r.proposal,actions=r.status==='Ожидает подтверждения клиента'?`<div class="proto-actions">${portalButton('Принять условия','request-accept',id,true)}${portalButton('Попросить изменить','request-revise',id)}</div>`:'';
 portalOpen('Заявка '+r.number,`<div class="proto">${portalBadge(r.status,'warn')}${p?`<dl class="proto-summary"><div><dt>Продукция</dt><dd>${esc(P(p.productId)?.name)}</dd></div><div><dt>Количество</dt><dd>${kg(p.qty)}</dd></div><div><dt>Цена за кг / доставка</dt><dd>${rub(p.price)} / ${rub(p.deliveryCost)}</dd></div><div><dt>Итого</dt><dd>${rub(p.qty*p.price+p.deliveryCost)}</dd></div><div><dt>Предлагаемый срок получения</dt><dd>${portalDate(p.due)} · ${esc(p.time||'')}</dd></div><div><dt>Получение / адрес</dt><dd>${esc(p.delivery)} · ${esc(p.address)}</dd></div><div><dt>Оплата и условия</dt><dd>${esc(p.terms)}</dd></div></dl><p class="proto-dialog-note">Предложение менеджера · версия ${p.revision}. Принятие условий передает заявку менеджеру для создания заказа.</p>`:'<p>Менеджер рассматривает заявку и подготовит цену и условия.</p>'}${actions}${partnerTimeline(r)}</div>`,'',{type:'review-request',requestId:id,revision:p?.revision});
}
function partnerProposalForm(id){
 if(partnerKind())return;const r=id?partnerRequest(id):null;if(id&&(!r||r.orderId||r.status==='Условия приняты'))return;
 const p=r?.proposal,c=r?S.companies.find(c=>String(c.id)===String(r.companyId)):S.companies[0];
 portalOpen(r?'Условия по заявке '+r.number:'Предложение клиенту',`<p class="proto-dialog-note">Клиент увидит предложение в «Моих заявках». Заказ, складские резервы и наряды пока не создаются.</p><div class="formgrid">${r?'<p class="proto-wide">Компания: <b>'+esc(c?.name)+'</b></p>':portalSelect('Компания клиента','companyId',S.companies.map(x=>[x.id,x.name]),c?.id)}${portalSelect('Продукция','productId',S.products.map(x=>[x.id,x.name]),p?.productId||r?.productId||S.products[0]?.id)}${portalField('Количество, кг','qty',p?.qty||r?.qty||1000,'number','min="1" step="1" required')}${portalField('Цена за кг, ₽','price',p?.price||P(r?.productId)?.price||S.products[0]?.price||'','number','min="0.01" step="0.01" required')}${portalField('Доставка, ₽','deliveryCost',p?.deliveryCost??0,'number','min="0" step="0.01" required')}${portalField('Предлагаемый срок получения','due',p?.due||r?.due||portalDay(4),'date','required')}${portalField('Время получения','dueTime',p?.time||'18:00','time','required')}${portalSelect('Получение','delivery',[['Доставка клиенту','Доставка клиенту'],['Самовывоз','Самовывоз']],p?.delivery||r?.delivery||'Доставка клиенту')}<div class="proto-wide">${portalField('Адрес / место самовывоза','address',p?.address||r?.address||c?.address||'')}</div><label class="field proto-wide">Оплата и согласуемые условия<textarea name="terms" required>${esc(p?.terms||c?.terms||'Условия оплаты согласуются с менеджером')}</textarea></label></div>`,'Отправить клиенту',{type:'partner-proposal',requestId:r?.id,companyId:r?.companyId,revision:p?.revision||0});
}
function partnerClientCatalog(){
 const products=S.products.filter(portalTextMatch),shown=portalUI.allProducts?products:products.slice(0,6);
 return `<p class="proto-doc-note">Каталог предприятия. Цену, количество и доставку менеджер подтвердит в предложении.</p><div class="proto-products">${shown.map(p=>`<article class="proto-product"><span class="proto-avatar">${icon('box')}</span><h3>${esc(p.name)}</h3><p>${esc(p.pack||'Упаковка уточняется')} · гранула ${esc(p.granule||'уточняется')}</p><div class="proto-price">${rub(p.price||0)} / кг<small>Ориентировочная учебная цена</small></div>${portalButton('Оставить заявку','product',p.id,true)}</article>`).join('')||portalEmpty('Продукция не найдена','Измените поиск.')}</div>${!portalUI.allProducts&&products.length>6?portalButton('Весь каталог','catalog-all'):''}`;
}
function partnerClientContent(){
 const data=partnerEnsure(),requests=portalCompanyRequests(),orders=portalCompanyOrders().filter(o=>o.agreed||o.portalRequestId),needs=requests.filter(r=>r.status==='Ожидает подтверждения клиента');
 const reqs=rs=>`<div class="proto-stack">${rs.filter(portalTextMatch).map(r=>portalRequestCard(r)).join('')||portalEmpty('Заявок пока нет','Выберите продукцию в каталоге или создайте заявку.')}</div>`;
 const ords=os=>`<div class="proto-stack">${os.filter(portalTextMatch).map(portalOrderCard).join('')||portalEmpty('Заказов пока нет','После согласования заявки менеджер создаст заказ. Здесь появится ход его выполнения.')}</div>`;
 if(portalUI.clientTab==='catalog')return partnerClientCatalog();
 if(portalUI.clientTab==='requests')return `<p class="partner-explanation">Здесь вы обсуждаете состав, цену и доставку. Заявка станет заказом после согласования и оформления менеджером.</p>${reqs(requests.slice().reverse())}`;
 if(portalUI.clientTab==='orders')return `<p class="partner-explanation">Здесь — выполнение оформленных заказов: готовность продукции и отправка. Изменения направляются менеджеру на рассмотрение.</p>${ords(orders)}`;
 if(portalUI.clientTab==='documents')return portalDocuments('client');
 return `<section class="partner-welcome"><div><h1>Все ваши поставки — в одном месте</h1><p>Заказывайте продукцию, согласовывайте условия и следите за выполнением.</p></div>${portalButton('Новая заявка','new-request','',true)}</section>${portalKpis([['Заказы в работе',orders.filter(o=>o.lines.some(l=>l.sent<l.qty)).length,'Оформлены менеджером'],['Ждут вашего ответа',needs.length,'Предложения по заявкам'],['Заявки на рассмотрении',requests.filter(r=>['Отправлена','В работе у менеджера','Нужны изменения'].includes(r.status)).length,'Менеджер готовит условия']])}${needs.length?portalPanel('Проверьте условия',reqs(needs)):''}<div class="partner-columns">${portalPanel('Последние заказы',ords(orders.slice(-2)),portalButton('Все заказы','tab','client:orders'))}${portalPanel('Заявки и предложения',reqs(requests.slice(-2).reverse()),portalButton('Все заявки','tab','client:requests'))}</div>`;
}
function partnerSupplierContent(){
 const data=partnerEnsure(),rfqs=data.rfqs.filter(r=>portalCanRespond(r,portalUI.supplierId)),purchases=data.purchases.filter(p=>p.supplierId===portalUI.supplierId),waiting=purchases.filter(p=>p.status==='Ожидает подтверждения');
 const cards=ps=>`<div class="proto-stack">${ps.filter(portalTextMatch).map(p=>portalPurchaseCard(p,true)).join('')||portalEmpty('Заказов пока нет','Здесь появятся адресованные вашей компании заказы покупателя.')}</div>`;
 if(portalUI.supplierTab==='listings')return portalTradingOwnListings(data);
 if(portalUI.supplierTab==='documents')return portalDocuments('supplier');
 if(portalUI.supplierTab==='requests')return `<p class="partner-explanation">Потребности покупателя, на которые вы можете ответить своими условиями. Ваш отклик еще не является заказом.</p><div class="proto-stack">${rfqs.filter(portalTextMatch).map(r=>portalRfqCard(r,true)).join('')||portalEmpty('Доступных запросов нет','Здесь появятся открытые запросы и приглашения вашей компании.')}</div>`;
 if(portalUI.supplierTab==='purchases')return `<p class="partner-explanation">Покупатель выбрал ваши условия и направил заказ. Подтвердите объем, цену, доставку и срок перед исполнением.</p>${cards(purchases)}`;
 if(portalUI.supplierTab==='deliveries')return `<p class="partner-explanation">Подтвержденные заказы к отгрузке. Сообщение об отправке не означает приемку на складе покупателя.</p>${cards(purchases.filter(p=>p.status!=='Ожидает подтверждения'))}`;
 return `<section class="partner-welcome"><div><h1>От предложения до поставки</h1><p>Получайте запросы покупателя, публикуйте сырье и согласовывайте заказы.</p></div>${portalButton('Разместить предложение','listing-new','',true)}</section>${portalKpis([['Доступные запросы',rfqs.length,'Открытые и по приглашению'],['Заказы к подтверждению',waiting.length,'Покупатель ждет вашего ответа'],['К отгрузке',purchases.filter(p=>p.status==='Подтвержден').length,'Условия подтверждены']])}<div class="partner-columns">${portalPanel('Нужен ваш ответ',cards(waiting),portalButton('Все заказы','tab','supplier:purchases'))}${portalPanel('Запросы покупателя',`<div class="proto-stack">${rfqs.slice(0,2).map(r=>portalRfqCard(r,true)).join('')||portalEmpty('Запросов нет','Публикуйте собственные предложения сырья.')}</div>`,portalButton('Все запросы','tab','supplier:requests'))}</div>`;
}
function partnerRolePicker(current){return `<details class="space-switch"><summary>Сменить пространство <small>демо</small></summary><div class="space-switch-menu">${[['manager','Команда предприятия'],['client','Клиент'],['supplier','Поставщик']].map(([id,label])=>`<button type="button" data-space-role="${id}" ${current===id?'aria-current="true"':''}>${label}</button>`).join('')}<p>Просмотр ролей прототипа. Это не вход в учетную запись.</p></div></details>`}
function partnerRender(){
 const kind=partnerKind(),key=kind==='client'?'clientTab':'supplierTab',company=kind==='client'?portalCompany():portalSupplier(portalUI.supplierId),tab=portalUI[key];
 const label=partnerTabs[kind].find(t=>t[0]===tab)?.[1]||'Обзор';
 partnerRoot.innerHTML=`<header class="partner-header"><a href="#${page}" class="partner-brand" data-partner-home><span class="brand-symbol">${$('.layout .brand-symbol svg').outerHTML}</span><span><b>АГРО · Атвинта</b><small>${kind==='client'?'Кабинет клиента':'Кабинет поставщика'}</small></span></a><div class="partner-header-right"><span class="partner-company">${esc(company?.name||'Компания')}</span>${partnerRolePicker(kind)}</div></header><div class="partner-body"><aside class="partner-sidebar"><div class="partner-organization"><span class="proto-avatar">${icon(kind==='client'?'box':'truck')}</span><div><b>${esc(company?.name||'Компания')}</b><small>${kind==='client'?'Покупатель продукции':'Поставщик сырья'}</small></div></div><nav aria-label="Разделы кабинета ${kind==='client'?'клиента':'поставщика'}">${partnerTabs[kind].map(([id,title])=>`<button type="button" data-proto-act="tab" data-id="${kind}:${id}" ${tab===id?'aria-current="page"':''}>${title}</button>`).join('')}</nav><details class="partner-demo-company"><summary>Другая компания · демо</summary>${portalContext(kind)}</details><p class="partner-demo-note">Локальный прототип.<br>Вход, обмен через сервер и реальные файлы пока не подключены.</p></aside><main class="partner-main"><div class="partner-page-head"><div><h1>${tab==='overview'?'Личный кабинет':label}</h1><p>${kind==='client'?'Ваши заявки и выполнение заказов':'Ваши предложения и заказы покупателя'}</p></div>${tab==='overview'?'':kind==='client'?portalButton('Новая заявка','new-request','',true):portalButton('Разместить предложение','listing-new','',true)}</div><label class="partner-search">${icon('search')}<input type="search" id="partner-search" value="${esc(query)}" placeholder="${kind==='client'?'Найти продукцию, заявку или заказ':'Найти сырье, запрос или заказ'}" aria-label="Поиск в кабинете"></label><div class="proto partner-content">${kind==='client'?partnerClientContent():partnerSupplierContent()}</div></main></div>`;
 enhanceControls();
}
function partnerReadRoute(){
 const hash=location.hash;if(hash===partnerLastRoute||hash.slice(1).split('?')[0]!==page)return;
 const kind=partnerKind();if(!kind)return;const p=new URLSearchParams(hash.split('?')[1]||''),key=kind==='client'?'clientTab':'supplierTab',section=p.get('section')||'overview';
 portalUI[key]=partnerTabs[kind].some(t=>t[0]===section)?section:'overview';
 if(kind==='client'&&S.companies.some(c=>String(c.id)===p.get('company')))portalUI.companyId=p.get('company');
 if(kind==='supplier'&&ensurePortalPrototype().suppliers.some(s=>s.id===p.get('company')))portalUI.supplierId=p.get('company');
 partnerLastRoute=hash;
}
function partnerWriteRoute(){
 const kind=partnerKind(),p=new URLSearchParams({section:portalUI[kind==='client'?'clientTab':'supplierTab'],company:String(kind==='client'?portalUI.companyId:portalUI.supplierId)}),hash='#'+page+'?'+p;
 if(location.hash!==hash&&!readingRoute)history.pushState(null,'',location.pathname+location.search+hash);
 partnerLastRoute=location.hash;routeScreen=page;
}
function partnerManagerInbox(){
 if(page!=='orders')return;$('#app .proto-inbox')?.remove();const data=partnerEnsure(),open=data.requests.filter(r=>!r.orderId),changes=data.changes;
 const inbox=document.createElement('section');inbox.className='manager-partner-inbox';inbox.innerHTML=`<div class="proto-panel-heading"><div><h2>Заявки и согласования с клиентами</h2><p>CRM: обработка обращений и управление исполнением. Клиент видит свои условия и ход заказа в отдельном кабинете.</p></div>${portalButton('Предложение клиенту','manager-proposal','',true)}</div><div class="manager-connection-flow"><span>Заявка / предложение</span><span>Подтверждение клиента</span><span>Заказ в CRM</span><span>Производство и отгрузка</span></div><div class="proto manager-request-grid">${open.map(r=>portalRequestCard(r,true)).join('')||'<p class="muted">Заявок на согласование нет. Новое предложение появится у выбранной компании в кабинете клиента.</p>'}</div>${changes.length?`<details class="manager-changes"><summary>Запросы изменения заказов · ${changes.filter(c=>c.status==='Ожидает рассмотрения').length} ожидают ответа</summary><div class="proto proto-stack">${changes.map(c=>`<article class="proto-order"><h3>Заказ №${c.orderId}</h3><p>${esc(c.text)}</p>${c.response?'<p>Ответ: '+esc(c.response)+'</p>':''}${portalBadge(c.status,'warn')}${c.status==='Ожидает рассмотрения'?portalButton('Ответить клиенту','change-reply',c.id):''}</article>`).join('')}</div></details>`:''}`;
 $('#app .page-content')?.before(inbox);
 const linked=data.requests.filter(r=>r.orderId&&O(r.orderId));
 if(linked.length)inbox.insertAdjacentHTML('beforeend',`<details class="manager-changes"><summary>Оформленные заявки · ${linked.length}</summary><div class="proto manager-request-grid">${linked.map(r=>portalRequestCard(r,true)).join('')}</div></details>`);
}
function partnerManagerChrome(){
 let control=$('#manager-space-control');if(!control){control=document.createElement('div');control.id='manager-space-control';control.innerHTML=partnerRolePicker('manager');$('.top').append(control)}
 portalNav?.remove();navRail.querySelector('[aria-label="Кабинеты"]')?.remove();
 if(page==='supplier-workspace'){
  // Partner access is a demo role switch, never a procurement navigation section.
  $('#app').querySelectorAll('[data-proto-act="navigate"][data-id="supplier-portal"],[data-proto-act="supplier-switch"]').forEach(b=>{b.dataset.spaceRole='supplier';if(b.dataset.protoAct==='supplier-switch')b.dataset.spaceCompany=b.dataset.id;b.removeAttribute('data-proto-act');b.textContent='Посмотреть роль · демо'});
  const intro=document.createElement('p');intro.className='partner-explanation';intro.textContent='Рабочее место закупщика: запросы, сравнение откликов и заказы поставщикам. Поставщик получает только адресованные ему запросы и заказы в отдельном кабинете.';$('#app .page-content')?.prepend(intro);
 }
 partnerManagerInbox();
}
function partnerConvertRequest(id){
 const r=partnerRequest(id);if(partnerKind()||!r||r.status!=='Условия приняты'||!r.proposal||r.acceptedRevision!==r.proposal.revision||r.orderId)return;
 const c=S.companies.find(c=>String(c.id)===String(r.companyId)),p=r.proposal;if(!c||!P(p.productId))return;
 const duplicate=S.orders.find(o=>o.portalRequestId===r.id);if(duplicate){r.orderId=duplicate.id;r.status='Заказ создан';return save('Заказ уже создан: №'+duplicate.id)}
 const contact=S.clients.find(x=>String(x.companyId)===String(c.id)),idOrder=next(S.orders);
 S.orders.push({id:idOrder,companyId:c.id,company:c.name,clientId:contact?.id,contact:contact?.name||'',city:c.city||'',address:p.address,delivery:p.delivery,due:p.due+'T'+p.time,priority:'Обычный',manager:'Менеджер предприятия',paid:false,agreed:false,checked:false,terms:p.terms,lines:[{p:p.productId,qty:p.qty,unitPrice:p.price,res:0,sent:0}],notes:[],files:[],portalRequestId:r.id,portalDeliveryCost:p.deliveryCost});
 r.orderId=idOrder;r.status='Заказ создан';partnerHistory(r,'Менеджер создал заказ №'+idOrder+' в CRM');save('Заказ №'+idOrder+' создан. Подтвердите исполнение в CRM; резервы и наряды пока не изменены');
}
const partnerPortalActBefore=portalAct;
portalAct=function(action,id){
 const kind=partnerKind();
 if(action==='manager-proposal')return partnerProposalForm();
 if(action==='request-propose')return partnerProposalForm(id);
 if(action==='request-review')return partnerReviewRequest(id);
 if(action==='request-convert')return partnerConvertRequest(id);
 if(action==='crm-order'){if(!kind&&O(id))return openDialog('order',Number(id));return}
 if(action==='request-accept'){
  const r=partnerRequest(id);if(kind!=='client'||!r||String(r.companyId)!==String(portalUI.companyId)||r.status!=='Ожидает подтверждения клиента'||portalDialogState?.revision!==r.proposal?.revision)return;
  r.status='Условия приняты';r.acceptedRevision=r.proposal.revision;partnerHistory(r,'Клиент принял условия версии '+r.acceptedRevision);return portalCommit('Условия приняты. Менеджер оформит заказ');
 }
 if(action==='request-revise'){
  const r=partnerRequest(id);if(kind!=='client'||!r||String(r.companyId)!==String(portalUI.companyId)||r.orderId)return;
  return portalOpen('Уточнить условия по '+r.number,'<label class="field">Что требуется изменить<textarea name="comment" required></textarea></label>','Отправить менеджеру',{type:'partner-revise',requestId:id,revision:r.proposal?.revision});
 }
 if(action==='change-reply'){
  const c=partnerEnsure().changes.find(c=>c.id===id);if(kind||!c||c.status!=='Ожидает рассмотрения')return;
  return portalOpen('Ответ по заказу №'+c.orderId,'<p class="proto-dialog-note">Ответ появится у клиента. Изменения самого заказа выполняются отдельно в CRM.</p><label class="field">Ответ клиенту<textarea name="response" required></textarea></label>','Отправить ответ',{type:'partner-change-reply',changeId:id});
 }
 if(action==='accept-delay'||action==='reject-delay'){
  const p=portalPurchase(id);if(kind||page!=='supplier-workspace'||!p?.proposedDue)return;
  if(action==='accept-delay'){p.due=p.proposedDue;partnerHistory(p,'Закупщик согласовал новый срок: '+portalDate(p.due))}else partnerHistory(p,'Закупщик отклонил перенос. Действует срок '+portalDate(p.due));
  delete p.proposedDue;delete p.delayReason;return portalCommit(action==='accept-delay'?'Новый срок согласован и виден поставщику':'Перенос отклонен. Поставщик увидит ответ');
 }
 // Keep the previous request-processing action available for existing links.
 if(action==='request-process'){if(kind)return;return partnerProposalForm(id)}
 return partnerPortalActBefore(action,id);
};
document.addEventListener('submit',e=>{
 const state=portalDialogState;if(e.target.id!=='portal-form'||!state?.type?.startsWith('partner-'))return;e.preventDefault();
 const v=Object.fromEntries(new FormData(e.target)),data=partnerEnsure(),kind=partnerKind();
 if(state.type==='partner-proposal'){
  if(kind)return;const r=state.requestId?partnerRequest(state.requestId):null,c=S.companies.find(c=>String(c.id)===String(state.companyId||v.companyId));
  if(!c||state.requestId&&(!r||r.orderId||r.status==='Условия приняты'||(r.proposal?.revision||0)!==state.revision))return portalFormError('Заявка изменилась. Откройте актуальную версию');
  const qty=Number(v.qty),price=Number(v.price),deliveryCost=Number(v.deliveryCost);
  if(!P(v.productId)||!Number.isSafeInteger(qty)||qty<=0||!v.price.trim()||!Number.isFinite(price)||price<=0||!v.deliveryCost.trim()||!Number.isFinite(deliveryCost)||deliveryCost<0)return portalFormError('Проверьте продукцию, объем, цену и стоимость доставки');
  if(!portalTradeValidDate(v.due)||v.due<TODAY||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.dueTime)||!['Доставка клиенту','Самовывоз'].includes(v.delivery)||!v.address.trim()||!v.terms.trim())return portalFormError('Укажите корректный срок, способ получения, адрес и условия');
  if(v.delivery==='Самовывоз'&&deliveryCost!==0)return portalFormError('При самовывозе доставка предприятия должна быть равна нулю');
  const request=r||{id:portalId('request'),companyId:c.id,productId:v.productId,qty,due:v.due,delivery:v.delivery,address:v.address.trim(),comment:'',origin:'manager',created:TODAY,history:[]};
  request.proposal={productId:v.productId,qty,price,deliveryCost,due:v.due,time:v.dueTime,delivery:v.delivery,address:v.address.trim(),terms:v.terms.trim(),revision:(request.proposal?.revision||0)+1};request.status='Ожидает подтверждения клиента';delete request.acceptedRevision;
  partnerHistory(request,'Менеджер направил условия · версия '+request.proposal.revision);if(!r)data.requests.push(request);
  return portalCommit('Предложение отправлено. Клиент увидит его в «Моих заявках»');
 }
 if(state.type==='partner-revise'){
  const r=partnerRequest(state.requestId);if(kind!=='client'||!r||String(r.companyId)!==String(portalUI.companyId)||r.orderId||r.proposal?.revision!==state.revision)return portalFormError('Заявка недоступна или условия изменились');
  if(!v.comment.trim())return portalFormError('Опишите изменения');r.status='Нужны изменения';r.comment=v.comment.trim();partnerHistory(r,'Клиент просит изменить условия: '+r.comment);return portalCommit('Уточнение отправлено менеджеру');
 }
 if(state.type==='partner-change-reply'){
  const c=data.changes.find(c=>c.id===state.changeId);if(kind||!c||c.status!=='Ожидает рассмотрения')return;
  if(!v.response.trim())return portalFormError('Напишите ответ');c.response=v.response.trim();c.status='Ответ менеджера';c.respondedAt=TODAY;return portalCommit('Ответ сохранен и доступен клиенту');
 }
});
const partnerPurchaseBefore=portalShowPurchase;
portalShowPurchase=function(id){
 partnerPurchaseBefore(id);const p=portalPurchase(id);if(!p||!portalDialog.open||page==='supplier-portal'&&p.supplierId!==portalUI.supplierId)return;
 portalDialog.querySelector('[data-proto-act="stub"][data-id="Согласование переноса"]')?.remove();
 if(page==='supplier-workspace'&&p.proposedDue)portalDialog.querySelector('.dialogbody').insertAdjacentHTML('beforeend',`<section class="partner-delay"><h3>Поставщик просит перенести срок</h3><p>${portalDate(p.due)} → ${portalDate(p.proposedDue)}</p><p>${esc(p.delayReason||'')}</p><div class="proto-actions">${portalButton('Согласовать перенос','accept-delay',id,true)}${portalButton('Оставить текущий срок','reject-delay',id)}</div></section>`);
};
const partnerOrderCardBefore=portalOrderCard;
portalOrderCard=function(o){
 let html=partnerOrderCardBefore(o);const r=o.portalRequestId&&partnerRequest(o.portalRequestId);
 if(r&&!o.agreed)html=html.replace('Заявка рассматривается','Условия приняты · заказ оформляется');
 if(r)html=html.replace('Желаемый срок:','Согласованный срок:');
 if(o.portalDeliveryCost!==undefined)html=html.replace(rub(amount(o))+'</strong>',rub(amount(o)+o.portalDeliveryCost)+'</strong>');
 const responses=partnerEnsure().changes.filter(c=>c.orderId===o.id&&String(c.companyId)===String(portalUI.companyId)&&c.response);
 if(responses.length)html=html.replace('</article>',`<div class="partner-response"><b>Ответ менеджера</b><p>${esc(responses.at(-1).response)}</p></div></article>`);
 return html;
};
const partnerShowOrderBefore=portalShowOrder;
portalShowOrder=function(id){partnerShowOrderBefore(id);const o=portalCompanyOrders().find(o=>String(o.id)===String(id));if(!o||!portalDialog.open)return;const body=portalDialog.querySelector('.dialogbody');
 if(o.portalDeliveryCost!==undefined)body.insertAdjacentHTML('beforeend',`<p class="proto-dialog-note">Продукция: ${rub(amount(o))}. Доставка: ${rub(o.portalDeliveryCost)}. Итого по согласованным условиям: ${rub(amount(o)+o.portalDeliveryCost)}.</p>`);
 const r=o.portalRequestId&&partnerRequest(o.portalRequestId);if(r)body.insertAdjacentHTML('beforeend',partnerTimeline(r));
 if(r){
  if(!o.agreed)body.querySelector('.proto > .badge')?.replaceChildren(document.createTextNode('Условия приняты · заказ оформляется'));
  body.querySelectorAll('dt').forEach(el=>{if(el.textContent==='Желаемый срок')el.textContent='Согласованный срок';if(el.textContent==='Сумма')el.textContent='Продукция'});
  const note=[...body.querySelectorAll('.proto-dialog-note')].find(el=>el.textContent.startsWith('Срок показан из текущего заказа.'));if(note)note.textContent='Условия подтверждены вами. Менеджер управляет исполнением заказа в CRM; изменения можно запросить отдельно.';
 }
};
// The MVP keeps accepted customer terms fixed; ordinary operational actions still work.
const partnerActBefore=act;
act=function(action,id){
 const o=action==='entity-delete'?(dialogType==='order'?O(dialogId):null):O(id);
 if(o?.portalRequestId){
  const message='Условия подтверждены клиентом. В этом прототипе изменение состава, доставки или отмена оформляются отдельной заявкой; текущие условия сохранены.';
  if(['composition-save','entity-save-lines','order-delete','entity-delete'].includes(action))return $('#modal').open?reject(message):toast(message);
  if(['order-save','order-tab-save'].includes(action))for(const key of ['company','terms','city','address','delivery','due']){
   const input=$('#modal').querySelector('[name="'+key+'"]');if(input&&input.value!==String(o[key]||''))return reject(message);
  }
 }
 return partnerActBefore(action,id);
};
const partnerDrawBefore=drawDialog;
drawDialog=function(){
 partnerDrawBefore();if(dialogType!=='order')return;const o=O(dialogId),r=o?.portalRequestId&&partnerRequest(o.portalRequestId);if(!r)return;
 $('#modal .dialogbody')?.insertAdjacentHTML('beforeend',`<section class="entity-note"><h3>Согласовано в кабинете клиента</h3><p>Заявка ${esc(r.number)} · версия ${r.acceptedRevision}. Продукция ${rub(amount(o))}, доставка ${rub(o.portalDeliveryCost||0)}. Итого ${rub(amount(o)+(o.portalDeliveryCost||0))}.</p><p>Состав, адрес и срок закреплены в прототипе. Оплата, резервы, производство и отгрузка управляются здесь, в CRM.</p></section>`);
};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-space-role]');if(b){e.preventDefault();document.querySelectorAll('.space-switch[open]').forEach(d=>d.open=false);if($('#modal').open)$('#modal').close();portalDialog.close();closeControlPopup();closeNavFlyout();query='';
  const role=b.dataset.spaceRole;if(role==='client'){page='client-portal';portalUI.clientTab='overview'}else if(role==='supplier'){page='supplier-portal';portalUI.supplierTab='overview';if(b.dataset.spaceCompany)portalUI.supplierId=b.dataset.spaceCompany}else page='orders';
  render();return;
 }
 if(e.target.closest('[data-partner-home]')){e.preventDefault();portalUI[partnerKind()==='client'?'clientTab':'supplierTab']='overview';query='';render()}
});
document.addEventListener('input',e=>{if(e.target.id!=='partner-search')return;const pos=e.target.selectionStart;query=e.target.value;render();const i=$('#partner-search');i.focus();try{i.setSelectionRange(pos,pos)}catch{}});
// Keep private tabs in their own URLs and render a different application shell.
const partnerRenderBefore=render;
render=function(){
 partnerEnsure();partnerReadRoute();const kind=partnerKind();
 if(partnerPaintedRole!==(kind||'manager')){closeControlPopup();if(portalDialog.open)portalDialog.close();if($('#modal').open)$('#modal').close();query=''}
 document.body.classList.toggle('partner-mode',!!kind);$('.layout').hidden=!!kind;partnerRoot.hidden=!kind;
 if(kind){$('#app').replaceChildren();partnerRender();partnerWriteRoute();document.title=(kind==='client'?'Кабинет клиента':'Кабинет поставщика')+' · АГРО'}
 else{partnerRoot.replaceChildren();partnerRenderBefore();partnerManagerChrome();document.title=names[page]+' · АГРО · Команда предприятия'}
 partnerPaintedRole=kind||'manager';
};
render();
