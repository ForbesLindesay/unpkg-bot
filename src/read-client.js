import github from 'github-basic';
import Promise from 'promise';

const tokens = [];
const clients = [];

export function addToken(token) {
  if (!tokens.includes(token)) {
    tokens.push(token);
    clients.push(github({version: 3, auth: token}));
  }
}

export function get(...args) {
  return new Promise((resolve, reject) => {
    function retry() {
      let maxRequestsRemaining = -1;
      let clientToUse = null;
      for (const client of clients) {
        if (client.rateLimit.remaining > maxRequestsRemaining) {
          maxRequestsRemaining = client.rateLimit.remaining;
          clientToUse = client;
        }
      }
      if (maxRequestsRemaining < 0) {
        console.warn('No clients available, waiting for a client to be added');
        setTimeout(retry, 5000);
        return;
      }
      clientToUse.get(...args).done(resolve, err => {
        if (err.statusCode === 403) {
          console.warn('Rate limit exceeded, waiting 5 seconds then trying again');
          setTimeout(retry, 5000);
        } else {
          reject(err);
        }
      });
    }
    retry();
  });
}
