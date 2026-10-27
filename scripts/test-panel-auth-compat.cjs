const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const html = fs.readFileSync(path.join(__dirname, '../workbuddy/panel.html'), 'utf8');
const start = html.indexOf('const ENC_PREFIX');
const end = html.indexOf('function saveKey()', start);
if (start < 0 || end < 0) throw new Error('panel auth functions not found');
const code = html.slice(start, end);
const host = 'example.test', userAgent = 'test browser', key = 'test-only-key';
function persisted(version) {
  const payload = Buffer.from(JSON.stringify({ state: { managementKey: key } }));
  const suffix = version === 2 ? `v2|${host}` : `${host}|${userAgent}`;
  const salt = Buffer.from(`cli-proxy-api-webui::secure-storage|${suffix}`);
  return `enc::v${version}::` + Buffer.from(payload.map((x, i) => x ^ salt[i % salt.length])).toString('base64');
}
function readKey(raw) {
  const context = { TextEncoder, TextDecoder, Uint8Array, atob, btoa, URLSearchParams,
    window: { location: { host, search: '' }, self: {}, top: {} },
    navigator: { userAgent }, localStorage: { getItem: () => raw }, sessionStorage: { getItem: () => null } };
  vm.createContext(context); vm.runInContext(code, context);
  return vm.runInContext('getKey()', context);
}
test('embedded panel reads existing v1 and current v2 login storage', () => {
  assert.equal(readKey(persisted(1)), key);
  assert.equal(readKey(persisted(2)), key);
});
test('missing or malformed storage does not produce a key', () => {
  assert.equal(readKey(null), null);
  assert.equal(readKey('enc::v2::not-a-valid-payload'), null);
});
test('startup calls load so missing credentials replace the loading message', () => {
  assert.match(html, /if\(window\.__wbThemeSync\)window\.__wbThemeSync\(\);\s*load\(false\);/);
  assert.match(html, /if\(!getKey\(\)\)\{\s*showAuth\(\);\s*g\.innerHTML=/);
});
