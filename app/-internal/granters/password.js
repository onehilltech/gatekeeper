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

const Granter = require ('../granter');

const {
  model,
  service,
  BadRequestError
} = require ('@onehilltech/blueprint');

const {
  union
} = require ('lodash');

const {
  Types: {
    ObjectId
  }
} = require ('@onehilltech/blueprint-mongodb');

const ModelVisitor = require ('../../models/-visitor');

const SCHEMA_ANDROID_CLIENT = {
  package: {
    in: 'body',
    isLength: {
      options: { min: 1 },
      errorMessage: 'This field is required.'
    }
  }
};

const SCHEMA_RECAPTCHA_CLIENT = {
  recaptcha: {
    in: 'body',
    isLength: {
      options: {min: 1},
      errorMessage: 'This field is required.'
    }
  }
};

/**
 * @class Password
 *
 * Granter for the password strategy.
 */
module.exports = Granter.extend ({
  /// Name of the granter.
  name: 'password',

  /// The account model definition.
  Account: model ('account'),

  /// The user token definition.
  UserToken: model ('user-token'),

  /// The service for verifying reCAPTCHA.
  recaptcha: service (),

  init () {
    this._super.call (this, ...arguments);
  },

  schemaFor (client) {
    let v = new ModelVisitor ({
      schema: null,

      visitAndroidClient () {
        this.schema = SCHEMA_ANDROID_CLIENT;
      },

      visitRecaptchaClient () {
        this.schema = SCHEMA_RECAPTCHA_CLIENT;
      }
    });

    client.accept (v);

    return v.schema;
  },

  /**
   * Create the UserToken for the request.
   *
   * @param req
   * @returns {doc}
   */
  createToken (req) {
    const {gatekeeperClient} = req;

    // We need to locate the account for the username, and check that the
    // provided password is correct. We also need to make sure the account
    // has not been disabled before we create the token.

    return this.findAccount (req).then (account => {
      const origin = req.get ('origin');

      const doc = {
        client : gatekeeperClient._id,
        account: account._id,
        scope  : union (gatekeeperClient.scope, account.scope),
        refresh_token: new ObjectId ()
      };

      if (!!origin)
        doc.origin = origin;

      return this.UserToken.create (doc);
    });
  },

  findAccount (req) {
    if (req.account)
      return Promise.resolve (req.account);

    const {username, password} = req.body;

    // We need to locate the account for the username, and check that the
    // provided password is correct. We also need to make sure the account
    // has not been disabled before we create the token.

    return this.Account.findOne ({username}).then (account => {
      if (!account)
        return Promise.reject (new BadRequestError ('invalid_username', 'The username does not exist.'));

      if (account.enabled !== true)
        return Promise.reject (new BadRequestError ('account_disabled', 'The account is disabled.'));

      return account.verifyPassword (password).then (match => {
        if (!match)
          return Promise.reject (new BadRequestError ('invalid_password', 'The password for the account is incorrect.'));

        return account;
      });
    });
  }
});
