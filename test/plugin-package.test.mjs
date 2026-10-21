import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const catalog = json('.agents/plugins/marketplace.json');

test('catalog resolves to a contained, existing package from the repository root', () => {
  assert.equal(catalog.name, 'ashare-quotes');
  assert.equal(catalog.plugins.length, 1);
  for (const entry of catalog.plugins) {
    assert.equal(entry.source.source, 'local');
    assert.match(entry.source.path, /^\.\//);
    const target = resolve(root, entry.source.path);
    assert(!relative(root, target).startsWith(`..${sep}`));
    // A root Agent Plugins manifest takes precedence over the native manifest.
    // Codex 0.163.0 deliberately ignores its app declarations, including overlays.
    assert(!existsSync(resolve(target, 'plugin.json')));
    assert(existsSync(resolve(target, '.codex-plugin/plugin.json')));
    assert.equal(entry.name, JSON.parse(readFileSync(resolve(target, '.codex-plugin/plugin.json'), 'utf8')).name);
    assert.equal(entry.policy.authentication, 'ON_INSTALL');
    assert(!Object.hasOwn(entry, 'pluginId'));
  }
});

test('native manifest preserves the required app without an inactive portable overlay', () => {
  const base = 'plugins/ashare-live-quotes/';
  const manifest = json(base + '.codex-plugin/plugin.json');
  assert.equal(manifest.name, 'ashare-live-quotes');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert([...manifest.interface.shortDescription].length <= 30);
  assert(Array.isArray(manifest.interface.capabilities));
  assert.equal(manifest.apps, './.app.json');
  assert.equal(manifest.skills, './skills/');
  const apps = json(base + manifest.apps).apps;
  assert.equal(Object.keys(apps).length, 1);
  const app = Object.values(apps)[0];
  assert.equal(app.id, 'asdk_app_sites_b91a56bbcc40819181d197752bd6b91f');
  assert.equal(app.required, true);
  assert(!existsSync(resolve(root, base, 'plugin.json')));
  assert(!existsSync(resolve(root, base, 'mcp.json')));
  assert(!existsSync(resolve(root, base, '.mcp.json')));
});

test('package has one discoverable reading skill and no executable or private payload', () => {
  const base = resolve(root, 'plugins/ashare-live-quotes');
  const files = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = resolve(dir, name), stat = lstatSync(path);
      assert(!stat.isSymbolicLink());
      if (stat.isDirectory()) walk(path); else files.push(relative(base, path).replaceAll('\\', '/'));
    }
  }
  walk(base);
  assert.deepEqual(files.sort(), ['.app.json', '.codex-plugin/plugin.json', 'skills/ashare-quotes-connection/SKILL.md'].sort());
  const skill = readFileSync(resolve(base, 'skills/ashare-quotes-connection/SKILL.md'), 'utf8');
  assert.match(skill, /^---\r?\nname: ashare-quotes-connection\r?\ndescription: .+\r?\n---/);
  assert.match(skill, /probe:false/);
  assert.match(skill, /Git 安装不会自动授予私有 App 的权限/);
  for (const file of files) {
    const source = readFileSync(resolve(base, file), 'utf8');
    assert(!/BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/.test(source));
    assert(!/[A-Z]:[\\/]|https:\/\/[^\s"]+\.chatgpt\.site/.test(source));
  }
});
