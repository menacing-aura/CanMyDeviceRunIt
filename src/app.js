import { devices, games, reviewedAt } from './catalog.js';
import { evaluateCompatibility, getAlternatives } from './compatibility.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const platformNames = { windows: 'Windows', macos: 'macOS', android: 'Android', chromeos: 'ChromeOS' };
const icons = {
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', chevron: '<path d="m9 5 7 7-7 7"/>', down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  laptop: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M2 20h20l-2-4H4z"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
  game: '<path d="M7 7h10c2 0 3 2 3.5 4l1 7c.3 2-2 3-3.5 1l-3-3H9l-3 3c-1.5 2-4 1-3.5-1l1-7C4 9 5 7 7 7Z"/><path d="M8 10v4m-2-2h4m6-1h.01m2 2h.01"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
  memory: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4m5-4v4m5-4v4M7 18v3m5-3v3m5-3v3"/>',
  drive: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 14h18m-5 3h.01m2.99 0h.01"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 11 3 3 5-5"/>',
  share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>',
  bolt: '<path d="m13 2-8 12h6l-1 8 9-12h-7z"/>',
  tune: '<path d="M4 7h8m4 0h4M4 17h4m4 0h8"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chip}</svg>`;
const covers = { fortnite: 'fortnite.jpg', 'genshin-impact': 'genshin-impact.jpg', 'stardew-valley': 'stardew-valley.jpg', 'counter-strike-2': 'counter-strike-2.jpg', valorant: 'valorant.jpg' };
const gameArt = (game, cls = '') => `<div class="game-art ${cls}" style="--art-color:${escape(game.color)}"><span class="art-fallback">${escape(game.shortName)}</span>${covers[game.id] ? `<img src="/assets/${covers[game.id]}" alt="" loading="lazy">` : icon(game.category === 'app' ? 'chip' : 'game')}</div>`;
const deviceIcon = device => icon(device.type === 'phone' ? 'phone' : 'laptop');
const sourceLink = (url, label = 'Publisher requirements') => `<a class="source-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;

let stored;
try { stored = JSON.parse(localStorage.getItem('cmdri-device') || 'null'); } catch { /* Storage is optional. */ }
const validCustom = device => device && device.id === 'custom' && typeof device.name === 'string' && device.name.length <= 80 && Object.hasOwn(platformNames, device.os) && Number.isFinite(device.ram) && device.ram > 0 && device.ram <= 1024;
const storedCatalogDevice = devices.find(device => device.id === stored?.id);
let selectedDevice = storedCatalogDevice
  ? {
      ...storedCatalogDevice,
      ...(Number.isFinite(stored?.freeStorage) && stored.freeStorage >= 0 && stored.freeStorage <= storedCatalogDevice.storage
        ? { freeStorage: stored.freeStorage }
        : {}),
    }
  : (validCustom(stored) ? stored : devices[0]);
let selectedGame = games[0];
let activeResult = null;
let pickerType = 'device';
let pickerFilter = 'all';
let libraryFilter = 'all';
let searchTerm = '';

function rememberDevice() {
  try { localStorage.setItem('cmdri-device', JSON.stringify(selectedDevice)); } catch { /* Private mode and full storage remain usable. */ }
}

function navigate(path, { scroll = true } = {}) {
  if (location.pathname + location.search !== path) history.pushState({}, '', path);
  render();
  if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
}

function setPageTitle(title) { document.title = `${title} — CanMyDeviceRunIt`; }

function render() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  const nav = path === '/games' || parts[0] === 'games' ? 'games' : parts[0] === 'devices' ? 'devices' : path === '/how-it-works' ? 'about' : 'checker';
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === nav);
    if (link.dataset.nav === nav) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (parts[0] === 'check' && parts.length === 3) {
    const device = devices.find(item => item.id === parts[1]);
    const game = games.find(item => item.id === parts[2]);
    if (!device || !game) return renderNotFound();
    selectedDevice = { ...device };
    const freeStorage = new URLSearchParams(location.search).get('free');
    if (freeStorage !== null && freeStorage.trim() !== '' && Number.isFinite(Number(freeStorage)) && Number(freeStorage) >= 0 && Number(freeStorage) <= selectedDevice.storage) selectedDevice.freeStorage = Number(freeStorage);
    selectedGame = game;
    activeResult = evaluateCompatibility(selectedDevice, selectedGame);
    return renderHome(true);
  }
  if (path === '/') { activeResult = evaluateCompatibility(selectedDevice, selectedGame); return renderHome(); }
  if (path === '/games' || path === '/devices') return renderLibrary(parts[0]);
  if (parts.length === 2 && parts[0] === 'games') return renderGame(games.find(game => game.id === parts[1]));
  if (parts.length === 2 && parts[0] === 'devices') return renderDevice(devices.find(device => device.id === parts[1]));
  if (path === '/how-it-works') return renderAbout();
  renderNotFound();
}

function renderHome(isShared = false) {
  setPageTitle(isShared ? `${selectedGame.name} on ${selectedDevice.name}` : 'Less guessing. More gaming.');
  $('#app').innerHTML = `
    <section class="hero">
      <div><span class="eyebrow"><span class="tiny-star">✳</span> YOUR HARDWARE. YOUR POSSIBILITIES.</span>
        <h1>Less guessing.<br><span>More gaming.</span></h1>
        <p>That game on your wishlist? Let’s see if your device is up for it.</p>
      </div>
      <div class="hero-stamp" aria-hidden="true"><div class="stamp-orbit"></div><span class="stamp-star star-one">✦</span><span class="stamp-star star-two">✦</span><div class="stamp-screen">${icon('game')}<span>GOOD GAMES.<br>HAPPY HARDWARE.</span></div><div class="stamp-base"></div><span class="stamp-note">find your next playable ↗</span></div>
    </section>
    <section class="checker-section" aria-label="Device compatibility checker">
      <div class="checker-form panel">
        <div class="section-caption"><span>${icon('tune')} THE COMPATIBILITY CHECK</span><span class="small-pill">NO INSTALL NEEDED</span></div>
        <div class="form-step"><div class="field-heading"><span class="step-number">01</span><label>Your device</label><button class="text-button" data-action="custom">Enter specs manually ${icon('arrow')}</button></div>
          <button class="selection-button" data-action="pick-device" aria-haspopup="dialog"><span class="selection-icon">${deviceIcon(selectedDevice)}</span><span class="selection-text"><strong>${escape(selectedDevice.name)}</strong><small>${escape(platformNames[selectedDevice.os])} <span>·</span> ${selectedDevice.ram} GB RAM</small></span>${icon('down')}</button>
          <div class="device-spec-summary">${icon('chip')}<span>${escape(selectedDevice.cpu)}</span></div>
        </div>
        <div class="form-step second-step"><div class="field-heading"><span class="step-number">02</span><label>What do you want to run?</label></div>
          <button class="selection-button game-selection" data-action="pick-game" aria-haspopup="dialog">${gameArt(selectedGame, 'selection-art')}<span class="selection-text"><strong>${escape(selectedGame.name)}</strong><small>${escape(selectedGame.genre)}</small></span>${icon('search')}</button>
        </div>
        <div class="free-space-field"><label for="free-space">Free storage <span>(optional)</span></label><div><input id="free-space" type="number" min="0" max="${selectedDevice.storage || 100000}" step="0.1" inputmode="decimal" placeholder="e.g. 120" value="${Number.isFinite(selectedDevice.freeStorage) ? selectedDevice.freeStorage : ''}"><span>GB</span></div></div>
        <button class="primary-button check-button" data-action="check">Check compatibility ${icon('arrow')}</button>
        <p class="form-footnote">${icon('shield')} Just a specs check. Your device stays yours.</p>
      </div>
      <div id="result-slot">${renderResult()}</div>
    </section>
    <section class="assistant-section panel" aria-labelledby="assistant-title">
      <div class="assistant-copy">
        <span class="eyebrow">A LITTLE EXTRA HELP</span>
        <h2 id="assistant-title">Ask about this match.</h2>
        <p>Get a plain-language explanation of the comparison for ${escape(selectedDevice.name)} and ${escape(selectedGame.name)}.</p>
        <p class="assistant-disclaimer">AI can be wrong. This helper does not search the web; verify current requirements with the publisher.</p>
      </div>
      <form id="assistant-form" class="assistant-form">
        <label class="input-label" for="assistant-question">Your question</label>
        <textarea id="assistant-question" name="question" rows="3" minlength="4" maxlength="500" required placeholder="Why might this game struggle on my device?"></textarea>
        <button class="primary-button" type="submit">Ask Groq <span aria-hidden="true">↗</span></button>
        <p class="assistant-privacy">Your question and these device/game details are sent to Groq through this site’s secure server endpoint.</p>
        <div id="assistant-answer" class="assistant-answer" role="status" aria-live="polite"></div>
      </form>
    </section>
    <div class="trust-strip"><span>${icon('check')} Free to use</span><span>${icon('shield')} No hardware scans</span><span>${icon('globe')} PCs, phones & Chromebooks</span><a href="/how-it-works">Estimates, with the details to back them up ${icon('arrow')}</a></div>
    <section class="popular-section"><div class="section-heading"><div><span class="eyebrow">THE USUAL SUSPECTS</span><h2>Big games. One quick check.</h2></div><a class="subtle-link" href="/games">Explore all games & apps ${icon('arrow')}</a></div>
      <div class="game-grid home-game-grid">${['fortnite', 'minecraft-java', 'genshin-impact', 'stardew-valley'].map(id => gameCard(games.find(game => game.id === id))).join('')}</div>
    </section>
    <section class="bottom-callout"><div class="callout-icon">${icon('laptop')}</div><div><h3>You don’t need the newest device.</h3><p>You just need to know what works with yours.</p></div><a href="/devices">Find your device ${icon('arrow')}</a></section>`;
}

function renderResult() {
  if (!activeResult) return `<div class="result-card result-pending"><div class="result-topline"><span class="result-eyebrow">YOUR COMPATIBILITY REPORT</span>${icon('game')}</div><div class="pending-icon">${icon('tune')}</div><h2>New combo.<br>New possibilities.</h2><p>Check ${escape(selectedGame.name)} with your ${escape(selectedDevice.name)} to see how they match up.</p><span class="pending-note">Hit “Check compatibility” to get your estimate.</span></div>`;
  const result = activeResult;
  const heading = { great: 'A pretty great match.', playable: 'You’re in the game.', limited: result.score === null ? 'Let’s take a closer look.' : 'A bit of a stretch.', unsupported: 'Not a native match.' }[result.status];
  const symbol = result.status === 'unsupported' ? '×' : result.score === null ? '?' : result.score;
  const checkMarkup = ['cpu', 'gpu', 'ram'].map(key => {
    const check = result.checks.find(item => item.key === key);
    return check ? `<div class="quick-spec"><span>${icon(key === 'ram' ? 'memory' : 'chip')}${escape(check.label)}</span><strong class="quick-${check.status}"><i>${check.status === 'pass' ? '✓' : check.status === 'fail' ? '×' : check.status === 'warn' ? '↗' : '?'}</i>${check.status === 'pass' ? 'Looks good' : check.status === 'warn' ? 'Minimum met' : check.status === 'fail' ? 'Below minimum' : 'Unverified'}</strong></div>` : '';
  }).join('');
  return `<article class="result-card status-${result.status}" aria-label="Compatibility result">
    <div class="result-topline"><span class="result-eyebrow"><span class="live-dot"></span> YOUR COMPATIBILITY REPORT</span><span class="estimate-tag">SPECS ESTIMATE</span></div>
    <div class="result-main"><div class="result-copy"><span class="result-label">${icon(result.status === 'great' || result.status === 'playable' ? 'check' : 'info')}${escape(result.label)}</span><h2>${heading}</h2><p>${escape(result.summary)}</p></div>
      <div class="score-wrap"><div class="score-ring" style="--score:${result.score || 0}"><div><strong>${symbol}</strong>${result.score !== null ? '<span>/ 100</span>' : '<span>UNRATED</span>'}</div></div><span class="score-caption">HARDWARE FIT INDEX</span></div>
    </div>
    ${checkMarkup ? `<div class="quick-specs">${checkMarkup}</div>` : `<div class="platform-message">${icon('globe')} Available on ${selectedGame.platforms.map(os => platformNames[os]).join(' & ')}</div>`}
    <div class="settings-tip">${icon('bolt')}<div><strong>A good place to start</strong><p>${escape(result.settings)}</p></div></div>
    <div class="result-bottom"><button class="result-detail-button" data-action="details">See the full breakdown ${icon('arrow')}</button><button class="share-button" data-action="share" aria-label="Share compatibility result">${icon('share')} Share</button></div>
  </article>
  <div class="result-caveat">${icon('info')} A guide, not an FPS benchmark. Software support and free space still need checking.</div>`;
}

function gameCard(game) {
  const compatibility = evaluateCompatibility(selectedDevice, game);
  return `<article class="game-card"><a class="game-card-image" href="/games/${game.id}" aria-label="${escape(game.name)} requirements">${gameArt(game)}<span class="art-tag">${game.category === 'app' ? 'APP' : escape(game.genre.toUpperCase())}</span></a><div class="game-card-body"><a class="game-card-title" href="/games/${game.id}">${escape(game.name)}</a><p>${game.platforms.map(os => platformNames[os]).join(' · ')}</p><div class="game-card-bottom"><span class="compatibility-dot fit-${compatibility.status}">${compatibility.status === 'great' ? 'Good hardware fit' : compatibility.status === 'playable' ? 'Minimum specs met' : compatibility.status === 'unsupported' ? 'Different platform' : 'Check requirements'}</span><button class="round-button" data-game-check="${game.id}" aria-label="Check ${escape(game.name)} on your device">${icon('arrow')}</button></div></div></article>`;
}

function renderLibrary(type) {
  const isGames = type === 'games';
  setPageTitle(isGames ? 'Games & apps' : 'Device library');
  searchTerm = ''; libraryFilter = 'all';
  $('#app').innerHTML = `<section class="page-intro"><span class="eyebrow">${isGames ? 'FIND YOUR NEXT FAVORITE' : 'GOOD HARDWARE COMES IN ALL SIZES'}</span><h1>${isGames ? 'What’s on your wishlist?' : 'Start with your device.'}</h1><p>${isGames ? 'From cozy farms to competitive lobbies. Find out what fits your setup.' : 'Find your exact configuration, or enter your own specs for a personal check.'}</p></section><section class="library"><div class="library-toolbar"><div class="search-field">${icon('search')}<input type="search" id="library-search" placeholder="${isGames ? 'Search games and apps…' : 'Search devices, brands, or hardware…'}" aria-label="${isGames ? 'Search games and apps' : 'Search devices'}"></div><div class="filter-tabs" role="group" aria-label="Filter ${type}">${(isGames ? [['all', 'All titles'], ['game', 'Games'], ['app', 'Apps']] : [['all', 'All devices'], ['pc', 'Computers'], ['phone', 'Phones'], ['chromebook', 'Chromebooks']]).map(([value, label]) => `<button data-library-filter="${value}" class="${value === 'all' ? 'active' : ''}" aria-pressed="${value === 'all'}">${label}</button>`).join('')}</div></div><div class="library-count" id="library-count" role="status"></div><div id="library-results" class="${isGames ? 'game-grid' : 'device-grid'}"></div></section>`;
  $('#library-search').addEventListener('input', event => { searchTerm = event.target.value; renderLibraryResults(type); });
  $('[aria-label="Filter ' + type + '"]').addEventListener('click', event => {
    const button = event.target.closest('[data-library-filter]'); if (!button) return;
    libraryFilter = button.dataset.libraryFilter;
    document.querySelectorAll('[data-library-filter]').forEach(tab => { tab.classList.toggle('active', tab === button); tab.setAttribute('aria-pressed', String(tab === button)); });
    renderLibraryResults(type);
  });
  renderLibraryResults(type);
}

function renderLibraryResults(type) {
  const isGames = type === 'games';
  const items = (isGames ? games : devices).filter(item => (libraryFilter === 'all' || (isGames ? item.category : item.type) === libraryFilter) && `${item.name} ${item.genre || ''} ${item.cpu || ''} ${item.gpu || ''} ${item.brand || ''}`.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  $('#library-count').textContent = `${items.length} ${isGames ? 'titles' : 'devices'} in the starter catalog${isGames ? ` · matches shown for ${selectedDevice.name}` : ' · exact configurations listed'}`;
  $('#library-results').innerHTML = items.length ? items.map(isGames ? gameCard : deviceCard).join('') : `<div class="empty-state">${icon('search')}<h3>No matches just yet.</h3><p>Try a different search${isGames ? ' or filter.' : ', or add your specifications manually.'}</p>${!isGames ? '<button class="primary-button" data-action="custom">Enter your specs</button>' : ''}</div>`;
}

function deviceCard(device) {
  return `<article class="device-card"><div class="device-card-top"><span class="device-illustration ${device.type}">${deviceIcon(device)}</span><span class="platform-pill">${platformNames[device.os]}</span></div><a href="/devices/${device.id}"><h3>${escape(device.name)}</h3></a><p>${escape(device.cpu)}</p><div class="device-card-specs"><span>${icon('memory')}${device.ram} GB RAM</span><span>${icon('drive')}${device.storage} GB</span></div><a class="device-card-link" href="/devices/${device.id}">View device ${icon('arrow')}</a></article>`;
}

function renderDevice(device) {
  if (!device) return renderNotFound();
  setPageTitle(`${device.name} specifications`);
  $('#app').innerHTML = `<a class="back-link" href="/devices">← All devices</a><section class="detail-hero device-detail-hero"><div class="large-device-icon">${deviceIcon(device)}</div><div><span class="eyebrow">${escape(device.brand)} · ${platformNames[device.os]}</span><h1>${escape(device.name)}</h1><p>A specific configuration. Check that the hardware below matches yours.</p><button class="primary-button" data-select-device="${device.id}">Use this device ${icon('arrow')}</button></div></section><section class="detail-columns"><div class="panel spec-panel"><h2>Under the hood</h2><dl class="spec-list">${[['Processor', device.cpu], ['Graphics', device.gpu], ['Memory', `${device.ram} GB`], ['Total storage', `${device.storage} GB`], ['Operating system', device.osLabel], ['Architecture', device.architecture]].map(([key, value]) => `<div><dt>${key}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${sourceLink(device.sourceUrl, 'Manufacturer specifications')}</div><div class="detail-notes"><span class="eyebrow">THE SMALL PRINT, MADE READABLE</span><h2>Know your configuration.</h2>${device.notes.map(note => `<p>${escape(note)}</p>`).join('')}<p>Total storage is the drive’s capacity. Enter your available free space in the checker for an installation-space check.</p><button class="text-button" data-action="custom">My specs are different ${icon('arrow')}</button></div></section><section class="popular-section"><div class="section-heading"><div><span class="eyebrow">EXPLORE THE POSSIBILITIES</span><h2>Put it to the test.</h2></div></div><div class="device-game-links">${games.slice(0, 6).map(game => `<a href="/check/${device.id}/${game.id}">${gameArt(game, 'selection-art')}<span>Can it run <strong>${escape(game.name)}?</strong></span>${icon('arrow')}</a>`).join('')}</div></section>`;
}

function renderGame(game) {
  if (!game) return renderNotFound();
  setPageTitle(`${game.name} system requirements`);
  $('#app').innerHTML = `<a class="back-link" href="/games">← All games & apps</a><section class="detail-hero"><div class="detail-game-art">${gameArt(game)}</div><div><span class="eyebrow">${escape(game.genre)} · ${game.category === 'app' ? 'APPLICATION' : 'GAME'}</span><h1>${escape(game.name)}</h1><p>${escape(game.description)}</p><button class="primary-button" data-game-check="${game.id}">Check my device ${icon('arrow')}</button></div></section><div class="section-heading"><div><span class="eyebrow">BEFORE YOU HIT DOWNLOAD</span><h2>What you’ll need.</h2></div><span class="review-date">Sources reviewed ${reviewedAt}</span></div><div class="requirements-grid">${Object.entries(game.requirements).map(([os, req]) => `<article class="panel spec-panel"><h3>${icon(os === 'android' ? 'phone' : 'laptop')} ${platformNames[os]}</h3><dl class="spec-list">${[['Operating system', req.os], ['Processor', req.cpu], ['Graphics', req.gpu], ['Memory', req.ram === null ? 'Check publisher / store' : `${req.ram} GB minimum${req.integratedRam ? ` · ${req.integratedRam} GB with integrated graphics` : ''}`], ['Free storage', req.storage === null ? 'Check the current installer' : `${req.storage} GB minimum`]].map(([key, value]) => `<div><dt>${key}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>${req.notes.length ? `<div class="requirement-notes">${req.notes.map(note => `<p>${escape(note)}</p>`).join('')}</div>` : ''}${sourceLink(req.sourceUrl || game.sourceUrl)}</article>`).join('')}</div>`;
}

function renderAbout() {
  setPageTitle('How the compatibility check works');
  $('#app').innerHTML = `<section class="page-intro"><span class="eyebrow">A LITTLE LESS MYSTERY</span><h1>Specs in. Clarity out.</h1><p>A useful starting point for your next download. Here’s exactly what goes into it.</p></section><section class="method-grid">${[['01', 'Pick your actual hardware.', 'Choose a listed configuration or enter your specifications. The same laptop name can hide very different hardware.'], ['02', 'Compare the requirements.', 'We compare native platform support, memory, free storage, and editorial processor and graphics tiers against publisher requirements.'], ['03', 'See the whole picture.', 'Get a hardware-fit estimate, the individual checks, publisher sources, and the limitations before you install.']].map(([n, title, desc]) => `<article class="panel method-card"><span class="step-number">${n}</span><h2>${title}</h2><p>${desc}</p></article>`).join('')}</section><section class="about-body"><article><h2>What does the score mean?</h2><p>The hardware fit index is a simple editorial rule, not a benchmark, a percent chance of running, or an FPS prediction. Processor and GPU capability tiers are broad approximations within each platform.</p><div class="score-legend"><div><strong>95</strong><span>Hardware headroom</span></div><div><strong>75</strong><span>Minimum hardware met</span></div><div><strong>35</strong><span>A requirement falls short</span></div><div><strong>—</strong><span>Unsupported or incomplete</span></div></div><p>A positive estimate still needs an OS-version, graphics-feature, driver, store-eligibility, and free-space check. We do not promise frame rates or a particular graphics preset.</p><h2>Things a spec sheet can’t tell us.</h2><p>Heat, battery settings, background apps, resolution, drivers, mods, and the specific game scene can all change performance. Anti-cheat requirements and school or work policies may block an otherwise capable device.</p><p>This version checks direct installation on Windows, macOS, Android, and ChromeOS. Cloud streaming, emulation, browser editions, iOS, and Linux are outside this starter catalog.</p><h2>Your data stays in your browser.</h2><p>No account, hardware scanning, analytics, or server database. Your selected device is saved in this browser’s local storage so it’s ready next time. Custom specifications are never put into a share URL. You can remove the saved device at any time.</p><button class="secondary-button" data-action="clear-saved">Forget my saved device</button><h2>Small catalog. Clear sources.</h2><p>We start with ${devices.length} specific device configurations and ${games.length} games and apps. The catalog is reviewed manually; it does not update automatically. Follow the official source links on each detail page to confirm the latest requirements.</p><p class="review-date">Source snapshot reviewed ${reviewedAt}. Game artwork and trademarks belong to their respective owners. CanMyDeviceRunIt is independent and unaffiliated with device manufacturers or game publishers.</p><a class="primary-button" href="/">Let’s check your device ${icon('arrow')}</a></article><aside class="about-aside">${icon('shield')}<h3>Useful. Honest.<br>Upfront.</h3><p>If we don’t have enough information, we’ll say so.</p><span>No magic benchmarks.<br>Just a clearer starting point.</span></aside></section>`;
}

function renderNotFound() {
  setPageTitle('Page not found');
  $('#app').innerHTML = `<section class="not-found"><span class="eyebrow">404 · OFF THE MAP</span><h1>That one’s not<br>in our library.</h1><p>The device, game, or page may not exist. Let’s find you a working match.</p><a class="primary-button" href="/">Back to the checker ${icon('arrow')}</a></section>`;
}

function openPicker(type) {
  pickerType = type; pickerFilter = 'all';
  const isDevice = type === 'device';
  const dialog = $('#picker-dialog');
  dialog.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">${isDevice ? 'YOUR EVERYDAY SIDEKICK' : 'THE NEXT DOWNLOAD'}</span><h2 id="picker-title">${isDevice ? 'Find your device.' : 'Pick a game or app.'}</h2></div><button class="icon-button" data-close-dialog aria-label="Close">${icon('close')}</button></div><div class="search-field">${icon('search')}<input id="picker-search" type="search" placeholder="${isDevice ? 'Search name, brand, or processor…' : 'Search games and apps…'}" aria-label="${isDevice ? 'Search devices' : 'Search games and apps'}" autofocus></div><div class="filter-tabs picker-filters">${(isDevice ? [['all', 'All'], ['pc', 'Computers'], ['phone', 'Phones'], ['chromebook', 'Chromebooks']] : [['all', 'All'], ['game', 'Games'], ['app', 'Apps']]).map(([value, label]) => `<button data-picker-filter="${value}" class="${value === 'all' ? 'active' : ''}" aria-pressed="${value === 'all'}">${label}</button>`).join('')}</div><div class="picker-results" id="picker-results"></div><div class="picker-footer">${isDevice ? '<span>Can’t find your exact setup?</span><button class="text-button" data-action="custom">Enter specs manually →</button>' : `<span>${games.length} titles to start. Clear sources for every one.</span>`}</div>`;
  $('#picker-search').addEventListener('input', renderPickerResults);
  renderPickerResults();
  dialog.showModal();
}

function renderPickerResults() {
  const isDevice = pickerType === 'device';
  const query = $('#picker-search').value.trim().toLowerCase();
  const items = (isDevice ? devices : games).filter(item => (pickerFilter === 'all' || (isDevice ? item.type : item.category) === pickerFilter) && `${item.name} ${item.brand || ''} ${item.cpu || ''} ${item.genre || ''}`.toLowerCase().includes(query));
  $('#picker-results').innerHTML = items.length ? items.map(item => `<button class="picker-item" data-pick-id="${item.id}">${isDevice ? `<span class="selection-icon">${deviceIcon(item)}</span>` : gameArt(item, 'selection-art')}<span><strong>${escape(item.name)}</strong><small>${isDevice ? `${platformNames[item.os]} · ${item.ram} GB RAM · ${escape(item.cpu)}` : `${escape(item.genre)} · ${item.platforms.map(os => platformNames[os]).join(', ')}`}</small></span>${icon(item.id === (isDevice ? selectedDevice.id : selectedGame.id) ? 'check' : 'chevron')}</button>`).join('') : `<div class="empty-state">${icon('search')}<h3>No matching ${isDevice ? 'devices' : 'titles'} yet.</h3><p>Try another name or choose a different filter.</p></div>`;
}

function invalidateResult() {
  activeResult = null;
  if (location.pathname !== '/') history.pushState({}, '', '/');
  renderHome();
}

function openCustom() {
  $('#picker-dialog').close();
  const dialog = $('#custom-dialog');
  dialog.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">MAKE IT YOURS</span><h2 id="custom-title">Your actual specs.</h2></div><button class="icon-button" data-close-dialog aria-label="Close">${icon('close')}</button></div><p class="dialog-description">Choose matching hardware from the starter catalog. If it isn’t listed, select “Not listed” for an honest, unrated check.</p><form id="custom-form"><label class="input-label">Device name<input name="name" value="${escape(selectedDevice.id === 'custom' ? selectedDevice.name : 'My device')}" required maxlength="80" autocomplete="off"></label><div class="form-columns"><label class="input-label">Operating system<select name="os">${Object.entries(platformNames).map(([value, label]) => `<option value="${value}" ${selectedDevice.os === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="input-label">Memory (GB)<input name="ram" type="number" min="1" max="1024" step="1" value="${selectedDevice.ram}" required></label></div><label class="input-label">Processor<select name="cpu" id="custom-cpu"></select></label><label class="input-label">Graphics<select name="gpu" id="custom-gpu"></select></label><div class="form-columns"><label class="input-label">Installed OS version<input name="osVersion" maxlength="30" autocomplete="off" placeholder="Optional · e.g. 11 or 120" value="${escape(selectedDevice.osVersion || '')}"></label><label class="input-label">App runtime architecture<select name="runtimeArchitecture"><option value="" ${!selectedDevice.runtimeArchitecture ? 'selected' : ''}>Not sure / not applicable</option><option value="x64" ${selectedDevice.runtimeArchitecture === 'x64' ? 'selected' : ''}>64-bit x86</option><option value="arm64" ${selectedDevice.runtimeArchitecture === 'arm64' ? 'selected' : ''}>64-bit ARM</option><option value="x86" ${selectedDevice.runtimeArchitecture === 'x86' ? 'selected' : ''}>32-bit x86</option><option value="arm32" ${selectedDevice.runtimeArchitecture === 'arm32' ? 'selected' : ''}>32-bit ARM</option></select></label></div><div class="form-columns"><label class="input-label">Free storage (GB)<input name="freeStorage" type="number" min="0" max="100000" step="0.1" placeholder="Optional" value="${selectedDevice.freeStorage ?? ''}"></label><label class="input-label">CPU architecture<select name="architecture"><option value="">Not sure</option><option value="x64" ${selectedDevice.architecture === 'x64' ? 'selected' : ''}>x64 / Intel or AMD</option><option value="arm64" ${selectedDevice.architecture === 'arm64' ? 'selected' : ''}>ARM64 / Apple or mobile</option></select></label></div><p class="custom-hint">${icon('info')} Find your specs in Windows Settings → System → About, macOS About This Mac, ChromeOS Settings → About ChromeOS, or your phone’s About device screen. Runtime architecture is mainly useful for Chromebook/Android app checks.</p><button class="primary-button full-width" type="submit">Use these specifications ${icon('arrow')}</button></form>`;
  const form = $('#custom-form');
  const updateHardware = () => {
    const eligible = devices.filter(device => device.os === form.elements.os.value);
    ['cpu', 'gpu'].forEach(key => {
      const unique = eligible.filter((device, index, array) => array.findIndex(other => other[key] === device[key]) === index);
      form.elements[key].innerHTML = `<option value="">Not listed / I’m not sure</option>${unique.map(device => `<option value="${device.id}" ${selectedDevice[key] === device[key] ? 'selected' : ''}>${escape(device[key])}</option>`).join('')}`;
    });
    form.elements.architecture.value = '';
  };
  updateHardware();
  form.elements.architecture.value = selectedDevice.architecture || '';
  form.elements.os.addEventListener('change', updateHardware);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const cpu = devices.find(device => device.id === data.get('cpu'));
    const gpu = devices.find(device => device.id === data.get('gpu'));
    const os = data.get('os');
    selectedDevice = { id: 'custom', name: data.get('name').trim() || 'My device', brand: 'Custom', type: os === 'android' ? 'phone' : os === 'chromeos' ? 'chromebook' : 'pc', os, osLabel: platformNames[os], ram: Number(data.get('ram')), cpu: cpu?.cpu || 'Not provided', cpuScore: cpu?.cpuScore ?? null, cpuId: cpu?.cpuId, gpu: gpu?.gpu || 'Not provided', gpuScore: gpu?.gpuScore ?? null, gpuType: gpu?.gpuType, architecture: data.get('architecture') || undefined, osVersion: data.get('osVersion').trim() || undefined, runtimeArchitecture: data.get('runtimeArchitecture') || undefined, notes: [] };
    if (data.get('freeStorage') !== '') selectedDevice.freeStorage = Number(data.get('freeStorage'));
    rememberDevice(); dialog.close(); activeResult = null; history.pushState({}, '', '/'); renderHome(); window.scrollTo({ top: 0, behavior: 'instant' });
    toast('Your specifications are ready to check.');
  });
  dialog.showModal();
}

