// Publish the standalone HTML previously compiled and checked locally.
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
if (html.includes('/* INLINE_CSS */') || html.includes('/* INLINE_JS */')) {
  throw new Error('Run python scripts/build.py before committing the project.');
}
await mkdir(new URL('dist/', root), { recursive: true });
await writeFile(new URL('dist/index.html', root), html, 'utf8');
await copyFile(new URL('src/favicon.svg', root), new URL('dist/favicon.svg', root));
console.log('Static demo prepared in dist/.');
