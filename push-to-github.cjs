const git = require('/home/runner/workspace/node_modules/isomorphic-git/index.cjs');
const http = require('/home/runner/workspace/node_modules/isomorphic-git/http/node/index.cjs');
const fs = require('fs');

const dir = '/home/runner/workspace';
const PAT = process.env.GITHUB_PAT;
const repoUrl = 'https://github.com/IPlayInHD/Property-intelligence.git';

if (!PAT) {
  console.error('GITHUB_PAT not set');
  process.exit(1);
}

console.log('PAT available: yes');

async function run() {
  try {
    await git.addRemote({ fs, dir, remote: 'origin', url: repoUrl });
    console.log('Remote origin added');
  } catch (e) {
    if (e.code === 'RemoteAlreadyExists') {
      await git.setConfig({ fs, dir, path: 'remote.origin.url', value: repoUrl });
      console.log('Remote origin updated to', repoUrl);
    } else {
      throw e;
    }
  }

  console.log('Pushing to GitHub...');
  const result = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    onAuth: () => ({ username: 'IPlayInHD', password: PAT }),
    onProgress: (evt) => {
      if (evt.phase) process.stdout.write(`\r  ${evt.phase} ${evt.loaded || ''}/${evt.total || ''}    `);
    },
    onMessage: (msg) => console.log('remote:', msg.trim()),
  });

  console.log('\nPush complete:', JSON.stringify(result, null, 2));
}

run().catch((err) => {
  console.error('Push failed:', err.message || err);
  process.exit(1);
});
