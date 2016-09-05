import fs from 'fs';
import Promise from 'promise';
import github from 'github-basic';
import gethub from 'gethub';
import rimraf from 'rimraf';
import lsr from 'lsr';
import throat from 'throat';
import {log, error} from './console';
import {pushError} from './db';

const client = github({version: 3, auth: process.env.GITHUB_BOT_TOKEN});

const readFile = Promise.denodeify(fs.readFile);
const rm = Promise.denodeify(rimraf);
const directory = __dirname + '/../temp';

// TODO: client.exists doesn't work because http-basic does not work with head requests that also support gzip
client.exists = function (owner, repo) {
  return this.get('/repos/:owner/:repo', {owner, repo}).then(
    () => true,
    () => false,
  );
};

if (process.env.NODE_ENV !== 'production') {
  console.log('===== DRY RUN =====');
  console.log('');
  console.log('To actually run code-mod, set NODE_ENV=production');
  console.log('');
  client.exists = () => Promise.resolve(false);
  [
    'fork',
    'branch',
    'commit',
    'pull',
  ].forEach(method => {
    client[method] = () => Promise.resolve(null);
  });
}

const blackList = [
  'qdot/gecko-hg',
  'angular/code.angularjs.org',
  'Belxjander/tenfourfox',
  'tijuca/icedove',
  'jsdelivr/jsdelivr',
];
function codemodRepo(fullName) {
  if (blackList.includes(fullName)) {
    return Promise.resolve(null);
  }
  const [owner, name] = fullName.split('/');

  return client.exists('npmcdn-to-unpkg-bot', name).then(exists => {
    if (exists) {
      return;
    }
    log('Code Modding', fullName);
    return rm(directory).then(() => {
      log('Downloading', fullName);
      return gethub(owner, name, 'master', directory);
    }).then(() => {
      log('Fetched', fullName);
      return lsr(directory);
    }).then(entries => {
      log('Processing Files', fullName);
      return Promise.all(entries.map(entry => {
        if (entry.isFile()) {
          return readFile(entry.fullPath, 'utf8').then(content => {
            const newContent = content.replace(/\bnpmcdn\b/g, 'unpkg');
            if (newContent !== content) {
              return {
                path: entry.path.substr(2), // remove the `./` that entry paths start with
                content: newContent,
              };
            }
          }, err => {
            if (err.code === 'ENOENT') {
              return;
            }
            throw err;
          });
        }
      }));
    }).then(updates => {
      updates = updates.filter(Boolean);
      if (updates.length === 0) {
        log('No Changes Made', fullName);
        return;
      }
      log('Forking', fullName);
      return client.fork(owner, name).then(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
      }).then(() => {
        log('Branching', fullName);
        return client.branch('npmcdn-to-unpkg-bot', name, 'master', 'npmcdn-to-unpkg');
      }).then(() => {
        log('Committing', fullName);
        return client.commit('npmcdn-to-unpkg-bot', name, {
          branch: 'npmcdn-to-unpkg',
          message: 'Replace npmcdn.com with unpkg.com',
          updates,
        });
      }).then(() => {
        log('Submitting Pull Request', fullName);
        return client.pull(
          {user: 'npmcdn-to-unpkg-bot', repo: name, branch: 'npmcdn-to-unpkg'},
          {user: owner, repo: name},
          {
            title: 'Replace npmcdn.com with unpkg.com',
            body: (
              'To avoid potential naming conflicts with npm, npmcdn.com is being renamed to unpkg.com. This is an ' +
              'automated pull request to update your project to use the new domain.'
            ),
          },
        );
      }).then(() => {
        log('Codemod Complete', fullName);
      });
    });
  }).then(null, err => {
    error('Error processing ' + fullName, err.stack);
    return pushError(owner, name, err.message || err);
  });
}

// only allow codemodding one repo at a time
export default throat(Promise)(1, codemodRepo);
