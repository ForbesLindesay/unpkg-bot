import {readFileSync} from 'fs';
import {createHash} from 'crypto';
import passport from 'passport';
import {Strategy as GitHubStrategy} from 'passport-github2';
import cookieSession from 'cookie-session';
import express from 'express';
import prepareResponse from 'prepare-response';
import {getLog} from './console';
import {saveUser, getUsers, getMaxUserIDProcessed} from './db';
import {addToken, getRateLimitStatus} from './read-client';
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

app.get('/ajax', (req, res, next) => {
  getMaxUserIDProcessed().done(maxUserIDProcessed => {
    res.json({maxUserIDProcessed, log: getLog().filter(Boolean), rateLimits: getRateLimitStatus()});
  }, next);
});
let hash = 'development';
if (process.env.NODE_ENV !== 'production') {
  app.get('/client/' + hash + '.js', require('browserify-middleware')(__dirname + '/client.js', {
    transform: [require('babelify')],
  }));
} else {
  const src = readFileSync(__dirname + '/bundle.js');
  const response = prepareResponse(src, {
    'content-type': 'js',
    'cache-control': '1 year',
  });
  hash = createHash('md5').update(src).digest("hex");
  app.get('/client/' + hash + '.js', (req, res, next) => {
    response.send(req, res, next);
  });
}

app.get('/', (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/github');
  }
  res.send(
    `
      <meta charset="utf-8">
      <title>Code Mod</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        .bar-chart {
          display: flex;
          flex-direction: column;
          height: 600px;
        }
        .bar-chart-bar {
          display: flex;
          flex-direction: row-reverse;
          flex-basis: 0;
          padding: 2px;
          flex-grow: 1;
        }
        .bar-chart-stats {
          display: none;
        }
        @media (min-width: 1000px) {
          .bar-chart {
            flex-direction: row;
            height: 150px;
          }
          .bar-chart-bar {
            flex-direction: column;
          }
          .bar-chart-stats {
            display: block;
          }
        }
      </style>
      <div id="container"></div>
      <script src="/client/${hash}.js"></script>
    `
  );
});

app.listen(process.env.PORT || 3000);
