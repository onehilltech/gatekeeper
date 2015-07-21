var passport    = require ('passport')
  , express     = require ('express')
  , winston     = require ('winston')
  , oauth2orize = require ('oauth2orize')
  , util       = require ('util')
  ;

var AccessToken     = require ('../../models/oauth2/accessToken')
  , Account         = require ('../../models/account')
  , RefreshableGrantRouter = require ('./refreshableGrantRouter')
  ;

passport.use (require ('../../authentication/client') ());

const NAME = 'password';

/**
 * @class PasswordRouter
 *
 * @param opts
 * @param server
 * @constructor
 */
function PasswordRouter (opts, server) {
  RefreshableGrantRouter.call (this, NAME, opts, server);

  var self = this;

  this._server.exchange (NAME,
    oauth2orize.exchange.password (function (client, username, password, scope, done) {
      // First, verify the user's password. Once we have verified the password, we can issue
      // an access token for this user.
      winston.log ('info', 'client %s authenticating password for %s', client.id, username);

      Account.authenticate (username, password, function (err, account) {
        if (err)
          return done (new oauth2orize.TokenError (err.message, 'invalid_client'));

        winston.log('info', 'client %s generating access/refresh token for %s', client.id, username);
        AccessToken.generateAndSave (self._tokenLength, client.id, account.id, done);
      });
    }));
}

util.inherits (PasswordRouter, RefreshableGrantRouter);

/**
 * Get the Express.js router for this router abstraction.
 *
 * @returns {*}
 */
PasswordRouter.prototype.appendRouter = function (router) {
  // The flow for this authentication is:
  //
  // (1) authorize the trusted client
  // (2) exchange the credentials for an access token
  router.post ('/oauth2/password',
    [
      passport.authenticate (['oauth2-client', 'oauth2-client-password'], { session : false }),
      this._server.token (),
      this._server.errorHandler ()
    ]
  );
}

PasswordRouter.prototype.getRefreshTokenAuthenticateStrategy = function () {
  return 'oauth2-client';
}

module.exports = exports = function (opts, server) {
  return new PasswordRouter (opts, server);
};