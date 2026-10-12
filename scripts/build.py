"""Compile the reviewed local sources into a single deployable HTML file."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'src'
template = (BASE / 'shell.html').read_text(encoding='utf-8')
page = template.replace('/* INLINE_CSS */', '\n'.join((BASE / n).read_text(encoding='utf-8') for n in ['redesign.css','verda.css','orders.css','warehouse.css','production.css','logistics.css','sidebar.css','process.css','refinement.css','compact.css','notifications.css','entities.css','interface.css','sales.css','dashboard.css','theme.css','controls.css','order-picker.css','purchase-picker.css','job-card.css','card-quality.css','order-composition.css','portals.css','supplier-trading.css','partner-spaces.css','ai-previews.css','ai-workspace.css','partner-fulfillment.css','partner-polish.css']))
page = page.replace('/* INLINE_JS */', '\n'.join((BASE / n).read_text(encoding='utf-8') for n in ['catalog-data.js','model.js','catalog.js','demo-scenario.js','views.js','dialogs.js','actions.js','ux.js','orders.js','warehouse.js','production.js','logistics.js','help.js','sidebar.js','process.js','navigation.js','notifications.js','entities.js','workflow.js','sales.js','dashboard.js','access.js','catalog-ui.js','controls.js','order-picker.js','purchase-picker.js','job-card.js','card-quality.js','order-composition.js','portals.js','supplier-trading.js','partner-spaces.js','ai-previews.js','ai-workspace.js','partner-fulfillment.js','coverage.js','partner-motion.js']))
(ROOT / 'index.html').write_text(page, encoding='utf-8')
print(f'BEKSA ERP: {len(page.encode())} bytes, standalone HTML')
