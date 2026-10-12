// Trading extends the local supplier prototype; it does not import market data.
// Listings are independent of RFQ responses. Existing prototype records are kept.
function portalEnsureTrading(data){
 for(const r of data.rfqs)r.visibility??='invited';
 if(Array.isArray(data.listings))return;
 const raw=S.raw[0],other=S.raw[1]||raw;
 const one=data.suppliers[0],two=data.suppliers[1]||one;
 data.listings=raw&&one?[
  {id:'demo-listing-1',supplierId:one.id,rawId:raw.id,qty:5000,minQty:500,price:Number(raw.price)||15,city:one.city,quality:'Кормовое сырье. Показатели качества уточняются по документам.',deliveryType:'delivery',deliveryCost:1800,terms:'Предоплата; условия согласуются перед поставкой.',availableFrom:portalDay(2),validUntil:portalDay(30),status:'active',revision:1,created:TODAY},
  {id:'demo-listing-2',supplierId:two.id,rawId:raw.id,qty:3000,minQty:1000,price:Math.round((Number(raw.price)||15)*0.95*100)/100,city:two.city,quality:'Условия качества и сопроводительные документы по запросу.',deliveryType:'pickup',deliveryCost:0,terms:'Самовывоз. Оплата согласуется с поставщиком.',availableFrom:portalDay(3),validUntil:portalDay(30),status:'active',revision:1,created:TODAY},
  {id:'demo-listing-3',supplierId:one.id,rawId:other.id,qty:2000,minQty:500,price:Number(other.price)||20,city:one.city,quality:'Качество требует согласования перед закупкой.',deliveryType:'negotiable',deliveryCost:null,terms:'Стоимость и способ доставки уточняются.',availableFrom:portalDay(4),validUntil:portalDay(30),status:'active',revision:1,created:TODAY}
 ]:[];
 // Keep old private requests private; add a separate open demo example.
 if(other&&!data.rfqs.some(r=>r.id==='demo-rfq-open'))data.rfqs.push({id:'demo-rfq-open',rawId:other.id,qty:2000,due:portalDay(6),requirements:'Открытый учебный запрос. Укажите цену, доставку и документы на сырье.',status:'Прием предложений',visibility:'open',invited:[],created:TODAY});
}
function portalCanRespond(r,supplierId){return !!r&&r.status==='Прием предложений'&&S.portalPrototype.suppliers.some(s=>s.id===supplierId)&&(r.visibility==='open'||r.invited.includes(supplierId))}
function portalListing(id){return ensurePortalPrototype().listings.find(l=>l.id===id)}
function portalListingActive(l){return l.status==='active'&&l.validUntil>=TODAY}
function portalListingStatus(l){return l.status==='withdrawn'?'Снято с публикации':l.validUntil<TODAY?'Срок истек':'Опубликовано'}
function portalListingMatches(l){
 const supplier=portalSupplier(l.supplierId),raw=portalRaw(l.rawId),f=portalUI.tradeFilters||{};
 const text=[raw?.name,supplier?.name,l.city,l.quality,l.terms].join(' ').toLocaleLowerCase('ru');
 return text.includes(query.toLocaleLowerCase('ru'))&&(!f.rawId||l.rawId===f.rawId)&&(!f.city||l.city===f.city)&&(!f.priceMax||l.price<=Number(f.priceMax))&&(!f.qtyMin||l.qty>=Number(f.qtyMin));
}
function portalListingDelivery(l){return l.deliveryType==='pickup'?'Самовывоз':l.deliveryType==='delivery'?'Доставка поставщиком':'Доставка по согласованию'}
function portalListingCard(l,own=false){
 const s=portalSupplier(l.supplierId),active=portalListingActive(l);
 return `<article class="proto-trade-card"><div class="proto-order-top"><div><div class="proto-caption">${own?'':esc(s?.name||'Поставщик')+' · '}${esc(l.city)}</div><h3>${esc(portalRaw(l.rawId)?.name||'Сырье')}</h3></div>${portalBadge(own?portalListingStatus(l):'Продажа',active?'good':'warn')}</div><div class="proto-trade-price">${rub(l.price)} <small>/ кг · без НДС</small></div><dl class="proto-trade-facts"><div><dt>Предлагаемый объем</dt><dd>${kg(l.qty)}</dd></div><div><dt>Минимальная партия</dt><dd>${kg(l.minQty)}</dd></div><div><dt>Готово к отгрузке с</dt><dd>${portalDate(l.availableFrom)}</dd></div><div><dt>Доставка</dt><dd>${esc(portalListingDelivery(l))}${l.deliveryCost===null?' · цена уточняется':l.deliveryType==='delivery'?' · '+rub(l.deliveryCost):''}</dd></div></dl><p class="proto-trade-quality">${esc(l.quality)}</p><div class="proto-actions">${portalButton('Подробнее','listing-detail',l.id)}${own?portalButton('Изменить','listing-edit',l.id):portalButton('Запросить поставку','listing-buy',l.id,true)}${own&&l.status==='active'?portalButton('Снять с публикации','listing-withdraw',l.id):''}</div></article>`;
}
function portalTradingOverview(data){
 const available=data.listings.filter(l=>portalListingActive(l)&&portalListingMatches(l));
 return portalPanel('Предложения сырья',`<p class="proto-doc-note">Поставщики размещают свободные предложения. Запрос на закупку собирает отклики на вашу потребность.</p><div class="proto-trade-preview">${available.slice(0,2).map(l=>`<button type="button" class="proto-trade-preview-row" data-proto-act="listing-detail" data-id="${esc(l.id)}"><span><b>${esc(portalRaw(l.rawId)?.name)}</b><small>${esc(portalSupplier(l.supplierId)?.name)} · ${esc(l.city)} · ${kg(l.qty)}</small></span><strong>${rub(l.price)} / кг</strong></button>`).join('')||portalEmpty('Подходящих предложений нет','Перейдите в каталог и измените фильтры.')}</div>`,portalButton('Все предложения','tab','buyer:listings'));
}
function portalTradingCatalog(data){
 const f=portalUI.tradeFilters||{},active=data.listings.filter(portalListingActive),rows=active.filter(portalListingMatches),cities=[...new Set(active.map(l=>l.city))].sort((a,b)=>a.localeCompare(b,'ru'));
 return `<div class="proto-trade-filters" aria-label="Фильтры предложений сырья">${portalTradeFilterSelect('Сырье','rawId',[['','Все виды сырья'],...S.raw.filter(r=>active.some(l=>l.rawId===r.id)).map(r=>[r.id,r.name])],f.rawId)}${portalTradeFilterSelect('Место отгрузки','city',[['','Все города'],...cities.map(city=>[city,city])],f.city)}${portalTradeFilterInput('Цена до, ₽/кг','priceMax',f.priceMax)}${portalTradeFilterInput('Объем от, кг','qtyMin',f.qtyMin)}${portalButton('Сбросить','listing-filters-reset')}</div><div class="proto-trade-caption"><p>Найдено: ${rows.length}. Цены учебные, без НДС; наличие и качество требуют подтверждения.</p>${portalButton('Разместить запрос на закупку','new-rfq')}</div><div class="proto-trade-grid">${rows.map(l=>portalListingCard(l)).join('')||portalEmpty('Предложения не найдены','Сбросьте фильтры или разместите запрос на закупку.')}</div>`;
}
function portalTradeFilterSelect(label,key,items,value){return `<label class="field">${esc(label)}<select data-trade-filter="${key}" aria-label="${esc(label)}">${items.map(([id,text])=>`<option value="${esc(id)}" ${String(id)===String(value||'')?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`}
function portalTradeFilterInput(label,key,value){return `<label class="field">${esc(label)}<input type="number" data-trade-filter="${key}" aria-label="${esc(label)}" value="${esc(value||'')}" min="0" step="any" placeholder="Не ограничено"></label>`}
function portalTradingOwnListings(data){
 const rows=data.listings.filter(l=>l.supplierId===portalUI.supplierId).filter(l=>[l.city,l.quality,portalRaw(l.rawId)?.name].join(' ').toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
 return `<p class="proto-doc-note">Публикуйте свободные предложения, даже если запрос от закупщика еще не поступил.</p><div class="proto-trade-grid">${rows.map(l=>portalListingCard(l,true)).join('')||portalEmpty('Вы еще не разместили предложений','Опубликуйте сырье, объем и условия продажи.')}</div>`;
}
function portalListingDetails(id){
 const l=portalListing(id);if(!l)return;const own=page==='supplier-portal';if(own&&l.supplierId!==portalUI.supplierId)return;
 portalOpen('Предложение · '+portalRaw(l.rawId)?.name,`<div class="proto">${portalBadge(portalListingStatus(l),portalListingActive(l)?'good':'warn')}<dl class="proto-summary"><div><dt>Поставщик</dt><dd>${esc(portalSupplier(l.supplierId)?.name)}</dd></div><div><dt>Место отгрузки</dt><dd>${esc(l.city)}</dd></div><div><dt>Объем / минимальная партия</dt><dd>${kg(l.qty)} / ${kg(l.minQty)}</dd></div><div><dt>Цена без НДС</dt><dd>${rub(l.price)} / кг</dd></div><div><dt>Готово к отгрузке с</dt><dd>${portalDate(l.availableFrom)}</dd></div><div><dt>Объявление актуально до</dt><dd>${portalDate(l.validUntil)}</dd></div><div><dt>Доставка</dt><dd>${esc(portalListingDelivery(l))}</dd></div><div><dt>Стоимость доставки</dt><dd>${l.deliveryCost===null?'Уточняется':rub(l.deliveryCost)}</dd></div></dl><div><h3>Качество и документы</h3><p>${esc(l.quality)}</p><p class="proto-dialog-note">Указано поставщиком. Документы и лабораторные показатели в прототипе не проверены.</p></div><div><h3>Условия</h3><p>${esc(l.terms)}</p></div><div class="proto-actions">${own?portalButton('Изменить предложение','listing-edit',id):portalListingActive(l)?portalButton('Запросить поставку','listing-buy',id,true):''}${!own?portalButton('Сравнить аналогичные','listing-compare',id):''}${portalButton('Связаться · скоро','stub','Связь с поставщиком')}</div></div>`);
}
function portalListingForm(id){
 if(page!=='supplier-portal')return;const data=ensurePortalPrototype(),l=id?portalListing(id):null;
 if(id&&(!l||l.supplierId!==portalUI.supplierId))return;
 const supplier=portalSupplier(portalUI.supplierId);
 portalOpen(l?'Изменить предложение':'Разместить предложение сырья',`<p class="proto-dialog-note">${esc(supplier.name)} · предложение появится в каталоге закупщика. Данные учебные; публикация не резервирует сырье.</p><div class="formgrid">${portalSelect('Сырье','rawId',S.raw.map(r=>[r.id,r.name]),l?.rawId||S.raw[0]?.id)}${portalField('Место отгрузки','city',l?.city||supplier.city)}${portalField('Предлагаемый объем, кг','qty',l?.qty||1000,'number','min="1" step="1" required')}${portalField('Минимальная партия, кг','minQty',l?.minQty||500,'number','min="1" step="1" required')}${portalField('Цена без НДС, ₽/кг','price',l?.price||'','number','min="0.01" step="0.01" required')}${portalSelect('Получение сырья','deliveryType',[['pickup','Самовывоз'],['delivery','Доставка поставщиком'],['negotiable','По согласованию']],l?.deliveryType||'negotiable')}<div class="proto-wide">${portalField('Доставка без НДС, ₽ · можно оставить пустым','deliveryCost',l?.deliveryCost??'','number','min="0" step="0.01"')}<p class="proto-dialog-note">Цена доставки относится к согласуемой поставке. При самовывозе доставка поставщика не начисляется.</p></div>${portalField('Готово к отгрузке с','availableFrom',l?.availableFrom||portalDay(1),'date','required')}${portalField('Предложение актуально до','validUntil',l?.validUntil||portalDay(30),'date','required')}<label class="field proto-wide">Качество и документы<textarea name="quality" placeholder="Показатели, характеристики и доступные документы" required>${esc(l?.quality||'')}</textarea></label><label class="field proto-wide">Условия оплаты и доставки<textarea name="terms" placeholder="Укажите важные условия" required>${esc(l?.terms||'')}</textarea></label></div>`,'Опубликовать предложение',{type:'listing',listingId:l?.id,supplierId:supplier.id,revision:l?.revision});
}
function portalListingBuy(id){
 if(page!=='supplier-workspace')return;const l=portalListing(id);if(!l||!portalListingActive(l))return toast('Предложение больше не доступно');
 portalOpen('Запросить поставку · '+portalRaw(l.rawId)?.name,`<p class="proto-dialog-note">${esc(portalSupplier(l.supplierId)?.name)} · ${rub(l.price)} / кг без НДС. После отправки поставщик должен подтвердить объем, цену, доставку и дату. Остатки не изменятся.</p><div class="formgrid">${portalField('Количество, кг','qty',Math.min(l.qty,Math.max(l.minQty,1000)),'number',`min="${l.minQty}" max="${l.qty}" step="1" required`)}${portalField('Желаемая дата поступления','due',l.availableFrom>TODAY?l.availableFrom:TODAY,'date','required')}${portalField('Предлагаемая стоимость доставки без НДС, ₽','deliveryCost',l.deliveryCost??'','number','min="0" step="0.01" required')}<p class="proto-dialog-note">${l.deliveryType==='pickup'?'Для самовывоза стоимость доставки поставщика равна нулю.':'Неизвестную стоимость доставки нужно согласовать; пустое поле не считается нулем.'}</p><label class="field proto-wide">Комментарий<textarea name="comment" placeholder="Место приемки, требования и пожелания"></textarea></label></div>`,'Направить запрос поставщику',{type:'listing-purchase',listingId:id,revision:l.revision});
}
function portalListingCompare(id,qty=1000){
 const base=portalListing(id);if(!base||page!=='supplier-workspace')return;
 const rows=ensurePortalPrototype().listings.filter(l=>l.rawId===base.rawId&&portalListingActive(l));
 portalOpen('Сравнить · '+portalRaw(base.rawId)?.name,`<p class="proto-dialog-note">Сравнение на одинаковый объем. Суммы без НДС; для самовывоза транспорт закупщика не включен. Сроки, качество и доставку подтвердит поставщик.</p><div class="proto-trade-compare-controls">${portalField('Объем для сравнения, кг','compareQty',qty,'number','min="1" step="1"')}${portalButton('Пересчитать','listing-compare-update',id)}</div><div class="proto-table">${table(['Поставщик / место','Цена за кг','Объем','Готово с','Условия доставки','За выбранный объем',''],rows.map(l=>{const suitable=qty>=l.minQty&&qty<=l.qty;return row([`<div class="proto-cell"><b>${esc(portalSupplier(l.supplierId)?.name)}</b><small>${esc(l.city)}</small></div>`,rub(l.price),`${kg(l.qty)}<small class="proto-trade-table-note">От ${kg(l.minQty)}</small>`,portalDate(l.availableFrom),`${esc(portalListingDelivery(l))}<small class="proto-trade-table-note">${l.deliveryCost===null?'Цена уточняется':rub(l.deliveryCost)}</small>`,suitable?(l.deliveryCost===null?rub(qty*l.price)+' + доставка':rub(qty*l.price+l.deliveryCost)):portalBadge(qty<l.minQty?'Меньше минимума':'Недостаточно объема','warn'),suitable?portalButton('Запросить','listing-buy',l.id):'—'])}))}</div><p class="proto-dialog-note">Налоговая база единая только в учебном примере. Здесь не рассчитывается рейтинг качества или подтвержденная рыночная цена.</p>`, '',{type:'listing-compare',listingId:id});
}
function portalTradeValidDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value))&&new Date(value+'T12:00').toLocaleDateString('sv-SE')===value}
function portalTradeApplyFilter(input){
 const key=input.dataset.tradeFilter;if(!key)return;
 portalUI.tradeFilters??={};portalUI.tradeFilters[key]=input.value;render();
 const next=document.querySelector(`[data-trade-filter="${key}"]`);if(next?.tagName==='INPUT')next.focus();
}
document.addEventListener('input',e=>{if(e.target.matches('input[data-trade-filter]'))portalTradeApplyFilter(e.target)});
document.addEventListener('change',e=>{
 if(e.target.matches('select[data-trade-filter]'))portalTradeApplyFilter(e.target);
 if(e.target.matches('#portal-form [name=visibility]')){const invited=portalDialog.querySelector('[data-trade-invite]');if(invited)invited.hidden=e.target.value==='open'}
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='portal-form'||!['listing','listing-purchase'].includes(portalDialogState?.type))return;e.preventDefault();
 const state=portalDialogState,values=Object.fromEntries(new FormData(e.target)),data=ensurePortalPrototype(),qty=Number(values.qty);
 if(!Number.isSafeInteger(qty)||qty<=0)return portalFormError('Укажите положительный целый объем в кг');
 if(state.type==='listing'){
  const l=state.listingId?portalListing(state.listingId):null,minQty=Number(values.minQty),price=Number(values.price),cost=values.deliveryCost.trim()===''?null:Number(values.deliveryCost);
  if(page!=='supplier-portal'||portalUI.supplierId!==state.supplierId||!portalSupplier(state.supplierId)||state.listingId&&(!l||l.supplierId!==state.supplierId))return portalFormError('Это предложение недоступно текущему поставщику');
  if(l&&l.revision!==state.revision)return portalFormError('Предложение изменилось. Откройте актуальную версию');
  if(!portalRaw(values.rawId)||!values.city.trim())return portalFormError('Выберите сырье и укажите место отгрузки');
  if(!Number.isSafeInteger(minQty)||minQty<=0||minQty>qty)return portalFormError('Минимальная партия должна быть положительной и не превышать предлагаемый объем');
  if(!Number.isFinite(price)||price<=0||cost!==null&&(!Number.isFinite(cost)||cost<0))return portalFormError('Укажите положительную цену и неотрицательную стоимость доставки');
  if(!['pickup','delivery','negotiable'].includes(values.deliveryType))return portalFormError('Выберите условия получения');
  if(!portalTradeValidDate(values.availableFrom)||!portalTradeValidDate(values.validUntil)||values.validUntil<TODAY||values.validUntil<values.availableFrom)return portalFormError('Укажите корректные даты. Срок предложения не может быть раньше готовности или сегодняшней даты');
  if(!values.quality.trim()||!values.terms.trim())return portalFormError('Заполните качество, документы и условия продажи');
  const next={id:l?.id||portalId('listing'),supplierId:state.supplierId,rawId:values.rawId,city:values.city.trim(),qty,minQty,price,deliveryType:values.deliveryType,deliveryCost:values.deliveryType==='pickup'?0:cost,quality:values.quality.trim(),terms:values.terms.trim(),availableFrom:values.availableFrom,validUntil:values.validUntil,status:'active',revision:(l?.revision||0)+1,created:l?.created||TODAY,updated:TODAY};
  if(l)Object.assign(l,next);else data.listings.push(next);
  portalUI.supplierTab='listings';return portalCommit('Предложение опубликовано в учебном каталоге сырья');
 }
 const l=portalListing(state.listingId),cost=Number(values.deliveryCost);
 if(page!=='supplier-workspace'||!l||!portalListingActive(l))return portalFormError('Предложение больше не доступно');
 if(l.revision!==state.revision)return portalFormError('Условия изменились. Откройте предложение заново');
 if(qty<l.minQty||qty>l.qty)return portalFormError('Количество должно быть от '+kg(l.minQty)+' до '+kg(l.qty));
 if(values.deliveryCost.trim()===''||!Number.isFinite(cost)||cost<0||l.deliveryType==='pickup'&&cost!==0)return portalFormError('Укажите стоимость доставки. Для самовывоза — ноль; неизвестная стоимость требует согласования');
 if(!portalTradeValidDate(values.due)||values.due<TODAY||values.due<l.availableFrom)return portalFormError('Дата поступления не может быть раньше сегодняшнего дня или готовности сырья');
 const snapshot={rawName:portalRaw(l.rawId)?.name,supplierName:portalSupplier(l.supplierId)?.name,city:l.city,quality:l.quality,terms:l.terms,deliveryType:l.deliveryType};
 data.purchases.push({id:portalId('po'),number:'П-'+String(data.purchases.length+1).padStart(3,'0'),listingId:l.id,listingRevision:l.revision,listingSnapshot:snapshot,supplierId:l.supplierId,rawId:l.rawId,qty,price:l.price,delivery:cost,due:values.due,status:'Ожидает подтверждения',created:TODAY,comment:values.comment.trim(),history:[{text:'Учебный запрос поставки создан из предложения сырья. Условия ожидают подтверждения поставщика',date:TODAY}]});
 portalUI.buyerTab='purchases';return portalCommit('Запрос поставки создан. Поставщик увидит его во вкладке «Заказы»');
});

const portalTradeActBefore=portalAct;
portalAct=function(action,id){
 if(action==='listing-detail')return portalListingDetails(id);
 if(action==='listing-new')return portalListingForm();
 if(action==='listing-edit')return portalListingForm(id);
 if(action==='listing-buy')return portalListingBuy(id);
 if(action==='listing-compare')return portalListingCompare(id);
 if(action==='listing-compare-update'){const qty=Number(portalDialog.querySelector('[name=compareQty]')?.value);if(!Number.isSafeInteger(qty)||qty<=0)return portalFormError('Укажите положительный целый объем для сравнения');return portalListingCompare(id,qty)}
 if(action==='listing-withdraw'){
  const l=portalListing(id);if(page!=='supplier-portal'||!l||l.supplierId!==portalUI.supplierId||l.status!=='active')return;
  l.status='withdrawn';l.revision++;save('Предложение снято с публикации. Созданные запросы поставки сохранены');return;
 }
 if(action==='listing-filters-reset'){portalUI.tradeFilters={};query='';render();return}
 return portalTradeActBefore(action,id);
};
const portalTradeRenderBefore=render;
render=function(){
 portalTradeRenderBefore();
 if(page==='supplier-portal'){
  const actions=document.querySelector('#app .page-heading .actions');if(actions)actions.innerHTML=portalButton('+ Разместить предложение','listing-new','',true)+portalButton('Рабочее место закупщика','navigate','supplier-workspace');
 }
};
// Display the agreed listing snapshot; later edits must not rewrite a purchase.
const portalTradePurchaseBefore=portalShowPurchase;
portalShowPurchase=function(id){
 portalTradePurchaseBefore(id);const p=portalPurchase(id);if(!p?.listingSnapshot||!portalDialog.open||page==='supplier-portal'&&p.supplierId!==portalUI.supplierId)return;
 const box=document.createElement('section');box.className='proto-trade-snapshot';const s=p.listingSnapshot;
 box.innerHTML=`<h3>Условия из предложения · версия ${p.listingRevision}</h3><p>${esc(s.city)} · ${esc(s.quality)}</p><p>${esc(s.terms)}</p>${p.comment?`<p>Комментарий закупщика: ${esc(p.comment)}</p>`:''}<p class="proto-dialog-note">Снимок на момент запроса поставки. Текущая публикация может содержать другие условия.</p>`;
 portalDialog.querySelector('.dialogbody').append(box);
};
render();
