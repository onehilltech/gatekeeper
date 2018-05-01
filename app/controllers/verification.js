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
  Controller,
  Action,
  model,
  service,
  env
} = require ('@onehilltech/blueprint');

/**
 * @class VerificationController
 *
 * The controller for verifying user accounts.
 */
module.exports = Controller.extend ({
  gatekeeper: service (),

  Account: model ('account'),

  __invoke () {
    return Action.extend ({
      schema: {
        token: {
          in: 'query',
          isLength: {
            options: {min: 1},
            errorMessage: 'This field is required.'
          }
        },

        redirect: {
          in: 'query',
          optional: true,
          isURL: {
            options: [{require_tld: env === 'production'}]
          }
        }
      },

      execute (req, res) {

      }
    })
  }
});

/*
Verification.prototype.__invoke = function () {

  return {
    execute: function (req, res, callback) {
      async.waterfall ([
        function (callback) {
          verification.verifyToken (req.query.token, callback);
        },

        function (account, n, callback) {
          if (req.query.redirect) {
            let code = n === 1 ? 'success' : 'verify_failed';

            res.redirect (`${req.query.redirect}?email=${encodeURIComponent (account.email)}&code=${code}`);
          }
          else {
            let verified = n === 1;

            let data = {
              email: account.email,
              message: verified ? `You have successfully verified the account for ${account.email}.` : `You failed to verify the account for ${account.email}.`
            };

            res.status (200).render ('gatekeeper-account-verification.pug', data);
          }

          return callback (null);
        }
      ], callback);
    }
  };
};
*/
