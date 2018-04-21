/*
 * Copyright (c) 2018 One Hill Technologies, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const async     = require ('async');
const blueprint   = require ('@onehilltech/blueprint');
const mongodb     = require ('@onehilltech/blueprint-mongodb');
const ObjectId    = mongodb.Types.ObjectId;
const HttpError   = blueprint.HttpError;
const UserToken   = require ('../../models/user-token');
const AccessToken = require ('../../models/access-token');

let serializer = require ('../../middleware/serializers') (blueprint.app.configs.gatekeeper.token)

/**
 * Policies for granting an access token based on password.
 *
 * @param req
 * @param callback
 */
function policies (req, callback) {
  const refreshToken = req.body.refresh_token;

  async.waterfall ([
    function (callback) {
      serializer.verifyToken (refreshToken, {}, function (err, payload) {
        if (!err)
          return callback (null, payload);

        // Process the error message. We have to check the name because the error
        // could be related to token verification.
        if (err.name === 'TokenExpiredError')
          return callback (new HttpError (401, 'token_expired', 'Token has expired'));

        if (err.name === 'JsonWebTokenError')
          return callback (new HttpError (403, 'invalid_token', err.message));
      });
    },

    function (payload, callback) {
      let filter = {refresh_token: new ObjectId (payload.jti), client: req.client._id};
      AccessToken.findOne (filter).populate ('client account').exec (callback);
    },

    function (accessToken, callback) {
      if (!accessToken)
        return callback (new HttpError (400, 'invalid_token', 'Unknown refresh token'));

      if (!accessToken.client.enabled)
        return callback (new HttpError (403, 'client_disabled', 'Client is disabled'));

      // Check the state of the account.
      if (!accessToken.account.enabled)
        return callback (new HttpError (400, 'account_disabled', 'Account is disabled'));

      req.accessToken = accessToken;

      return callback (null, true);
    }
  ], callback);
}

function createToken (req, callback) {

  // Let's remove the old token because it is no longer valid, and replace
  // it with a new access token.

  async.waterfall ([
    function (callback) {
      const {accessToken} = req;
      accessToken.remove (callback);
    },

    function (accessToken, callback) {
      const doc = {
        client : accessToken.client._id,
        account: accessToken.account._id,
        scope  : accessToken.scope,
        origin : accessToken.origin,
        refresh_token: new ObjectId ()
      };

      UserToken.create (doc, callback);
    }
  ], callback);
}

module.exports = {
  createToken,
  policies
};
