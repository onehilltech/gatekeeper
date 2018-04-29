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
  request
} = require ('../../../../../../lib/testing');

const {
  seed
} = require ('@onehilltech/blueprint-mongodb');

const {
  expect
} = require ('chai');

function getToken (data) {
  return request ()
    .post ('/v1/oauth2/token')
    .send (data)
    .expect (200)
    .expect ('Content-Type', /json/)
    .then (res => res.body);
}

describe.only ('app | routers | oauth2 | token', function () {
  describe ('/token', function () {
    const TOKEN_URL = '/v1/oauth2/token';

    it ('should fail because of bad grant_type', function () {
      const {native} = seed ('$default');
      const client = native[0];

      const data = {
        client_id: client.id,
        grant_type: 'a',
      };

      return request ()
        .post (TOKEN_URL)
        .send (data)
        .expect (400, { errors:
            [ { code: 'validation_failed',
              detail: 'The request validation failed.',
              status: '400',
              meta: {
                validation: {
                  grant_type: {
                    location: "body",
                    msg: "The grant type is not supported.",
                    param: "grant_type",
                    value: 'a'
                  }
                }
              } }] });
    });

    it ('should fail because client is disabled', function () {
      const {native, accounts} = seed ('$default');
      const account = accounts[0];
      const client = native[2];

      const data = {
        grant_type: 'password',
        username: account.username,
        password: account.password,
        client_id: client.id,
        client_secret: client.client_secret
      };

      return request ()
        .post (TOKEN_URL)
        .send (data)
        .expect (403, { errors:
            [ { code: 'client_disabled',
              detail: 'The client is disabled.',
              status: '403' } ] });
    });

    describe ('password', function () {
      context ('native', function () {
        it ('should grant token for the username/password', function () {
          const {native,accounts} = seed ('$default');
          const account = accounts[1];
          const client = native[0];

          const data = {
            grant_type: 'password',
            username: account.username,
            password: account.username,
            client_id: client.id,
            client_secret: client.client_secret
          };

          return getToken (data).then (token => {
            expect (token).to.have.all.keys (['token_type', 'access_token', 'refresh_token']);
            expect (token).to.have.property ('token_type', 'Bearer');
          });
        });

        it ('should grant token bound to an origin', function () {
          const {native, accounts} = seed ('$default');
          const account = accounts[1];
          const client = native[0];

          const data = {
            grant_type: 'password',
            username: account.username,
            password: account.username,
            client_id: client.id,
            client_secret: client.client_secret
          };

          return getToken (data).then (token => {
            expect (token).to.have.all.keys (['token_type', 'access_token', 'refresh_token']);
            expect (token).to.have.property ('token_type', 'Bearer');
          });
        });

        it ('should fail because account is disabled', function () {
          const {native, accounts} = seed ('$default');
          const account = accounts[4];
          const client = native[0];

          const data = {
            grant_type: 'password',
            username: account.username,
            password: account.password,
            client_id: client.id,
            client_secret: client.client_secret
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'account_disabled',
                  detail: 'The account is disabled.',
                  status: '400' } ] });
        });

        it ('should fail because password is incorrect', function () {
          const {native, accounts} = seed ('$default');
          const account = accounts[1];
          const client = native[0];

          const data = {
            grant_type: 'password',
            username: account.username,
            password: 'incorrect_password',
            client_id: client.id,
            client_secret: client.client_secret
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, {errors: [{status: '400', code: 'invalid_password', detail: 'The password for the account is incorrect.'}]});
        });
      });

      context ('android', function () {
        it ('should grant token', function () {
          const {android,accounts} = seed ('$default');
          const client = android[0];
          const account = accounts[0];

          const data = {
            grant_type: 'password',
            client_id: client.id,
            package: 'com.onehilltech.gatekeeper',
            username: account.username,
            password: account.username,
          };

          return getToken (data).then (token => {
            expect (token).to.have.keys (['token_type','access_token','refresh_token']);
          });
        });

        it ('should fail because of invalid package', function () {
          const {android,accounts} = seed ('$default');
          const client = android[0];
          const account = accounts[0];

          const data = {
            grant_type: 'password',
            client_id: client.id,
            username: account.username,
            password: account.username,
            package: 'a.b'
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'invalid_package',
                  detail: 'The package does not match the client.',
                  status: '400' } ] });
        });
      });
    });

    describe ('client_credentials', function () {
      context ('native', function () {
        it ('should get token for client credentials', function () {
          const {native} = seed ('$default');
          const client = native[0];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id,
            client_secret: client.client_secret
          };

          return getToken (data).then (token => {
            expect (token).to.have.all.keys (['token_type', 'access_token']);
            expect (token).to.have.property ('token_type', 'Bearer');
          });
        });

        it ('should fail because of missing fields', function () {
          const {native} = seed ('$default');
          const client = native[0];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'validation_failed',
                  detail: 'The request validation failed.',
                  status: '400',
                  meta: {
                    validation: {
                      client_secret: {
                        location: 'body',
                        msg: 'This field is required.',
                        param: 'client_secret'
                      }
                    }
                  }
            } ] });
        });

        it ('should fail because client is disabled', function () {
          const {native} = seed ('$default');
          const client = native[2];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id,
            client_secret: client.client_secret
          };

          return request ()
            .post (TOKEN_URL)
            .send(data)
            .expect (403, { errors:
                [ { code: 'client_disabled',
                  detail: 'The client is disabled.',
                  status: '403' } ] });
        });

        it ('should fail because incorrect secret', function () {
          const {native} = seed ('$default');
          const client = native[0];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id,
            client_secret: 'bad_secret'
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'invalid_secret',
                  detail: 'The client secret is not valid.',
                  status: '400' } ] });
        });
      });

      context ('android', function () {
        it ('should fail because of missing fields', function () {
          const {android} = seed ('$default');
          const client = android[0];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id,
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'validation_failed',
                  detail: 'The request validation failed.',
                  status: '400',
                  meta: {
                    validation: {
                      client_secret: {
                        location: 'body',
                        msg: 'This field is required.',
                        param: 'client_secret'
                      },

                      package: {
                        location: 'body',
                        msg: 'This field is required.',
                        param: 'package'
                      }
                    }
                  }
                } ] });
        });

        it ('should fail because of invalid package', function () {
          const {android} = seed ('$default');
          const client = android[0];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id,
            client_secret: client.client_secret,
            package: 'a.b'
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'invalid_package',
                  detail: 'The package does not match the client.',
                  status: '400' } ] });
        });

        it ('should fail because of invalid client secret', function () {
          const {android} = seed ('$default');
          const client = android[0];

          const data = {
            grant_type: 'client_credentials',
            client_id: client.id,
            client_secret: 'bad_secret',
            package: client.package
          };

          return request ()
            .post (TOKEN_URL)
            .send (data)
            .expect (400, { errors:
                [ { code: 'invalid_secret',
                  detail: 'The client secret is not valid.',
                  status: '400' } ] });
        });
      });
    });

    describe ('refresh_token', function () {
      it ('should refresh the access and refresh token', function () {
        const {native, accounts} = seed ('$default');
        const account = accounts[1];
        const client = native[0];

        const data = {
          grant_type: 'password',
          username: account.username,
          password: account.username,
          client_id: client.id,
          client_secret: client.client_secret
        };

        return getToken (data).then (token => {
          const data = {
            grant_type: 'refresh_token',
            client_id: client.id,
            client_secret: client.client_secret,
            refresh_token: token.refresh_token
          };

          return getToken (data)
            .then (refreshToken => {
              expect (refreshToken).to.have.all.keys (['token_type', 'access_token', 'refresh_token']);
              expect (refreshToken).to.have.property ('token_type', 'Bearer');

              expect (refreshToken.access_token).to.not.equal (token.access_token);
              expect (refreshToken.refresh_token).to.not.equal (token.refresh_token);
            });
        });
      });

      it ('should not refresh token because missing secret', function () {
        const {native, user_tokens} = seed ('$default');
        const accessToken = user_tokens[1].serializeSync ();
        const client = native[0];

        const data = {
          grant_type: 'refresh_token',
          client_id: client.id,
          refresh_token: accessToken.refresh_token
        };

       return request ()
          .post (TOKEN_URL)
          .send (data)
          .withUserToken (1)
          .expect (400, {
            errors: [{
              status: '400',
              code: "validation_failed",
              detail: "Request validation failed",
              meta: {
                validation: {
                  client_secret: {
                    location: "body",
                    msg: "Missing client secret",
                    param: "client_secret"
                  }
                }
              }
            }]
          });
      });
    });
  });

  describe ('/logout', function () {
    it ('should logout the current user', function () {
     return request ()
        .post ('/v1/oauth2/logout')
        .withUserToken (0)
        .expect (200, 'true');
    });
  });
});
