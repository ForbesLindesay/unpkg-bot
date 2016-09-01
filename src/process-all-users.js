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
        err => {
          error('Error processing ' + users[i].login, err.stack);
          pushError(users[i].login, null, err.message || err).done(
            () => next(i + 1),
          );
        }
      );
    }
    next(0);
  });
}
getMaxUserIDProcessed().done(getPage);
