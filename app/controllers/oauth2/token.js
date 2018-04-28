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

const blueprint = require ('@onehilltech/blueprint');

const {
  Controller,
  Action,
  BadRequestError,
} = require ('@onehilltech/blueprint');

const Granters = require ('../../-internal/granters');
const AccessTokenGenerator = require ('../../-internal/token-generators/access-token');

const {
  get,
  transform,
  values
} = require ('lodash');

/**
 * @class TokenController
 *
 * The TokenController provides methods for binding OAuth 2.0 routes to its
 * implementation of the OAuth 2.0 protocol.
 *
 * @constructor
 */
module.exports = Controller.extend ({
  grantTypes: blueprint.computed ({
    get () { return Object.keys (this.granters); }
  }),

  /// Collection of granters supported by the controller.
  granters: null,

  tokenGenerator: null,

  init () {
    this._super.call (this, ...arguments);

    const config = this.app.lookup ('config:gatekeeper');
    const tokenOptions = get (config, 'token', {});
    this.tokenGenerator = new AccessTokenGenerator (tokenOptions);

    this.granters = transform (Granters, (results, Granter) => {
      let granter = new Granter ({tokenGenerator: this.tokenGenerator});
      results[granter.name] = granter;
    }, {});
  },

  /**
   * Issue an access token. The issue workflow depends on the grant_type
   * body parameter.
   */
  issueToken () {
    return Action.extend ({
      schema: {
        grant_type: {
          in: 'body',
          isIn: {
            errorMessage: 'The grant type is not supported.',
            options: [this.grantTypes]
          }
        },

        client_id: {
          in: 'body',
          notEmpty: true,
          isMongoId: {
            errorMessage: 'The client id is not valid.'
          }
        }
      },

      execute (req, res) {
        const {grant_type} = req.body;
        const granter = this.controller.granters[grant_type];

        return granter.createToken (req)
          .then (accessToken => accessToken.serialize (this.tokenGenerator))
          .then (accessToken => {
            const ret = Object.assign ({token_type: 'Bearer'}, accessToken);
            res.status (200).json (ret);
          });
      }
    });
  },

  /**
   * Logout the current user making the request.
   *
   * @returns {*}
   */
  logout () {
    return Action.extend ({
      execute (req, res) {
        let {accessToken} = req;

        return accessToken.remove ().then (result => {
          if (!result)
            return Promise.reject (new BadRequestError ('invalid_token', 'The access token is invalid.'));

          res.status (200).send (true);
        });
      }
    });
  }
});
