// Keep the current screen in the URL, including refresh and browser history.
function readScreenRoute(){
 const route=new URLSearchParams(location.hash.slice(1).split('?')[1]||'');
 const key=location.hash.slice(1).split('?')[0];
 const screen=key==='process'?'guide':key;
 page=Object.hasOwn(names,screen)?screen:'trips';
 if(page==='ai-assistant')aiAssistantInternalRole=route.get('role')==='buyer'?'buyer':'manager';
 const date=route.get('date');
 if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date)))selectedDate=date;
 const range=route.get('period');
 if(['day','week','month','all'].includes(range))period=range;
 query='';
}
readScreenRoute();
let routeScreen=page,readingRoute=false;
const renderBeforeRouting=render;
render=function(){
 renderBeforeRouting();
 if(readingRoute)return;
 const params=new URLSearchParams();
 if(['client-portal','supplier-portal'].includes(page)&&location.hash.slice(1).split('?')[0]===page){
  const partnerRoute=new URLSearchParams(location.hash.split('?')[1]||'');
  for(const key of ['section','company','view'])if(partnerRoute.has(key))params.set(key,partnerRoute.get(key));
 }
 if(page==='ai-assistant')params.set('role',aiAssistantInternalRole);
 if(['day','shifts','trips','sales','revenue','prodreport'].includes(page)){
  params.set('date',selectedDate);params.set('period',period);
 }
 const hash='#'+(page==='guide'?'process':page)+(params.size?'?'+params.toString():'');
 if(location.hash!==hash){
  history[page===routeScreen?'replaceState':'pushState'](null,'',location.pathname+location.search+hash);
 }
 routeScreen=page;
};
function restoreScreenRoute(){
 readingRoute=true;readScreenRoute();routeScreen=page;
 if($('#modal').open)$('#modal').close();
 render();readingRoute=false;
}
window.addEventListener('popstate',restoreScreenRoute);
window.addEventListener('hashchange',restoreScreenRoute);
render();
