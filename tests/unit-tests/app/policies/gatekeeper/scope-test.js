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
  expect
} = require ('chai');

describe ('app | policies | gatekeeper | request | scope', function () {
  context ('no pattern', function () {
    it ('the policy should pass', function () {
      let Policy = blueprint.lookup ('policy:gatekeeper.scope');

      let req = { scope: ['a.b'] };
      let policy = new Policy ();

      policy.setParameters ('a.b');

      return policy.runCheck (req).then (result => {
        expect (err).to.be.null;
        expect (result).to.be.true;
      });
    });

    it ('the policy should fail', function (done) {
      let req = { scope: ['a.c'] };

      policy ('a.b', req, (err, result, details) => {
        expect (err).to.be.null;
        expect (result).to.be.false;
        expect (details).to.deep.equal ({reason: 'invalid_scope', message: 'This request does not have a valid scope.'});

        return done (null);
      });
    });
  });

  context ('glob pattern', function () {
    it ('the policy should pass', function (done) {
      let req = { scope: ['a.b.*'] };

      policy ('a.b.c', req, (err, result) => {
        expect (err).to.be.null;
        expect (result).to.be.true;

        return done (null);
      });
    });

    it ('the policy should fail', function (done) {
      let req = { scope: ['a.b.*'] };

      policy ('a.c.d', req, (err, result, details) => {
        expect (err).to.be.null;
        expect (result).to.be.false;
        expect (details).to.deep.equal ({reason: 'invalid_scope', message: 'This request does not have a valid scope.'});

        return done (null);
      });
    });
  });

});