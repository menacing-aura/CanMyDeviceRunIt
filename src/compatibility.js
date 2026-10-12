import { games } from './catalog.js';

const platformNames = { windows: 'Windows', macos: 'macOS', android: 'Android', chromeos: 'ChromeOS' };
const isNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const gb = value => isNumber(value) ? `${value} GB` : 'Not provided';
const list = value => Array.isArray(value) ? value : value ? [String(value)] : [];

// Compare dotted versions as components: macOS 10.10 is newer than 10.9.
// Missing or descriptive values remain unverified rather than being guessed.
function versionIsBelow(actual, minimum) {
  const parse = value => /^(?:\d+\.)*\d+$/.test(String(value)) ? String(value).split('.').map(Number) : null;
  const actualParts = parse(actual);
  const minimumParts = parse(minimum);
  if (!actualParts || !minimumParts) return false;
  for (let i = 0; i < Math.max(actualParts.length, minimumParts.length); i += 1) {
    if ((actualParts[i] || 0) !== (minimumParts[i] || 0)) return (actualParts[i] || 0) < (minimumParts[i] || 0);
  }
  return false;
}

function missingResult(summary) {
  return {
    status: 'limited', label: 'More details needed', score: null, summary,
    settings: 'Add the missing specifications before choosing settings.', checks: [],
    notes: ['A model name alone cannot confirm its hardware configuration.'],
  };
}

/**
 * Estimates native-app hardware fit. It does not measure FPS, probe hardware,
 * validate installed drivers/OS builds, or guarantee store/anti-cheat access.
 * `storage` is total capacity; only optional `freeStorage` can pass space checks.
 */
