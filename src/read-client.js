import github from 'github-basic';
import Promise from 'promise';
import deck from 'deck';
import {warn} from './console';

const tokens = [];
const clients = [];

export function addToken(token) {
  if (!tokens.includes(token)) {
    tokens.push(token);
    clients.push(github({version: 3, auth: token}));
  }
}
export function getRateLimitStatus() {
  return clients.map(client => client.rateLimit);
}

export function get(...args) {
  return new Promise((resolve, reject) => {
    function retry() {
      if (clients.length === 0) {
        warn('No clients available, waiting for a client to be added');
        setTimeout(retry, 5000);
        return;
      }
      const clientWeights = {};
      for (let i = 0; i < clients.length; i++) {
        clientWeights[i] = clients[i].rateLimit.remaining || 1;
      }
      const clientToUse = clients[deck.pick(clientWeights)];
      clientToUse.get(...args).done(resolve, err => {
        if (err.statusCode === 401) {
          console.error('=====================');
          console.error(err.stack);
          console.dir(clientToUse);
          console.error('=====================');
          setTimeout(retry, 1000);
        } else if (err.statusCode === 403) {
          warn('Rate limit exceeded, waiting 1 second then trying again');
          setTimeout(retry, 1000);
        } else {
          reject(err);
        }
      });
    }
    retry();
  });
}
