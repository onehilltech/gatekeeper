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

const {
  model,
  HttpError
} = require ('@onehilltech/blueprint');

const {
  get
} = require ('lodash');

const {
  ResourceController
} = require ('@onehilltech/blueprint-mongodb');

let blueprint  = require ('@onehilltech/blueprint')
  , mongodb    = require ('@onehilltech/blueprint-mongodb')
  , ObjectId   = mongodb.Types.ObjectId
  , objectPath = require ('object-path')
  , _          = require ('underscore')
  , password   = require ('../middleware/granters/password')
  ;

/**
 * Default account id generator. This generator will just produce a new
 * ObjectId for each account.
 */
function __generateAccountId (account) {
  return Promise.resolve (account._id || new ObjectId ());
}

/**
 * @class AccountController
 */
module.exports = ResourceController.extend ({
  model: model ('account'),
  namespace: 'gatekeeper',

  schema: {
    isMongoId: null,
    toMongoId: null,

    isMongoIdOrToken: {
      options: [['me']]
    }
  },

  init () {
    this._super.call (this, ...arguments);
    this._generateAccountId = get (this.app.configs, 'gatekeeper.generators.accountId', __generateAccountId);
  },

  create () {
    return this._super.call (this, ...arguments).extend ({
      prepareDocument (req, doc) {
        doc.created_by = req.user.client_id;

        return this._generateAccountId (doc).then (id => {
          if (id)
            doc._id = id;

          return doc;
        });
      },

      prepareResponse (req, res, result) {
        // If the origin request wanted to login the user, then we need to
        // return to login the user for the account and return the access
        // token for the corresponding login.

        const login = get (req.query, 'login', false);

        if (!login)
          return result;

        /*
                async.waterfall ([
          function (callback) {
            req.client = req.user;
            req.account = result.account;

            password.createToken (req, callback);
          },

          function (accessToken, callback) {
            accessToken.serialize (callback);
          },

          function (token, callback) {
            result.token = _.extend ({token_type: 'Bearer'}, token);
            return callback (null, result);
          }
        ], callback);

         */
      }
    });
  }
});

/*
Account.prototype.update = function () {
  return ResourceController.prototype.update.call (this, {
    on: {
      prepareUpdate: function (req, doc, callback) {
        // Make sure the update does not include properties that cannot be updated
        // and/or deleted.
        // Make sure the update does not include properties that cannot be updated
        // and/or deleted.
        if (!req.scope.includes ('gatekeeper.account.update') &&
          !req.scope.includes ('gatekeeper.account.*') &&
          ((doc.$set && doc.$set.scope) || (doc.$unset && doc.$unset.scope))) {
          return callback (new HttpError (403, 'unauthorized', 'You are not authorized to update or delete the scope.'));
        }

        if (doc.$set && doc.$set.password)
          return callback (new HttpError (400, 'bad_request', 'You cannot directly change the password.'));

        if (doc.$unset && doc.$unset.password)
          return callback (new HttpError (400, 'bad_request', 'You cannot delete the password.'));

        return callback (null, doc);
      }
    }
  });
};

Account.prototype.changePassword = function () {
  return {
    validate: {
      'accountId': {
        in: 'params',
        isMongoIdOrToken: {
          errorMessage: "Must be ObjectId or 'me'",
          options: ['me']
        }
      },
      'password.current': {
        in: 'body',
        notEmpty: true
      },

      'password.new': {
        in: 'body',
        notEmpty: true
      }
    },

    sanitize: idSanitizer,

    execute: function (req, res, callback) {
      const currentPassword = req.body.password.current;
      const newPassword = req.body.password.new;

      async.waterfall ([
        function (callback) {
          Account.findById (req.params.accountId, callback);
        },

        function (account, callback) {
          async.waterfall ([
            function (callback) {
              account.verifyPassword (currentPassword, callback);
            },

            function (match, callback) {
              if (!match)
                return callback (new HttpError (400, 'invalid_password', 'Current password is invalid'));

              account.password = newPassword;
              account.save (callback);
            }
          ], callback);
        },

        function (account, n, callback) {
          res.status (200).json (n === 1);
          return callback (null);
        }
      ], callback);
    }
  }
};

*/
