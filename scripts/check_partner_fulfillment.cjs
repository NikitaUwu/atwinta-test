// Regression checks for stock posting and the shared partner workflow.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('./qa-runtime.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const target of process.argv.slice(2).length?process.argv.slice(2):['index.html']){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const url=/^https?:/.test(target)?target:'file:///'+path.resolve(target).replace(/\\/g,'/');
  await p.goto(url.split('#')[0]+'#supplier-portal?section=purchases&company=demo-supplier-1');
  const before=await p.evaluate(()=>portalRaw(portalPurchase('demo-po-1').rawId).stock);
  await p.locator('#partner-space [data-proto-act=confirm-purchase]').first().click();
  await p.locator('#partner-space [data-proto-act=dispatch-purchase]').first().click();
  await p.locator('#portal-form [name=qty]').fill('600');
  await p.locator('#portal-form [name=eta]').fill(await p.evaluate(()=>TODAY));
  await p.locator('#portal-form [type=submit]').click();
  assert.equal(await p.evaluate(()=>portalRaw(portalPurchase('demo-po-1').rawId).stock),before);
  const shipment=await p.evaluate(()=>ensurePortalPrototype().shipments[0].id);
  await p.evaluate(id=>{page='supplier-workspace';portalUI.buyerTab='purchases';render();portalAct('flow-receive',id)},shipment);
  await p.locator('#portal-form [name=receivedQty]').fill('550');
  await p.locator('#portal-form [name=acceptedQty]').fill('500');
  await p.locator('#portal-form [name=comment]').fill('Недостача и непринятый объем');
  await p.locator('#portal-form [type=submit]').click();
  assert.equal(await p.evaluate(()=>portalRaw(portalPurchase('demo-po-1').rawId).stock),before+500);
  assert.equal(await p.evaluate(()=>flowPoTotals(portalPurchase('demo-po-1')).toSend),500);
  await p.evaluate(id=>portalAct('flow-receive',id),shipment);
  assert.equal(await p.locator('#portal-dialog').isVisible(),false);
  await p.evaluate(()=>act('purchase-receive',portalPurchase('demo-po-1').operationalPurchaseId));
  assert.equal(await p.evaluate(()=>portalRaw(portalPurchase('demo-po-1').rawId).stock),before+500);
  await p.keyboard.press('Escape');await p.reload();
  assert.equal(await p.evaluate(()=>S.purchases.filter(x=>x.portalPurchaseId==='demo-po-1').length),1);
  assert.equal(await p.evaluate(()=>portalRaw(portalPurchase('demo-po-1').rawId).stock),before+500);
  await p.evaluate(()=>{page='supplier-portal';portalUI.supplierId='demo-supplier-2';portalUI.supplierTab='purchases';render();portalShowPurchase('demo-po-1')});
  assert.equal(await p.locator('#portal-dialog').isVisible(),false);
  await p.evaluate(()=>{
   S.orders=[{id:9999,companyId:S.companies[0].id,company:S.companies[0].name,city:'Юрга',due:TODAY+'T18:00',agreed:true,lines:[{p:'pk5',qty:2000,res:0,sent:0}]}];
   S.jobs=[{id:9001,order:9999,p:'pk5',qty:2000,fact:0,loss:0,status:'Очередь',date:TODAY,recipe:{wheat:350}}];S.tasks=[];S.reminders=[];
   portalRaw('wheat').stock=1000;portalRaw('wheat').min=200;
   S.portalPrototype.purchases=[];S.portalPrototype.shipments=[];S.portalPrototype.receipts=[];
   S.purchases=[{id:7001,status:'Черновик',due:TODAY,items:{wheat:10000}},{id:7002,status:'Согласована',due:portalDay(1),items:{wheat:1000}}];
   page='ai-assistant';aiAssistantInternalRole='buyer';render();
  });
  const result=await p.evaluate(()=>coverageCalculate('wheat'));
  assert.equal(result.need,1400);assert.equal(result.incoming,1000);assert.equal(result.shortfall,600);assert.equal(result.balance,600);assert.equal(result.demands.length,1);
  // A city query must include competing obligations from other destinations.
  await p.evaluate(()=>{S.orders.push({id:9998,companyId:S.companies[0].id,company:S.companies[0].name,city:'Томск',due:TODAY+'T18:00',agreed:true,lines:[{p:'pk5',qty:1000,res:0,sent:0}]});S.jobs.push({id:9002,order:9998,p:'pk5',qty:1000,fact:0,status:'Очередь',date:TODAY,recipe:{wheat:350}})});
  const scoped=await p.evaluate(()=>coverageCalculate('wheat',{city:'Юрга'}));
  assert.equal(scoped.selectedNeed,1400);assert.equal(scoped.need,2100);assert.equal(scoped.shortfall,1300);
  assert(scoped.affected.every(x=>x.orderId===9999));
  await p.locator('#coverage-question').fill('Хватит ли неизвестного сырья на план?');
  await p.locator('#coverage-question-form [type=submit]').click();
  assert.equal(await p.locator('.coverage-report').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS partner partial receipt, stock idempotency, persistence, supplier scope, dated coverage, competing orders, draft exclusion',target);
  await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
