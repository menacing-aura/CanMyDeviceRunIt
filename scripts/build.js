import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { devices, games, reviewedAt } from '../src/catalog.js';
import { evaluateCompatibility } from '../src/compatibility.js';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const routePaths = [
  '/', '/games', '/devices', '/how-it-works',
  ...games.map(game => `/games/${game.id}`),
  ...devices.map(device => `/devices/${device.id}`),
  ...devices.flatMap(device => games.map(game => `/check/${device.id}/${game.id}`)),
];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function siteOrigin(value) {
  if (!value) return null;
  let url;
  try { url = new URL(value); } catch { throw new Error('SITE_URL must be an absolute http(s) origin, for example https://your-domain.example.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must contain only an http(s) origin, with no credentials, path, query, or fragment.');
  }
  return url.origin;
}

const itemLink = (path, name) => `<a href="${escapeHtml(path)}">${escapeHtml(name)}</a>`;
const bullets = items => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const sourceLink = url => itemLink(url, 'Publisher specifications');
const memory = value => value == null ? 'Not published' : `${value} GB`;
const wrap = (heading, content) => `<section class="static-content"><h1>${escapeHtml(heading)}</h1>${content}</section>`;

function gameRequirements(game) {
  return Object.entries(game.requirements).map(([platform, requirement]) => `<section><h2>${escapeHtml(platform)} requirements</h2><dl>
    <dt>Operating system</dt><dd>${escapeHtml(requirement.os)}</dd>
    <dt>Processor</dt><dd>${escapeHtml(requirement.cpu)}</dd>
    <dt>Graphics</dt><dd>${escapeHtml(requirement.gpu)}</dd>
    <dt>Memory</dt><dd>${escapeHtml(memory(requirement.ram))}</dd>
    <dt>Available storage</dt><dd>${escapeHtml(memory(requirement.storage))}</dd>
    </dl>${bullets(requirement.notes.map(escapeHtml))}<p>${sourceLink(requirement.sourceUrl)}</p></section>`).join('');
}

function deviceSpecs(device) {
  return `<dl><dt>Operating system</dt><dd>${escapeHtml(device.osLabel)}</dd>
    <dt>Processor</dt><dd>${escapeHtml(device.cpu)}</dd><dt>Graphics</dt><dd>${escapeHtml(device.gpu)}</dd>
    <dt>Memory</dt><dd>${escapeHtml(memory(device.ram))}</dd>
    <dt>Total storage</dt><dd>${escapeHtml(memory(device.storage))} — available space is unknown</dd></dl>
    ${bullets(device.notes.map(escapeHtml))}<p>${sourceLink(device.sourceUrl)}</p>`;
}

