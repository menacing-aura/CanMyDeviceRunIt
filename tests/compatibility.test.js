import test from 'node:test';
import assert from 'node:assert/strict';
import { devices, games } from '../src/catalog.js';
import { evaluateCompatibility, getAlternatives } from '../src/compatibility.js';

const device = id => devices.find(item => item.id === id);
const game = id => games.find(item => item.id === id);
const check = (result, key) => result.checks.find(item => item.key === key);

test('default Nitro 5 meets Fortnite minimums but not recommended memory', () => {
  const result = evaluateCompatibility(device('acer-nitro-5'), game('fortnite'));
  assert.equal(result.status, 'playable');
  assert.equal(check(result, 'ram').status, 'warn');
  assert.match(result.settings, /Performance mode/);
});

test('unsupported native platform never gets a positive hardware score', () => {
  const result = evaluateCompatibility(device('macbook-air-m2'), game('valorant'));
  assert.equal(result.status, 'unsupported');
  assert.equal(result.score, null);
});

test('Windows ARM cannot pass VALORANT merely with powerful hardware', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), architecture: 'arm64' }, game('valorant'));
  assert.equal(result.status, 'limited');
  assert.equal(check(result, 'architecture').status, 'fail');
});

test('insufficient RAM blocks an otherwise capable device', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), ram: 4 }, game('fortnite'));
  assert.equal(result.status, 'limited');
  assert.equal(check(result, 'ram').status, 'fail');
});

test('Minecraft Java uses higher minimum for shared-memory graphics', () => {
  const integrated = evaluateCompatibility(device('macbook-air-m1'), game('minecraft-java'));
  const discrete = evaluateCompatibility(device('acer-nitro-5'), game('minecraft-java'));
  assert.equal(check(integrated, 'ram').status, 'fail');
  assert.equal(check(integrated, 'ram').required, '12 GB minimum');
  assert.notEqual(check(discrete, 'ram').status, 'fail');
});

test('total storage capacity does not imply enough free space', () => {
  const result = evaluateCompatibility(device('asus-tuf-a15'), game('genshin-impact'));
  assert.equal(check(result, 'storage').status, 'unknown');
  assert.match(check(result, 'storage').device, /total/);
});

test('known insufficient free space fails even on a large drive', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), freeStorage: 20 }, game('genshin-impact'));
  assert.equal(result.status, 'limited');
  assert.equal(check(result, 'storage').status, 'fail');
});

test('a drive smaller than the install requirement fails without a free-space estimate', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), storage: 64 }, game('genshin-impact'));
  assert.equal(result.status, 'limited');
  assert.equal(check(result, 'storage').status, 'fail');
});

test('zero free storage is a known failure, not missing information', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), freeStorage: 0 }, game('stardew-valley'));
  assert.equal(check(result, 'storage').status, 'fail');
});

test('impossible free-space input is not accepted as a storage pass', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), freeStorage: 2000 }, game('genshin-impact'));
  assert.equal(check(result, 'storage').status, 'unknown');
  const smallDrive = evaluateCompatibility({ ...device('asus-tuf-a15'), storage: 64, freeStorage: 200 }, game('genshin-impact'));
  assert.equal(check(smallDrive, 'storage').status, 'fail');
  assert.equal(smallDrive.status, 'limited');
});

test('missing hardware data produces an unknown result without a numeric fit index', () => {
  const result = evaluateCompatibility({ ...device('acer-nitro-5'), cpuScore: undefined }, game('fortnite'));
  assert.equal(result.status, 'limited');
  assert.equal(result.score, null);
  assert.equal(check(result, 'cpu').status, 'unknown');
});

test('published platform availability alone does not invent Android performance', () => {
  const result = evaluateCompatibility(device('galaxy-s23'), game('stardew-valley'));
  assert.equal(result.status, 'limited');
  assert.equal(result.score, null);
  assert.notEqual(result.status, 'unsupported');
});

test('a well-equipped device meets the recommended Genshin hardware', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), freeStorage: 200 }, game('genshin-impact'));
  assert.equal(result.status, 'great');
  assert.equal(check(result, 'storage').status, 'pass');
  assert.ok(result.score > 75);
});

test('malformed values are never coerced into passing hardware checks', () => {
  for (const ram of [null, undefined, NaN, Infinity, '16', -4]) {
    const result = evaluateCompatibility({ ...device('asus-tuf-a15'), ram }, game('fortnite'));
    assert.equal(result.status, 'limited');
    assert.equal(check(result, 'ram').status, 'unknown');
  }
});

test('missing selections are handled without throwing', () => {
  assert.equal(evaluateCompatibility(null, null).score, null);
  assert.equal(evaluateCompatibility({}, game('fortnite')).status, 'limited');
  assert.deepEqual(getAlternatives(null, game('fortnite')), []);
});

test('alternatives exclude current title and unsupported or uncertain matches', () => {
  const current = game('fortnite');
  const alternatives = getAlternatives(device('macbook-air-m2'), current, 3);
  assert.ok(alternatives.length > 0 && alternatives.length <= 3);
  assert.ok(alternatives.every(item => item.id !== current.id && item.category === 'game'));
  assert.ok(alternatives.every(item => ['great', 'playable'].includes(item.compatibility.status)));
  assert.deepEqual(getAlternatives(device('acer-nitro-5'), current, 0), []);
});

test('every supported catalog platform has a publisher requirements source', () => {
  assert.equal(new Set(devices.map(item => item.id)).size, devices.length);
  assert.equal(new Set(games.map(item => item.id)).size, games.length);
  for (const item of games) {
    for (const platform of item.platforms) {
      assert.ok(item.requirements[platform]?.sourceUrl.startsWith('https://'), `${item.id}/${platform}`);
    }
  }
});

