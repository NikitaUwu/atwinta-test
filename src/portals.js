// Interface prototype only: no authentication, external sending or stock posting.
// partner-fulfillment.js links procurement records to S.purchases and posts explicit receipts.
const portalPages=['client-portal','supplier-workspace','supplier-portal'];
const portalUI={clientTab:'overview',buyerTab:'overview',supplierTab:'requests',companyId:null,supplierId:'demo-supplier-1',allProducts:false};
const portalDay=(offset=0)=>{const d=new Date(TODAY+'T12:00');d.setDate(d.getDate()+offset);return d.toLocaleDateString('sv-SE')};
const portalDate=d=>d?String(d).slice(0,10).split('-').reverse().join('.'):'Не указан';
const portalId=prefix=>prefix+'-'+crypto.randomUUID();
const portalButton=(text,action,id='',primary=false)=>`<button type="button" data-proto-act="${action}" data-id="${esc(id)}"${primary?' class="primary"':''}>${esc(text)}</button>`;
const portalBadge=(text,kind='')=>badge(text,kind);
const portalEmpty=(title,text)=>`<div class="proto-empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
const portalPanel=(title,body,action='')=>`<section class="proto-panel"><div class="proto-panel-heading"><h2>${esc(title)}</h2>${action}</div>${body}</section>`;
const portalKpis=items=>`<div class="proto-kpis">${items.map(([title,value,note])=>`<div class="proto-kpi"><span>${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('')}</div>`;
const portalTextMatch=x=>JSON.stringify(x).toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'));
function ensurePortalPrototype(){
 ensureEntityDirectories();
 if(!S.portalPrototype||S.portalPrototype.version!==1){
  const raw=S.raw[0],other=S.raw[1]||raw,company=S.companies[0],product=S.products[0];
  S.portalPrototype={version:1,
   suppliers:[{id:'demo-supplier-1',name:'Сибирское зерно',city:'Новосибирск',contact:'Ирина · отдел продаж',materials:'Зерновые культуры',terms:'Предоплата',note:'Учебный поставщик'},{id:'demo-supplier-2',name:'Алтайские корма',city:'Барнаул',contact:'Андрей · отдел поставок',materials:'Зерновые и кормовое сырье',terms:'По согласованию',note:'Учебный поставщик'},{id:'demo-supplier-3',name:'Премикс Партнер',city:'Кемерово',contact:'Мария · менеджер',materials:'Премиксы и добавки',terms:'Предоплата',note:'Учебный поставщик'}],
   requests:company&&product?[{id:'demo-request-1',companyId:company.id,productId:product.id,qty:1500,due:portalDay(4),delivery:'Доставка клиенту',address:company.address||'',comment:'Просим уточнить условия и возможность доставки.',status:'Отправлена',created:TODAY}]:[],
   rfqs:raw?[{id:'demo-rfq-1',rawId:raw.id,qty:1500,due:portalDay(3),requirements:'Качество и документы необходимо согласовать с закупщиком.',status:'Прием предложений',invited:['demo-supplier-1','demo-supplier-2'],created:TODAY},{id:'demo-rfq-2',rawId:other.id,qty:1000,due:portalDay(5),requirements:'Указать условия доставки на склад.',status:'Прием предложений',invited:['demo-supplier-1','demo-supplier-2','demo-supplier-3'],created:TODAY}]:[],
   offers:raw?[{id:'demo-offer-1',rfqId:'demo-rfq-1',supplierId:'demo-supplier-1',qty:1500,price:Number(raw.price)||15,delivery:1800,due:portalDay(3),comment:'Документы предоставим при согласовании.',created:TODAY},{id:'demo-offer-2',rfqId:'demo-rfq-1',supplierId:'demo-supplier-2',qty:1500,price:Math.round((Number(raw.price)||15)*0.95*100)/100,delivery:3500,due:portalDay(4),comment:'Поставка на следующий день после запрошенного срока.',created:TODAY}]:[],
   purchases:raw?[{id:'demo-po-1',number:'П-001',supplierId:'demo-supplier-1',rawId:raw.id,qty:1000,price:Number(raw.price)||15,delivery:1800,due:portalDay(2),status:'Ожидает подтверждения',created:TODAY,history:[{text:'Закупщик направил учебный заказ на подтверждение',date:TODAY}]}]:[],
   changes:[]};
 }
 if(!S.companies.some(c=>String(c.id)===String(portalUI.companyId)))portalUI.companyId=S.companies[0]?.id??null;
 if(!S.portalPrototype.suppliers.some(s=>s.id===portalUI.supplierId))portalUI.supplierId=S.portalPrototype.suppliers[0]?.id;
 portalEnsureTrading(S.portalPrototype);
 return S.portalPrototype;
}
const portalSupplier=id=>ensurePortalPrototype().suppliers.find(s=>s.id===id);
const portalCompany=()=>S.companies.find(c=>String(c.id)===String(portalUI.companyId));
const portalCompanyOrders=()=>S.orders.filter(o=>String(o.companyId)===String(portalUI.companyId));
const portalCompanyRequests=()=>ensurePortalPrototype().requests.filter(r=>String(r.companyId)===String(portalUI.companyId));
const portalRfq=id=>ensurePortalPrototype().rfqs.find(r=>r.id===id);
const portalPurchase=id=>ensurePortalPrototype().purchases.find(p=>p.id===id);
const portalRaw=id=>S.raw.find(r=>r.id===id);
function portalTabs(kind,items){const key={client:'clientTab',buyer:'buyerTab',supplier:'supplierTab'}[kind];return `<nav class="proto-tabs" aria-label="Разделы модуля">${items.map(([id,label])=>`<button type="button" data-proto-act="tab" data-id="${kind}:${id}" aria-current="${portalUI[key]===id?'page':'false'}">${label}</button>`).join('')}</nav>`}
function portalContext(kind){
 const customer=kind==='client',items=customer?S.companies:ensurePortalPrototype().suppliers,current=customer?portalCompany():portalSupplier(portalUI.supplierId);
 return `<div class="proto-context"><div class="proto-identity"><span class="proto-avatar">${icon(customer?'box':'truck')}</span><div><b>${esc(current?.name||'Компания не выбрана')}</b><small>${customer?'Заказы и заявки вашей компании':'Запросы и поставки учебного поставщика'}</small></div></div><label class="field">Компания для просмотра демо<select data-proto-context="${kind}" aria-label="${customer?'Компания клиента':'Компания поставщика'}">${items.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(customer?portalUI.companyId:portalUI.supplierId)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label></div>`;
}
function portalLayout(content,kind){return `<div class="proto"><div class="proto-note"><strong>Интерфейсный прототип</strong><span>Учебные данные в этом браузере. Вход и отправка контрагентам пока не подключены.</span></div>${kind?portalContext(kind):''}${content}</div>`}
function portalOrderStatus(o){if(o.lines.every(l=>l.sent>=l.qty))return 'Отгружен · получение не подтверждено';return {'Согласован':'Заказ подтвержден','Проверка остатков':'Заявка рассматривается','Новая заявка':'Заявка рассматривается','В работе':'В производстве'}[stage(o)]||stage(o)}
function portalOrderCard(o){
 const sent=sum(o.lines,l=>l.sent),ready=sum(o.lines,l=>l.res),qty=volume(o);
 const changes=ensurePortalPrototype().changes.filter(c=>c.orderId===o.id);
 return `<article class="proto-order"><div class="proto-order-top"><div><div class="proto-caption">Заказ №${o.id}</div><h3>${esc(o.lines.map(l=>P(l.p)?.name||'Продукция').join(', '))}</h3></div>${portalBadge(portalOrderStatus(o),sent>=qty?'good':o.agreed?'warn':'')}</div><p>${kg(qty)} · ${esc(o.delivery)} · ${esc(o.city)}</p><div class="proto-steps">${[['Заявка',true],['Подтвержден',o.agreed],['Готово к отгрузке',ready+sent>=qty],['Отправлен',sent>=qty]].map(([label,done],i)=>`<span class="proto-step ${done?'done':i===1?'active':''}">${label}</span>`).join('')}</div><div class="proto-order-bottom"><span>Желаемый срок: ${portalDate(o.due)}</span><strong>${rub(amount(o))}</strong></div>${changes.length?`<p class="proto-caption">Запрос изменения: ${esc(changes.at(-1).text)} · ${esc(changes.at(-1).status)}</p>`:''}<div class="proto-actions">${portalButton('Подробнее','order',o.id)}${portalButton(o.lines.length>1?'Повторить первую позицию':'Повторить','repeat',o.id)}</div></article>`;
}
function portalRequestCard(r,internal=false){
 const company=S.companies.find(c=>String(c.id)===String(r.companyId));
 return `<article class="proto-order"><div class="proto-order-top"><div><div class="proto-caption">Заявка · ${portalDate(r.created)}${internal?' · '+esc(company?.name||'Компания'):''}</div><h3>${esc(P(r.productId)?.name||'Продукция')} · ${kg(r.qty)}</h3></div>${portalBadge(r.status,r.status==='В работе у менеджера'?'good':'warn')}</div><p>Желаемый срок: ${portalDate(r.due)} · ${esc(r.delivery)}</p>${r.comment?`<p class="proto-caption">${esc(r.comment)}</p>`:''}${internal&&r.status==='Отправлена'?`<div class="proto-actions">${portalButton('Принять в работу','request-process',r.id)}</div>`:''}</article>`;
}
function portalClientView(){
 const orders=portalCompanyOrders(),requests=portalCompanyRequests(),active=orders.filter(o=>o.lines.some(l=>l.sent<l.qty)),open=requests.filter(r=>r.status==='Отправлена');
 let content=portalTabs('client',[['overview','Обзор'],['orders','Мои заказы'],['catalog','Каталог'],['documents','Документы']]);
 if(portalUI.clientTab==='overview'){
  content+=portalKpis([['Активные заказы',active.length,'Еще не отгружены полностью'],['Отправленные заявки',open.length,'Ожидают ответа менеджера'],['Объем заказов',kg(sum(active,volume)),'По активным заказам']]);
  content+=`<div class="proto-grid">${portalPanel('Мои заказы',`<div class="proto-stack">${orders.filter(portalTextMatch).slice(0,2).map(portalOrderCard).join('')||portalEmpty('Заказов пока нет','Начните с новой заявки.')}</div>`,portalButton('Все заказы','tab','client:orders'))}<div class="proto-stack">${portalPanel('Отправленные заявки',`<div class="proto-stack">${requests.filter(portalTextMatch).slice(-2).reverse().map(r=>portalRequestCard(r)).join('')||portalEmpty('Нет заявок','Выберите продукцию в каталоге.')}</div>`)}${portalPanel('Ваш менеджер',`<div class="proto-stack"><p>${esc(orders[0]?.manager||'Менеджер предприятия')}</p><p class="proto-doc-note">Поможет согласовать цену, доставку и изменение заказа.</p>${portalButton('Связаться','stub','Связь с менеджером')}</div>`)}</div></div>`;
 }else if(portalUI.clientTab==='orders'){
  content+=portalPanel('Заявки на согласование',`<div class="proto-stack">${requests.filter(portalTextMatch).map(r=>portalRequestCard(r)).join('')||portalEmpty('Заявок нет','Создайте заявку или повторите прошлый заказ.')}</div>`);
  content+=`<div class="proto-stack">${orders.filter(portalTextMatch).map(portalOrderCard).join('')||portalEmpty('Заказы не найдены','Попробуйте изменить поиск или компанию демо.')}</div>`;
 }else if(portalUI.clientTab==='catalog'){
  const products=S.products.filter(portalTextMatch),shown=portalUI.allProducts?products:products.slice(0,6);
  content+=`<p class="proto-doc-note">Цены ориентировочные и учебные. Окончательные условия согласует менеджер.</p><div class="proto-products">${shown.map(p=>`<article class="proto-product"><span class="proto-avatar">${icon('box')}</span><h3>${esc(p.name)}</h3><p>${esc(p.pack||'Упаковка уточняется')} · гранула ${esc(p.granule||'уточняется')}</p><div class="proto-price">${rub(p.price||0)} / кг<small>Ориентир для демонстрации</small></div>${portalButton('Заказать','product',p.id,true)}</article>`).join('')||portalEmpty('Нет подходящей продукции','Измените поисковый запрос.')}</div>${!portalUI.allProducts&&products.length>6?`<div>${portalButton('Показать весь каталог','catalog-all')}</div>`:''}`;
 }else content+=portalDocuments('client');
 return portalLayout(content,'client');
}
function portalDocuments(kind){
 const docs=kind==='client'?[['Счет на оплату','Пример документа по заказу'],['Документ отгрузки','Пример документа по поставке'],['Паспорт качества','Пример документа на продукцию']]:[['Спецификация поставки','Пример согласованных условий'],['Документ на сырье','Пример сопроводительного документа']];
 return portalPanel('Документы',`<p class="proto-doc-note">Показаны примеры. Загрузка и скачивание файлов появятся на следующем этапе.</p>${docs.map(([name,note])=>`<div class="proto-doc"><span class="proto-avatar">${icon('list')}</span><div><b>${name}</b><small>${note}</small></div>${portalButton('Посмотреть пример','document',name)}</div>`).join('')}`);
}
function portalRfqCard(r,external=false){
 const offers=ensurePortalPrototype().offers.filter(o=>o.rfqId===r.id),own=offers.find(o=>o.supplierId===portalUI.supplierId),chosen=own&&ensurePortalPrototype().purchases.some(p=>p.offerId===own.id);
 return `<article class="proto-order"><div class="proto-order-top"><div><div class="proto-caption">Запрос на закупку · ${portalDate(r.created)} · ${r.visibility==='open'?'Открытый сбор откликов':'По приглашению'}</div><h3>${esc(portalRaw(r.rawId)?.name||'Сырье')} · ${kg(r.qty)}</h3></div>${portalBadge(external&&chosen?'Выбрано закупщиком':external&&own?'Предложение отправлено':r.status,external&&own?'good':'warn')}</div><p>Нужно на складе: ${portalDate(r.due)}</p><p class="proto-caption">${esc(r.requirements)}</p><div class="proto-order-bottom"><span>${external?(own?'Ваша цена: '+rub(own.price)+' / кг':'Ожидаем ваши условия'):offers.length+' предложений · '+(r.visibility==='open'?'все участники':r.invited.length+' приглашенных')}</span><div class="proto-actions">${external?(chosen?portalButton('Перейти к заказам','tab','supplier:purchases'):portalButton(own?'Обновить предложение':'Предложить условия','offer',r.id,!own)):portalButton('Сравнить предложения','compare',r.id)}</div></div></article>`;
}
function portalPurchaseCard(p,external=false){
 return `<article class="proto-order"><div class="proto-order-top"><div><div class="proto-caption">Заказ поставщику №${esc(p.number)}</div><h3>${esc(portalRaw(p.rawId)?.name||'Сырье')} · ${kg(p.qty)}</h3></div>${portalBadge(p.status,p.status==='Подтвержден'?'good':'warn')}</div><p>${external?'Поставка на склад предприятия':esc(portalSupplier(p.supplierId)?.name||'Поставщик')} · ${portalDate(p.due)}</p>${p.proposedDue?`<div>${portalBadge('Предложен перенос на '+portalDate(p.proposedDue),'warn')}</div>`:''}<div class="proto-order-bottom"><span>${rub(p.price)} / кг · доставка ${rub(p.delivery)}</span><strong>${rub(p.qty*p.price+p.delivery)}</strong></div><div class="proto-actions">${portalButton('Подробнее','purchase',p.id)}${external&&p.status==='Ожидает подтверждения'?portalButton('Подтвердить','confirm-purchase',p.id,true):''}${external&&['Подтвержден','Отправлен поставщиком'].includes(p.status)?portalButton('Предложить перенос','delay',p.id):''}${external&&p.status==='Подтвержден'?portalButton('Сообщить об отправке','dispatch-purchase',p.id):''}</div></article>`;
}
function portalBuyerView(){
 const data=ensurePortalPrototype();let content=portalTabs('buyer',[['overview','Обзор'],['listings','Предложения сырья'],['requests','Запросы на закупку'],['purchases','Поставки'],['suppliers','Поставщики']]);
 if(portalUI.buyerTab==='overview'){
  content+=portalKpis([['Запросы сырья',data.rfqs.length,'Учебные запросы поставщикам'],['Предложения',data.offers.length,'Доступны для сравнения'],['Ждут подтверждения',data.purchases.filter(p=>p.status==='Ожидает подтверждения').length,'Заказы поставщикам']]);
  content+=portalTradingOverview(data);
  content+=`<div class="proto-grid">${portalPanel('Запросы и отклики',`<div class="proto-stack">${data.rfqs.filter(portalTextMatch).map(r=>portalRfqCard(r)).join('')||portalEmpty('Запросы не найдены','Создайте запрос на нужное сырье.')}</div>`)}<div class="proto-stack">${portalPanel('Ожидаемые поставки',`<div class="proto-stack">${data.purchases.filter(portalTextMatch).map(p=>portalPurchaseCard(p)).join('')||portalEmpty('Поставок пока нет','Выберите предложение в запросе.')}</div>`)}${portalPanel('Как работает снабжение',`<div class="proto-stack"><p>Найдите сырье в предложениях или разместите запрос на закупку и сравните отклики.</p><p class="proto-doc-note">Каждая партия принимается отдельно. Только принятый объем пополняет склад.</p>${portalButton('Кабинет поставщика','navigate','supplier-portal')}</div>`)}</div></div>`;
 }else if(portalUI.buyerTab==='listings')content+=portalTradingCatalog(data);
 else if(portalUI.buyerTab==='requests')content+=`<div class="proto-stack">${data.rfqs.filter(portalTextMatch).map(r=>portalRfqCard(r)).join('')||portalEmpty('Нет запросов','Создайте первый запрос сырья.')}</div>`;
 else if(portalUI.buyerTab==='purchases')content+=`<div class="proto-stack">${data.purchases.filter(portalTextMatch).map(p=>portalPurchaseCard(p)).join('')||portalEmpty('Нет поставок','Сначала выберите предложение.')}</div>`;
 else content+=`<div class="proto-table">${table(['Поставщик','Сырье','Условия','Контакт',''],data.suppliers.filter(portalTextMatch).map(s=>row([`<div class="proto-cell"><b>${esc(s.name)}</b><small>${esc(s.city)} · учебная компания</small></div>`,esc(s.materials),esc(s.terms),esc(s.contact),portalButton('Открыть кабинет','supplier-switch',s.id)])))}</div>`;
 return portalLayout(content);
}
function portalSupplierView(){
 const data=ensurePortalPrototype(),rfqs=data.rfqs.filter(r=>portalCanRespond(r,portalUI.supplierId)),purchases=data.purchases.filter(p=>p.supplierId===portalUI.supplierId);
 let content=portalTabs('supplier',[['requests','Запросы'],['listings','Мои предложения'],['purchases','Заказы'],['deliveries','Поставки'],['documents','Документы']]);
 content+=portalKpis([['Доступные запросы',rfqs.length,'Открытые и по приглашению'],['Ожидают ответа',purchases.filter(p=>p.status==='Ожидает подтверждения').length,'Подтвердите условия заказа'],['Подтвержденные',purchases.filter(p=>p.status==='Подтвержден').length,'Поставки к исполнению']]);
 if(portalUI.supplierTab==='requests')content+=`<div class="proto-stack">${rfqs.filter(portalTextMatch).map(r=>portalRfqCard(r,true)).join('')||portalEmpty('Приглашений пока нет','Здесь появятся адресованные вашей компании запросы.')}</div>`;
 else if(portalUI.supplierTab==='listings')content+=portalTradingOwnListings(data);
 else if(portalUI.supplierTab==='documents')content+=portalDocuments('supplier');
 else{const rows=(portalUI.supplierTab==='deliveries'?purchases.filter(p=>p.status!=='Ожидает подтверждения'):purchases).filter(portalTextMatch);content+=`<div class="proto-stack">${rows.map(p=>portalPurchaseCard(p,true)).join('')||portalEmpty('Поставок пока нет','Подтвердите заказ или дождитесь решения закупщика.')}</div>`;}
 return portalLayout(content,'supplier');
}

// Own native modal: existing internal cards remain untouched.
const portalDialog=document.createElement('dialog');portalDialog.id='portal-dialog';document.body.append(portalDialog);
let portalDialogState=null,portalDialogOpener=null;
portalDialog.addEventListener('close',()=>{portalDialogState=null;if(portalDialogOpener?.isConnected)portalDialogOpener.focus()});
function portalOpen(title,body,submit='',state={}){
 if($('#modal').open)$('#modal').close();
 portalDialogOpener=document.activeElement;portalDialogState=state;
 portalDialog.setAttribute('aria-labelledby','portal-dialog-title');
 portalDialog.innerHTML=`<form id="portal-form" novalidate><div class="dialoghead"><h2 id="portal-dialog-title">${esc(title)}</h2>${portalButton('Закрыть','close-dialog')}</div><div class="dialogbody"><p id="portal-form-error" class="error" role="alert" hidden></p>${body}</div><div class="dialogfoot">${portalButton(submit?'Отмена':'Закрыть','close-dialog')}${submit?`<button type="submit" class="primary">${esc(submit)}</button>`:''}</div></form>`;
 if(!portalDialog.open)portalDialog.showModal();
 const first=portalDialog.querySelector('input:not([type=hidden]),textarea');if(first)first.focus();
}
function portalField(label,name,value='',type='text',extra=''){return `<label class="field">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function portalSelect(label,name,items,value){return `<label class="field">${esc(label)}<select name="${name}" aria-label="${esc(label)}">${items.map(([id,text])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`}
function portalNewRequest(productId,order){
 const company=portalCompany(),product=P(productId)||S.products[0];
 if(!company||!product)return toast('Сначала выберите компанию и продукцию');
 portalOpen(order?'Повторить позицию':'Новая заявка',`<p class="proto-dialog-note">${esc(company.name)} · после отправки менеджер согласует цену и срок. Заявка не резервирует продукцию.${order&&order.lines.length>1?' В этой версии повторяется первая позиция заказа; для остальных можно создать отдельные заявки.':''}</p><div class="formgrid">${portalSelect('Продукция','productId',S.products.map(p=>[p.id,p.name]),product.id)}${portalField('Количество, кг','qty',order?.lines[0]?.qty||1000,'number','min="1" step="1" required')}${portalField('Желаемая дата получения','due',portalDay(4),'date','required')}${portalSelect('Способ получения','delivery',[['Доставка клиенту','Доставка клиенту'],['Самовывоз','Самовывоз']],order?.delivery||'Доставка клиенту')}<div class="proto-wide">${portalField('Адрес доставки / место самовывоза','address',order?.address||company.address||'')}</div><label class="field proto-wide">Комментарий<textarea name="comment" placeholder="Упаковка, доставка или другие пожелания"></textarea></label></div>`,'Отправить заявку',{type:'request',companyId:company.id});
}
function portalShowOrder(id){
 const o=portalCompanyOrders().find(x=>String(x.id)===String(id));if(!o)return;
 portalOpen('Заказ №'+o.id,`<div class="proto">${portalBadge(portalOrderStatus(o),o.agreed?'good':'warn')}<dl class="proto-summary"><div><dt>Компания</dt><dd>${esc(o.company)}</dd></div><div><dt>Сумма</dt><dd>${rub(amount(o))}</dd></div><div><dt>Желаемый срок</dt><dd>${portalDate(o.due)}</dd></div><div><dt>Получение</dt><dd>${esc(o.delivery)}</dd></div><div><dt>Адрес</dt><dd>${esc(o.address)}</dd></div><div><dt>Оплата</dt><dd>${o.paid?'Подтверждена сотрудником':'Требует согласования'}</dd></div></dl><div class="proto-table">${table(['Продукция','Заказано','Готово к отгрузке','Отправлено'],o.lines.map(l=>row([esc(P(l.p)?.name||'Продукция'),kg(l.qty),kg(l.res),kg(l.sent)])))}</div><p class="proto-dialog-note">Срок показан из текущего заказа. Подтвержденная дата доставки и документы будут подключены отдельно.</p><div class="proto-actions">${portalButton('Запросить изменение','order-change',o.id)}${portalButton('Повторить заказ','repeat',o.id)}</div></div>`);
}
function portalNewRfq(){
 portalOpen('Новый запрос на закупку',`<p class="proto-dialog-note">Открытый запрос увидят все учебные поставщики. Закрытый — только приглашенный. Рассылка пока не подключена.</p><div class="formgrid">${portalSelect('Сырье','rawId',S.raw.map(r=>[r.id,r.name]),S.raw[0]?.id)}${portalField('Количество, кг','qty',1000,'number','min="1" step="1" required')}${portalField('Нужно на складе','due',portalDay(3),'date','required')}${portalSelect('Кому доступен запрос','visibility',[['invited','Только приглашенному поставщику'],['open','Всем участникам']], 'invited')}<div data-trade-invite>${portalSelect('Пригласить поставщика','supplierId',ensurePortalPrototype().suppliers.map(s=>[s.id,s.name]),portalUI.supplierId)}</div><label class="field proto-wide">Требования и условия<textarea name="requirements" placeholder="Качество, документы, доставка"></textarea></label></div>`,'Создать запрос',{type:'rfq'});
}
function portalOfferForm(id){
 const r=portalRfq(id);if(!portalCanRespond(r,portalUI.supplierId))return;
 const own=ensurePortalPrototype().offers.find(o=>o.rfqId===id&&o.supplierId===portalUI.supplierId);
 portalOpen('Предложить условия',`<p class="proto-dialog-note">${esc(portalRaw(r.rawId)?.name)} · требуется ${kg(r.qty)} к ${portalDate(r.due)}. Учебные цены приводятся без НДС, в рублях за кг.</p><div class="formgrid">${portalField('Доступный объем, кг','qty',own?.qty||r.qty,'number','min="1" step="1" required')}${portalField('Цена без НДС, ₽/кг','price',own?.price||portalRaw(r.rawId)?.price||'','number','min="0.01" step="0.01" required')}${portalField('Доставка без НДС, ₽','delivery',own?.delivery??0,'number','min="0" step="0.01" required')}${portalField('Дата поступления на склад','due',own?.due||r.due,'date','required')}<label class="field proto-wide">Комментарий<textarea name="comment" placeholder="Условия оплаты, качество и документы">${esc(own?.comment||'')}</textarea></label></div>`,'Отправить предложение',{type:'offer',rfqId:id,supplierId:portalUI.supplierId,offerId:own?.id});
}
function portalCompare(id){
 const r=portalRfq(id);if(!r)return;const offers=ensurePortalPrototype().offers.filter(o=>o.rfqId===id);
 portalOpen('Предложения · '+(portalRaw(r.rawId)?.name||'Сырье'),`<p class="proto-dialog-note">Запрос: ${kg(r.qty)} к ${portalDate(r.due)}. Все суммы учебные, без НДС. Итог — за предлагаемый объем с доставкой.</p><div class="proto-table">${offers.length?table(['Поставщик','Объем','Цена / кг','Доставка','Итого','Поступление',''],offers.map(o=>{const chosen=ensurePortalPrototype().purchases.some(p=>p.offerId===o.id),late=o.due>r.due;return row([esc(portalSupplier(o.supplierId)?.name),kg(o.qty),rub(o.price),rub(o.delivery),rub(o.qty*o.price+o.delivery),`<div class="proto-cell">${portalDate(o.due)}${late?portalBadge('Позже срока','warn'):portalBadge('В срок','good')}${o.qty<r.qty?portalBadge('Часть объема','warn'):''}</div>`,chosen?portalBadge('Выбрано','good'):portalButton('Выбрать','choose-offer',o.id)])})):portalEmpty('Предложений пока нет','Перейдите в кабинет приглашенного поставщика и предложите условия.')}</div><p class="proto-dialog-note">Выбор создает учебный заказ поставщику. Проверка документов и качества, внутреннее одобрение и реальная закупка появятся позже.</p>`);
}
function portalShowPurchase(id){
 const p=portalPurchase(id);if(!p||page==='supplier-portal'&&p.supplierId!==portalUI.supplierId)return;
 const related=S.jobs.filter(j=>j.status!=='Готово'&&j.recipe?.[p.rawId]>0);
 portalOpen('Поставка №'+p.number,`<div class="proto">${portalBadge(p.status,p.status==='Подтвержден'?'good':'warn')}<dl class="proto-summary"><div><dt>Поставщик</dt><dd>${esc(portalSupplier(p.supplierId)?.name)}</dd></div><div><dt>Сырье</dt><dd>${esc(portalRaw(p.rawId)?.name)}</dd></div><div><dt>Количество</dt><dd>${kg(p.qty)}</dd></div><div><dt>Дата поступления</dt><dd>${portalDate(p.due)}</dd></div><div><dt>Стоимость с доставкой, без НДС</dt><dd>${rub(p.qty*p.price+p.delivery)}</dd></div></dl>${p.proposedDue?`<div class="proto-note"><strong>Запрошен перенос</strong><span>Предлагаемая дата: ${portalDate(p.proposedDue)}. ${esc(p.delayReason||'')} Действующие условия не изменены.</span></div>`:''}<div><h3>История</h3>${p.history.map(h=>`<p class="proto-dialog-note">${portalDate(h.date)} · ${esc(h.text)}</p>`).join('')}</div>${page==='supplier-workspace'?`<div><h3>Связанные задания</h3><p class="proto-dialog-note">${related.length?'Сырье используется в нарядах: '+related.map(j=>'№'+j.id).join(', ')+'. Связь не означает подтвержденную задержку.':'Активных заданий с этим сырьем нет.'}</p></div><div class="proto-actions">${portalButton('Приемка · скоро','stub','Приемка сырья')}${p.proposedDue?portalButton('Разбор переноса · скоро','stub','Согласование переноса'):''}</div>`:''}<p class="proto-dialog-note">Подтверждение и отправка не изменяют склад. Приемка проводится отдельно.</p></div>`);
}
function portalFormError(message){const el=portalDialog.querySelector('#portal-form-error');el.textContent=message;el.hidden=false;el.tabIndex=-1;el.focus()}
function portalCommit(message){portalDialog.close();save(message)}
document.addEventListener('submit',e=>{
 if(e.target.id!=='portal-form')return;e.preventDefault();
 const state=portalDialogState,data=Object.fromEntries(new FormData(e.target)),store=ensurePortalPrototype();if(!state)return;
 if(['request','rfq','offer'].includes(state.type)&&(!Number.isSafeInteger(Number(data.qty))||Number(data.qty)<=0))return portalFormError('Укажите положительное целое количество в кг');
 if(['request','rfq','offer','delay'].includes(state.type)&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.due||'')||Number.isNaN(Date.parse(data.due))||data.due<TODAY))return portalFormError('Выберите дату не раньше сегодняшнего дня');
 if(state.type==='request'){
  if(!P(data.productId)||!S.companies.some(c=>String(c.id)===String(state.companyId)))return portalFormError('Компания или продукция больше недоступна');
  if(!data.address?.trim())return portalFormError('Укажите адрес доставки или место самовывоза');
  store.requests.push({id:portalId('request'),companyId:state.companyId,productId:data.productId,qty:Number(data.qty),due:data.due,delivery:data.delivery,address:data.address.trim(),comment:data.comment.trim(),status:'Отправлена',created:TODAY});
  portalUI.clientTab='requests';return portalCommit('Заявка отправлена менеджеру и сохранена в «Моих заявках»');
 }
 if(state.type==='rfq'){
  if(!portalRaw(data.rawId)||!['open','invited'].includes(data.visibility)||data.visibility==='invited'&&!portalSupplier(data.supplierId))return portalFormError('Выберите сырье и получателей запроса');
  store.rfqs.push({id:portalId('rfq'),rawId:data.rawId,qty:Number(data.qty),due:data.due,requirements:data.requirements.trim()||'Условия уточняются',status:'Прием предложений',visibility:data.visibility,invited:data.visibility==='open'?[]:[data.supplierId],created:TODAY});
  portalUI.buyerTab='requests';return portalCommit('Учебный запрос создан и появился в кабинете поставщика');
 }
 if(state.type==='offer'){
  if(!Number.isFinite(Number(data.price))||Number(data.price)<=0||data.price.trim()===''||!Number.isFinite(Number(data.delivery))||Number(data.delivery)<0||data.delivery.trim()==='')return portalFormError('Укажите положительную цену и стоимость доставки от нуля');
  const r=portalRfq(state.rfqId);if(!portalCanRespond(r,state.supplierId))return portalFormError('Запрос недоступен этому поставщику');
  const existing=store.offers.find(o=>o.id===state.offerId);
  if(existing&&store.purchases.some(p=>p.offerId===existing.id))return portalFormError('Предложение уже выбрано. Изменение условий заказа пока доступно только как запрос переноса');
  const offer={id:existing?.id||portalId('offer'),rfqId:state.rfqId,supplierId:state.supplierId,qty:Number(data.qty),price:Number(data.price),delivery:Number(data.delivery),due:data.due,comment:data.comment.trim(),created:TODAY};
  if(existing)Object.assign(existing,offer);else store.offers.push(offer);
  return portalCommit('Предложение сохранено и доступно закупщику для сравнения');
 }
 if(state.type==='change'){
  if(!data.comment.trim())return portalFormError('Опишите, что требуется изменить');
  store.changes.push({id:portalId('change'),orderId:state.orderId,companyId:portalUI.companyId,text:data.comment.trim(),status:'Ожидает рассмотрения',created:TODAY});
  return portalCommit('Запрос изменения сохранен. Сам заказ остался прежним');
 }
 if(state.type==='delay'){
  const p=portalPurchase(state.purchaseId);if(!p||p.supplierId!==state.supplierId)return portalFormError('Поставка недоступна');
  if(!data.comment.trim())return portalFormError('Укажите причину изменения срока');
  p.proposedDue=data.due;p.delayReason=data.comment.trim();p.history.push({text:'Предложен перенос на '+portalDate(data.due)+': '+p.delayReason,date:TODAY});
  return portalCommit('Запрос переноса сохранен. Закупщик увидит его в карточке поставки');
 }
});
function portalAct(action,id){
 const store=ensurePortalPrototype();
 if(action==='close-dialog')return portalDialog.close();
 if(action==='tab'){const [kind,value]=id.split(':'),key={client:'clientTab',buyer:'buyerTab',supplier:'supplierTab'}[kind];if(key){portalUI[key]=value;render()}return}
 if(action==='navigate'){portalDialog.close();page=id;query='';render();return}
 if(action==='new-request')return portalNewRequest();
 if(action==='product')return portalNewRequest(id);
 if(action==='repeat'){const o=portalCompanyOrders().find(o=>String(o.id)===String(id));if(o)portalNewRequest(o.lines[0]?.p,o);return}
 if(action==='order')return portalShowOrder(id);
 if(action==='catalog-all'){portalUI.allProducts=true;render();return}
 if(action==='new-rfq')return portalNewRfq();
 if(action==='offer')return portalOfferForm(id);
 if(action==='compare')return portalCompare(id);
 if(action==='purchase')return portalShowPurchase(id);
 if(action==='supplier-switch'){portalUI.supplierId=id;page='supplier-portal';query='';render();return}
 if(action==='request-process'){const r=store.requests.find(r=>r.id===id);if(r?.status==='Отправлена'){r.status='В работе у менеджера';save('Клиентская заявка принята в работу. Согласование условий будет подключено позже')}return}
 if(action==='choose-offer'){
  const o=store.offers.find(o=>o.id===id),r=o&&portalRfq(o.rfqId);if(!o||!r)return;
  if(store.purchases.some(p=>p.offerId===id))return toast('По этому предложению уже создан учебный заказ');
  store.purchases.push({id:portalId('po'),number:'П-'+String(store.purchases.length+1).padStart(3,'0'),offerId:o.id,supplierId:o.supplierId,rawId:r.rawId,qty:Math.min(r.qty,o.qty),price:o.price,delivery:o.delivery,due:o.due,status:'Ожидает подтверждения',created:TODAY,history:[{text:'Учебный заказ создан из предложения поставщика',date:TODAY}]});
  portalUI.buyerTab='purchases';return portalCommit('Создан учебный заказ. Поставщик может подтвердить его в своем кабинете');
 }
 if(action==='confirm-purchase'||action==='dispatch-purchase'){
  const p=portalPurchase(id);if(!p||page!=='supplier-portal'||p.supplierId!==portalUI.supplierId)return;
  const expected=action==='confirm-purchase'?'Ожидает подтверждения':'Подтвержден';if(p.status!==expected)return;
  p.status=action==='confirm-purchase'?'Подтвержден':'Отправлен поставщиком';p.history.push({text:action==='confirm-purchase'?'Поставщик подтвердил учебные условия':'Поставщик сообщил об отправке',date:TODAY});save(action==='confirm-purchase'?'Поставка подтверждена в прототипе':'Отправка отмечена. Приход на склад не проведен');return;
 }
 if(action==='order-change'){
  const o=portalCompanyOrders().find(o=>String(o.id)===String(id));if(!o)return;
  portalOpen('Запросить изменение заказа №'+o.id,`<p class="proto-dialog-note">Менеджер рассмотрит запрос. Состав, цена, резервы и срок заказа сейчас не изменятся.</p><label class="field">Что нужно изменить<textarea name="comment" placeholder="Например: изменить адрес или обсудить частичную отгрузку" required></textarea></label>`,'Отправить запрос',{type:'change',orderId:o.id});return;
 }
 if(action==='delay'){
  const p=portalPurchase(id);if(!p||p.supplierId!==portalUI.supplierId)return;
  portalOpen('Предложить перенос поставки',`<p class="proto-dialog-note">Текущая дата: ${portalDate(p.due)}. Новый срок будет предложен закупщику, без изменения действующей даты.</p><div class="formgrid">${portalField('Предлагаемая дата','due',p.proposedDue||portalDay(5),'date','required')}<label class="field proto-wide">Причина<textarea name="comment" placeholder="Почему требуется перенос" required>${esc(p.delayReason||'')}</textarea></label></div>`,'Предложить перенос',{type:'delay',purchaseId:id,supplierId:portalUI.supplierId});return;
 }
 if(action==='document')return portalOpen(id,`<div class="proto-empty"><h3>Место для документа</h3><p>Это пример интерфейса. Настоящий файл пока не загружен.</p></div><p class="proto-dialog-note">Здесь появятся реквизиты, версия и действия с опубликованным файлом.</p>`);
 if(action==='stub')return toast(id+': функция появится на следующем этапе');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-proto-act]');if(b&&!b.disabled)portalAct(b.dataset.protoAct,b.dataset.id||'')});
document.addEventListener('change',e=>{const kind=e.target.dataset.protoContext;if(!kind)return;if(kind==='client')portalUI.companyId=e.target.value;else portalUI.supplierId=e.target.value;query='';render()});

// Add prototype entry points to both expanded navigation and the collapsed rail.
const supplierSection=navSections.find(s=>s.name==='Снабжение');supplierSection.pages.push('supplier-workspace');
document.querySelector('.sidebar .nav [data-page="purchases"]')?.insertAdjacentHTML('afterend','<button data-page="supplier-workspace">Поставщики и предложения</button>');
const portalNavSection={name:'Кабинеты',icon:'M4 21V5h16v16M8 9h2m4 0h2M8 13h2m4 0h2M10 21v-4h4v4',pages:['client-portal','supplier-portal']};
navSections.push(portalNavSection);
navRail.insertAdjacentHTML('beforeend',`<button type="button" data-nav-section="${navSections.length-1}" aria-label="Кабинеты" title="Кабинеты" aria-expanded="false" aria-controls="nav-flyout">${navSvg(portalNavSection.icon)}<span class="rail-marker" aria-hidden="true"></span></button>`);
const portalNav=document.createElement('details');portalNav.className='nav-group';portalNav.innerHTML=`<summary><span class="nav-section-label proto-nav-label">Кабинеты <small>демо</small></span><span class="nav-chevron" aria-hidden="true">${navSvg('m6 9 6 6 6-6')}</span></summary><nav class="nav"><button data-page="client-portal">Кабинет клиента</button><button data-page="supplier-portal">Кабинет поставщика</button></nav>`;
document.querySelector('.sidebar-stats').before(portalNav);
const portalViewBefore=view;view=function(){ensurePortalPrototype();if(page==='client-portal')return portalClientView();if(page==='supplier-workspace')return portalBuyerView();if(page==='supplier-portal')return portalSupplierView();return portalViewBefore()};
const portalRenderBefore=render;render=function(){
 if(portalDialog.open&&!portalPages.includes(page))portalDialog.close();
 ensurePortalPrototype();portalRenderBefore();$('#app').classList.toggle('proto-page',portalPages.includes(page));
 if(portalPages.includes(page)){
  $('#crumb').textContent=(page==='supplier-workspace'?'Снабжение':'Кабинеты')+' / '+names[page];
  const heading=$('#app .page-heading'),note=heading?.querySelector('p'),eyebrow=heading?.querySelector('.eyebrow');
  if(note)note.textContent={'client-portal':'Закажите продукцию и следите за исполнением.','supplier-workspace':'От запроса сырья до подтвержденной поставки.','supplier-portal':'Ответьте на запросы и согласуйте поставки.'}[page];
  if(eyebrow)eyebrow.textContent=page==='supplier-workspace'?'Снабжение':'Кабинеты';
  const actions=heading?.querySelector('.actions');if(actions)actions.innerHTML=page==='client-portal'?portalButton('+ Новая заявка','new-request','',true):page==='supplier-workspace'?portalButton('+ Запрос сырья','new-rfq','',true):portalButton('Рабочее место закупщика','navigate','supplier-workspace');
  $('#search').placeholder=page==='client-portal'?'Продукция или заказ':'Сырье, поставщик или запрос';
 }
 if(page==='orders'){
  const data=ensurePortalPrototype(),incoming=data.requests.filter(r=>r.status==='Отправлена'),changes=data.changes.filter(c=>c.status==='Ожидает рассмотрения');
  if(incoming.length||changes.length){const inbox=document.createElement('details');inbox.className='proto-inbox';inbox.innerHTML=`<summary>Кабинет клиента · ${incoming.length} новых заявок · ${changes.length} запросов изменения</summary><div class="proto-stack">${incoming.map(r=>portalRequestCard(r,true)).join('')}${changes.map(c=>`<article class="proto-order"><h3>Изменение заказа №${c.orderId}</h3><p>${esc(c.text)}</p><div>${portalBadge('Согласование · скоро','warn')}</div></article>`).join('')}</div>`;$('#app .page-content').before(inbox)}
 }
};
render();
