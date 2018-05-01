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

const {expect} = require ('chai');
const blueprint = require ('@onehilltech/blueprint');
const { seed } = require ('@onehilltech/blueprint-mongodb');
const { request } = require ('../../../../../lib/testing');
const async = require ('async');

describe ('app | routers | password', function () {
  let tokenGenerator;

  before (function () {
    const gatekeeper = blueprint.lookup ('service:gatekeeper');
    tokenGenerator = gatekeeper.getTokenGenerator ('gatekeeper:password_reset');
  });

  describe ('/v1/password/forgot', function () {
    describe ('POST', function () {
      it ('should initiate forgot password sequence', function () {
        let {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .post ('/v1/password/forgot')
          .send ({email: account.email})
          .expect (200, 'true');
      });
    });
  });

  describe ('/v1/password/reset', function () {
    describe ('POST', function () {
      it ('should reset the account password', function () {
        let {accounts} = seed ('$default');
        const account = accounts[0];

        return tokenGenerator.generateToken ({email: account.email})
          .then (token => {
            blueprint.once ('gatekeeper.password.reset', (acc) => {
              expect (acc.id).to.equal (account.id);
              expect (acc.password).to.not.equal ('1234567890');

              async.waterfall ([
                function (callback) {
                  acc.verifyPassword ('1234567890', callback)
                },

                function (result, callback) {
                  expect (result).to.be.true;
                  return callback (null);
                }
              ], callback);
            });

            request ()
              .post ('/v1/password/reset')
              .send ({'reset-password': {token: token, password: '1234567890'}})
              .expect (200, 'true');
          });
      });
    });
  });
});
