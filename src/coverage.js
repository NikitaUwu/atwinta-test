// One grounded scenario. All numbers are computed locally; no LLM is connected.
// Physical stock already contains receipts and actual consumption. Remaining jobs
// consume it once; orders contribute only their uncovered, unplanned remainder.
const coverageSessions=new Map();
function coverageSession(){const key=aiPreviewRole();if(!coverageSessions.has(key))coverageSessions.set(key,{question:'Хватит ли пшеницы на текущий производственный план?',incoming:true});return coverageSessions.get(key)}
function coverageInterpret(question){
 const normalized=question.toLocaleLowerCase('ru'),raw=S.raw.find(r=>normalized.includes(r.name.toLocaleLowerCase('ru')))||S.raw.find(r=>r.id==='wheat'&&/пшен/.test(normalized))||S.raw.find(r=>r.id==='corn'&&/кукуруз/.test(normalized));
 const until=normalized.match(/\d{4}-\d{2}-\d{2}/)?.[0];
 const city=/юрг/.test(normalized)?'Юрга':S.orders.map(o=>o.city).find(c=>c&&normalized.includes(c.toLocaleLowerCase('ru')))||'';
 return{rawId:raw?.id||null,city,until:until&&portalTradeValidDate(until)?until:null,replyOnly:/ответ|понедельник/.test(normalized)};
}
function coverageCalculate(rawId,{city='',until=null,incoming=true}={}){
 const raw=S.raw.find(r=>r.id===rawId);if(!raw)return null;
 const warnings=[],demands=[],supplies=[],excluded=[];
 const allOrders=S.orders.filter(o=>o.agreed),selectedOrders=allOrders.filter(o=>!city||o.city.toLocaleLowerCase('ru')===city.toLocaleLowerCase('ru'));
 for(const j of S.jobs){
  const o=O(j.order);if(j.status==='Готово'||!o?.agreed)continue;
  const need=(j.recipe?.[rawId]||0)*Math.max(0,j.qty-(j.fact||0)-(j.loss||0))/500;if(!need)continue;
  const dated=!!j.date,date=j.date&&j.date>TODAY?j.date:TODAY;if(until&&date>until)continue;
  demands.push({date,qty:need,orderId:o.id,jobId:j.id,label:'Наряд №'+j.id,assumed:!dated});
  if(!dated)warnings.push('Наряд №'+j.id+' не назначен по дате: потребность учтена сегодня консервативно.');
  else if(j.date<TODAY)warnings.push('Наряд №'+j.id+' просрочен: оставшаяся потребность учтена сегодня.');
 }
 for(const o of allOrders)for(const l of o.lines){
  const uncoveredQty=uncovered(o,l),recipe=P(l.p)?.recipe;if(!uncoveredQty||!recipe?.[rawId])continue;
  const planned=Math.ceil(uncoveredQty/500)*500,date=o.due.slice(0,10)<TODAY?TODAY:o.due.slice(0,10);if(until&&date>until)continue;
  demands.push({date,qty:recipe[rawId]*planned/500,orderId:o.id,jobId:null,label:'Неоформленная потребность заказа №'+o.id,assumed:true});
  warnings.push('Заказ №'+o.id+': остаток без наряда рассчитан по текущей рецептуре, с округлением выпуска до замеса 500 кг. Дата производства не подтверждена.');
 }
 // All confirmed obligations compete for the same stock, even for a city question.
 // Their active reserves are already in remaining job demand, never subtracted twice.
 const outsideHeld=0;
 const selectedNeed=sum(demands.filter(d=>selectedOrders.some(o=>o.id===d.orderId)),d=>d.qty);
 if(city)warnings.push('В балансе учтены и другие подтвержденные заказы: общий запас сырья расходуется всеми направлениями. Список рисков ниже выделяет выбранное направление.');
 for(const p of S.purchases){
  const remaining=Math.max(0,(p.items?.[rawId]||0)-(p.received?.[rawId]||0));if(!remaining)continue;
  if(!['Согласована','Частично получено'].includes(p.status)){excluded.push('Закупка №'+p.id+' · '+p.status+' · '+kg(remaining));continue}
  if(p.portalPurchaseId){
   const po=portalPurchase(p.portalPurchaseId);if(!po)continue;
   const shipments=(ensurePortalPrototype().shipments||[]).filter(x=>x.purchaseId===po.id&&!(ensurePortalPrototype().receipts||[]).some(r=>r.shipmentId===x.id));
   for(const s of shipments)addSupply(s.eta,s.qty,'Партия '+s.number,p.id);
   const unshipped=flowPoTotals(po).toSend;if(unshipped)addSupply(po.due,unshipped,'Неотгруженный остаток '+po.number,p.id);
  }else addSupply(p.due,remaining,'Закупка №'+p.id,p.id);
 }
 function addSupply(date,qty,label,purchaseId){
  if(!portalTradeValidDate(date)||date<TODAY){excluded.push(label+' · дата поступления требует подтверждения · '+kg(qty));return}
  if(!until||date<=until)supplies.push({date,qty,label,purchaseId});
 }
 const days=[...new Set([TODAY,...demands.map(x=>x.date),...(incoming?supplies.map(x=>x.date):[])])].sort();
 let balance=raw.stock-outsideHeld,shortfall=0;const timeline=[],affected=[];
 for(const date of days){
  const start=balance,needs=demands.filter(x=>x.date===date),arrivals=incoming?supplies.filter(x=>x.date===date):[];
  balance-=sum(needs,x=>x.qty);
  const need=sum(needs,x=>x.qty),receipt=sum(arrivals,x=>x.qty),gap=Math.max(0,raw.min-balance);shortfall=Math.max(shortfall,gap);
  if(gap>0)affected.push(...needs.filter(x=>selectedOrders.some(o=>o.id===x.orderId)));
  // Unknown arrival times: same-day receipt is not assumed available for early work.
  if(need&&receipt)warnings.push(portalDate(date)+': поступление и производство в один день; порядок и время не подтверждены. Сначала учитываем потребность, затем поступление.');
  balance+=receipt;timeline.push({date,start,need,receipt,gap,end:balance});
 }
 if(raw.stockKnown===false)warnings.push('Остаток сырья не подтвержден. Расчет носит предварительный характер.');
 if(affected.length)warnings.push('Внутри дня очередность производства не подтверждена. Под риском показаны все выбранные заказы с потребностью в день дефицита, а не гарантированная задержка конкретного заказа.');
 return{raw,city,until,stock:raw.stock,outsideHeld,selectedNeed,need:sum(demands,x=>x.qty),incoming:incoming?sum(supplies,x=>x.qty):0,minimum:raw.min,balance,shortfall,timeline,demands,supplies,excluded,warnings:[...new Set(warnings)],affected};
}
function coverageContent(){
 const state=coverageSession(),parsed=coverageInterpret(state.question),result=coverageCalculate(parsed.rawId,{...parsed,incoming:state.incoming});
 const noCity=parsed.city&&!S.orders.some(o=>o.agreed&&o.city===parsed.city),unsupported=state.error;
 return `<div class="coverage-workspace"><span class="ai-preview-eyebrow">${aiSpark} Анализ обеспеченности сырьем</span><h2>Хватит ли сырья на производственный план?</h2><p class="flow-note">Проверка склада, производственного плана и поступлений. Расчет работает на данных этого браузера; ИИ-модель пока не подключена.</p><form id="coverage-question-form" class="coverage-question"><label class="field" for="coverage-question">Ваш вопрос<textarea id="coverage-question" rows="2">${esc(state.question)}</textarea></label><button class="primary" type="submit">Проанализировать</button></form><div class="coverage-samples"><button data-coverage-act="sample" data-id="plan">Хватит ли пшеницы на план?</button><button data-coverage-act="sample" data-id="jurga">Что с заказами на Юргу?</button><button data-coverage-act="sample" data-id="corn">Проверить кукурузу</button></div>${unsupported?`<p class="flow-alert" role="alert">${esc(unsupported)}</p>`:''}${parsed.replyOnly?'<p class="flow-alert">Ответ поставщика в понедельник не определяет дату поступления. Неподтвержденные заказы исключены; нужен согласованный срок доставки.</p>':''}${noCity?`<p class="flow-alert">В текущих данных нет подтвержденных заказов на ${esc(parsed.city)}. Общий план не подставляется вместо них.</p>`:''}<details class="flow-archive"><summary>Конкретный учебный пример: три заказа на Юргу</summary><p class="flow-note">Добавляет три учебных заказа по 5 000 кг ПК-5 и наряды на три последовательных дня, а также неподтвержденную закупку 5 000 кг пшеницы. Объемы заданы для демонстрации; остатки склада сохраняются. Потребность берется из рецептуры нарядов. Повторное нажатие не создает дубликаты.</p><button data-coverage-act="demo">${S.coverageDemo?'Открыть добавленный пример':'Добавить учебный пример'}</button></details>${!unsupported&&!noCity&&result?coverageReport(result,state):''}</div>`;
}
function coverageReport(r,state){
 const first=r.timeline.find(x=>x.gap>0),scope=r.city?'Общий план · направление '+r.city:'Все подтвержденные заказы',risk=r.shortfall>0;
 const orderIds=[...new Set(r.affected.map(x=>x.orderId))];
 return `<section class="coverage-report" aria-label="Результат анализа"><div class="coverage-report-head"><div><h3>${esc(r.raw.name)} · ${esc(scope)}</h3><p class="flow-note">${r.until?'По '+portalDate(r.until):'Текущий незавершенный план'} · расчет на ${portalDate(TODAY)}</p></div>${portalBadge(risk?'Есть риск дефицита':r.need?'Объем обеспечен по расчету':'Нет потребности',risk?'warn':'good')}</div><div class="flow-metrics">${flowMetric('На складе сейчас',kg(r.stock))}${flowMetric('Нужно на общий план',kg(r.need))}${flowMetric('Ожидается подтвержденно',kg(r.incoming))}${flowMetric('Не хватает с учетом минимума',kg(r.shortfall))}</div><p>${risk?`Первый риск: <b>${portalDate(first.date)}</b>. Максимальная нехватка до поступления — <b>${kg(r.shortfall)}</b>.`:`${r.need?'По учтенным объемам сырья хватает.':'Незавершенных нарядов или неоформленной потребности по выбранному сырью нет.'}`}</p><div class="coverage-balance"><span>Текущий остаток <b>${kg(r.stock)}</b></span><span>− резерв вне выборки <b>${kg(r.outsideHeld)}</b></span><span>− потребность <b>${kg(r.need)}</b></span><span>+ поступления <b>${kg(r.incoming)}</b></span><span>= итог <b>${kg(r.balance)}</b></span></div><p class="coverage-source">Минимальный остаток: ${kg(r.minimum)}. Он сохраняется как ограничение; нехватка включает восстановление этого минимума. Резерв работающих нарядов внутри выбранного плана уже входит в потребность и не вычитается повторно.</p><div class="flow-tabs" role="group" aria-label="Сценарий поступлений"><button data-coverage-act="incoming" data-id="yes" aria-pressed="${state.incoming}">С подтвержденными поступлениями</button><button data-coverage-act="incoming" data-id="no" aria-pressed="${!state.incoming}">Без будущих поступлений</button></div>${r.city?`<p class="coverage-source">На выбранное направление нужно ${kg(r.selectedNeed)}; остальные ${kg(r.need-r.selectedNeed)} относятся к другим заказам и тоже уменьшают общий запас.</p>`:''}<h3>Баланс по датам</h3>${table(['Дата','На начало','Потребность','Поступит','Нехватка до поступления','На конец'],r.timeline.map(x=>row([portalDate(x.date),kg(x.start),kg(x.need),kg(x.receipt),kg(x.gap),kg(x.end)])))}<h3>Какие заказы требуют внимания</h3><div class="coverage-affected">${orderIds.map(id=>`<button data-coverage-act="order" data-id="${id}">Заказ №${id} · ${esc(O(id)?.company)}</button>`).join('')||'<p class="flow-note">По рассчитанному остатку заказы под риском не выявлены.</p>'}</div><h3>Что можно сделать</h3><p>${risk?'Уточнить дату поступления у поставщика; сравнить альтернативы на недостающий объем; с производством проверить очередность затронутых нарядов.':'Сверить даты производства и прибытия перед запуском нарядов.'} Изменения не выполняются автоматически.</p><div class="coverage-actions"><button data-coverage-act="navigate" data-id="supplier-workspace">Открыть поставки и предложения</button><button data-coverage-act="navigate" data-id="needs">Открыть потребность производства</button><button data-coverage-act="navigate" data-id="raw">Открыть склад сырья</button></div>${r.warnings.length?`<div class="flow-alert"><b>Ограничения и допущения</b><ul>${r.warnings.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p>Проверка объема не гарантирует выполнение сроков.</p></div>`:''}<details class="flow-archive"><summary>Источники расчета</summary><h3>Потребность: оставшийся выпуск × компонент / замес 500 кг</h3>${table(['Основание','Дата','Сырье, кг'],r.demands.map(x=>row([esc(x.label)+(x.assumed?' · дата / план требуют подтверждения':''),portalDate(x.date),num(x.qty)])))}<h3>Ожидаемые поступления</h3>${r.supplies.length?table(['Основание','Дата','Количество'],r.supplies.map(x=>row([esc(x.label),portalDate(x.date),kg(x.qty)]))):'<p class="flow-note">Подтвержденных поступлений в выбранном периоде нет.</p>'}<p class="coverage-source">В режиме «Без будущих поступлений» эти поступления показаны для справки и не включены в баланс.</p>${r.excluded.length?`<h3>Не включены в прогноз</h3><ul>${r.excluded.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<p class="coverage-source">Склад: текущая запись «${esc(r.raw.name)}». Производство: снимки рецептур незавершенных нарядов. Заказы: только остаток, не покрытый готовой продукцией и существующими нарядами. Закупки: подтвержденные остатки, партии и фактические приемки.</p></details></section>`;
}
function coverageAddDemo(){
 if(partnerKind())return;const product=P('pk5'),raw=portalRaw('wheat'),c=S.companies[0];if(!product||!raw||!c)return toast('Для примера нужны ПК-5, пшеница и компания');
 if(!S.coverageDemo){
  const orderIds=[];
  for(let i=0;i<3;i++){
   const id=next(S.orders),qty=5000,due=portalDay(i);orderIds.push(id);
   S.orders.push({id,companyId:c.id,company:c.name,contact:'Учебный пример',city:'Юрга',address:'Учебный адрес, Юрга',delivery:'Доставка клиенту',due:due+'T18:00',priority:'Обычный',manager:'Менеджер предприятия',paid:false,agreed:true,checked:true,terms:'Учебный сценарий обеспеченности',lines:[{p:product.id,qty,res:0,sent:0,unitPrice:product.price}],notes:['Учебный пример: требуется свежий выпуск по наряду'],files:[],demo:true,coverageDemo:true});
   S.jobs.push({id:next(S.jobs),order:id,p:product.id,qty,fact:0,loss:0,status:'Очередь',date:due,shift:'Дневная',line:'Готовая продукция',recipe:structuredClone(product.recipe),demo:true,coverageDemo:true});
  }
  const data=ensurePortalPrototype(),id=portalId('po');data.purchases.push({id,number:'П-'+String(data.purchases.length+1).padStart(3,'0'),supplierId:'demo-supplier-1',rawId:raw.id,qty:5000,price:raw.price,delivery:0,due:portalDay(3),status:'Ожидает подтверждения',created:TODAY,history:[{text:'Учебная закупка для сценария обеспеченности. Срок поставщиком не подтвержден.',date:TODAY}],coverageDemo:true});
  S.coverageDemo={orderIds,purchaseId:id,date:TODAY};flowEnsure();
 }
 coverageSession().question='Хватит ли пшеницы на три заказа на Юргу, если поставщик ответит только в понедельник?';coverageSession().error='';save('Учебный пример открыт. Складские остатки сохранены');
}
const coverageWorkspaceBefore=aiWorkspaceContent;
aiWorkspaceContent=function(){return !partnerKind()&&['manager','buyer'].includes(aiPreviewRole())?coverageContent():coverageWorkspaceBefore()};
document.addEventListener('input',e=>{if(e.target.id==='coverage-question')coverageSession().question=e.target.value});
document.addEventListener('submit',e=>{
 if(e.target.id!=='coverage-question-form')return;e.preventDefault();const state=coverageSession(),question=$('#coverage-question').value.trim();state.question=question;
 state.error=!question||!/(хват|обеспеч|потребност|дефицит|план)/i.test(question)||/(цен[ауы]|стоимость|скидк)/i.test(question)?'Пока подключен анализ обеспеченности сырьем. Например: «Хватит ли пшеницы на текущий план?» Другие вопросы не обрабатываются.':!coverageInterpret(question).rawId?'Уточните название сырья в вопросе. Пока проверяется один компонент за раз; неизвестное название не заменяется пшеницей.':'';
 render();document.querySelector('.coverage-report')?.scrollIntoView({block:'start',behavior:'smooth'});
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-coverage-act]');if(!b||b.disabled||partnerKind())return;e.preventDefault();const {coverageAct:action,id}=b.dataset,state=coverageSession();
 if(action==='sample'){state.question={plan:'Хватит ли пшеницы на текущий производственный план?',jurga:'Хватит ли пшеницы на заказы на Юргу?',corn:'Хватит ли кукурузы на текущий производственный план?'}[id];state.error='';return render()}
 if(action==='incoming'){state.incoming=id==='yes';return render()}
 if(action==='demo')return coverageAddDemo();
 if(action==='order'&&O(id))return openDialog('order',Number(id));
 if(action==='navigate'){page=id;query='';if(id==='supplier-workspace')portalUI.buyerTab='purchases';return render()}
});
// Internal entry points open the working calculation directly, not an empty mock.
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-ai-preview="assistant"]');if(!button||partnerKind())return;
 e.preventDefault();e.stopImmediatePropagation();aiWorkspaceOpen(button.dataset.aiContext||'');
},true);
const coverageDecorateBefore=aiWorkspaceDecorate;
aiWorkspaceDecorate=function(){
 coverageDecorateBefore();if(page!=='ai-assistant'||partnerKind())return;
 const search=$('#search');if(search)(search.closest('.toolbar')||search.parentElement).style.display='none';
 const note=$('#app .page-heading p');if(note)note.textContent='Обеспеченность сырьем: расчет, источники и последствия для заказов';
};
render();
