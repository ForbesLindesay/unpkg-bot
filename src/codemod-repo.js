import fs from 'fs';
import Promise from 'promise';
import github from 'github-basic';
import gethub from 'gethub';
import rimraf from 'rimraf';
import lsr from 'lsr';
import throat from 'throat';
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

function codemodRepo(fullName) {
  const [owner, name] = fullName.split('/');

  return client.exists('npmcdn-to-unpkg-bot', name).then(exists => {
    if (exists) {
      return;
    }
    console.log('Code modding ' + fullName);
    return rm(directory).then(() => {
      console.log('downloading ' + fullName);
      return gethub(owner, name, 'master', directory);
    }).then(() => {
      console.log('fetched ' + fullName);
      return lsr(directory);
    }).then(entries => {
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
          });
        }
      }));
    }).then(updates => {
      updates = updates.filter(Boolean);
      if (updates.length === 0) {
        console.log('codemod resulted in no changes');
        return;
      }
      console.log('forking ' + fullName);
      return client.fork(owner, name).then(() => {
        console.log('branching ' + fullName);
        return client.branch('npmcdn-to-unpkg-bot', name, 'master', 'npmcdn-to-unpkg');
      }).then(() => {
        console.log('committing ' + fullName);
        return client.commit('npmcdn-to-unpkg-bot', name, {
          branch: 'npmcdn-to-unpkg',
          message: 'Replace npmcdn.com with unpkg.com',
          updates,
        });
      }).then(() => {
        console.log('submitting pull request ' + fullName);
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
        console.log('codemod complete');
      });
    });
  }).then(null, err => {
    console.error('Error processing ' + fullName);
    console.error(err.stack);
    return pushError(owner, name, err.message || err);
  });
}

// only allow codemodding one repo at a time
export default throat(Promise)(1, codemodRepo);
