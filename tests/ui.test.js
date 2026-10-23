import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../src/app.js', import.meta.url);

test('custom specifications expose the compatibility details the engine can use', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.doesNotMatch(app, /<\/option\s+value=/, 'option markup must be well formed');
  assert.match(app, /name="osVersion"/);
  assert.match(app, /name="runtimeArchitecture"/);
  assert.match(app, /osVersion: data\.get\('osVersion'\)/);
  assert.match(app, /runtimeArchitecture: data\.get\('runtimeArchitecture'\)/);
});

test('every configured local cover points to a committed asset', async () => {
  const app = await readFile(appUrl, 'utf8');
  const block = app.match(/const covers = \{([^;]+)\};/s);
  assert.ok(block, 'cover mapping should exist');
  const files = [...block[1].matchAll(/:\s*'([^']+)'/g)].map(match => match[1]);
  assert.ok(files.length > 0, 'at least one local cover should be configured');
  for (const file of files) {
    await access(new URL(`../public/assets/${file}`, import.meta.url));
  }
});

test('saved free storage can be restored for catalog devices', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.match(app, /storedCatalogDevice/);
  assert.match(app, /stored\.freeStorage <= storedCatalogDevice\.storage/);
});


test('tech HUD theme keeps the dark neon design tokens', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(styles, /--cyan:#00e7ff/);
  assert.match(styles, /--violet:#8a5cff/);
  assert.match(styles, /TECH HUD THEME/);
  assert.match(styles, /body::before/);
  assert.match(styles, /\.result-card::before/);
  assert.match(html, /SYSTEM ONLINE \/\/ FREE/);
  assert.match(html, /theme-color" content="#050816"/);
});


test('device UI shows exact configuration labels instead of only marketing names', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.match(app, /device\.configLabel/);
  assert.match(app, /Catalog configuration/);
  assert.match(app, /Factory OS/);
  assert.match(app, /Use this exact profile/);
  assert.match(app, /item\.configLabel/);
});




test('Linux is exposed in the custom-spec flow with reusable PC hardware', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.match(app, /linux: 'Linux'/);
  assert.match(app, /selectedOs === 'linux'/);
  assert.match(app, /device\.type === 'pc'/);
  assert.match(app, /native Linux releases only/);
});


test('smooth collision-safe UI includes mobile stacking and shrink guards', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const assistant = await readFile(new URL('../src/assistant.css', import.meta.url), 'utf8');
  assert.match(styles, /SMOOTH \+ COLLISION-SAFE LAYOUT/);
  assert.match(styles, /@media\(max-width:560px\)/);
  assert.match(styles, /\.result-main\{\s*flex-direction:column/);
  assert.match(styles, /\.quick-specs\{\s*grid-template-columns:1fr/);
  assert.match(styles, /dialog\{[\s\S]*max-height:min\(86vh,860px\)/);
  assert.match(styles, /overflow-wrap:anywhere/);
  assert.match(assistant, /Smooth RUN\/\/AI layout/);
});


test('RUN AI exposes Gemini primary with Groq fallback messaging', async () => {
  const app = await readFile(appUrl, 'utf8');
  assert.match(app, /RUN\/\/AI · GEMINI \+ GROQ/);
  assert.match(app, /PRIMARY \/\/ GEMINI 3\.8 FLASH/);
  assert.match(app, /FALLBACK \/\/ GROQ/);
  assert.match(app, /API keys stay server-side/);
});
