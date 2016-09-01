import {getMaxUserIDProcessed, setMaxUserIDProcessed, pushError} from './db';
import {get} from './read-client';
import processUser from './process-user';
import {error} from './console';

function getPage(since) {
  get('/users', {since}).done(users => {
    const maxID = users.reduce((id, user) => {
      return Math.max(id, user.id);
    }, since || -1);
    function next(i) {
      if (i >= users.length) {
        return setMaxUserIDProcessed(maxID).done(() => getPage(maxID));
      }
      processUser(users[i].login).done(
        () => next(i + 1),
      );
    }
    next(0);
  }, err => {
    error('Error getting users', err.stack);
    pushError(null, null, err.message || err).done(
      () => setTimeout(() => getPage(since), 5000),
    );
  });
}
getMaxUserIDProcessed().done(getPage);
