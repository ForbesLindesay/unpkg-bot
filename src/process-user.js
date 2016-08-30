import getReposForUser from './get-repos-for-user';
import codemodRepo from './codemod-repo';

// codemod repos for a given user one at a time
export default function processUser(username) {
  return getReposForUser(username).then(repos => {
    console.log('process: ' + username);
    return new Promise((resolve, reject) => {
      function next(i) {
        if (i >= repos.length) {
          return resolve();
        }
        codemodRepo(repos[i]).done(() => next(i + 1), reject);
      }
      next(0);
    });
  });
}
