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
  checkSchema
} = require('express-validator/check');

const {
  Controller,
  Action,
  BadRequestError,
  ForbiddenError,
  model,
  env,
} = require ('@onehilltech/blueprint');

const Granters = require ('../../-internal/granters');
const AccessTokenGenerator = require ('../../-internal/token-generators/access-token');
const ModelVisitor = require ('../../models/-visitor');

const mm = require ('micromatch');

const {
  fromCallback
} = require ('bluebird');

const {
  get,
  transform
} = require ('lodash');

const {
  validationResult
} = require ('express-validator/check');

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
    get () {
      return Object.keys (this.granters);
    }
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
        client_id: {
          in: 'body',
          isLength: {
            options: {min: 1},
            errorMessage: 'The field is required.'
          },
          isMongoId: {
            errorMessage: 'The field is not valid.'
          }
        },

        grant_type: {
          in: 'body',
          isLength: {
            options: {min: 1},
            errorMessage: 'The field is required.'
          },
          isIn: {
            errorMessage: 'The grant type is not supported.',
            options: [this.grantTypes]
          }
        },
      },

      Client: model ('client'),

      validate (req) {
        // We also need to validate the request based on the client making the
        // request. For example, the native client will have different requirements
        // than the recaptcha client. So, let's locate the client in the database,
        // and all allow the granter to validate the request on per client basis.

        const {client_id} = req.body;

        return this.Client.findById (client_id).then (client => {
          if (!client)
            return Promise.reject (new BadRequestError ('unknown_client', 'The client does not exist.'));

          if (!client.enabled)
            return Promise.reject (new ForbiddenError ('client_disabled', 'The client is disabled.'));

          req.gatekeeperClient = client;

          // Let's validate the schema for the granter. We consider this the
          // static validation for the granter.

          const granter = this.granterFor (req);
          const granterSchema = granter.schemaFor (client);

          let promises = [];

          if (granterSchema) {
            const checks = checkSchema (granterSchema);

            promises = checks.map (middleware => fromCallback (callback => {
              middleware.call (null, req, {}, callback);
            }));
          }

          return Promise.all (promises).then (() => {
            // We are checking the validation result now because we want to return
            // the proper error message if there were any validation errors related
            // to the schema definitions. If we do not put this check here, then we
            // run the risk of the dynamic validation generating a error that will
            // take priority over the schema validation errors.

            const errors = validationResult (req);

            if (!errors.isEmpty ())
              return;

            // The last part of the validation is performing any dynamic validation
            // based on the client. This validation is independent of the grant type
            // for the request. Afterwards, we are going to allow the granter to perform
            // any dynamic, context-specific validation.
            const v = new ModelVisitor ({
              promise: null,

              visitAndroidClient (client) {
                // We are going to make sure the package name matches the
                // package of the client.
                const packageName = req.body.package;

                if (packageName !== client.package)
                  this.promise = Promise.reject (new BadRequestError ('invalid_package', 'The package does not match the client.'));
              },

              visitRecaptchaClient (client) {
                // For all reCAPTCHA clients requesting a token, the origin of the request
                // must match the origin of the client on record. This only applies when we
                // are not in the test environment.

                if (env !== 'test') {
                  let origin = req.get ('origin');

                  if (origin) {
                    // The origin in the request is a string. The origin in the client model
                    // can be a pattern. This will allow a single client model to handle requests
                    // from different clients on the same domain.
                    const isMatch = mm.isMatch (origin, client.origin);

                    if (!isMatch)
                      this.promise = Promise.reject (new BadRequestError ('invalid_origin', 'The origin of the request does not match the client.'));
                  }
                  else {
                    this.promise = Promise.reject (new BadRequestError ('unknown_origin', 'The request is missing its origin.'));
                  }
                }
              }
            });

            client.accept (v);

            return Promise.resolve (v.promise)
              .then (() => granter.validate (req));
          });
        });
      },

      execute (req, res) {
        const granter = this.granterFor (req);

        return granter.createToken (req)
          .then (accessToken => accessToken.serialize (this.tokenGenerator))
          .then (accessToken => {
            const ret = Object.assign ({token_type: 'Bearer'}, accessToken);
            res.status (200).json (ret);
          });
      },

      granterFor (req) {
        const {grant_type} = req.body;
        return this.controller.granters[grant_type];
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