test('unknown installed OS version stays a warning while a known old OS fails', () => {
  const unspecified = evaluateCompatibility(device('asus-tuf-a15'), game('fortnite'));
  assert.equal(check(unspecified, 'platform').status, 'warn');
  assert.equal(unspecified.status, 'great');
  const old = evaluateCompatibility({ ...device('asus-tuf-a15'), osVersion: '8.1' }, game('fortnite'));
  assert.equal(check(old, 'platform').status, 'fail');
  assert.equal(old.status, 'limited');
  assert.notEqual(old.score, 95);
});

test('OS version comparisons preserve dotted version ordering', () => {
  const old = evaluateCompatibility({ ...device('macbook-air-m2'), osVersion: '10.9' }, game('stardew-valley'));
  const newer = evaluateCompatibility({ ...device('macbook-air-m2'), osVersion: '10.15' }, game('stardew-valley'));
  assert.equal(check(old, 'platform').status, 'fail');
  assert.equal(check(newer, 'platform').status, 'warn');
});

test('a 64-bit Chromebook CPU does not prove the app runtime is compatible', () => {
  const result = evaluateCompatibility(device('lenovo-chromebook-duet'), game('minecraft-bedrock'));
  assert.equal(check(result, 'cpu').status, 'pass');
  assert.equal(check(result, 'runtime').status, 'unknown');
  assert.equal(result.status, 'limited');
  assert.equal(result.score, null);
});

test('Chromebook processor tiers cannot substitute for verified CPU support', () => {
  const result = evaluateCompatibility({ ...device('lenovo-chromebook-duet'), cpuId: undefined, cpuScore: 6, runtimeArchitecture: 'arm64' }, game('minecraft-bedrock'));
  assert.equal(check(result, 'cpu').status, 'unknown');
  assert.equal(result.status, 'limited');
  assert.equal(result.score, null);
});

test('known 32-bit runtime fails Minecraft while verified 64-bit runtime meets minimum', () => {
  const reference = device('lenovo-chromebook-duet');
  const wrongRuntime = evaluateCompatibility({ ...reference, runtimeArchitecture: 'arm32' }, game('minecraft-bedrock'));
  const compatibleRuntime = evaluateCompatibility({ ...reference, osVersion: '120', runtimeArchitecture: 'arm64' }, game('minecraft-bedrock'));
  assert.equal(check(wrongRuntime, 'runtime').status, 'fail');
  assert.equal(wrongRuntime.status, 'limited');
  assert.equal(compatibleRuntime.status, 'playable');
});

test('unknown architecture can never receive the headroom score', () => {
  const result = evaluateCompatibility({ ...device('asus-tuf-a15'), architecture: undefined }, game('valorant'));
  assert.equal(result.status, 'limited');
  assert.equal(result.score, null);
});

test('the entire catalog never reports a high score alongside a failing check', () => {
  for (const model of devices) {
    for (const title of games) {
      const result = evaluateCompatibility(model, title);
      if (result.checks.some(item => item.status === 'fail')) {
        assert.ok(result.status === 'limited' || result.status === 'unsupported', `${model.id}/${title.id}`);
        assert.ok(result.score === null || result.score <= 35, `${model.id}/${title.id}`);
      }
      if (result.score === 95) assert.equal(result.status, 'great');
    }
  }
});


test('expanded starter catalog keeps broad device coverage', () => {
  const requiredIds = [
    'macbook-air-m3-13',
    'thinkpad-e14-gen5-i5',
    'hp-victus-15-fa1319tx',
    'dell-g15-5530-rtx4060',
    'pixel-8',
    'pixel-9a',
    'galaxy-s24',
    'galaxy-a25-5g',
    'acer-chromebook-plus-515',
    'lenovo-flex-5i-chromebook-plus',
  ];
  assert.ok(devices.length >= 19);
  for (const id of requiredIds) assert.ok(device(id), `missing expanded catalog device: ${id}`);
  assert.ok(new Set(devices.map(item => item.os)).has('windows'));
  assert.ok(new Set(devices.map(item => item.os)).has('macos'));
  assert.ok(new Set(devices.map(item => item.os)).has('android'));
  assert.ok(new Set(devices.map(item => item.os)).has('chromeos'));
});


test('expanded app catalog includes popular creative, dev, and communication tools', () => {
  const requiredIds = [
    'discord',
    'spotify',
    'obs-studio',
    'gimp',
    'krita',
    'godot',
    'android-studio',
    'docker-desktop',
    'adobe-photoshop',
    'adobe-premiere',
  ];
  const apps = games.filter(item => item.category === 'app');
  assert.ok(apps.length >= 12);
  for (const id of requiredIds) {
    assert.ok(game(id), `missing expanded app: ${id}`);
    assert.equal(game(id).category, 'app');
  }
});

test('apps with unpublished hardware thresholds stay usable without inventing requirements', () => {
  const result = evaluateCompatibility(device('acer-nitro-5'), game('discord'));
  assert.equal(result.status, 'playable');
  assert.equal(result.score, 75);
  assert.equal(check(result, 'cpu').status, 'warn');
  assert.equal(check(result, 'gpu').status, 'warn');
  assert.equal(check(result, 'ram').status, 'warn');
  assert.match(check(result, 'cpu').required, /published/i);
});

test('published app hardware minimums still fail normally', () => {
  const result = evaluateCompatibility({ ...device('dell-inspiron-15'), ram: 4 }, game('android-studio'));
  assert.equal(result.status, 'limited');
  assert.equal(check(result, 'ram').status, 'fail');
});
