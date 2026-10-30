/* Fail closed on suspicious secret filenames and obvious credential assignments.
   This is a helpful guardrail, not a guarantee against all secrets. */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const staged = process.argv.includes('--staged');
const blockedName = /^(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?|\.npmrc|credentials\.json|service-account[^/]*\.json|.*\.(?:pem|key|p12|pfx|jks|keystore|secret|secrets))$/i;
const blockedDirs = new Set(['.git', 'node_modules', '.wrangler', 'dist', 'build', 'coverage']);
const credentialMatchers = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\b(?:CF_API_TOKEN|CLOUDFLARE_API_TOKEN|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|GH_TOKEN|DATABASE_URL|JWT_SECRET)\s*[:=]\s*['\"]?[^'\"\s;]{8,}/i,
];
let files = [];
if (staged) {
  const result = cp.spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { cwd: root, encoding: 'buffer' });
  if (result.status !== 0) { console.error('Could not inspect Git staged files.'); process.exit(1); }
  files = result.stdout.toString('utf8').split('\0').filter(Boolean);
} else {
  function walk(dir, prefix = '') {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!blockedDirs.has(e.name)) walk(path.join(dir, e.name), path.join(prefix, e.name)); }
      else if (e.isFile()) files.push(path.join(prefix, e.name));
    }
  }
  walk(root);
}
let failed = false;
for (const relative of files) {
  const filePath = path.join(root, relative);
  const name = path.basename(relative);
  const isBlockedName = blockedName.test(name);
  if (isBlockedName) {
    // Local excluded secrets are expected in an unstaged working tree; don't block those.
    if (staged) { console.error('BLOCKED sensitive file staged: ' + relative); failed = true; }
    continue;
  }
  if (!fs.existsSync(filePath)) continue;
  const stat = fs.statSync(filePath);
  if (stat.size > 1024 * 1024 || /\.(?:png|webp|jpg|jpeg|gif|ico|swf|zip|woff2?|ttf|otf)$/i.test(name)) continue;
  const data = fs.readFileSync(filePath, 'utf8');
  if (credentialMatchers.some(re => re.test(data))) {
    console.error('Possible credential found in: ' + relative + ' (value not displayed)');
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('Secret-safety scan passed (' + (staged ? 'staged files' : 'project files') + ').');