export function pageDefinition(path) {
  if (path === '/') return {
    title: 'CanMyDeviceRunIt — Less guessing. More gaming.',
    description: 'Compare your PC, phone, or Chromebook with game and app requirements. Free, independent compatibility estimates with publisher sources.',
    content: wrap('Know what your device can run.', '<p>Compare your device with games and apps before you download. Every result explains the checked requirements and what still needs verification.</p><p>Use JavaScript for custom specifications and interactive comparisons, or browse these guides.</p>' + bullets([
      itemLink('/games', 'Browse games and apps'), itemLink('/devices', 'Browse devices'), itemLink('/how-it-works', 'How our estimates work'),
    ])),
  };
  if (path === '/games') return {
    title: 'Game & app requirements | CanMyDeviceRunIt',
    description: 'Explore sourced requirements for games and apps, then compare them with PCs, Android phones, Macs, and Chromebooks.',
    content: wrap('Games & apps', bullets(games.map(game => `${itemLink(`/games/${game.id}`, game.name)} — ${escapeHtml(game.description)}`))),
  };
  if (path === '/devices') return {
    title: 'Device specifications | CanMyDeviceRunIt',
    description: 'Browse specific laptop, phone, Mac, and Chromebook configurations and compare their hardware with game requirements.',
    content: wrap('Devices', '<p>Configurations vary. Match the listed processor, graphics, and memory to your own device.</p>' + bullets(devices.map(device => `${itemLink(`/devices/${device.id}`, device.name)} — ${escapeHtml(device.cpu)}, ${escapeHtml(memory(device.ram))} RAM`))),
  };
  if (path === '/how-it-works') return {
    title: 'How compatibility estimates work | CanMyDeviceRunIt',
    description: 'Learn how we compare device specifications with published requirements, why estimates are not FPS benchmarks, and how browser privacy works.',
    content: wrap('How it works', `<p>We compare a specific device configuration with publisher requirements for its operating system. Processor and graphics comparisons use editorial capability tiers, not measured benchmarks.</p><p>Results are estimates, not a promise that software will install or perform at a particular frame rate. Check your installed OS, drivers, graphics APIs, anti-cheat requirements, store eligibility, and free storage.</p><p>Total storage capacity does not mean available storage. Unsupported platforms and missing specifications are called out rather than assigned an optimistic rating.</p><p>Custom device data and saved selections stay in browser storage. If you choose to ask the AI helper, your question and the selected device, game, and comparison details are sent through a Cloudflare Pages Function to Groq for a response. The app does not store those questions. The helper has no live web search; verify current details with the publisher. Cloudflare and Groq may process request data under their own terms. This application has no account system, server database, analytics, or hardware scanner. Clear site data in your browser to remove saved selections.</p><p>Catalog sources were reviewed ${escapeHtml(reviewedAt)}. Publisher and manufacturer links appear on every detail page.</p>`),
  };
  const parts = path.split('/').filter(Boolean);
  const game = games.find(item => item.id === (parts[0] === 'check' ? parts[2] : parts[1]));
  const device = devices.find(item => item.id === parts[1]);
  if (parts.length === 2 && parts[0] === 'games' && game) return {
    title: `${game.name} requirements | CanMyDeviceRunIt`,
    description: `${game.name} system requirements and platform notes. Compare your device with sourced memory, processor, graphics, and storage requirements.`,
    content: wrap(`${game.name} requirements`, `<p>${escapeHtml(game.description)}</p>${gameRequirements(game)}<h2>Check a device</h2>${bullets(devices.map(item => itemLink(`/check/${item.id}/${game.id}`, `${item.name} + ${game.name}`)))}`),
  };
  if (parts.length === 2 && parts[0] === 'devices' && device) return {
    title: `${device.name} compatibility | CanMyDeviceRunIt`,
    description: `See what ${device.name} with ${device.cpu} and ${memory(device.ram)} RAM can run. Compare this specific configuration with games and apps.`,
    content: wrap(`${device.name} specifications`, `${deviceSpecs(device)}<h2>Compare games & apps</h2>${bullets(games.map(item => itemLink(`/check/${device.id}/${item.id}`, `${device.name} + ${item.name}`)))}`),
  };
  if (parts.length === 3 && parts[0] === 'check' && device && game) {
    const result = evaluateCompatibility(device, game);
    return {
      title: `Can ${device.name} run ${game.name}? | CanMyDeviceRunIt`,
      description: `${result.label}: ${result.summary}`,
      content: wrap(`Can ${device.name} run ${game.name}?`, `<h2>${escapeHtml(result.label)}</h2><p>${escapeHtml(result.summary)}</p><p>${escapeHtml(result.settings)}</p>
        <table><caption>Requirements compared with this device</caption><thead><tr><th scope="col">Component</th><th scope="col">Device</th><th scope="col">Requirement</th><th scope="col">Check</th></tr></thead><tbody>
        ${result.checks.map(check => `<tr><th scope="row">${escapeHtml(check.label)}</th><td>${escapeHtml(check.device)}</td><td>${escapeHtml(check.required)}</td><td>${escapeHtml(check.status)}</td></tr>`).join('')}</tbody></table>
        ${bullets(result.notes.map(escapeHtml))}<p>${itemLink(`/devices/${device.id}`, `${device.name} specifications`)} · ${itemLink(`/games/${game.id}`, `${game.name} requirements`)}</p>`),
    };
  }
  return {
    title: 'Page not found | CanMyDeviceRunIt', description: 'This page could not be found. Browse device specifications or game requirements to start a new comparison.',
    content: wrap('Page not found', `<p>That comparison or guide is not available.</p><p>${itemLink('/', 'Go to the compatibility checker')}</p>`),
  };
}

export function renderPage(shell, page, canonical) {
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escapeHtml(page.description)}">`)
    .replace('<div id="app"></div>', () => `<div id="app">${page.content}</div>`);
  if (canonical) html = html.replace('</head>', () => `    <link rel="canonical" href="${escapeHtml(canonical)}">\n  </head>`);
  return html;
}

export async function buildSite({ root = projectRoot, output = join(root, 'dist'), origin = process.env.SITE_URL } = {}) {
  const baseUrl = siteOrigin(origin);
  const shell = await readFile(join(root, 'index.html'), 'utf8');
  const destination = resolve(output);
  if (destination === resolve(root) || destination === dirname(resolve(root))) throw new Error('Build output must be a dedicated directory.');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(join(root, 'src'), join(destination, 'src'), { recursive: true });
  await cp(join(root, 'public'), destination, { recursive: true });
  for (const path of routePaths) {
    const file = join(destination, path.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, renderPage(shell, pageDefinition(path), baseUrl ? `${baseUrl}${path}` : null));
  }
  await writeFile(join(destination, '404.html'), renderPage(shell, pageDefinition('/404')));
  const robots = 'User-agent: *\nAllow: /\n' + (baseUrl ? `Sitemap: ${baseUrl}/sitemap.xml\n` : '');
  await writeFile(join(destination, 'robots.txt'), robots);
  if (baseUrl) {
    const entries = routePaths.map(path => `  <url><loc>${escapeHtml(`${baseUrl}${path}`)}</loc></url>`).join('\n');
    await writeFile(join(destination, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
  }
  return { output: destination, pages: routePaths.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await buildSite();
    console.log(`Built ${result.pages} pages in ${result.output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
