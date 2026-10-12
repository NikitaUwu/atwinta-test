// Local prototype: shared purchase identity, shipment facts and explicit acceptance.
// Migration creates links only; it never infers a receipt or changes physical stock.
function flowEnsure(){
 const data=ensurePortalPrototype();data.shipments??=[];data.receipts??=[];
 for(const p of data.purchases){
  let operational=S.purchases.find(x=>x.portalPurchaseId===p.id);
  if(!operational){operational={id:next(S.purchases),portalPurchaseId:p.id,items:{[p.rawId]:p.qty},date:p.created,due:p.due,priority:'Обычный',status:'Ожидает подтверждения',received:{}};S.purchases.push(operational)}
  p.operationalPurchaseId=operational.id;operational.received??={};operational.due=p.due;operational.unitPrices={[p.rawId]:p.price};
  const receipts=data.receipts.filter(x=>x.purchaseId===p.id),accepted=sum(receipts,x=>x.acceptedQty);
  operational.received[p.rawId]=accepted;
  if(p.status==='Ожидает подтверждения')operational.status='Ожидает подтверждения';
  else operational.status=accepted>=p.qty?'Получено':accepted>0?'Частично получено':'Согласована';
 }
 return data;
}
function flowPoTotals(p){
 const data=ensurePortalPrototype(),shipments=data.shipments||[],receipts=data.receipts||[];
 const own=shipments.filter(x=>x.purchaseId===p.id),accepted=sum(receipts.filter(x=>x.purchaseId===p.id),x=>x.acceptedQty);
 const transit=sum(own.filter(x=>!receipts.some(r=>r.shipmentId===x.id)),x=>x.qty);
 return{sent:sum(own,x=>x.qty),accepted,transit,toSend:Math.max(0,p.qty-accepted-transit),remaining:Math.max(0,p.qty-accepted)};
}
function flowPoStatus(p){
 const t=flowPoTotals(p);return p.status==='Ожидает подтверждения'?p.status:t.accepted>=p.qty?'Получено':t.accepted>0?'Частично принято':t.transit?'В пути':'Подтвержден';
}
function flowCanPurchase(p){return p&&(page==='supplier-workspace'||page==='purchases'||page==='supplier-portal'&&p.supplierId===portalUI.supplierId)}
function flowShipment(id){return (ensurePortalPrototype().shipments||[]).find(x=>x.id===id)}
function flowMetric(label,value){return `<div><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
function flowShipmentCard(sh,external=false){
 const p=portalPurchase(sh.purchaseId);if(!p||external&&p.supplierId!==portalUI.supplierId)return '';
 const receipt=ensurePortalPrototype().receipts.find(r=>r.shipmentId===sh.id);
 return `<article class="flow-shipment" data-shipment-id="${esc(sh.id)}"><div class="flow-card-head"><div><b>Партия ${esc(sh.number)} · заказ ${esc(p.number)}</b><p>${esc(portalRaw(p.rawId)?.name)} · ${kg(sh.qty)}</p></div>${portalBadge(receipt?'Приемка завершена':'В пути',receipt?'good':'warn')}</div><dl class="flow-dates"><div><dt>Отправлено</dt><dd>${portalDate(sh.departedAt)}</dd></div><div><dt>Ожидается на складе</dt><dd>${portalDate(sh.eta)}</dd></div></dl>${sh.reference?`<p class="muted">Сопроводительный документ: ${esc(sh.reference)}</p>`:''}${sh.comment?`<p>${esc(sh.comment)}</p>`:''}${receipt?`<div class="flow-metrics">${flowMetric('Получено фактически',kg(receipt.receivedQty))}${flowMetric('Принято на склад',kg(receipt.acceptedQty))}${flowMetric('Не принято / недостача',kg(sh.qty-receipt.acceptedQty))}</div><p class="muted">${portalDate(receipt.date)} · ${esc(receipt.comment||'Расхождений нет')}</p>`:!external?`<div class="proto-actions">${portalButton('Оформить приемку','flow-receive',sh.id,true)}</div>`:'<p class="muted">Покупатель подтвердит фактическую приемку.</p>'}</article>`;
}
portalPurchaseCard=function(p,external=false){
 const t=flowPoTotals(p),status=flowPoStatus(p);
 return `<article class="proto-order" data-purchase-id="${esc(p.id)}"><div class="proto-order-top"><div><div class="proto-caption">Заказ поставщику ${esc(p.number)}</div><h3>${esc(portalRaw(p.rawId)?.name)} · ${kg(p.qty)}</h3></div>${portalBadge(status,t.accepted>=p.qty?'good':'warn')}</div><p>${external?'Поставка на склад предприятия':esc(portalSupplier(p.supplierId)?.name)} · ${p.status==='Ожидает подтверждения'?'запрошенный':'согласованный'} срок ${portalDate(p.due)}</p><div class="flow-metrics">${flowMetric('В пути',kg(t.transit))}${flowMetric('Принято',kg(t.accepted))}${flowMetric('Осталось исполнить',kg(t.remaining))}</div>${p.proposedDue?`<p class="flow-alert">Запрошен перенос на ${portalDate(p.proposedDue)}. Пока действует прежний срок.</p>`:''}<div class="proto-order-bottom"><span>${rub(p.price)} / кг · доставка ${rub(p.delivery)}</span><strong>${rub(p.qty*p.price+p.delivery)}</strong></div><div class="proto-actions">${portalButton('Заказ и партии','purchase',p.id)}${external&&p.status==='Ожидает подтверждения'?portalButton('Подтвердить заказ','confirm-purchase',p.id,true):''}${external&&p.status!=='Ожидает подтверждения'&&t.toSend>0?portalButton('Создать отгрузку','dispatch-purchase',p.id,true):''}${external&&p.status!=='Ожидает подтверждения'&&t.remaining>0?portalButton('Предложить перенос','delay',p.id):''}</div></article>`;
};
portalShowPurchase=function(id){
 flowEnsure();const p=portalPurchase(id);if(!flowCanPurchase(p))return;
 const external=page==='supplier-portal',t=flowPoTotals(p),shipments=ensurePortalPrototype().shipments.filter(x=>x.purchaseId===id),s=p.listingSnapshot;
 portalOpen('Заказ поставщику '+p.number,`<div class="proto">${portalPurchaseCard(p,external)}<p class="flow-note">Закупочный лист №${p.operationalPurchaseId} связан с этим заказом. Остатки увеличиваются только на объем, принятый покупателем.</p>${s?`<details><summary>Согласованные условия предложения</summary><p>${esc(s.city)} · ${esc(s.quality)}</p><p>${esc(s.terms)}</p></details>`:''}${p.proposedDue&&!external?`<section class="partner-delay"><h3>Запрос переноса срока</h3><p>${portalDate(p.due)} → ${portalDate(p.proposedDue)} · ${esc(p.delayReason)}</p><div class="proto-actions">${portalButton('Согласовать перенос','accept-delay',id,true)}${portalButton('Отклонить','reject-delay',id)}</div></section>`:''}<h3>Партии и приемка</h3><div class="proto-stack">${shipments.map(x=>flowShipmentCard(x,external)).join('')||portalEmpty('Отгрузок еще нет','Поставщик создаст партию после подтверждения заказа.')}</div>${p.status==='Отправлен поставщиком'&&!shipments.length?'<p class="flow-alert">Сохранено старое сообщение об отправке. Состав партии и приемка не подтверждены; поставщику нужно оформить отгрузку.</p>':''}<h3>Документы</h3>${flowDocumentList(external?'supplier':'buyer',p.id)}<details><summary>История заказа</summary>${partnerTimeline(p)}</details>${!external&&t.remaining>0?`<p class="flow-note">Осталось принять ${kg(t.remaining)}. Не принятый объем требует дальнейшей поставки или отдельного согласования.</p>`:''}</div>`);
};
function flowDispatchForm(id){
 const p=portalPurchase(id);if(page!=='supplier-portal'||!p||p.supplierId!==portalUI.supplierId||p.status==='Ожидает подтверждения')return;
 const t=flowPoTotals(p);if(!t.toSend)return toast('Весь оставшийся объем уже отгружен');
 portalOpen('Отгрузка по заказу '+p.number,`<p class="flow-note">Можно отправить ${kg(t.toSend)}. Сообщение об отправке не изменяет склад покупателя.</p><div class="formgrid">${portalField('Количество в партии, кг','qty',t.toSend,'number','min="1" required')}${portalField('Дата отправки','departedAt',TODAY,'date','required')}${portalField('Ожидаемое поступление','eta',p.due<TODAY?TODAY:p.due,'date','required')}${portalField('Номер накладной / документа','reference','')}<label class="field proto-wide">Комментарий<textarea name="comment"></textarea></label></div>`,'Сообщить об отгрузке',{type:'flow-dispatch',purchaseId:id,supplierId:portalUI.supplierId});
}
function flowReceiptForm(id){
 const sh=flowShipment(id),p=sh&&portalPurchase(sh.purchaseId);if(!p||!['supplier-workspace','purchases'].includes(page)||ensurePortalPrototype().receipts.some(x=>x.shipmentId===id))return;
 portalOpen('Приемка партии '+sh.number,`<p class="flow-note">Заявлено ${kg(sh.qty)}. Только принятый объем попадет в доступный склад. Один раз на каждую партию.</p><div class="formgrid">${portalField('Получено фактически, кг','receivedQty',sh.qty,'number','min="0" required')}${portalField('Принято на склад, кг','acceptedQty',sh.qty,'number','min="0" required')}${portalField('Дата приемки','date',TODAY,'date','required')}<label class="field proto-wide">Расхождения / причина непринятия<textarea name="comment" placeholder="Укажите недостачу или причину отклонения"></textarea></label></div>`,'Подтвердить приемку',{type:'flow-receipt',shipmentId:id});
}
const flowPortalActBefore=portalAct;
portalAct=function(action,id){
 if(action==='dispatch-purchase')return flowDispatchForm(id);
 if(action==='flow-receive')return flowReceiptForm(id);
 if(action==='confirm-purchase'){
  const p=portalPurchase(id);if(page!=='supplier-portal'||!p||p.supplierId!==portalUI.supplierId||p.status!=='Ожидает подтверждения')return;
  p.status='Подтвержден';partnerHistory(p,'Поставщик подтвердил объем и согласованный срок');flowEnsure();return save('Заказ подтвержден и связан со складской закупкой');
 }
 return flowPortalActBefore(action,id);
};
// Block old all-at-once receipt paths for linked purchases, including entity cards.
const flowActBefore=act;
act=function(action,id){
 const p=S.purchases.find(x=>String(x.id)===String(id));
 if(['purchase-create','purchase-selected'].includes(action)){
  const selected=action==='purchase-selected'?[...document.querySelectorAll('[name=rawsel]:checked')].map(x=>x.value):[];
  const items={};for(const r of S.raw.filter(r=>!selected.length||selected.includes(r.id))){
   const inProgress=sum(S.purchases,x=>['Черновик','Ожидает подтверждения'].includes(x.status)?Math.max(0,(x.items?.[r.id]||0)-(x.received?.[r.id]||0)):0);
   const qty=Math.max(0,shortage(r)-inProgress);if(qty)items[r.id]=qty;
  }
  if(!Object.keys(items).length)return toast('Новой потребности нет или закупки уже в работе. Черновики не считаются подтвержденным поступлением');
  S.purchases.push({id:next(S.purchases),date:TODAY,due:TODAY,priority:'Высокий',status:'Черновик',items});return save('Создана закупка по потребности без повторения существующих закупок');
 }
 if(p?.portalPurchaseId&&['purchase-receive','entity-receive','purchase-approve','entity-approve'].includes(action)){
  if(partnerKind())return;if($('#modal').open)$('#modal').close();return portalShowPurchase(p.portalPurchaseId);
 }
 if(action==='entity-delete'&&dialogType==='purchase'&&S.purchases.find(x=>x.id==dialogId)?.portalPurchaseId)return reject('Закупка связана с заказом поставщику. Удаление нарушит историю поставок и приемки');
 return flowActBefore(action,id);
};
Object.assign(purchLabel,{'Ожидает подтверждения':['Ждем поставщика','warn'],'Частично получено':['Частично принято','blue']});
const flowPurchasesBefore=purchasesUX;
purchasesUX=function(){return '<p class="flow-note">Заказы поставщикам и закупочные листы связаны. Для частичной приемки откройте «Партии и приемка» в строке закупки.</p>'+flowPurchasesBefore()};
const flowSupplierBefore=partnerSupplierContent;
partnerSupplierContent=function(){
 if(portalUI.supplierTab==='purchases'){
  const purchases=flowEnsure().purchases.filter(x=>x.supplierId===portalUI.supplierId),shipments=ensurePortalPrototype().shipments.filter(x=>purchases.some(p=>p.id===x.purchaseId)),mode=portalUI.supplierOrderView||'orders';
  return `<div class="flow-tabs" role="group" aria-label="Заказы и отгрузки"><button data-flow-act="supplier-view" data-id="orders" aria-pressed="${mode==='orders'}">Заказы</button><button data-flow-act="supplier-view" data-id="shipments" aria-pressed="${mode==='shipments'}">Отгрузки · ${shipments.length}</button></div><p class="partner-explanation">${mode==='orders'?'Подтвердите заказ, затем отправляйте его одной или несколькими партиями.':'Отдельные партии: количество, ожидаемое прибытие и результат приемки покупателем.'}</p><div class="proto-stack">${mode==='orders'?purchases.filter(portalTextMatch).map(p=>portalPurchaseCard(p,true)).join('')||portalEmpty('Заказов пока нет','Покупатель направит заказ после выбора ваших условий.'):shipments.filter(portalTextMatch).map(s=>flowShipmentCard(s,true)).join('')||portalEmpty('Отгрузок пока нет','Создайте партию из подтвержденного заказа.')}</div>`;
 }
 if(portalUI.supplierTab==='requests'){
  const data=ensurePortalPrototype(),responded=new Set(data.offers.filter(x=>x.supplierId===portalUI.supplierId).map(x=>x.rfqId));
  const active=data.rfqs.filter(x=>portalCanRespond(x,portalUI.supplierId)),archive=data.rfqs.filter(x=>responded.has(x.id)&&!active.includes(x));
  return `<p class="partner-explanation">Отклик — предложение условий; заказ покупателя подтверждается отдельно.</p><div class="proto-stack">${active.filter(portalTextMatch).map(x=>portalRfqCard(x,true)).join('')||portalEmpty('Открытых запросов нет','Ранее отправленные отклики остаются в истории ниже.')}</div>${archive.length?`<details class="flow-archive"><summary>История моих откликов · ${archive.length}</summary>${archive.map(x=>`<article class="flow-shipment"><b>${esc(portalRaw(x.rawId)?.name)} · ${kg(x.qty)}</b><p>${esc(x.status)}</p><p>Ваш отклик: ${rub(data.offers.find(o=>o.rfqId===x.id&&o.supplierId===portalUI.supplierId).price)} / кг</p></article>`).join('')}</details>`:''}`;
 }
 return flowSupplierBefore();
};

// Customer delivery facts reuse operational shipment tasks; no second stock posting.
function flowOrderTotals(o){
 const tasks=S.tasks.filter(t=>t.order===o.id),sent=sum(o.lines,l=>l.sent),received=sum(tasks,t=>t.sent?(t.receivedQty||0):0);
 return{qty:volume(o),sent,received,toSend:Math.max(0,volume(o)-sent),toReceive:Math.max(0,volume(o)-received),tasks};
}
function flowOrderNext(o){
 const t=flowOrderTotals(o);
 if(t.tasks.some(x=>x.receiptClosed&&x.receivedQty<x.qty))return 'Менеджер: согласовать расхождение при получении';
 if(t.tasks.some(x=>x.sent&&!x.receiptClosed))return 'Клиент: подтвердить получение отправленных партий';
 if(t.toSend>0)return 'Менеджер: подготовить остаток и сообщить срок партии';
 return 'Поставки завершены';
}
portalOrderStatus=function(o){
 const t=flowOrderTotals(o);if(t.received>=t.qty)return 'Получен полностью';
 if(t.tasks.some(x=>x.receiptClosed&&x.receivedQty<x.qty))return 'Есть расхождения при получении';
 if(t.received>0)return 'Получен частично';if(t.sent>=t.qty)return 'Отправлен · ждем получения';
 if(t.sent>0)return 'Частичная отгрузка';return o.agreed?'Заказ подтвержден':'Заказ оформляется';
};
function flowDeliveryCard(t,client=false){
 const o=O(t.order);if(!o)return '';
 return `<article class="flow-shipment" data-task-id="${t.id}"><div class="flow-card-head"><div><b>Партия №${t.id} · ${esc(P(t.p)?.name)}</b><p>${kg(t.qty)}</p></div>${portalBadge(t.receiptClosed?(t.receivedQty<t.qty?'Получено с расхождением':'Получение подтверждено'):t.sent?'В пути':'Готовится',t.receiptClosed&&t.receivedQty===t.qty?'good':'warn')}</div><dl class="flow-dates"><div><dt>Отправка</dt><dd>${t.sent?portalDate(t.sentAt):'Еще не отправлено'}</dd></div><div><dt>Ожидаемое получение</dt><dd>${t.arrivalDue?portalDate(t.arrivalDue):'Менеджер уточняет срок'}</dd></div></dl>${t.receiptClosed?`<p>Получено ${kg(t.receivedQty)} из ${kg(t.qty)} · ${portalDate(t.receivedAt)}</p>${t.receiptComment?`<p>${esc(t.receiptComment)}</p>`:''}`:t.sent&&client?portalButton('Подтвердить получение','flow-client-receive',t.id,true):''}${!client?portalButton('Указать срок получения','flow-task-eta',t.id):''}</article>`;
}
portalOrderCard=function(o){
 const t=flowOrderTotals(o),r=o.portalRequestId&&partnerRequest(o.portalRequestId),due=r?'Согласованный срок':'Срок в заказе';
 const eta=t.tasks.filter(x=>!x.receiptClosed&&x.arrivalDue).map(x=>x.arrivalDue).sort()[0];
 return `<article class="proto-order" data-order-id="${o.id}"><div class="proto-order-top"><div><div class="proto-caption">Заказ №${o.id}</div><h3>${esc(o.lines.map(l=>P(l.p)?.name||'Продукция').join(', '))}</h3></div>${portalBadge(portalOrderStatus(o),t.received>=t.qty?'good':'warn')}</div><div class="flow-metrics">${flowMetric('Заказано',kg(t.qty))}${flowMetric('Отправлено',kg(t.sent))}${flowMetric('Получено',kg(t.received))}${flowMetric('Еще получить',kg(t.toReceive))}</div><p>${due}: ${portalDate(o.due)} · ближайшая партия: ${eta?portalDate(eta):'срок уточняется'}</p><p class="flow-next">${esc(flowOrderNext(o))}</p><div class="proto-order-bottom"><span>${esc(o.delivery)}</span><strong>${rub(amount(o)+(o.portalDeliveryCost||0))}</strong></div><div class="proto-actions">${portalButton('Заказ и поставки','order',o.id)}${portalButton('Повторить заказ','repeat',o.id)}</div></article>`;
};
portalShowOrder=function(id){
 const o=portalCompanyOrders().find(x=>String(x.id)===String(id));if(page!=='client-portal'||!o)return;
 const t=flowOrderTotals(o),r=o.portalRequestId&&partnerRequest(o.portalRequestId),changes=ensurePortalPrototype().changes.filter(x=>x.orderId===o.id);
 portalOpen('Заказ №'+o.id,`<div class="proto">${portalOrderCard(o)}<dl class="proto-summary"><div><dt>Адрес</dt><dd>${esc(o.address)}</dd></div><div><dt>Условия оплаты</dt><dd>${esc(o.terms)}</dd></div><div><dt>Оплата</dt><dd>${o.paid?'Подтверждена сотрудником':'Ожидает согласования'}</dd></div><div><dt>Продукция / доставка</dt><dd>${rub(amount(o))} / ${rub(o.portalDeliveryCost||0)}</dd></div></dl><dl class="flow-dates"><div><dt>Первоначально желаемый срок</dt><dd>${r?portalDate(r.due):'Отдельно не зафиксирован'}</dd></div><div><dt>${r?'Согласованный срок':'Срок в заказе'}</dt><dd>${portalDate(o.due)}</dd></div><div><dt>Осталось отправить</dt><dd>${kg(t.toSend)}</dd></div></dl>${table(['Продукция','Заказано','Готово','Отправлено','Получено'],o.lines.map(l=>row([esc(P(l.p)?.name),kg(l.qty),kg(l.res),kg(l.sent),kg(sum(t.tasks.filter(x=>x.p===l.p&&x.sent),x=>x.receivedQty||0))])))}<h3>Поставки по заказу</h3><div class="proto-stack">${t.tasks.map(x=>flowDeliveryCard(x,true)).join('')||portalEmpty('Партии еще не назначены','Менеджер сообщит состав и ожидаемое получение каждой партии.')}</div><h3>Документы</h3>${flowDocumentList('client',o.id)}<div class="proto-actions">${portalButton('Запросить изменение','order-change',o.id)}</div>${changes.length?`<details open><summary>Обращения по заказу</summary>${changes.map(c=>`<p>${esc(c.text)} · ${esc(c.status)}</p>${c.response?`<p><b>Ответ менеджера:</b> ${esc(c.response)}</p>`:''}`).join('')}</details>`:''}</div>`);
};
const flowDrawBefore=drawDialog;
drawDialog=function(){
 flowDrawBefore();const body=$('#modal .dialogbody');if(!body)return;
 if(dialogType==='task'&&T(dialogId))body.insertAdjacentHTML('beforeend',`<section class="proto flow-task-detail"><h3>Срок и получение клиентом</h3>${flowDeliveryCard(T(dialogId))}</section>`);
 if(dialogType==='order'&&O(dialogId))body.insertAdjacentHTML('beforeend',`<section class="proto flow-task-detail"><h3>Получение клиентом</h3><p>${esc(flowOrderNext(O(dialogId)))}</p>${S.tasks.filter(t=>t.order===Number(dialogId)).map(t=>flowDeliveryCard(t)).join('')}</section>`);
};
const flowClientBefore=partnerClientContent;
partnerClientContent=function(){
 const html=flowClientBefore();
 if(portalUI.clientTab!=='overview')return html;
 const active=portalCompanyOrders().filter(o=>(o.agreed||o.portalRequestId)&&flowOrderTotals(o).toReceive>0).length;
 return html.replace(/(<span>Заказы в работе<\/span><strong>)[^<]+/,`$1${active}`).replace('Оформлены менеджером','До полного получения');
};

// Multi-line requests use the existing revision/approval/order workflow.
function flowRequestLines(r,proposal=false){
 const source=proposal?r.proposal:r;
 return source?.lines||[{productId:source?.productId,qty:source?.qty,price:source?.price}];
}
function flowLineForm(l,i,priced){
 return `<div class="flow-line" data-request-line>${portalSelect('Продукция','productId',S.products.map(p=>[p.id,p.name]),l.productId)}${portalField('Количество, кг','qty',l.qty,'number','min="1" required')}${priced?portalField('Цена за кг, ₽','price',l.price??P(l.productId)?.price??'','number','min="0.01" step="0.01" required'):''}<button type="button" data-flow-act="remove-line" aria-label="Удалить позицию ${i+1}">×</button></div>`;
}
function flowLinesForm(lines,priced){return `<div class="flow-lines" data-priced="${priced}">${lines.map((l,i)=>flowLineForm(l,i,priced)).join('')}</div><button type="button" data-flow-act="add-line">Добавить позицию</button>`}
portalNewRequest=function(productId,order){
 const company=portalCompany();if(page!=='client-portal'||!company)return;
 const lines=order?order.lines.map(l=>({productId:l.p,qty:l.qty})):[{productId:productId||S.products[0]?.id,qty:1000}];
 portalOpen(order?'Повторить заказ №'+order.id:'Новая заявка',`<p class="flow-note">${esc(company.name)} · все позиции передаются менеджеру. Цена и доступность проверяются заново; прошлые условия не принимаются автоматически.</p>${flowLinesForm(lines,false)}<div class="formgrid">${portalField('Желаемая дата получения','due',portalDay(4),'date','required')}${portalSelect('Получение','delivery',[['Доставка клиенту','Доставка клиенту'],['Самовывоз','Самовывоз']],order?.delivery||'Доставка клиенту')}<div class="proto-wide">${portalField('Адрес','address',order?.address||company.address||'')}</div><label class="field proto-wide">Комментарий<textarea name="comment"></textarea></label></div><details class="flow-archive"><summary>Текущие ориентиры каталога</summary>${lines.map(l=>`<p>${esc(P(l.productId)?.name||'Позиция недоступна')} · ${rub(P(l.productId)?.price||0)} / кг · свободный готовый объем ${kg(P(l.productId)?Math.max(0,free(l.productId)):0)}</p>`).join('')}<p class="muted">Это данные при открытии формы, не резерв и не подтверждение возможности доставки.</p></details>${aiPreviewButton('Заполнить из сообщения · макет','import')}`,'Отправить заявку',{type:'flow-request',companyId:company.id,repeatOrderId:order?.id});
};
partnerProposalForm=function(id){
 if(partnerKind())return;const r=id?partnerRequest(id):null;if(id&&(!r||r.orderId||r.status==='Условия приняты'))return;
 const p=r?.proposal,c=r?S.companies.find(c=>String(c.id)===String(r.companyId)):S.companies[0];
 const lines=r?flowRequestLines(r,!!p):[{productId:S.products[0]?.id,qty:1000}];
 portalOpen(r?'Условия по заявке '+r.number:'Предложение клиенту',`<p class="flow-note">Состав, цены и доставка согласуются одной версией предложения. Производство и резерв не запускаются.</p>${r?`<p>Компания: <b>${esc(c?.name)}</b></p>`:portalSelect('Компания','companyId',S.companies.map(x=>[x.id,x.name]),c?.id)}${flowLinesForm(lines,true)}<div class="formgrid">${portalField('Доставка, ₽','deliveryCost',p?.deliveryCost??0,'number','min="0" step="0.01" required')}${portalField('Предлагаемый срок','due',p?.due||r?.due||portalDay(4),'date','required')}${portalField('Время','dueTime',p?.time||'18:00','time','required')}${portalSelect('Получение','delivery',[['Доставка клиенту','Доставка клиенту'],['Самовывоз','Самовывоз']],p?.delivery||r?.delivery||'Доставка клиенту')}<div class="proto-wide">${portalField('Адрес','address',p?.address||r?.address||c?.address||'')}</div><label class="field proto-wide">Условия оплаты<textarea name="terms" required>${esc(p?.terms||c?.terms||'Условия уточняются')}</textarea></label></div>${aiPreviewButton('Заполнить из обращения · макет','import')}`,'Отправить клиенту',{type:'flow-proposal',requestId:r?.id,companyId:r?.companyId,revision:p?.revision||0});
};
portalRequestCard=function(r,internal=false){
 const lines=flowRequestLines(r,!!r.proposal),c=S.companies.find(c=>String(c.id)===String(r.companyId));
 return `<article class="proto-order" data-request-id="${esc(r.id)}"><div class="proto-order-top"><div><div class="proto-caption">${esc(r.number)}${internal?' · '+esc(c?.name):''}</div><h3>${esc(lines.map(l=>P(l.productId)?.name||'Продукция').join(', '))}</h3></div>${portalBadge(r.status,r.orderId?'good':'warn')}</div><p>${kg(sum(lines,l=>l.qty))} · ${r.proposal?'Предлагаемый':'Желаемый'} срок ${portalDate(r.proposal?.due||r.due)}</p>${r.proposal?`<p>Итого с доставкой: <b>${rub(sum(lines,l=>l.qty*l.price)+r.proposal.deliveryCost)}</b></p>`:''}${r.comment?`<p>${esc(r.comment)}</p>`:''}<div class="proto-actions">${partnerRequestActions(r,internal)}</div></article>`;
};
partnerReviewRequest=function(id){
 const r=partnerRequest(id);if(page!=='client-portal'||!r||String(r.companyId)!==String(portalUI.companyId))return;
 const p=r.proposal,lines=flowRequestLines(r,!!p);
 portalOpen('Заявка '+r.number,`<div class="proto">${portalBadge(r.status,'warn')}${table(p?['Продукция','Количество','Цена / кг','Сумма']:['Продукция','Количество'],lines.map(l=>row([esc(P(l.productId)?.name),kg(l.qty),...(p?[rub(l.price),rub(l.price*l.qty)]:[])])))}${p?`<p>Доставка: ${rub(p.deliveryCost)} · всего ${rub(sum(lines,l=>l.qty*l.price)+p.deliveryCost)}</p><p>Срок: ${portalDate(p.due)} ${esc(p.time)} · ${esc(p.delivery)} · ${esc(p.address)}</p><p>Оплата: ${esc(p.terms)} · версия ${p.revision}</p>`:'<p>Менеджер подготовит условия для всех позиций.</p>'}${r.status==='Ожидает подтверждения клиента'?`<div class="proto-actions">${portalButton('Принять условия','request-accept',id,true)}${portalButton('Попросить изменить','request-revise',id)}</div>`:''}${partnerTimeline(r)}</div>`,'',{type:'review-request',requestId:id,revision:p?.revision});
};
partnerConvertRequest=function(id){
 const r=partnerRequest(id);if(partnerKind()||!r||r.status!=='Условия приняты'||!r.proposal||r.acceptedRevision!==r.proposal.revision||r.orderId)return;
 const c=S.companies.find(c=>String(c.id)===String(r.companyId)),p=r.proposal,lines=flowRequestLines(r,true);if(!c||lines.some(l=>!P(l.productId)))return;
 const duplicate=S.orders.find(o=>o.portalRequestId===r.id);if(duplicate){r.orderId=duplicate.id;r.status='Заказ создан';return save('Заказ уже создан')}
 const orderId=next(S.orders),contact=S.clients.find(x=>String(x.companyId)===String(c.id));
 S.orders.push({id:orderId,companyId:c.id,company:c.name,clientId:contact?.id,contact:contact?.name||'',city:c.city||'',address:p.address,delivery:p.delivery,due:p.due+'T'+p.time,priority:'Обычный',manager:'Менеджер предприятия',paid:false,agreed:false,checked:false,terms:p.terms,lines:lines.map(l=>({p:l.productId,qty:l.qty,unitPrice:l.price,res:0,sent:0})),notes:[],files:[],portalRequestId:r.id,portalDeliveryCost:p.deliveryCost});
 r.orderId=orderId;r.status='Заказ создан';partnerHistory(r,'Создан заказ №'+orderId+' со всеми согласованными позициями');save('Заказ создан в CRM. Исполнение запускается штатными действиями');
};

// Generated demo documents are scoped to the current party, searchable without AI.
const flowDocFilters=new Map();
function flowDocs(kind){
 const docs=[];
 if(kind==='client')for(const o of portalCompanyOrders().filter(x=>x.agreed||x.portalRequestId)){
  docs.push({id:'client-order-'+o.id,type:'Условия заказа',subject:'Заказ №'+o.id,objectId:o.id,date:o.portalRequestId?partnerRequest(o.portalRequestId)?.created||TODAY:TODAY,lines:o.lines.map(l=>[P(l.p)?.name,l.qty,l.unitPrice??P(l.p)?.price]),note:o.terms+' · срок '+portalDate(o.due)});
  for(const t of S.tasks.filter(t=>t.order===o.id&&t.sent))docs.push({id:'client-shipment-'+t.id,type:'Отгрузка',subject:'Заказ №'+o.id+' · партия №'+t.id,objectId:o.id,date:t.sentAt||TODAY,lines:[[P(t.p)?.name,t.qty,t.unitPrice]],note:'Отправлено. Получение подтверждается отдельно.'});
 }else for(const p of ensurePortalPrototype().purchases.filter(x=>kind==='buyer'||x.supplierId===portalUI.supplierId)){
  docs.push({id:'supplier-order-'+p.id,type:'Условия заказа',subject:'Заказ '+p.number,objectId:p.id,date:p.created,lines:[[portalRaw(p.rawId)?.name,p.qty,p.price]],note:'Срок '+portalDate(p.due)+' · '+flowPoStatus(p)});
  for(const s of (ensurePortalPrototype().shipments||[]).filter(x=>x.purchaseId===p.id))docs.push({id:'supplier-shipment-'+s.id,type:'Отгрузка',subject:'Заказ '+p.number+' · партия '+s.number,objectId:p.id,date:s.departedAt,lines:[[portalRaw(p.rawId)?.name,s.qty,p.price]],note:s.reference||'Учебный документ партии'});
  for(const r of (ensurePortalPrototype().receipts||[]).filter(x=>x.purchaseId===p.id))docs.push({id:'receipt-'+r.id,type:'Приемка',subject:'Заказ '+p.number+' · приемка',objectId:p.id,date:r.date,lines:[[portalRaw(p.rawId)?.name,r.acceptedQty,p.price]],note:'Получено '+kg(r.receivedQty)+'. '+r.comment});
 }
 return docs;
}
function flowDocRow(d){return `<div class="flow-doc-row"><div><b>${esc(d.type)}</b><p>${esc(d.subject)} · ${portalDate(d.date)}</p><small>Учебный HTML-файл · не первичный документ</small></div><div class="proto-actions"><button data-flow-act="document-view" data-id="${esc(d.id)}">Просмотреть</button><button data-flow-act="document-download" data-id="${esc(d.id)}">Скачать</button></div></div>`}
function flowDocumentList(kind,id){return flowDocs(kind).filter(d=>String(d.objectId)===String(id)).map(flowDocRow).join('')||'<p class="muted">Документов пока нет.</p>'}
portalDocuments=function(kind){
 const key=kind+':'+(kind==='client'?portalUI.companyId:portalUI.supplierId),f=flowDocFilters.get(key)||{},docs=flowDocs(kind);
 const filtered=docs.filter(d=>(!f.type||d.type===f.type)&&(!f.object||String(d.objectId)===f.object)&&(!f.from||d.date>=f.from)&&(!f.to||d.date<=f.to)&&portalTextMatch(d));
 return `<p class="flow-note">Документы связаны с заказами и партиями. Файлы формируются из демонстрационных данных; загрузка подписанных документов не подключена.</p><div class="flow-doc-filters">${portalSelect('Тип','type',[['','Все типы'],...['Условия заказа','Отгрузка','Приемка'].map(x=>[x,x])],f.type)}${portalSelect('Заказ','object',[['','Все заказы'],...[...new Map(docs.map(d=>[String(d.objectId),d.subject.split(' · ')[0]])).entries()]],f.object)}${portalField('С даты','from',f.from||'','date')}${portalField('По дату','to',f.to||'','date')}</div><p class="muted">Найдено: ${filtered.length}</p>${filtered.map(flowDocRow).join('')||portalEmpty('Документы не найдены','Измените поиск или фильтры.')}`;
};
function flowCurrentDoc(id){const kind=partnerKind()||(['supplier-workspace','purchases'].includes(page)?'buyer':null);return kind&&flowDocs(kind).find(d=>d.id===id)}
function flowDocumentBody(d){return `<p class="flow-alert">Демонстрационный документ. Не является счетом, накладной или подтверждением качества.</p><h3>${esc(d.type)} · ${esc(d.subject)}</h3><p>${portalDate(d.date)}</p>${table(['Позиция','Количество, кг','Цена / кг'],d.lines.map(l=>row([esc(l[0]),num(l[1]),l[2]!==undefined?rub(l[2]):'Не указана'])))}<p>${esc(d.note)}</p>`}

document.addEventListener('click',event=>{
 const b=event.target.closest('[data-flow-act]');if(!b||b.disabled)return;event.preventDefault();const {flowAct:action,id}=b.dataset;
 if(action==='supplier-view'){portalUI.supplierOrderView=id;query='';return render()}
 if(action==='add-line'){const holder=portalDialog.querySelector('.flow-lines');if(holder)holder.insertAdjacentHTML('beforeend',flowLineForm({productId:S.products[0]?.id,qty:1000},holder.children.length,holder.dataset.priced==='true'));return}
 if(action==='remove-line'){const holder=b.closest('.flow-lines');if(holder.children.length>1)b.closest('[data-request-line]').remove();else portalFormError('В заявке должна остаться хотя бы одна позиция');return}
 if(action==='document-view'||action==='document-download'){
  const d=flowCurrentDoc(id);if(!d)return;
  if(action==='document-view')return portalOpen('Учебный документ',flowDocumentBody(d));
  const html='<!doctype html><html lang="ru"><meta charset="utf-8"><title>Учебный документ</title><style>body{font:16px Arial;margin:40px;max-width:900px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:10px}button{border:0;background:none;font:inherit}.sort-head span{display:none}</style>'+flowDocumentBody(d)+'</html>';
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='Учебный_'+d.subject.replace(/[^\p{L}\p{N}-]+/gu,'_')+'_'+d.type+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
});
document.addEventListener('change',e=>{
 const holder=e.target.closest('.flow-doc-filters');if(!holder)return;const kind=partnerKind(),key=kind+':'+(kind==='client'?portalUI.companyId:portalUI.supplierId),f=flowDocFilters.get(key)||{};
 f[e.target.name]=e.target.value;flowDocFilters.set(key,f);render();document.querySelector('.flow-doc-filters [name="'+e.target.name+'"]')?.focus();
});
const flowPortalActMore=portalAct;
portalAct=function(action,id){
 if(action==='flow-client-receive'){
  const t=T(id),o=t&&portalCompanyOrders().find(o=>o.id===t.order);if(page!=='client-portal'||!o||!t.sent||t.receiptClosed)return;
  return portalOpen('Получение партии №'+t.id,`<p class="flow-note">Отправлено ${kg(t.qty)}. Факт получения не меняет склад предприятия повторно.</p><div class="formgrid">${portalField('Получено, кг','qty',t.qty,'number','min="0" required')}${portalField('Дата получения','date',TODAY,'date','required')}<label class="field proto-wide">Расхождения<textarea name="comment"></textarea></label></div>`,'Подтвердить получение',{type:'flow-client-receipt',taskId:t.id,companyId:portalUI.companyId});
 }
 if(action==='flow-task-eta'){
  const t=T(id);if(partnerKind()||!t||t.receiptClosed)return;
  return portalOpen('Срок получения партии №'+t.id,`<p class="flow-note">Ожидаемая дата показывается клиенту отдельно от согласованного срока заказа.</p>${portalField('Ожидаемое получение','date',t.arrivalDue||portalDay(1),'date','required')}`,'Сообщить клиенту',{type:'flow-task-eta',taskId:t.id});
 }
 return flowPortalActMore(action,id);
};
document.addEventListener('submit',event=>{
 const state=portalDialogState;if(event.target.id!=='portal-form'||!state?.type?.startsWith('flow-'))return;event.preventDefault();
 const v=Object.fromEntries(new FormData(event.target)),data=flowEnsure(),type=state.type;
 if(type==='flow-dispatch'){
  const p=portalPurchase(state.purchaseId),qty=Number(v.qty);if(page!=='supplier-portal'||!p||p.supplierId!==portalUI.supplierId||p.supplierId!==state.supplierId||p.status==='Ожидает подтверждения')return portalFormError('Заказ недоступен');
  if(!Number.isSafeInteger(qty)||qty<=0||qty>flowPoTotals(p).toSend)return portalFormError('Объем должен быть положительным и не превышать неотгруженный остаток');
  if(!portalTradeValidDate(v.departedAt)||!portalTradeValidDate(v.eta)||v.departedAt>TODAY||v.departedAt<p.created||v.eta<v.departedAt)return portalFormError('Отправка должна быть между созданием заказа и сегодняшним днем; прибытие — не раньше отправки');
  const sh={id:portalId('shipment'),number:p.number+'/'+(data.shipments.filter(x=>x.purchaseId===p.id).length+1),purchaseId:p.id,qty,departedAt:v.departedAt,eta:v.eta,reference:v.reference.trim(),comment:v.comment.trim()};
  data.shipments.push(sh);partnerHistory(p,'Отправлена партия '+sh.number+': '+kg(qty)+', прибытие '+portalDate(sh.eta));return portalCommit('Партия отправлена. Покупатель может оформить приемку');
 }
 if(type==='flow-receipt'){
  const sh=flowShipment(state.shipmentId),p=sh&&portalPurchase(sh.purchaseId),received=Number(v.receivedQty),accepted=Number(v.acceptedQty);
  if(!['supplier-workspace','purchases'].includes(page)||!p||data.receipts.some(x=>x.shipmentId===sh.id))return portalFormError('Партия недоступна или уже принята');
  if(!v.receivedQty.trim()||!v.acceptedQty.trim()||![received,accepted].every(Number.isSafeInteger)||received<0||accepted<0||received>sh.qty||accepted>received)return portalFormError('Получено: от 0 до объема партии. Принято: от 0 до полученного');
  if(!portalTradeValidDate(v.date)||v.date>TODAY||v.date<sh.departedAt)return portalFormError('Дата приемки должна быть между отправкой и сегодняшним днем');
  if(accepted<sh.qty&&!v.comment.trim())return portalFormError('Укажите причину непринятого объема или недостачи');
  const raw=portalRaw(p.rawId);if(!raw)return portalFormError('Сырье не найдено');
  const receipt={id:portalId('receipt'),shipmentId:sh.id,purchaseId:p.id,receivedQty:received,acceptedQty:accepted,date:v.date,comment:v.comment.trim()};data.receipts.push(receipt);
  raw.stock+=accepted;(S.moves||=[]).push({raw:raw.id,date:v.date,type:'Приход',qty:accepted,purchase:p.operationalPurchaseId,receiptId:receipt.id,comment:'Приемка '+sh.number+' · '+receipt.comment});
  partnerHistory(p,'Принято '+kg(accepted)+' из партии '+sh.number+(accepted<sh.qty?'. Расхождение: '+receipt.comment:''));flowEnsure();return portalCommit('Приемка сохранена. Склад увеличен на '+kg(accepted));
 }
 if(type==='flow-client-receipt'){
  const t=T(state.taskId),o=t&&portalCompanyOrders().find(o=>o.id===t.order),qty=Number(v.qty);
  if(page!=='client-portal'||String(state.companyId)!==String(portalUI.companyId)||!o||!t.sent||t.receiptClosed)return portalFormError('Партия недоступна или получение уже подтверждено');
  if(!v.qty.trim()||!Number.isSafeInteger(qty)||qty<0||qty>t.qty||!portalTradeValidDate(v.date)||v.date>TODAY||v.date<(t.sentAt||TODAY))return portalFormError('Проверьте количество и дату получения');
  if(qty<t.qty&&!v.comment.trim())return portalFormError('Опишите расхождение');
  t.receivedQty=qty;t.receivedAt=v.date;t.receiptClosed=true;t.receiptComment=v.comment.trim();
  if(qty<t.qty)data.changes.push({id:portalId('change'),orderId:o.id,companyId:o.companyId,text:'Расхождение по партии №'+t.id+': получено '+kg(qty)+' из '+kg(t.qty)+'. '+t.receiptComment,status:'Ожидает рассмотрения',created:TODAY});
  return portalCommit('Получение подтверждено'+(qty<t.qty?'; менеджеру передано расхождение':''));
 }
 if(type==='flow-task-eta'){
  const t=T(state.taskId);if(partnerKind()||!t||t.receiptClosed)return portalFormError('Партия недоступна');
  if(!portalTradeValidDate(v.date)||v.date<TODAY||v.date<(t.sentAt||t.date||TODAY))return portalFormError('Получение не может быть раньше отправки или сегодняшнего дня');
  t.arrivalDue=v.date;return portalCommit('Ожидаемое получение сообщено клиенту');
 }
 if(type==='flow-request'||type==='flow-proposal'){
  const priced=type==='flow-proposal',r=state.requestId?partnerRequest(state.requestId):null,companyId=state.companyId||v.companyId,c=S.companies.find(x=>String(x.id)===String(companyId));
  if(!c||priced&&partnerKind()||!priced&&(page!=='client-portal'||String(c.id)!==String(portalUI.companyId)))return portalFormError('Компания недоступна');
  if(priced&&state.requestId&&(!r||r.orderId||r.status==='Условия приняты'||(r.proposal?.revision||0)!==state.revision))return portalFormError('Заявка изменилась. Откройте актуальные условия');
  const lines=[...event.target.querySelectorAll('[data-request-line]')].map(row=>({productId:row.querySelector('[name=productId]').value,qty:Number(row.querySelector('[name=qty]').value),...(priced?{price:Number(row.querySelector('[name=price]').value)}:{})}));
  if(!lines.length||lines.some(l=>!P(l.productId)||!Number.isSafeInteger(l.qty)||l.qty<=0||priced&&(!Number.isFinite(l.price)||l.price<=0))||new Set(lines.map(l=>l.productId)).size!==lines.length)return portalFormError('Проверьте позиции: положительные объемы и цены, без повторения одной продукции');
  if(!portalTradeValidDate(v.due)||v.due<TODAY||!v.address.trim()||!['Доставка клиенту','Самовывоз'].includes(v.delivery))return portalFormError('Укажите корректную дату, получение и адрес');
  const request=r||{id:portalId('request'),companyId:c.id,productId:lines[0].productId,qty:lines[0].qty,lines:lines.map(l=>({productId:l.productId,qty:l.qty})),due:v.due,delivery:v.delivery,address:v.address.trim(),comment:v.comment?.trim()||'',created:TODAY,origin:priced?'manager':'client',number:'З-'+String(data.requests.length+1).padStart(3,'0'),history:[]};
  if(priced){
   const cost=Number(v.deliveryCost);if(!v.deliveryCost.trim()||!Number.isFinite(cost)||cost<0||v.delivery==='Самовывоз'&&cost!==0||!v.terms.trim()||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.dueTime))return portalFormError('Проверьте доставку, время и условия оплаты');
   request.proposal={productId:lines[0].productId,qty:lines[0].qty,price:lines[0].price,lines,deliveryCost:cost,due:v.due,time:v.dueTime,delivery:v.delivery,address:v.address.trim(),terms:v.terms.trim(),revision:(r?.proposal?.revision||0)+1};request.status='Ожидает подтверждения клиента';delete request.acceptedRevision;partnerHistory(request,'Менеджер направил условия для '+lines.length+' позиций');
  }else{request.status='Отправлена';request.repeatOrderId=state.repeatOrderId;partnerHistory(request,'Клиент отправил заявку: '+lines.length+' позиций');portalUI.clientTab='requests'}
  if(!r)data.requests.push(request);return portalCommit(priced?'Предложение доступно клиенту':'Все позиции переданы менеджеру на согласование');
 }
});
const flowRenderBefore=render;
render=function(){flowEnsure();flowRenderBefore()};
flowEnsure();localStorage.setItem(KEY,JSON.stringify(S));render();
