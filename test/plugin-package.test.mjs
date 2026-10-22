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
    assert(existsSync(resolve(target, 'plugin.json')));
    assert(existsSync(resolve(target, '.codex-plugin/plugin.json')));
    assert.equal(entry.name, JSON.parse(readFileSync(resolve(target, 'plugin.json'), 'utf8')).name);
    assert.equal(entry.policy.authentication, 'ON_INSTALL');
    assert(!Object.hasOwn(entry, 'pluginId'));
  }
});

test('Claude marketplace points to the same contained package', () => {
  const m = json('.claude-plugin/marketplace.json');
  assert.equal(m.plugins.length, 1);
  assert.equal(m.plugins[0].name, 'ashare-live-quotes');
  assert(existsSync(resolve(root, m.plugins[0].source, '.claude-plugin/plugin.json')));
});

test('portable and compatibility manifests agree and resolve a required app dependency', () => {
  const base = 'plugins/ashare-live-quotes/';
  const portable = json(base + 'plugin.json');
  const compatibility = json(base + '.codex-plugin/plugin.json');
  const openai = portable.extensions['com.openai'];
  for (const key of ['name', 'version', 'description', 'author']) assert.deepEqual(portable[key], compatibility[key]);
  assert.deepEqual(openai.interface, compatibility.interface);
  assert([...openai.interface.shortDescription].length <= 30);
  assert.equal(openai.apps, './.app.json');
  assert.equal(compatibility.apps, openai.apps);
  const apps = json(base + openai.apps).apps;
  assert.equal(Object.keys(apps).length, 1);
  const app = Object.values(apps)[0];
  assert.match(app.id, /^asdk_app_[a-z0-9_]+$/);
  assert.equal(app.required, true);
  assert(!Object.hasOwn(portable, 'apps'));
  assert(!existsSync(resolve(root, base, 'mcp.json')));
  assert(!existsSync(resolve(root, base, '.mcp.json')));
});

test('package has two reading skills, one stdlib quote script and no private payload', () => {
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
  assert.deepEqual(files.sort(), ['.app.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'plugin.json',
    'skills/ashare-quotes-connection/SKILL.md', 'skills/ashare-public-quotes/SKILL.md',
    'skills/ashare-public-quotes/scripts/quote.py'].sort());
  const claude = JSON.parse(readFileSync(resolve(base, '.claude-plugin/plugin.json'), 'utf8'));
  const portable = JSON.parse(readFileSync(resolve(base, 'plugin.json'), 'utf8'));
  assert.equal(claude.name, portable.name);
  assert.equal(claude.version, portable.version);
  const pub = readFileSync(resolve(base, 'skills/ashare-public-quotes/SKILL.md'), 'utf8');
  assert.match(pub, /^---\r?\nname: ashare-public-quotes\r?\ndescription: .+\r?\n---/);
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
