import throat from 'throat';
import Promise from 'promise';
import {getMaxUserIDProcessed, setMaxUserIDProcessed, pushError} from './db';
import {get} from './read-client';
import processUser from './process-user';
import {error} from './console';

function getPage(since) {
  get('/users', {since}).done(users => {
    const maxID = users.reduce((id, user) => {
      return Math.max(id, user.id);
    }, since || -1);
    Promise.all(users.map(throat(Promise)(10, user => processUser(user.login)))).then(() => {
      return setMaxUserIDProcessed(maxID);
    }).done(() => getPage(maxID));
  }, err => {
    error('Error getting users', err.stack);
    pushError(null, null, err.message || err).done(
      () => setTimeout(() => getPage(since), 5000),
    );
  });
}
getMaxUserIDProcessed().done(getPage);
