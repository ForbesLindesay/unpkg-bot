import passport from 'passport';
import {Strategy as GitHubStrategy} from 'passport-github2';
import cookieSession from 'cookie-session';
import express from 'express';
import getLog from './console';
import {saveUser, getUsers} from './db';
import {addToken} from './read-client';
import processUser from './process-user';
import './process-all-users';

const app = express();

getUsers().done(users => {
  users.forEach(user => {
    addToken(user.accessToken);
  });
});

app.use(cookieSession({
  keys: [process.env.SESSION_KEY],
  // session expires after 1 hour
  maxAge: 60 * 60 * 1000,
  // session is not accessible from JavaScript
  httpOnly: true,
}));
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK || 'http://localhost:3000/auth/github/callback',
  },
  (accessToken, refreshToken, profile, done) => {
    addToken(accessToken);
    processUser(profile.username).done();
    saveUser(profile.username, accessToken).done(
      () => done(null, {username: profile.username, accessToken}),
      done,
    );
  }
));
app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/github', passport.authenticate('github', {scope: []}));

app.get('/auth/github/callback', passport.authenticate('github'), (req, res) => {
  res.redirect('/');
});
app.get('/auth/logout', passport.authenticate('github'), (req, res) => {
  res.logout();
  res.sendStatus(200);
});
app.get('/', (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/github');
  }
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(getLog().filter(Boolean).join('\n'));
});

app.listen(process.env.PORT || 3000);
