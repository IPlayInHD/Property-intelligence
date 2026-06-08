import git from '/home/runner/workspace/node_modules/isomorphic-git/index.cjs' assert { type: 'json' };

// Use dynamic require for CJS modules
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const gitLib = require('/home/runner/workspace/node_modules/isomorphic-git/index.cjs');
const http = require('/home/runner/workspace/node_modules/isomorphic-git/http/node/index.cjs');

const dir = '/home/runner/workspace';
const PAT = process.env.GITHUB_PAT;
const repoUrl = 'https://github.com/IPlayInHD/Property-intelligence.git';

if (!PAT) {
  console.error('GITHUB_PAT not set');
  process.exit(1);
}

console.log('PAT available: yes');

// Set remote origin
try {
  await gitLib.addRemote({ fs, dir, remote: 'origin', url: repoUrl });
  console.log('Remote origin added');
} catch (e) {
  if (e.code === 'RemoteAlreadyExists') {
    await gitLib.setConfig({ fs, dir, path: 'remote.origin.url', value: repoUrl });
    console.log('Remote origin updated');
  } else {
    throw e;
  }
}

// Push main branch
console.log('Pushing to GitHub...');
const result = await gitLib.push({
  fs,
  http,
  dir,
  remote: 'origin',
  ref: 'main',
  onAuth: () => ({ username: 'IPlayInHD', password: PAT }),
  onProgress: (evt) => {
    if (evt.phase) process.stdout.write(`\r${evt.phase} ${evt.loaded||''}/${evt.total||''}`);
  },
  onMessage: (msg) => console.log('MSG:', msg),
});

console.log('\nPush result:', JSON.stringify(result, null, 2));
process.exit(0);
