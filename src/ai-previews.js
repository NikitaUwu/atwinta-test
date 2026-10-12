// Interface-only previews. No AI requests, file processing, record writes or ranking.
const aiPreviewDialog=document.createElement('dialog');
aiPreviewDialog.id='ai-preview-dialog';
aiPreviewDialog.setAttribute('aria-labelledby','ai-preview-title');
document.body.append(aiPreviewDialog);
let aiPreviewOpener=null,aiPreviewMode='',aiPreviewContext='',aiPreviewSample=0,aiPreviewSource='text',aiPreviewShowCard=false,aiPreviewDraft=null;
const aiSpark='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/></svg>';
function aiPreviewButton(label,action,context='',cls=''){
 return `<button type="button" class="ai-preview-button ${cls}" data-ai-preview="${action}" data-ai-context="${esc(context)}">${aiSpark}<span>${esc(label)}</span></button>`;
}
function aiPreviewRole(){return partnerKind()||(page==='ai-assistant'?aiAssistantInternalRole:page==='supplier-workspace'?'buyer':'manager')}
function aiPreviewLocation(){
 const role=aiPreviewRole();
 if(role==='client'||role==='supplier'){
  const key=role==='client'?'clientTab':'supplierTab',section=partnerTabs[role].find(x=>x[0]===portalUI[key])?.[1]||'Обзор';
  return (role==='client'?'Клиент':'Поставщик')+' · '+section;
 }
 return (role==='buyer'?'Закупщик':'Команда предприятия')+' · '+(names[page]||'Рабочий раздел');
}
function aiPreviewExamples(){
 const role=aiPreviewRole();
 if(role==='client')return [
  {question:'Что с моим заказом и когда ждать доставку?',title:'Ход выполнения заказа',text:'В ответе появятся готовность продукции, отправленный объём и согласованный срок. Если дата получения ещё не подтверждена, помощник объяснит это отдельно.',metrics:[['Готово к отправке','— кг'],['Ожидаемая доставка','Не рассчитана']],sources:['Мои заказы','Согласованные условия','Мои отгрузки'],next:'Открыть связанный заказ'},
  {question:'Можно ли повторить заказ, но получить его раньше?',title:'Возможность повторной закупки',text:'Помощник сопоставит ваш прошлый заказ с доступными предложениями и условиями доставки. Новый срок подтвердит менеджер.',metrics:[['Доступный объём','Не проверен'],['Ближайший срок','Не рассчитан']],sources:['Моя история заказов','Каталог продукции'],next:'Подготовить новую заявку'}
 ];
 if(role==='supplier')return [
  {question:'Какие мои поставки покупатель ещё не подтвердил?',title:'Поставки, требующие ответа',text:'Здесь появятся только ваши заказы, ожидающие подтверждения покупателя, с условиями и следующим действием.',metrics:[['Ожидают ответа','— заказов'],['Ближайший срок','Не рассчитан']],sources:['Мои заказы покупателя','История согласования'],next:'Открыть мои заказы'},
  {question:'Что произойдёт, если я перенесу отгрузку на понедельник?',title:'Последствия переноса для вашей поставки',text:'Помощник покажет изменение вашего срока и необходимость согласования с закупщиком. Внутренние заказы и производство покупателя в кабинете поставщика не раскрываются.',metrics:[['Новый срок','Не согласован'],['Ответ покупателя','Ожидается']],sources:['Мои отгрузки','Согласованные условия'],next:'Предложить новый срок'}
 ];
 if(role==='buyer')return [
  {question:'У кого лучше заказать пшеницу с учётом доставки?',title:'Сравнение условий закупки',text:'В ответе появится сравнение на одинаковый объём: цена сырья, доставка, доступность и срок. Неизвестные расходы будут отмечены отдельно.',metrics:[['Стоимость с доставкой','— ₽'],['Доступный объём','— кг']],sources:['Предложения сырья','Отклики на запрос','Условия доставки'],next:'Открыть сравнение предложений'},
  {question:'Поставщик ответит в понедельник. Какие задания под риском?',title:'Влияние ожидания сырья',text:'Помощник свяжет остатки и резервы с потребностью нарядов и сроками поставок. Здесь появятся затронутые задания и варианты действий.',metrics:[['Доступно после резервов','— кг'],['Не покрытая потребность','— кг']],sources:['Остатки сырья','Наряды и рецептуры','Ожидаемые поставки'],next:'Посмотреть связанные задания'}
 ];
 return [
  {question:'На сколько хватит пшеницы, если в плане заказы на Юргу, а поставщик ответит только в понедельник?',title:'Хватит ли сырья до поставки',text:'Помощник сопоставит свободный остаток, рецептуры, производственный план и сроки заказов. Здесь появится дефицит по времени и перечень заказов, которые он затронет.',metrics:[['Свободный остаток','— кг'],['Потребность до поставки','— кг'],['Дефицит','Не рассчитан']],sources:['Остатки и резервы','Заказы и рецептуры','План производства','Поставки'],next:'Открыть затронутые заказы'},
  {question:'Если перенести этот заказ, что изменится в производстве и доставке?',title:'Связи заказа с исполнением',text:'Здесь появятся связанные наряды, готовая продукция и рейсы. Помощник объяснит, какие сроки потребуют согласования.',metrics:[['Связанные наряды','—'],['Затронутые рейсы','—']],sources:['CRM','Наряды','Отгрузки и рейсы'],next:'Посмотреть связанные объекты'}
 ];
}
function aiPreviewHeader(title,subtitle){
 return `<header class="ai-preview-head"><div><div class="ai-preview-eyebrow">${aiSpark}<span>ИИ · макет интерфейса</span></div><h2 id="ai-preview-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button type="button" class="ai-preview-close" data-ai-preview="close" aria-label="Закрыть ИИ-макет">×</button></header>`;
}
function aiPreviewAssistantBody(){
 const examples=aiPreviewExamples(),selected=examples[aiPreviewSample];
 return aiPreviewHeader('Помощник по данным сервиса','Ответы с учётом вашей роли и текущего раздела')+`<div class="ai-preview-body"><div class="ai-preview-context"><span>Контекст</span><strong>${esc(aiPreviewContext||aiPreviewLocation())}</strong></div><p class="ai-preview-notice">Это интерфейсный макет. Вопросы ниже открывают заранее подготовленные примеры. Данные сервиса не анализируются.</p><section class="ai-preview-prompts"><h3>Попробуйте пример вопроса</h3>${examples.map((x,i)=>`<button type="button" data-ai-preview="sample" data-ai-index="${i}" aria-pressed="${i===aiPreviewSample}">${esc(x.question)}</button>`).join('')}</section><section class="ai-preview-answer" aria-live="polite"><span class="ai-preview-label">Пример структуры ответа</span><h3>${esc(selected.title)}</h3><p>${esc(selected.text)}</p><dl class="ai-preview-metrics">${selected.metrics.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><div class="ai-preview-sources"><span>Будущие источники ответа</span><p>${selected.sources.map(esc).join(' · ')}</p></div><button type="button" disabled>${esc(selected.next)}</button><small>Переходы из ответа появятся после подключения ИИ.</small></section></div><footer class="ai-preview-composer"><label for="ai-preview-question">Ваш вопрос</label><textarea id="ai-preview-question" placeholder="Например: что изменится, если сдвинуть поставку?" rows="2"></textarea><div><span>Свободные вопросы пока не обрабатываются</span><button type="button" disabled>Отправить</button></div></footer>`;
}
function aiPreviewImportBody(){
 const role=aiPreviewRole(),supplier=role==='supplier',buyer=role==='buyer',target=supplier?'предложения сырья':buyer?'предложения поставщика':'заявки клиента';
 const message=aiPreviewDraft??(supplier||buyer?'Пшеница, самовывоз. Объём и цену уточним. Отгрузка после согласования.':'Повторите прошлый заказ, но увеличьте объём и перенесите дату. Доставка по прежнему адресу.');
 const fields=supplier||buyer?[['Сырьё','Пшеница','Из текста'],['Объём и цена','Нужно уточнить','Не указаны'],['Получение','Самовывоз','Из текста'],['Срок отгрузки','Нужно согласовать','Не указана дата']]:[['Продукция','Из прошлого заказа','Из истории'],['Количество','Нужно уточнить','Не указан новый объём'],['Дата получения','Нужно уточнить','Не указана дата'],['Адрес','Из прошлого заказа','Из истории']];
 const input=aiPreviewSource==='text'?`<label class="ai-preview-input-label" for="ai-preview-input">Вставьте сообщение или переписку</label><textarea id="ai-preview-input" rows="5" placeholder="Текст заявки, сообщения клиента или условий поставщика">${esc(message)}</textarea>`:aiPreviewSource==='file'?`<div class="ai-preview-dropzone">${aiSpark}<strong>Документ или таблица</strong><p>КП поставщика, прайс или спецификация потребности</p><span>PDF, XLSX, DOCX · загрузка пока не подключена</span><button type="button" disabled>Выбрать файл</button></div>`:`<div class="ai-preview-dropzone">${aiSpark}<strong>Голосовое сообщение</strong><p>Продиктуйте состав заявки и пожелания к доставке</p><span>Запись и расшифровка пока не подключены</span><button type="button" disabled>Записать сообщение</button></div>`;
 return aiPreviewHeader('Заполнить из входящих данных','Место для разбора '+target)+`<div class="ai-preview-body"><p class="ai-preview-notice">Макет: ничего не загружается и не распознаётся. Пример карточки фиксированный и не зависит от введённого текста.</p><div class="ai-preview-import-layout"><section><div class="ai-preview-tabs" role="group" aria-label="Формат входящих данных">${[['text','Текст'],['file','Файл'],['voice','Голос']].map(([id,label])=>`<button type="button" data-ai-preview="source" data-ai-source="${id}" aria-pressed="${id===aiPreviewSource}">${label}</button>`).join('')}</div>${input}<button type="button" class="ai-preview-demo-action" data-ai-preview="card-example">Посмотреть пример карточки</button></section><section class="ai-preview-extracted" aria-live="polite"><span class="ai-preview-label">${aiPreviewShowCard?'Пример результата':'Будущая карточка'}</span>${aiPreviewShowCard?`<h3>${supplier?'Предложение сырья':buyer?'Предложение поставщика':'Заявка клиента'}</h3><dl>${fields.map(([label,value,source])=>`<div><dt>${esc(label)}</dt><dd><strong>${esc(value)}</strong><small>${esc(source)}</small></dd></div>`).join('')}</dl><div class="ai-preview-smart-note"><b>Умная подсказка</b><p>${supplier||buyer?'Перед публикацией уточните объём, цену и дату. Затем можно сопоставить условия с запросом покупателя.':'Уточните новый объём и дату. Затем можно проверить доступность и предложить вариант исполнения.'}</p></div>`:`<div class="ai-preview-empty">${aiSpark}<h3>Поля и их источники</h3><p>Здесь появятся распознанные условия, сведения из истории и вопросы для уточнения.</p></div>`}</section></div></div><footer class="ai-preview-foot"><p>Пользователь проверит результат перед сохранением.</p><button type="button" disabled>Перенести в форму</button></footer>`;
}
function aiPreviewRecommendationBody(){
 const role=aiPreviewRole(),kind=aiPreviewContext||'repeat';
 const config=kind==='alternatives'?{title:'Похожие варианты',why:'Характеристики товара, ваши требования и доступность',content:'Подходящий вариант',detail:'Здесь появятся отличия по составу, назначению, упаковке и условиям. Замена требует проверки совместимости.',action:'Посмотреть товар'}:role==='supplier'?{title:'Запросы под ваше сырьё',why:'Ваши предложения, доступный объём, регион и сроки',content:'Подходящий запрос покупателя',detail:'Здесь появятся запросы, на которые вы можете ответить, и причины совпадения с вашими условиями.',action:'Открыть запрос'}:role==='buyer'?{title:'Подходящие предложения сырья',why:'Потребность, характеристики сырья, объём, доставка и сроки',content:'Предложение под вашу закупку',detail:'Здесь появится сравнение с вашей потребностью. Неизвестные условия будут выделены, чтобы их можно было уточнить.',action:'Сравнить условия'}:kind==='catalog'?{title:'Каталог под вашу задачу',why:'История заказов и поиска, профиль компании и требования',content:'Подходящий товар',detail:'Здесь появится объяснение, почему товар поднят выше в каталоге. Сейчас порядок товаров не изменён.',action:'Посмотреть товар'}:{title:'Повторная закупка в нужный момент',why:'История покупок, интервалы заказов и согласованные условия',content:'Повтор привычного заказа',detail:'Здесь появится предложение повторить закупку с проверкой объёма, даты и доступности. Периодичность пока не рассчитывается.',action:role==='manager'?'Открыть клиента':'Подготовить заявку'};
 return aiPreviewHeader(config.title,'Персональные предложения внутри рабочего раздела')+`<div class="ai-preview-body"><p class="ai-preview-notice">Это пример расположения и оформления. Персональный подбор, прогноз повторной покупки и скидки пока не рассчитываются.</p><section class="ai-preview-recommendation"><span class="ai-preview-label">Пример рекомендации</span><h3>${esc(config.content)}</h3><p>${esc(config.detail)}</p><dl class="ai-preview-metrics"><div><dt>Товар / сырьё</dt><dd>Будет подобран</dd></div><div><dt>Объём и срок</dt><dd>Нужно подтвердить</dd></div></dl><div class="ai-preview-sources"><span>Почему предложено</span><p>${esc(config.why)}</p></div><button type="button" disabled>${esc(config.action)}</button></section><div class="ai-preview-smart-note"><b>Индивидуальные условия</b><p>Скидка появится только при наличии утверждённых правил компании. ИИ не назначает её самостоятельно.</p></div></div><footer class="ai-preview-foot"><p>Автоматическое создание или отправка заказа не предусмотрены.</p><button type="button" data-ai-preview="close">Понятно</button></footer>`;
}
function aiPreviewPaint(){
 aiPreviewDialog.classList.toggle('ai-preview-drawer',aiPreviewMode==='assistant');
 aiPreviewDialog.innerHTML=aiPreviewMode==='assistant'?aiPreviewAssistantBody():aiPreviewMode==='import'?aiPreviewImportBody():aiPreviewRecommendationBody();
}
function aiPreviewOpen(mode,context){
 aiPreviewOpener=document.activeElement;aiPreviewMode=mode;aiPreviewContext=context||'';aiPreviewSample=0;aiPreviewSource='text';aiPreviewShowCard=false;aiPreviewDraft=null;
 aiPreviewPaint();if(!aiPreviewDialog.open)aiPreviewDialog.showModal();aiPreviewDialog.querySelector('.ai-preview-close').focus();
}
aiPreviewDialog.addEventListener('close',()=>{if(aiPreviewOpener?.isConnected)aiPreviewOpener.focus()});
aiPreviewDialog.addEventListener('input',event=>{if(event.target.id==='ai-preview-input')aiPreviewDraft=event.target.value});
document.addEventListener('click',event=>{
 const control=event.target.closest('[data-ai-preview]');if(!control)return;
 event.preventDefault();const action=control.dataset.aiPreview;
 if(['assistant','import','recommend'].includes(action))return aiPreviewOpen(action,control.dataset.aiContext);
 if(action==='close')return aiPreviewDialog.close();
 if(action==='sample'){
  aiPreviewSample=Number(control.dataset.aiIndex);aiPreviewPaint();aiPreviewDialog.querySelector(`[data-ai-index="${aiPreviewSample}"]`).focus();return;
 }
 if(action==='source'){
  aiPreviewSource=control.dataset.aiSource;aiPreviewPaint();aiPreviewDialog.querySelector(`[data-ai-source="${aiPreviewSource}"]`).focus();return;
 }
 if(action==='card-example'){
  aiPreviewShowCard=true;aiPreviewPaint();aiPreviewDialog.querySelector('[data-ai-preview="card-example"]').focus();
 }
});
function aiPreviewBand(title,text,action,label,context='',recommend=false){
 return `<div class="ai-preview-shortcut">${aiPreviewButton(title,action,context)}<small>ИИ · макет</small></div>`;
}
function aiPreviewMount(){
 const role=aiPreviewRole(),head=partnerKind()?partnerRoot.querySelector('.partner-header-right'):$('#manager-space-control');
 if(head&&!head.querySelector('[data-ai-preview="assistant"]'))head.insertAdjacentHTML('afterbegin',aiPreviewButton('ИИ-помощник','assistant',aiPreviewLocation(),'ai-preview-header-button'));
 const content=partnerKind()?partnerRoot.querySelector('.partner-content'):$('#app .proto');
 if(role==='client'&&content){
  if(portalUI.clientTab==='overview')content.insertAdjacentHTML('beforeend',aiPreviewBand('Ваша следующая закупка','Здесь появится предложение повторить привычный заказ.','recommend','Посмотреть пример','repeat',true));
  if(portalUI.clientTab==='catalog'){
   content.insertAdjacentHTML('beforeend',aiPreviewBand('Подбор под вашу задачу','Место для персональных рекомендаций в каталоге.','recommend','Как это выглядит','catalog',true));
   content.querySelectorAll('.proto-product').forEach(card=>card.insertAdjacentHTML('beforeend',aiPreviewButton('Похожие варианты','recommend','alternatives','ai-preview-card-button')));
  }
  if(portalUI.clientTab==='requests')content.insertAdjacentHTML('beforeend',aiPreviewBand('Заявка из сообщения, файла или голоса','Передайте условия в удобном формате вместо ручного заполнения.','import','Посмотреть интерфейс'));
 }
 if(role==='supplier'&&content){
  if(portalUI.supplierTab==='overview')content.insertAdjacentHTML('beforeend',aiPreviewBand('Запросы под ваше сырьё','Место для запросов, подходящих под ваши предложения и условия.','recommend','Посмотреть пример','supplier',true));
  if(portalUI.supplierTab==='listings')content.insertAdjacentHTML('beforeend',aiPreviewBand('Предложение из прайса или сообщения','Место для переноса условий продажи в форму предложения.','import','Посмотреть интерфейс'));
 }
 if(role==='buyer'&&content){
  if(['overview','listings'].includes(portalUI.buyerTab))content.insertAdjacentHTML('beforeend',aiPreviewBand('Предложения под вашу потребность','Здесь появится подбор сырья с объяснением условий и отличий.','recommend','Посмотреть пример','buyer',true));
  if(portalUI.buyerTab==='requests')content.insertAdjacentHTML('beforeend',aiPreviewBand('Входящее КП в удобной форме','Место для разбора условий поставщика и сопоставления с запросом.','import','Посмотреть интерфейс'));
 }
 if(role==='manager'&&page==='orders'){
  const inbox=$('#app .manager-partner-inbox');
  if(inbox)inbox.insertAdjacentHTML('afterbegin',`<div class="ai-preview-manager-tools">${aiPreviewButton('Разобрать обращение','import')}${aiPreviewButton('Повторные закупки','recommend','repeat')}</div>`);
 }
}
// Add context entry points to existing cards without altering their business actions.
for(const name of ['portalOrderCard','portalPurchaseCard','portalRfqCard']){
 const previous=window[name];
 window[name]=function(record,...args){
  const html=previous(record,...args),label=name==='portalOrderCard'?'Заказ №'+record.id:name==='portalPurchaseCard'?'Поставка №'+record.number:'Запрос на закупку';
  return html.replace('</article>',`<div class="ai-preview-card-entry">${aiPreviewButton('Спросить ИИ','assistant',label,'ai-preview-card-button')}</div></article>`);
 };
}
const aiPreviewPortalOpenBefore=portalOpen;
portalOpen=function(title,body,submit='',state={}){
 aiPreviewPortalOpenBefore(title,body,submit,state);
 const dialogBody=portalDialog.querySelector('.dialogbody');
 if(['request','partner-proposal','offer','listing'].includes(state.type))dialogBody.insertAdjacentHTML('beforeend',aiPreviewBand('Заполнить из сообщения или файла','Текст, документы и голосовое сообщение. Результат можно будет проверить.','import','Посмотреть макет'));
 else if(!submit)dialogBody.insertAdjacentHTML('beforeend',`<div class="ai-preview-card-entry">${aiPreviewButton('Спросить ИИ об этой карточке','assistant',title)}</div>`);
};
const aiPreviewDrawBefore=drawDialog;
drawDialog=function(){
 aiPreviewDrawBefore();const body=$('#modal .dialogbody');
 if(body&&['order','job','trip','purchase'].includes(dialogType))body.insertAdjacentHTML('afterbegin',`<div class="ai-preview-card-entry">${aiPreviewButton('Спросить ИИ о связях и сроках','assistant',$('#modal h2')?.textContent||aiPreviewLocation())}</div>`);
 if(body&&dialogType==='neworder')body.insertAdjacentHTML('beforeend',aiPreviewBand('Заявка из обращения клиента','Место для заполнения формы из сообщения или документа.','import','Посмотреть макет'));
};
const aiPreviewRenderBefore=render;
render=function(){if(aiPreviewDialog.open)aiPreviewDialog.close();aiPreviewRenderBefore();aiPreviewMount()};
render();
