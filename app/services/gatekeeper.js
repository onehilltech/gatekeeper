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

const { Service } = require ('@onehilltech/blueprint');

/**
 * @class GatekeeperService
 */
module.exports = Service.extend ({
  /**
   * Generate a token.
   *
   * @param payload       Payload to encode
   * @param opts          Additional options
   */
  generateToken (payload, opts = {}) {

  },

  /**
   * Verify a token. The payload of the token is returned.
   *
   * @param token         Token to verify
   * @param opts          Additional options
   */
  verifyToken (token, opts = {}) {

  }
});
