import { readFileSync, writeFileSync } from 'node:fs';

const packageUrl = new URL('./package.json', import.meta.url);
const manifestUrl = new URL('./manifest.json', import.meta.url);
const versionsUrl = new URL('./versions.json', import.meta.url);

const { version } = JSON.parse(readFileSync(packageUrl, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
const versions = JSON.parse(readFileSync(versionsUrl, 'utf8'));

manifest.version = version;
versions[version] = manifest.minAppVersion;

writeFileSync(manifestUrl, `${JSON.stringify(manifest, null, '\t')}\n`);
writeFileSync(versionsUrl, `${JSON.stringify(versions, null, 2)}\n`);
