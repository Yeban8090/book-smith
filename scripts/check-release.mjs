import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const pkg = read('package.json');
const manifest = read('manifest.json');
const lock = read('package-lock.json');
const versions = read('versions.json');
assert.equal(manifest.version, pkg.version, 'manifest 与 package 版本必须一致');
assert.equal(lock.version, pkg.version, '锁文件版本必须一致');
assert.equal(lock.packages[''].version, pkg.version, '锁文件根项目版本必须一致');
assert.equal(versions[pkg.version], manifest.minAppVersion, '最低 Obsidian 版本映射必须一致');
assert.equal(manifest.isDesktopOnly, false, '写作功能允许移动端加载，PDF 导出在运行时限制为桌面端');
console.log(`Release configuration OK: ${pkg.version}`);
