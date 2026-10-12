// Presentation only: no timers or mutations of orders, stock or portal state.
// A keyed screen change animates once; searches and filters render immediately.
const partnerMotionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const partnerMotionEasing='cubic-bezier(.2,.75,.2,1)';
let partnerMotionLastScreen='';
function partnerMotionAnimate(element,keyframes,options){
 if(!element||partnerMotionPreference.matches||typeof element.animate!=='function')return;
 return element.animate(keyframes,{duration:260,easing:partnerMotionEasing,...options});
}
function partnerMotionScreen(){
 const role=partnerKind();if(!role){partnerMotionLastScreen='';return}
 const section=portalUI[role==='client'?'clientTab':'supplierTab'];
 const identity=role==='client'?portalUI.companyId:portalUI.supplierId;
 const key=[role,identity,section,section==='purchases'?portalUI.supplierOrderView:''].join(':');
 if(key===partnerMotionLastScreen)return;
 partnerMotionLastScreen=key;
 const main=partnerRoot.querySelector('.partner-main');if(!main)return;
 const items=[main.querySelector('.partner-page-head'),main.querySelector('.partner-search'),...main.querySelectorAll('.partner-content > *')].filter(Boolean).slice(0,8);
 items.forEach((element,index)=>partnerMotionAnimate(element,[{opacity:.6,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{delay:Math.min(index*25,100)}));
}
const partnerMotionRenderBefore=render;
render=function(){partnerMotionRenderBefore();partnerMotionScreen()};
const partnerMotionOpenBefore=portalOpen;
portalOpen=function(...args){
 const wasOpen=portalDialog.open;partnerMotionOpenBefore(...args);
 if(partnerKind()&&!wasOpen)partnerMotionAnimate(portalDialog,[{opacity:.55,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:220});
};
partnerMotionPreference.addEventListener('change',event=>{
 if(!event.matches)return;
 for(const root of [partnerRoot,portalDialog])for(const animation of root.getAnimations({subtree:true}))animation.cancel();
});
// Styles apply on first paint; entering motion starts only on subsequent navigation.
const partnerMotionInitialRole=partnerKind();
if(partnerMotionInitialRole){const section=portalUI[partnerMotionInitialRole==='client'?'clientTab':'supplierTab'];partnerMotionLastScreen=[partnerMotionInitialRole,partnerMotionInitialRole==='client'?portalUI.companyId:portalUI.supplierId,section,section==='purchases'?portalUI.supplierOrderView:''].join(':')}
