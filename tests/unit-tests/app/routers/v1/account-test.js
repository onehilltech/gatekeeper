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
  expect
} = require ('chai');

const {
  request
} = require ('../../../../../lib/testing');

const {
  lean,
  seed
} = require ('@onehilltech/blueprint-mongodb');

describe.only ('app | routers | account', function () {
  describe ('/v1/accounts', function () {
    context ('GET', function () {
      it ('should return all the accounts for glob scope', function () {
        const {accounts} = seed ('$default');

        return request ()
          .get ('/v1/accounts')
          .withUserToken (0)
          .query ({_sort: {username: 1}})
          .expect (200, {'accounts': lean (accounts)});
      });

      it ('should return all the accounts for valid scope', function () {
        const {accounts} = seed ('$default');

        return request ()
          .get ('/v1/accounts')
          .query ({_sort: {username: 1}})
          .withUserToken (1)
          .expect (200, {'accounts': lean (accounts)});
      });

      it ('should not allow request', function () {
        return request ()
          .get ('/v1/accounts')
          .withUserToken (2)
          .expect (403, { errors:
            [ { code: 'invalid_scope',
              detail: 'This request does not have a valid scope.',
              status: '403' } ] });
      });
    });

    context ('POST', function () {
      let data = { username: 'tester1', password: 'tester1', email: 'james@onehilltech.com' };

      it.only ('should create a new account', function () {
        return request ()
          .post ('/v1/accounts')
          .send ({account: data})
          .withClientToken (0)
          .expect (500, {});
      });

      it ('should create a new account, and login the user', function (done) {
        const autoLogin = {
          _id: mongodb.Types.ObjectId (),
          username: 'auto-login',
          password: 'auto-login',
          email: 'auto-login@onehilltech.com'
        };

        request ()
          .post ('/v1/accounts')
          .query ({login: true})
          .send ({account: autoLogin})
          .withClientToken (0)
          .expect (200)
          .end (function (err, res) {
            if (err)
              return done (err);

            let actual = mongodb.lean (_.omit (_.extend (autoLogin, {
              created_by: blueprint.app.seeds.$default.native[0].id,
              scope: [],
              enabled: true
            }), ['password']));

            expect (res.body.account).to.eql (actual);
            expect (res.body).to.have.property ('token');

            expect (res.body.token).to.have.keys (['token_type', 'access_token', 'refresh_token']);
            expect (res.body.token).to.have.property ('token_type', 'Bearer');

            return done (null);
          });
      });

      it ('should not create an account [duplicate]', function (done) {
        const account = blueprint.app.seeds.$default.accounts[0];
        const dup = {username: account.username, password: account.password, email: account.email, created_by: account.created_by};

        request ()
          .post ('/v1/accounts')
          .send ({account: dup})
          .withClientToken (0)
          .expect (400, done);
      });

      it ('should not create an account [missing parameter]', function (done) {
        const invalid = {password: 'tester1', email: 'james@onehilltech.com'};

        request ()
          .post ('/v1/accounts')
          .send (invalid)
          .withClientToken (0)
          .expect (400, done);
      });

      it ('should not create an account [invalid scope]', function (done) {
        const account = { username: 'tester1', password: 'tester1', email: 'james@onehilltech.com'};

        request ()
          .post ('/v1/accounts').send ({account: account})
          .withClientToken (1)
          .expect (403, { errors: [{ status: '403', code: 'invalid_scope', detail: 'This request does not have a valid scope.' }] }, done);
      });
    });
  });

  describe ('/v1/accounts/:accountId', function () {
    context ('GET', function () {
      it ('should return the owner account', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .get (`/v1/accounts/${account.id}`)
          .withUserToken (2)
          .expect (200, {account: account.lean ()});
      });

      it ('should return the account for me', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .get ('/v1/accounts/me')
          .withUserToken (2)
          .expect (200, {account: account.lean ()});
      });

      context ('get_all', function () {
        it ('should return account for a different user', function () {
          const {accounts} = seed ('$default');
          const account = accounts[1];

          request ()
            .get (`/v1/accounts/${account.id}`)
            .withUserToken (1)
            .expect (200, {account: account.lean ()});
        });
      });

      context ('!get_all', function () {
        it ('should not return account for different user', function () {
          const {accounts} = seed ('$default');
          const account = accounts[1];

          return request ()
            .get (`/v1/accounts/${account.id}`)
            .withUserToken (2)
            .expect (403, { errors:
                [ { code: 'forbidden_access',
                  detail: 'You do not have access to the account.',
                  status: '403' } ] });
        });
      });
    });

    context ('UPDATE', function () {
      it ('should update the scope', function () {
        const {accounts} = seed ('$default');
        const account = accounts[3];

        let updated = account.lean ();
        updated.scope.push ('the_new_scope');

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .send ({account: {scope: updated.scope}})
          .expect (200, {account: updated});
      });

      it ('should update the email', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        let updated = account.lean ();
        updated.email = 'foo@contact.com';

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .send ({account: {email: updated.email}} )
          .expect (200, {account: updated});
      });

      it ('should not update the scope', function () {
        const {accounts} = seed ('$default');
        const account = accounts[0];

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (2)
          .send ({account: {scope: ['the_new_scope']}})
          .expect (403, { errors:
              [ { code: 'invalid_scope',
                detail: 'You are not allowed to update the account scope.',
                status: '403' } ] });
      });

      it ('should not update the password', function () {
        const {accounts} = seed ('$default');
        const account = accounts[3];

        return request ()
          .put (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .send ({account: {password: '1234567890'}})
          .expect (403, { errors:
              [ { code: 'forbidden',
                detail: 'You cannot update or delete the password.',
                status: '403' } ] });
      });
    });

    context ('DELETE', function () {
      it ('should allow account owner to delete account', function () {
        const {accounts} = seed ('$default');

        return request ()
          .delete (`/v1/accounts/${accounts[0].id}`)
          .withUserToken (0)
          .expect (200, 'true');
      });

      it ('should not allow user to delete account of another user', function () {
        const {accounts} = seed ('$default');
        const account = accounts[1];

        return request ()
          .delete (`/v1/accounts/${account.id}`)
          .withUserToken (0)
          .expect (403, { errors:
            [ { code: 'invalid_account',
              detail: 'You are not the account owner.',
              status: '403' } ] });
      });
    });

    describe ('/password', function () {
      it ('should change the password', function (done) {
        const Account = blueprint.lookup ('model:account');
        const account = blueprint.app.seeds.$default.accounts[0];

        async.series ([
          function (callback) {
            request ()
              .post ('/v1/accounts/' + account.id + '/password')
              .withUserToken (0)
              .send ({password: { current: account.username, new: 'new-password'}})
              .expect (200, 'true', callback);
          },

          function (callback) {
            async.waterfall ([
              function (callback) {
                Account.findById (account._id, callback);
              },

              function (changed, callback) {
                expect (changed.password).to.not.equal (account.password);
                return callback (null);
              }
            ], callback);
          }
        ], done);
      });

      it ('should not change the password because current is wrong', function (done) {
        const account = blueprint.app.seeds.$default.accounts[0];

        request ()
          .post ('/v1/accounts/' + account.id + '/password')
          .withUserToken (0)
          .send ({password: { current: 'bad-password', new: 'new-password'}})
          .expect (400, { errors: [{ status: '400', code: 'invalid_password', detail: 'Current password is invalid' }] }, done);
      });
    });
  });
});