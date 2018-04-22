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
  BO
} = require ('@onehilltech/blueprint');

const jwt = require ('jsonwebtoken');

const {
  merge,
  omit
} = require ('lodash');

const assert = require ('assert');

const DEFAULT_ALGORITHM = 'HS256';

const {
  fromCallback
} = require ('bluebird');

/**
 * @class TokenGenerator
 *
 * Wrapper class for jsonwebtoken to sign and verify access tokens.
 */
module.exports = BO.extend ({
  mergedProperties: ['options'],

  init (opts = {}) {
    this._super.call (this, ...arguments);

    assert (this.kind === 'jwt', 'The kind property must have value \'jwt\'');
    assert (!!this.options.secret || (!!this.options.publicKey && !!this.options.privateKey), 'You must define options.secret or options.{publicKey, privateKey}');

    // Let's cache the options locally. But, we need to separate the hash from
    // the options used to generate the token.

    this._signingHash = this.options.privateKey || this.options.secret;
    this._verifyHash = this.options.publicKey || this.options.secret;
    this.options = merge ({algorithm: DEFAULT_ALGORITHM}, omit (this.options, ['secret','publicKey','privateKey']));
  },

  /**
   * Generate a JSON web token for the payload. You can pass in an optional options hash
   * to override the default options.
   *
   * @param payload
   * @param opts
   */
  generateToken (payload, opts = {}) {
    let options = merge ({}, this.options, opts);

    return fromCallback (callback => {
      jwt.sign (payload, this._signingHash, options, callback);
    });
  },

  /**
   * Verify an existing JSON web token.
   *
   * @param token
   * @param opts
   */
  verifyToken (token, opts = {}) {
    let options = merge ({}, this.options, opts);

    if (!options.algorithms) {
      if (options.algorithm) {
        options.algorithms = [options.algorithm];
        delete options.algorithm;
      }

      else
        options.algorithms = ['none'];
    }

    return fromCallback (callback => {
      jwt.verify (token, this._verifyHash, options, callback);
    });
  }
});