function checkCompatibility() {
  const input = $('#free-space');
  if (input && !input.reportValidity()) return;
  selectedDevice = { ...selectedDevice };
  if (input?.value !== '' && input?.value !== undefined) selectedDevice.freeStorage = Number(input.value); else delete selectedDevice.freeStorage;
  rememberDevice();
  activeResult = evaluateCompatibility(selectedDevice, selectedGame);
  if (selectedDevice.id !== 'custom') {
    const path = `/check/${selectedDevice.id}/${selectedGame.id}${Number.isFinite(selectedDevice.freeStorage) ? `?free=${selectedDevice.freeStorage}` : ''}`;
    history.pushState({}, '', path);
    setPageTitle(`${selectedGame.name} on ${selectedDevice.name}`);
  }
  $('#result-slot').innerHTML = renderResult();
  $('#breakdown')?.remove();
  toast(`Check complete: ${activeResult.label}.`);
  if (window.matchMedia('(max-width: 760px)').matches) $('#result-slot').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function askAssistant(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const question = form.elements.question.value.trim();
  const button = form.querySelector('button[type="submit"]');
  const answer = $('#assistant-answer');
  button.disabled = true;
  answer.textContent = 'Thinking about this comparison…';
  const requirement = selectedGame.requirements?.[selectedDevice.os];
  const payload = {
    question,
    device: {
      name: selectedDevice.name,
      os: selectedDevice.osLabel || platformNames[selectedDevice.os],
      cpu: selectedDevice.cpu,
      gpu: selectedDevice.gpu,
      ram: selectedDevice.ram,
      freeStorage: selectedDevice.freeStorage,
    },
    game: {
      name: selectedGame.name,
      platforms: selectedGame.platforms,
      requirement: requirement ? {
        os: requirement.os,
        cpu: requirement.cpu,
        gpu: requirement.gpu,
        ram: requirement.ram,
        storage: requirement.storage,
      } : null,
    },
    compatibility: {
      label: activeResult?.label || 'Not checked',
      summary: activeResult?.summary || 'No estimate is available.',
      settings: activeResult?.settings || 'No settings suggestion is available.',
    },
  };

  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error('The AI helper returned an unreadable response. Please try again shortly.'); }
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The AI helper is temporarily unavailable. Please try again shortly.');
    if (typeof result.answer !== 'string' || !result.answer.trim()) throw new Error('The AI helper returned an empty response. Please try again shortly.');
    answer.textContent = result.answer.trim();
  } catch (error) {
    answer.textContent = error instanceof TypeError
      ? 'The AI helper could not be reached. Please check your connection and try again.'
      : error instanceof Error ? error.message : 'The AI helper failed unexpectedly. Please try again shortly.';
  } finally {
    button.disabled = false;
  }
}