export function evaluateCompatibility(device, game) {
  if (!device || !game) return missingResult('Choose a device and a game or app to compare.');
  if (!device.os || !Array.isArray(game.platforms)) return missingResult('The operating system or platform support information is missing.');

  const platform = platformNames[device.os] || device.os;
  if (!game.platforms.includes(device.os)) {
    return {
      status: 'unsupported', label: 'No native support', score: null,
      summary: `${game.name} has no verified current native release for ${platform} in this catalog.`,
      settings: 'Choose a supported platform or an alternative below.',
      checks: [{ key: 'platform', label: 'Operating system', status: 'fail', device: device.osLabel || platform,
        required: game.platforms.map(os => platformNames[os] || os).join(', ') }],
      notes: ['This check covers direct installation. Browser versions, cloud streaming, emulation and Linux containers are separate options.'],
    };
  }

  const requirements = game.requirements?.[device.os];
  if (!requirements) return missingResult(`${game.name} supports ${platform}, but verified requirements are missing from this catalog.`);

  const notes = [
    'This is a specifications-based estimate, not a benchmark or an FPS prediction.',
    'Verify the installed OS version, drivers, graphics features and store eligibility before installing.',
    ...list(requirements.notes),
  ];
  const checks = [{ key: 'platform', label: 'Operating system',
    status: versionIsBelow(device.osVersion, requirements.minimumOsVersion) ? 'fail' : 'warn',
    device: device.osVersion ? `${device.osLabel || platform} · version ${device.osVersion}` : device.osLabel || platform,
    required: requirements.os || 'Check publisher requirements' }];

  // Integrated GPUs share system RAM. Unknown GPU type uses the higher published
  // minimum rather than incorrectly passing a low-memory custom configuration.
  const ramRequired = isNumber(requirements.integratedRam) && device.gpuType !== 'discrete'
    ? Math.max(requirements.ram || 0, requirements.integratedRam) : requirements.ram;
  const gpuRequired = device.gpuType === 'integrated' && isNumber(requirements.integratedGpuScore)
    ? requirements.integratedGpuScore : requirements.gpuScore;
  const metrics = [
    { key: 'cpu', label: 'Processor', actual: device.cpuScore, minimum: requirements.cpuScore,
      shown: device.cpu || 'Not provided', required: requirements.cpu || 'Not published', recommended: requirements.recommended?.cpuScore },
    { key: 'gpu', label: 'Graphics', actual: device.gpuScore, minimum: gpuRequired,
      shown: device.gpu || 'Not provided', required: requirements.gpu || 'Not published', recommended: requirements.recommended?.gpuScore },
    { key: 'ram', label: 'Memory', actual: device.ram, minimum: ramRequired,
      shown: gb(device.ram), required: isNumber(ramRequired) ? `${gb(ramRequired)} minimum` : 'Not published', recommended: requirements.recommended?.ram },
  ];

  for (const metric of metrics) {
    let status;
    if (metric.minimum === 0) status = 'pass';
    else if (metric.key === 'cpu' && requirements.verifiedCpuIds && !requirements.verifiedCpuIds.includes(device.cpuId)) status = 'unknown';
    else if (!isNumber(metric.actual) || !isNumber(metric.minimum)) status = 'unknown';
    else if (metric.actual < metric.minimum) status = 'fail';
    else if (isNumber(metric.recommended) && metric.actual < metric.recommended) status = 'warn';
    else status = 'pass';
    checks.push({ key: metric.key, label: metric.label, status, device: metric.shown, required: metric.required });
  }

  if (requirements.architectures) {
    checks.push({ key: 'architecture', label: 'CPU architecture',
      status: !device.architecture ? 'unknown' : requirements.architectures.includes(device.architecture) ? 'pass' : 'fail',
      device: device.architecture || 'Not provided', required: requirements.architectures.join(' or ') });
  }

  if (requirements.runtimeArchitectures) {
    checks.push({ key: 'runtime', label: 'App runtime architecture',
      status: !device.runtimeArchitecture ? 'unknown' : requirements.runtimeArchitectures.includes(device.runtimeArchitecture) ? 'pass' : 'fail',
      device: device.runtimeArchitecture || 'Not verified on this device', required: '64-bit app runtime (confirm in system settings / store)' });
  }

  const freeSpaceKnown = isNumber(device.freeStorage);
  const storageKnown = isNumber(requirements.storage);
  const invalidFreeSpace = freeSpaceKnown && isNumber(device.storage) && device.freeStorage > device.storage;
  let storageStatus = 'unknown';
  if (storageKnown) {
    if (isNumber(device.storage) && device.storage < requirements.storage) storageStatus = 'fail';
    else if (!invalidFreeSpace && freeSpaceKnown) storageStatus = device.freeStorage >= requirements.storage ? 'pass' : 'fail';
  }
  checks.push({ key: 'storage', label: 'Available storage', status: storageStatus,
    device: invalidFreeSpace ? 'Free space exceeds total capacity' : freeSpaceKnown ? `${gb(device.freeStorage)} free`
      : isNumber(device.storage) ? `${gb(device.storage)} total · free space unknown` : 'Free space not provided',
    required: storageKnown ? `${gb(requirements.storage)} free` : 'Check the current installer' });
  if (storageStatus === 'unknown') notes.push(invalidFreeSpace
    ? 'The supplied free space is greater than total capacity. Recheck available storage.'
    : 'Available storage is unverified. Total drive capacity does not tell us how much space is free.');

  const hardwareUnknown = checks.some(check => check.key !== 'storage' && check.status === 'unknown');
  const failures = checks.filter(check => check.status === 'fail');
  const meetsRecommended = requirements.recommended
    ? metrics.every(metric => !isNumber(metric.recommended) || (isNumber(metric.actual) && metric.actual >= metric.recommended))
    : metrics.every(metric => metric.minimum === 0 || (isNumber(metric.actual) && isNumber(metric.minimum)
      && metric.actual >= (metric.key === 'ram' ? Math.max(4, metric.minimum * 2) : metric.minimum + 1)));

  const status = failures.length || hardwareUnknown ? 'limited' : meetsRecommended ? 'great' : 'playable';
  // The fit index uses discrete rule outcomes; it is not a benchmark, percent
  // chance of running, or a performance difference between devices.
  const score = hardwareUnknown ? null : status === 'great' ? 95 : status === 'playable' ? 75 : 35;
  let summary;
  let label;
  if (failures.length) {
    label = 'Below requirements';
    summary = `${device.name || 'Your device'} falls short on ${failures.map(check => check.label.toLowerCase()).join(', ')}. Resolve these requirements before relying on this match for ${game.name}.`;
  } else if (hardwareUnknown) {
    label = 'More details needed';
    summary = `${game.name} is available for ${platform}, but the available hardware requirements or device details are too incomplete for a confident rating.`;
  } else if (status === 'great') {
    label = 'Good hardware fit';
    summary = `${device.name || 'Your device'} meets the checked hardware requirements with headroom. Confirm software support and free space before installing ${game.name}.`;
  } else {
    label = 'Meets minimum specs';
    summary = `${device.name || 'Your device'} meets the checked minimum hardware requirements for ${game.name}. Start conservatively and check the notes below.`;
  }

  let settings = game.category === 'app'
    ? 'Start with a small project. Large assets, extensions and rendering jobs need additional resources.'
    : status === 'great'
      ? 'Start with the default preset, then adjust quality after trying a representative session.'
      : 'Start with low graphics, reduce resolution or render distance, and close background apps.';
  if (status === 'limited') settings = failures.length
    ? 'Resolve the requirements marked below before installing. Lower settings cannot fix every hardware or platform restriction.'
    : 'Check the publisher or app store for the missing requirements before choosing settings.';
  if (game.id === 'fortnite' && status === 'playable' && device.os === 'windows') {
    settings = 'Try Performance mode or low graphics. Close background apps; 16 GB RAM is Epic’s recommendation.';
  }
  if (score !== null) notes.push('Fit index: 95 = hardware headroom, 75 = minimum hardware met, 35 = a requirement fails. This is an editorial rule, not measured performance.');

  return { status, label, score, summary, settings, checks, notes };
}

/** Returns other supported titles in the same category with a usable estimate. */
export function getAlternatives(device, game, limit = 3) {
  if (!device || !game || !Number.isFinite(limit) || limit <= 0) return [];
  const rank = { great: 2, playable: 1 };
  return games
    .filter(candidate => candidate.id !== game.id && candidate.category === game.category)
    .map(candidate => ({ ...candidate, compatibility: evaluateCompatibility(device, candidate) }))
    .filter(candidate => candidate.compatibility.status === 'great' || candidate.compatibility.status === 'playable')
    .sort((a, b) => rank[b.compatibility.status] - rank[a.compatibility.status]
      || Number(b.genre === game.genre) - Number(a.genre === game.genre)
      || a.name.localeCompare(b.name))
    .slice(0, Math.floor(limit));
}
