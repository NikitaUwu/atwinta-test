// Import once, preserve operational balances, posted transactions and job snapshots.
function importBeksaCatalog(state,fresh=false){
 if(state.catalogVersion===BEKSA_CATALOG.version)return state;
 state.catalogBackups??=[];
 if(!fresh)state.catalogBackups.push({version:BEKSA_CATALOG.version,date:new Date().toISOString(),products:structuredClone(state.products),raw:structuredClone(state.raw)});
 for(const source of BEKSA_CATALOG.raw){const existing=state.raw.find(r=>r.id===source.id);if(existing){Object.assign(existing,{source:source.source,sourceRow:source.sourceRow,unit:source.unit,purchaseBatch:source.purchaseBatch,min:source.min,stockKnown:true,priceKnown:existing.price>0});}else state.raw.push(structuredClone(source));}
 for(const source of BEKSA_CATALOG.products){const existing=state.products.find(p=>p.id===source.id);if(existing){const keep={stock:existing.stock,price:existing.price,stockKnown:true,priceKnown:existing.price>0};Object.assign(existing,structuredClone(source),keep);}else state.products.push(structuredClone(source));}
 state.packaging??=structuredClone(BEKSA_CATALOG.packaging);
 state.catalogVersion=BEKSA_CATALOG.version;
 if(fresh)for(const j of state.jobs){const p=state.products.find(p=>p.id===j.p);if(p?.source){j.recipe=structuredClone(p.recipe);j.catalogIssues=structuredClone(p.sourceIssues);}}
 return state;
}
const catalogOriginalSeed=seed;seed=function(){return importBeksaCatalog(catalogOriginalSeed(),true)};
importBeksaCatalog(S,window.catalogFreshState===true);
localStorage.setItem(KEY,JSON.stringify(S));
