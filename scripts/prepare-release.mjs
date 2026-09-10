import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = (process.env.REQUESTED_VERSION || '').replace(/^v/, '');
const numeric = '(?:0|[1-9][0-9]*)';
const identifier = `(?:${numeric}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(
  `^${numeric}\\.${numeric}\\.${numeric}(?:-${identifier}(?:\\.${identifier})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`
);
if (!semver.test(version) || version !== pkg.version)
  throw new Error('Requested semantic version must match package.json');
if (pkg.name !== 'datatables.net-AltEditor')
  throw new Error('Unexpected package name');
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if (lock.version !== version || lock.packages[''].version !== version)
  throw new Error('package-lock.json version must match package.json');
const lines = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);
const start = lines.findIndex((line) => {
  const match = /^## (?:\[([^\]]+)\]|(\S+))(?:\s|$)/.exec(line);
  return match && (match[1] || match[2]) === version;
});
if (start < 0) throw new Error(`Missing changelog entry for ${version}`);
let end = lines.findIndex((line, index) => index > start && /^## /.test(line));
if (end < 0) end = lines.length;
const notes = lines
  .slice(start + 1, end)
  .join('\n')
  .trim();
if (!notes) throw new Error('Release notes must not be empty');
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/release-notes.md', notes + '\n');
if (process.env.GITHUB_ENV)
  appendFileSync(
    process.env.GITHUB_ENV,
    `VERSION=${version}\nTAG_NAME=v${version}\nPACKAGE_TARBALL=${pkg.name}-${version}.tgz\n`
  );
console.log(`Prepared release notes for v${version}`);
