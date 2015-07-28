var winston     = require ('winston')
  , uid         = require ('uid-safe')
  , oauth2orize = require ('oauth2orize')
  ;

var Client      = require ('../models/oauth2/client')
  , AccessToken = require ('../models/oauth2/accessToken')
  , Account     = require ('../models/account')
  ;

const TOKEN_LENGTH  = 128;
const SECRET_LENGTH = 48;

function Oauth2Controller (models) {
  var self = this;

  this._accountModel = models[Account.modelName];
  this._accessTokenModel = models[AccessToken.modelName];
  this._clientModel = models[Client.modelName];
  this._server = oauth2orize.createServer ();

  // Define the client serialization and deserialization methods. This will only
  // be used for grant types that require a session.
  this._server.serializeClient (function (client, done) {
    return done (null, client.id);
  });

  this._server.deserializeClient (function (id, done) {
    self._clientModel.findById (id, done);
  });

  function initializeExchanges () {
    winston.info ('initializing exchange: password');
    self._server.exchange ('password', oauth2orize.exchange.password (function (client, username, password, scope, done) {
      winston.log ('info', 'client %s: exchanging username/password for access token [user=%s]', client.id, username);

      self._accountModel.authenticate (username, password, function (err, account) {
        if (err)
          return done (new oauth2orize.TokenError (err.message, 'invalid_client'));

        winston.log('info', 'client %s generating access/refresh token for %s', client.id, username);
        self._accessTokenModel.newUserToken (TOKEN_LENGTH, client.id, account.id, done);
      });
    }));

    // Configure the client_credentials exchange.
    winston.info ('initializing exchange: client_credentials');
    self._server.exchange ('client_credentials', oauth2orize.exchange.clientCredentials (function (client, scope, body, done) {
      // We do not care about the client parameter. This is because the body
      // has the credentials we need to find and validate the client.
      if (!body.client_id)
        return done (new oauth2orize.AuthorizationError ('body is missing client_id', 'invalid_request'));

      if (!body.client_secret)
        return done (new oauth2orize.AuthorizationError ('body is missing client_secret', 'invalid_request'));

      var clientId = body.client_id;

      // Locate the client in the body of the message.
      winston.log ('info', 'client %s: exchanging client credentials for access token', clientId);
      self._clientModel.findById (clientId, function (err, client) {
        if (err)
          return done (err);

        if (!client)
          return done (new oauth2orize.AuthorizationError ('client id is invalid', 'invalid_request'));

        // Validate the client credentials.
        if (client.secret !== body.client_secret)
          return done (new oauth2orize.AuthorizationError ('client secret does not match', 'access_denied'));

        // Create a new access token for the client. If one already exists, then overwrite
        // the old access token with a new access token.
        winston.info ('client %s: creating access token for client', clientId);
        self._accessTokenModel.newClientToken (TOKEN_LENGTH, client, scope, function (err, accessToken) {
          if (err)
            return done (err);

          return done (null, accessToken.token);
        });
      });
    }));

    winston.info ('initializing exchange: refresh_token');
    self._server.exchange ('refresh_token', oauth2orize.exchange.refreshToken (function (client, refresh_token, scope, done) {
      // Locate the original access token that corresponds to this refresh
      // token. If we cannot find the original access token, then we need to
      // return an error to the user.
      winston.log ('info', 'client %s: refreshing access token', client.id);
      self._accessTokenModel.refresh (TOKEN_LENGTH, client.id, refresh_token, function (err, accessToken, refreshToken) {
        if (err)
          return done (new oauth2orize.TokenError ('Failed to refresh token', 'invalid_request'));

        return done (err, accessToken, refreshToken);
      });
    }));
  }

  initializeExchanges ();
}

Oauth2Controller.prototype.lookupClientByParam = function () {
  var self = this;

  return function (req, res, next, clientId) {
    winston.info ('searching for client ' + clientId);

    self._clientModel.findById (clientId, function (err, client) {
      if (err)
        return next (err);

      if (!client)
        return next (new Error ('Client does not exist'));

      req.client = client;
      return next ();
    });
  };
};

Oauth2Controller.prototype.lookupTokenByParam = function () {
  var self = this;

  return function (req, res, next, tokenId) {
    winston.info ('searching for token ' + tokenId);

    self._accessTokenModel.findById (tokenId, function (err, token) {
      if (err)
        return next (err);

      if (!token)
        return next (new Error ('token does not exist'))

      req.token = token;
      next ();
    });
  };
};

Oauth2Controller.prototype.logoutUser = function () {
  var self = this;

  return [
    passport.authenticate ('bearer', {session : false}),
    function (req, res) {
      self._accessTokenModel.findByIdAndRemove (req.authInfo.token_id, function (err) {
        return res.status (200).send (err ? false : true);
      });
    }
  ];
};

Oauth2Controller.prototype.grantToken = function () {
  var self = this;

  return [
    self._server.token (),
    self._server.errorHandler ()
  ];
};

Oauth2Controller.prototype.deleteClient = function () {
  return function (req, res) {
    if (!req.client)
      return res.status (404).send ();

    var client = req.client;
    client.remove (function (err) {
      return res.send (200, err ? false : true);
    });
  };
};

Oauth2Controller.prototype.refreshSecret = function () {
  return function (req, res) {
    if (!req.client)
      return res.status (404).send ();

    var newSecret = uid.sync (SECRET_LENGTH);
    var client = req.client;

    // Update the secret, save it, and return it to the client.
    client.secret = newSecret;
    client.save (function (err) {
      return res.status (200).send (newSecret);
    });
  };
}

Oauth2Controller.prototype.updateClient = function () {
  return function (req, res) {
    if (!req.client)
      return res.status (404).send ();

    var client = req.client;
    client.name = req.body.name;
    client.redirect_uri = req.body.redirect_uri;
    client.email = req.body.email;

    client.save (function (err) {
      res.status (200).send (err ? false : true);
    });
  }
};

Oauth2Controller.prototype.enableClient = function () {
  return function (req, res) {
    if (!req.client)
      return res.status (404).send ();

    req.checkBody ('enabled', 'Enabled is a required Boolean').notEmpty ().isBoolean ();

    var errors = req.validationErrors ();

    if (errors)
      return res.status (400).send (errors);

    // Sanitize the parameters.
    req.sanitizeBody ('enabled').toBoolean ();

    // Update the client, and save it.
    var client = req.client;
    client.enabled = req.body.enabled;

    client.save (function (err) {
      res.status (200).send (err ? false : true);
    });
  };
};

Oauth2Controller.prototype.enableToken = function () {
  return function (req, res) {
    if (!req.token)
      return res.status (404).send ();

    req.checkBody ('enabled', 'Enabled is a required Boolean').notEmpty ().isBoolean ();

    var errors = req.validationErrors ();

    if (errors)
      return res.status (400).send (errors);

    // Sanitize the parameters.
    req.sanitizeBody ('enabled').toBoolean ();

    // Update the client, and save it.
    var token = req.token;
    winston.info ('enabling access token %s [state=%s]', token.id, req.body.enabled);

    token.enabled = req.body.enabled;
    token.save (function (err) {
      if (err)
        winston.error (err);

      res.status (200).send (err ? false : true);
    });
  };
};

Oauth2Controller.prototype.deleteToken = function () {
  return function (req, res) {
    if (!req.token)
      return res.status (404).send (false);

    var token = req.token;
    winston.info ('deleting access token %s', token.id);

    token.remove (function (err) {
      return res.status (200).send (err ? false : true);
    });
  };
};

exports = module.exports = Oauth2Controller;
