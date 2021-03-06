/*
 * Copyright (c) 2019 One Hill Technologies, LLC
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

const { Service, model, ForbiddenError, BadRequestError } = require ('@onehilltech/blueprint');
const { union, get } = require ('lodash');

const {
  Types: { ObjectId }
} = require ('@onehilltech/blueprint-mongodb');

const moment = require ('moment');

/**
 * @class GatekeeperService
 *
 * The service allows clients to perform system-level operations related to
 * authentication and authorization.
 */
module.exports = Service.extend ({
  Account: model ('account'),

  Client: model ('client'),

  UserToken: model ('user-token'),

  _tokenGenerator: null,

  _refreshTokenGenerator: null,

  start () {
    const gatekeeper = this.app.lookup ('service:gatekeeper');
    this._tokenGenerator = gatekeeper.getTokenGenerator ('gatekeeper:access_token');
    this._refreshTokenGenerator = gatekeeper.getTokenGenerator ('gatekeeper:refresh_token');
  },

  /**
   * Find the account by its username.
   *
   * @param username
   */
  findAccountByUsername (username) {
    return this.Account.findOne ({username});
  },

  /**
   * Find the account by its email.
   *
   * @param email
   */
  findAccountByEmail (email) {
    return this.Account.findOne ({email});
  },

  /**
   * Issue a token for the account on the specified client.
   *
   * @param clientId        Hosting client
   * @param account         The account model
   * @param opts            Additional options
   */
  issueToken (clientId, account, opts = {}) {
    // If the client has an black and white list, then we need to make sure the
    // account is not in the black list and is in the white list.

    const { origin, refreshable = true, scope = [], payload } = opts;

    if (account.enabled !== true)
      return Promise.reject (new BadRequestError ('account_disabled', 'The account is disabled.'));

    if (account.is_deleted)
      return Promise.reject (new BadRequestError ('account_deleted', 'The account no longer exists.'));

    return this._findClient (clientId).then (client => {
      if (!client)
        return Promise.reject (new BadRequestError ('invalid_client', 'The client does not exist.'));

      if (!client.enabled)
        return Promise.reject (new ForbiddenError ('client_disabled', 'The client is disabled.'));

      if (client.is_deleted)
        return Promise.reject (new BadRequestError ('client_deleted', 'The client has been deleted.'));

      if (!client.allowed (account))
        return Promise.reject (new ForbiddenError ('unauthorized_account', 'Your account cannot access this client.'));

      // Make sure the account is able to access the client.

      const doc = {
        client : client._id,
        account: account._id,
        scope  : union (client.scope, account.scope, scope)
      };

      if (refreshable)
        doc.refresh_token = new ObjectId ();

      if (client.expiration)
        doc.expiration = client.computeExpiration ();

      // Bind the token to the origin if present. The origin is used by other parts
      // of the framework to ensure the token is not been hijacked.

      if (!!origin)
        doc.origin = origin;

      if (!!payload)
        doc.payload = payload;

      return this.UserToken.create (doc);
    });
  },

  serializeToken (token) {
    return token.serialize (this._tokenGenerator, this._refreshTokenGenerator)
      .then (token => Object.assign ({token_type: 'Bearer'}, token));
  },

  _findClient (client) {
    // We need to locate the account for the username, and check that the
    // provided password is correct. We also need to make sure the account
    // has not been disabled before we create the token.

    const collectionName = get (client, 'collection.name');

    if (collectionName === 'gatekeeper_clients')
      return Promise.resolve (client);

    return this.Client.findById (client).then (client => {
      if (!client)
        return Promise.reject (new BadRequestError ('invalid_client', 'The client does not exist.'));

      if (client.enabled !== true)
        return Promise.reject (new BadRequestError ('client_disabled', 'The client is disabled.'));

      return client;
    });
  },
});