function showBreakdown() {
  if (!activeResult) return;
  if ($('#breakdown')) { $('#breakdown').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const result = activeResult;
  const alternatives = getAlternatives(selectedDevice, selectedGame);
  const section = document.createElement('section'); section.id = 'breakdown'; section.className = 'breakdown';
  section.innerHTML = `<div class="section-heading"><div><span class="eyebrow">HERE’S HOW WE GOT THERE</span><h2>The full picture.</h2><p>${escape(selectedGame.name)} on ${escape(selectedDevice.name)}</p></div><button class="icon-button" data-action="close-details" aria-label="Close breakdown">${icon('close')}</button></div><div class="table-scroll"><table class="comparison-table"><caption class="sr-only">Hardware comparison against minimum requirements</caption><thead><tr><th scope="col">Component</th><th scope="col">Your device</th><th scope="col">Requirement</th><th scope="col">Result</th></tr></thead><tbody>${result.checks.map(check => `<tr><th scope="row">${escape(check.label)}</th><td>${escape(check.device)}</td><td>${escape(check.required)}</td><td><span class="check-state check-${check.status}">${({ pass: '✓ Meets specs', warn: check.key === 'platform' ? 'Verify version' : 'Check notes', fail: '× Falls short', unknown: '? Unverified' })[check.status]}</span></td></tr>`).join('')}</tbody></table></div><div class="breakdown-notes"><h3>A few things to keep in mind</h3><ul>${result.notes.map(note => `<li>${escape(note)}</li>`).join('')}</ul>${sourceLink(selectedGame.requirements[selectedDevice.os]?.sourceUrl || selectedGame.sourceUrl)}${selectedDevice.sourceUrl ? sourceLink(selectedDevice.sourceUrl, 'Device specifications') : ''}</div>${alternatives.length ? `<div class="alternatives"><h3>Other possibilities for your device</h3><div>${alternatives.map(game => `<button data-game-check="${game.id}">${gameArt(game, 'selection-art')}<span><strong>${escape(game.name)}</strong><small>${escape(game.compatibility.label)}</small></span>${icon('arrow')}</button>`).join('')}</div></div>` : ''}`;
  $('.trust-strip').after(section);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shareResult() {
  if (!activeResult) return;
  const isCustom = selectedDevice.id === 'custom';
  const url = new URL(isCustom ? '/' : `/check/${selectedDevice.id}/${selectedGame.id}`, location.origin);
  if (!isCustom && Number.isFinite(selectedDevice.freeStorage)) url.searchParams.set('free', String(selectedDevice.freeStorage));
  const summary = `${selectedGame.name} on ${selectedDevice.name}: ${activeResult.label}${activeResult.score === null ? '' : ` (${activeResult.score}/100 hardware fit index)`}. Specs estimate, not a benchmark.\n${url.href}`;
  const dialog = $('#share-dialog');
  dialog.innerHTML = `<div class="dialog-heading"><div><span class="eyebrow">SEND THE VERDICT</span><h2 id="share-title">Good to know. Good to share.</h2></div><button class="icon-button" data-close-dialog aria-label="Close">${icon('close')}</button></div><p class="dialog-description">${isCustom ? 'Copy this summary to share your result. Custom hardware details stay in your browser; the link opens the checker.' : 'This link recreates your selected device, game, and supplied free space. The estimate may change as requirements are updated.'}</p><label class="input-label" for="share-value">${isCustom ? 'Result summary' : 'Result link'}</label><textarea id="share-value" readonly rows="${isCustom ? 5 : 3}">${escape(isCustom ? summary : url.href)}</textarea><button class="primary-button full-width" id="copy-share">${icon('share')} Copy ${isCustom ? 'summary' : 'link'}</button><p id="copy-status" class="copy-status" role="status"></p>`;
  $('#copy-share').addEventListener('click', async () => {
    const field = $('#share-value');
    try { await navigator.clipboard.writeText(field.value); $('#copy-status').textContent = 'Copied. Ready to send!'; }
    catch { field.focus(); field.select(); $('#copy-status').textContent = 'Select and copy the text above using your browser’s Copy command.'; }
  });
  dialog.showModal();
}

let toastTimer;
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}

document.addEventListener('submit', event => {
  if (event.target.id === 'assistant-form') askAssistant(event);
});

document.addEventListener('click', event => {
  const close = event.target.closest('[data-close-dialog]');
  if (close) { close.closest('dialog').close(); return; }
  const link = event.target.closest('a');
  if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0 && !link.target && !link.hasAttribute('download')) {
    const url = new URL(link.href);
    if (url.origin === location.origin && !url.hash) { event.preventDefault(); navigate(url.pathname + url.search); return; }
  }
  const pickerTab = event.target.closest('[data-picker-filter]');
  if (pickerTab) {
    pickerFilter = pickerTab.dataset.pickerFilter;
    document.querySelectorAll('[data-picker-filter]').forEach(button => { button.classList.toggle('active', button === pickerTab); button.setAttribute('aria-pressed', String(button === pickerTab)); });
    renderPickerResults(); return;
  }
  const picked = event.target.closest('[data-pick-id]');
  if (picked) {
    if (pickerType === 'device') { selectedDevice = { ...devices.find(device => device.id === picked.dataset.pickId) }; rememberDevice(); }
    else selectedGame = games.find(game => game.id === picked.dataset.pickId);
    $('#picker-dialog').close(); invalidateResult(); return;
  }
  const chooseDevice = event.target.closest('[data-select-device]');
  if (chooseDevice) { selectedDevice = { ...devices.find(device => device.id === chooseDevice.dataset.selectDevice) }; rememberDevice(); navigate('/'); return; }
  const quickGame = event.target.closest('[data-game-check]');
  if (quickGame) {
    selectedGame = games.find(game => game.id === quickGame.dataset.gameCheck);
    if (selectedDevice.id !== 'custom') navigate(`/check/${selectedDevice.id}/${selectedGame.id}${Number.isFinite(selectedDevice.freeStorage) ? `?free=${selectedDevice.freeStorage}` : ''}`);
    else navigate('/');
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'pick-device') openPicker('device');
  if (action === 'pick-game') openPicker('game');
  if (action === 'custom') openCustom();
  if (action === 'check') checkCompatibility();
  if (action === 'details') showBreakdown();
  if (action === 'share') shareResult();
  if (action === 'close-details') { $('#breakdown')?.remove(); $('[data-action="details"]')?.focus(); }
  if (action === 'clear-saved') {
    try { localStorage.removeItem('cmdri-device'); } catch { /* Nothing to remove. */ }
    selectedDevice = devices[0]; toast('Saved device removed from this browser.');
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'free-space' && activeResult) {
    activeResult = null; $('#result-slot').innerHTML = renderResult(); $('#breakdown')?.remove();
  }
});
document.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement) event.target.style.display = 'none';
}, true);
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
}));
window.addEventListener('popstate', render);
render();
