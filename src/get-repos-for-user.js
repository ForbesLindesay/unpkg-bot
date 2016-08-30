import Promise from 'promise';
import {get} from './read-client';

export default function getReposForUser(username) {
  return new Promise((resolve, reject) => {
    const repos = [];
    processPage(get('/search/code', {q: 'npmcdn user:' + username}));
    function processPage(page) {
      page.done(p => {
        p.items.forEach(item => {
          const repo = item.repository.full_name;
          if (!repos.includes(repo)) {
            repos.push(repo);
          }
        });
        if (p.urlNext) {
          processPage(get(p.urlNext));
        } else {
          resolve(repos);
        }
      }, reject);
    }
  });
}
