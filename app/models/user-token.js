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

const assert = require ('assert');
const blueprint = require ('@onehilltech/blueprint');
const mongodb   = require ('@onehilltech/blueprint-mongodb');
const Schema    = mongodb.Schema;
const ObjectId  = mongodb.Schema.Types.ObjectId;
const AccessToken = require ('./access-token');
const Account     = require ('./account');
const AccessTokenGenerator = require ('../-internal/token-generators/access-token');

const {
  props
} = require ('bluebird');

const {
  get
} = require ('lodash');

const discriminatorKey = AccessToken.schema.options.discriminatorKey;
const options = require ('./-common-options') ({discriminatorKey});

const config = blueprint.lookup ('config:gatekeeper');
const tokenOptions = get (config, 'token');

assert (!!tokenOptions, 'The gatekeeper configuration file (app/configs/gatekeeper.js) must define {token} property');

const defaultGenerator = new AccessTokenGenerator (tokenOptions);

let schema = new Schema ({
  /// Account that owns the token.
  account: {type: ObjectId, ref: Account.modelName, index: true},

  /// Optional refresh token for the user.
  refresh_token: {type: ObjectId, index: true, unique: true, sparse: true}
}, options);

schema.methods.serialize = function (generator = defaultGenerator) {
  return props ({
    access_token: (() => {
      const payload = { scope: this.scope };
      const options = { jwtid: this.id };

      if (this.origin)
        options.audience = this.origin;

      return generator.generateToken (payload, options);
    })(),

    refresh_token: (() => {
      if (!this.refresh_token)
        return callback (null);

      const payload = {  };
      const options = { jwtid: this.refresh_token.toString () };

      if (this.origin)
        options.audience = this.origin;

      return generator.generateToken (payload, options);
    })()
  });
};

schema.methods.serializeSync = function (generator = defaultGenerator) {
  return  {
    access_token: (() => {
      let options = {jwtid: this.id};

      if (this.origin)
        options.audience = this.origin;

      return generator.generateTokenSync ({ scope: this.scope }, options);
    }) (),

    refresh_token: (() => {
      if (!this.refresh_token)
        return undefined;

      let options = {jwtid: this.refresh_token.toString ()};

      if (this.origin)
        option.audience = this.origin;

      return generator.generateTokenSync ({}, options);
    })
  };
};

module.exports = AccessToken.discriminator ('user_token', schema);
