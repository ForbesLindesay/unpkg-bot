import mongo from 'then-mongo';
import Promise from 'promise';

const db = mongo(process.env.MONGO_DB, ['users', 'maxUserIDProcessed', 'errors']);

export function saveUser(username, accessToken) {
  return db.users.update({_id: username}, {_id: username, username, accessToken}, {upsert: true});
}
export function getUsers() {
  return db.users.find();
}

export function getMaxUserIDProcessed() {
  return db.maxUserIDProcessed.findOne({_id: 'unpkg-bot'}).then(o => (o ? o.value : undefined));
}
export function setMaxUserIDProcessed(value) {
  if (process.env.NODE_ENV === 'production') {
    return db.maxUserIDProcessed.update({_id: 'unpkg-bot'}, {_id: 'unpkg-bot', value}, {upsert: true});
  } else {
    return Promise.resolve(null);
  }
}
export function pushError(username, repo, message) {
  return db.errors.insert({username, repo, message});
}
