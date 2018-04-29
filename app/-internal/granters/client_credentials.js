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

const Granter = require ('../granter');
const ModelVisitor = require ('../../models/-visitor');

const {
  merge
} = require ('lodash');

const {
  BadRequestError,
  model,
  service,
} = require ('@onehilltech/blueprint');

const SCHEMA_NATIVE_CLIENT = {
  client_secret: {
    in: 'body',
    isLength: {
      options: { min: 1 },
      errorMessage: 'This field is required.'
    }
  }
};

const SCHEMA_ANDROID_CLIENT = merge ({
  package: {
    in: 'body',
    isLength: {
      options: { min: 1 },
      errorMessage: 'This field is required.'
    }
  }
}, SCHEMA_NATIVE_CLIENT);

const SCHEMA_RECAPTCHA_CLIENT = {
  recaptcha: {
    in: 'body',
    isLength: {
      options: {min: 1},
      errorMessage: 'This field is required.'
    }
  }
};

/**
 * @class ClientCredentials
 *
 * Granter for the client_credentials.
 */
module.exports = Granter.extend ({
  name: 'client_credentials',

  ClientToken: model ('client-token'),

  recaptcha: service (),

  /**
   * Create a token for the request.
   *
   * @param req
   */
  createToken (req) {
    const {gatekeeperClient} = req;

    const doc = {
      client: gatekeeperClient._id,
      scope : gatekeeperClient.scope,
    };

    const origin = req.get ('origin');

    if (!!origin)
      doc.origin = origin;

    return this.ClientToken.create (doc);
  },

  schemaFor (client) {
    let v = new ModelVisitor ({
      schema: null,

      visitNativeClient () {
        this.schema = SCHEMA_NATIVE_CLIENT;
      },

      visitAndroidClient () {
        this.schema = SCHEMA_ANDROID_CLIENT;
      },

      visitRecaptchaClient () {
        this.schema = SCHEMA_RECAPTCHA_CLIENT;
      }
    });

    client.accept (v);

    return v.schema;
  },

  validate (req) {
    const {gatekeeperClient} = req;

    let v = new ModelVisitor ({
      promise: null,

      recaptcha: this.recaptcha,

      visitNativeClient (client) {
        const {client_secret} = req.body;

        if (client.client_secret !== client_secret)
          this.promise = Promise.reject (new BadRequestError ('invalid_secret', 'The client secret is not valid.'));
      },

      visitAndroidClient (client) {
        this.visitNativeClient (client);
      },

      visitRecaptchaClient (client) {
        const response = req.body.recaptcha;
        const ip = req.ip;
        const secret = client.recaptcha_secret;

        this.promise = this.recaptcha.verifyResponse (secret, response, ip);
      }
    });

    gatekeeperClient.accept (v);

    return v.promise;
  }
});
