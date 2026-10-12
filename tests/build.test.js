import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildSite, escapeHtml, pageDefinition, renderPage, routePaths, siteOrigin } from '../scripts/build.js';
import { createRequestHandler } from '../scripts/serve.js';

const shell = '<html><head><title>Default</title><meta name="description" content="Default"></head><body><div id="app"></div></body></html>';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'can-my-device-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, 'public', 'assets'), { recursive: true });
  await writeFile(join(root, 'index.html'), shell);
  await writeFile(join(root, 'src', 'app.js'), 'export const healthy = true;');
  await writeFile(join(root, 'src', 'styles.css'), 'body { color: black; }');
  await writeFile(join(root, 'public', 'assets', 'icon.svg'), '<svg></svg>');
  await writeFile(join(root, 'public', '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
  await writeFile(join(root, 'public', '_routes.json'), '{"version":1,"include":["/api/assistant"],"exclude":[]}');
  await writeFile(join(root, '.env'), 'private=never-serve');
  return root;
}

async function request(handler, url, method = 'GET') {
  const response = new EventEmitter();
  response.headers = {};
  response.setHeader = (name, value) => { response.headers[name.toLowerCase()] = value; };
  response.writeHead = (status, headers) => { response.status = status; for (const [name, value] of Object.entries(headers)) response.setHeader(name, value); };
  response.end = body => { response.body = body == null ? '' : body.toString(); };
  await handler({ url, method }, response);
  return response;
}

test('metadata escapes text and rejects non-origin SITE_URL values', () => {
  assert.equal(escapeHtml('<"&\'>'), '&lt;&quot;&amp;&#39;&gt;');
  const html = renderPage(shell, { title: '</title><script>oops</script>', description: '" onload="oops', content: '<h1>Safe body</h1>' }, 'https://example.com/');
  assert.ok(html.includes('&lt;/title&gt;&lt;script&gt;'));
  assert.ok(html.includes('content="&quot; onload=&quot;oops"'));
  assert.ok(!html.includes('<script>'));
  assert.equal(siteOrigin('https://example.com/'), 'https://example.com');
  assert.equal(siteOrigin(''), null);
  for (const value of ['javascript:alert(1)', 'file:///tmp', 'https://example.com/path', 'https://u:p@example.com', 'https://example.com/?secret=1', 'https://example.com/#hash']) {
    assert.throws(() => siteOrigin(value), /SITE_URL/);
  }
});

test('build emits unique crawlable pages, assets, headers, and optional sitemap', async t => {
  const root = await fixture(t);
  const result = await buildSite({ root, origin: 'https://example.com' });
  assert.equal(result.pages, routePaths.length);
  const titles = new Set();
  for (const path of routePaths) {
    const html = await readFile(join(result.output, path.slice(1), 'index.html'), 'utf8');
    titles.add(html.match(/<title>(.*?)<\/title>/s)[1]);
    assert.ok(html.includes('<h1>'), `${path} needs readable initial content`);
    assert.ok(html.includes(`href="https://example.com${path}"`));
  }
  assert.equal(titles.size, routePaths.length);
  const comparison = await readFile(join(result.output, 'check', 'macbook-air-m1', 'valorant', 'index.html'), 'utf8');
  assert.ok(comparison.includes('No native support'));
  assert.ok(comparison.includes('macOS'));
  const specs = await readFile(join(result.output, 'games', 'genshin-impact', 'index.html'), 'utf8');
  assert.ok(specs.includes('110 GB'));
  assert.ok(specs.includes('Publisher specifications'));
  assert.ok((await readFile(join(result.output, 'sitemap.xml'), 'utf8')).includes('https://example.com/check/'));
  assert.ok((await readFile(join(result.output, 'robots.txt'), 'utf8')).includes('Sitemap:'));
  assert.equal(await readFile(join(result.output, 'assets', 'icon.svg'), 'utf8'), '<svg></svg>');
  assert.ok((await readFile(join(result.output, '_headers'), 'utf8')).includes('nosniff'));
  assert.deepEqual(JSON.parse(await readFile(join(result.output, '_routes.json'), 'utf8')), {
    version: 1, include: ['/api/assistant'], exclude: [],
  });
  assert.ok((await readFile(join(result.output, '404.html'), 'utf8')).includes('Page not found'));
  await buildSite({ root, origin: '' });
  await assert.rejects(readFile(join(result.output, 'sitemap.xml')), { code: 'ENOENT' });
  assert.ok(!(await readFile(join(result.output, 'index.html'), 'utf8')).includes('rel="canonical"'));
  assert.ok(!pageDefinition('/devices/unknown').title.includes('undefined'));
});

test('development and preview handlers serve only allowed files and catalog routes', async t => {
  const root = await fixture(t);
  await symlink(join(root, '.env'), join(root, 'public', 'assets', 'leak.svg'));
  await buildSite({ root, origin: '' });
  for (const dist of [false, true]) {
    const handler = createRequestHandler({ root, dist });
    for (const path of ['/', '/games', '/games/', '/devices/acer-nitro-5', '/check/acer-nitro-5/fortnite?share=1']) {
      const response = await request(handler, path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
    }
    const js = await request(handler, '/src/app.js');
    assert.equal(js.status, 200);
    assert.equal(js.headers['content-type'], 'text/javascript; charset=utf-8');
    assert.equal((await request(handler, '/src/styles.css')).headers['content-type'], 'text/css; charset=utf-8');
    assert.equal((await request(handler, '/assets/icon.svg')).headers['content-type'], 'image/svg+xml');
    assert.equal((await request(handler, '/assets/icon.svg', 'HEAD')).body, '');
    for (const path of ['/assets/missing.svg', '/src/missing.js', '/missing', '/games/no-such-game', '/check/unknown/fortnite', '/package.json', '/scripts/build.js', '/_headers', '/.env', '/.git/config', '/../.env', '/assets/../../.env', '/assets/%2e%2e/%2e%2e/.env', '/assets/%252e%252e/.env', '/assets/..\\.env', '/assets/%00.svg', '/assets/%ff.svg', '/assets/leak.svg', '//example.com/.env']) {
      assert.equal((await request(handler, path)).status, 404, `${dist ? 'preview' : 'development'} must reject ${path}`);
    }
    const post = await request(handler, '/', 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
  }
  await rm(join(root, 'dist', 'games', 'index.html'));
  assert.equal((await request(createRequestHandler({ root, dist: true }), '/games')).status, 200);
});
