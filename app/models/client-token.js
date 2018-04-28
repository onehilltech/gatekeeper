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
  props
} = require ('bluebird');

const assert = require ('assert');
const blueprint = require ('@onehilltech/blueprint');
const mongodb = require ('@onehilltech/blueprint-mongodb');
const Schema  = mongodb.Schema;
const AccessToken = require ('./access-token');
const AccessTokenGenerator = require ('../-internal/token-generators/access-token');

const {
  get
} = require ('lodash');

const discriminatorKey = AccessToken.schema.options.discriminatorKey;

let options = require ('./-common-options') ({discriminatorKey});

const config = blueprint.lookup ('config:gatekeeper');
const tokenOptions = get (config, 'token');

assert (!!tokenOptions, 'The gatekeeper configuration file (app/configs/gatekeeper.js) must define {token} property');

const defaultGenerator = new AccessTokenGenerator (tokenOptions);

//const tokenGenerator = new AccessTokenGenerator ();
const schema = new Schema ({ }, options);

schema.methods.serialize = function (tokenGenerator = defaultGenerator) {
  return props ({
    access_token: (() => {
      const payload = { scope: this.scope };
      const options = { jwtid: this.id };

      if (this.origin)
        options.audience = this.origin;

      return tokenGenerator.generateTokenSync (payload, options);
    })()
  });
};

schema.methods.serializeSync = function (tokenGenerator = defaultGenerator) {
  return {
    access_token: (() => {
      const payload = { scope: this.scope };
      const options = { jwtid: this.id };

      if (this.origin)
        options.audience = this.origin;

      return tokenGenerator.generateTokenSync (payload, options);

    }) ()
  };
};

module.exports = AccessToken.discriminator ('client_token', schema);
