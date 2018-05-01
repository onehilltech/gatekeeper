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
  Action,
  Controller,
  model,
  service,
  BadRequestError,
} = require ('@onehilltech/blueprint');

/**
 * @class PasswordController
 *
 * Controller that has actions related to managing an accounts password.
 */
module.exports = Controller.extend ({
  tokenGenerator: null,

  gatekeeper: service (),

  init () {
    this._super.call (this, ...arguments);

    this.tokenGenerator = this.gatekeeper.getTokenGenerator ('gatekeeper:password_reset');
  },

  forgotPassword () {
    return Action.extend ({
      schema: {
        email: {
          in: 'body',
          isLength: {
            options: {min: 1},
            errorMessage: 'The request is missing the email parameter.'
          },
          isEmail: {
            errorMessage: 'The provide email address is not valid.'
          }
        }
      },

      Account: model ('account'),

      execute (req, res) {
        const {email} = req.body;

        return this.Account.findOne ({email}).then (account => {
          if (!account)
            return callback (new BadRequestError ('unknown_account', 'The account for the email address does not exist.'));

          this.controller.app.emit ('gatekeeper.password.forgot', account);
          res.status (200).json (true);
        });
      }
    });
  },

  resetPassword () {
    return Action.extend ({
      Account: model ('account'),

      schema: {
        'reset-password.token': {
          in: 'body',
          isLength: {
            options: {min: 1},
            errorMessage: 'The request is missing the token parameter.'
          }
        },
        'reset-password.password': {
          in: 'body',
          isLength: {
            options: {min: 1},
            errorMessage: 'The request is missing the password parameter.'
          }
        }
      },

      execute (req, res) {
        let {token,password} = req.body['reset-password'];

        return this.controller.tokenGenerator.verifyToken (token)
          .then (payload => this.Account.findOne ({email: payload.email}))
          .then (account => {
            account.password = password;
            return account.save ();
          })
          .then (account => {
            this.controller.app.emit ('gatekeeper.password.reset', account);

            res.status (200).json (true);
          });
      }
    });
  }
});
