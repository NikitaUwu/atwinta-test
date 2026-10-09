function catalogIssues(p){return p?.sourceIssues||[]}
const catalogDrawBefore=drawDialog;drawDialog=function(){catalogDrawBefore();const body=$('#modal .dialogbody');if(!body)return;let x;if(['recipe','product'].includes(dialogType))x=P(dialogId);if(dialogType==='rawitem')x=S.raw.find(r=>r.id===dialogId);
 if(dialogType==='raw')x=S.raw.find(r=>r.id===dialogId);
 if(x?.source){const issues=catalogIssues(x);body.insertAdjacentHTML('afterbegin',`<section class="entity-note"><b>Источник: ${esc(x.source)}</b>${x.sourceTotal!=null?'<p>Сумма в документе: '+kg(x.sourceTotal)+'. Состав сохранён без пересчёта.</p>':''}${x.priceKnown===false&&!(x.price>0)?'<p>Цена не указана в источнике. Укажите её в карточке перед продажей.</p>':''}${x.stockKnown===false&&x.stock===0?'<p>Фактический остаток не указан. В учёте 0 до оприходования или ввода остатка.</p>':''}${x.purchaseBatch?'<p>Объём закупки из источника: '+kg(x.purchaseBatch)+'</p>':''}</section>`)};
};
const catalogRenderBefore=render;render=function(){catalogRenderBefore();if(['recipes','raw','stock','needs'].includes(page)){const note=document.createElement('p');note.className='muted catalog-note';note.textContent='БЭКС: рецептуры из документов. Остатки, цены и регулярный спрос — условные данные для демонстрации.';$('#app').prepend(note);}
 if(page==='raw'&&S.packaging?.length){$('#app').insertAdjacentHTML('beforeend','<h3>Упаковка · учёт в штуках</h3>'+table(['Наименование','Минимальный остаток, шт','Объём закупки, шт'],S.packaging.map(r=>row([esc(r.name),num(r.min),num(r.purchaseBatch)]))));}
};
const catalogCheckBefore=checkAvailability;checkAvailability=function(o){const prior=new Set(S.jobs.map(j=>j.id)),r=catalogCheckBefore(o);for(const j of S.jobs)if(!prior.has(j.id)&&P(j.p)?.source)j.catalogIssues=structuredClone(catalogIssues(P(j.p)));return r;};
const catalogAddJobBefore=addJob;addJob=function(...args){const r=catalogAddJobBefore(...args);if(r.job&&P(r.job.p)?.source)r.job.catalogIssues=structuredClone(catalogIssues(P(r.job.p)));return r;};
const catalogActBefore=act;act=function(a,id){if(a==='job-start'){const j=J(id);if(j&&Math.abs(sum(Object.values(j.recipe),x=>x)-500)>.001)return reject('Состав наряда должен составлять 500 кг');}
 if(a==='order-create'){for(const p of S.products)if(p.source&&!(p.price>0)&&number('qty-'+p.id)>0)return reject('Укажите цену продукции: '+p.name);}
 const recipeValid=a==='recipe-save'&&!readRecipeForm().error;
 const jobValues=a==='job-recipe'?S.raw.map(r=>number('recipe-'+r.id)):[];
 const result=catalogActBefore(a,id);
 if(recipeValid&&P(id)){P(id).sourceIssues=[];P(id).priceKnown=P(id).price>0;localStorage.setItem(KEY,JSON.stringify(S));drawDialog();}
 if(a==='job-recipe'){const j=J(id);if(j&&j.status==='Очередь'&&jobValues.every(x=>Number.isFinite(x)&&x>=0)&&Math.abs(sum(jobValues,x=>x)-500)<.001){j.catalogIssues=[];localStorage.setItem(KEY,JSON.stringify(S));drawDialog();}}
 return result;
};
render();
