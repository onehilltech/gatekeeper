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
  Policy,
  model
} = require ('@onehilltech/blueprint');

module.exports = Policy.extend ({
  failureCode: 'unauthorized_issue',

  failureMessage: 'The client is not able to be issued tokens.',

  Client: model ('client'),

  runCheck (req) {
    const {client_id} = req.body;

    return this.Client.findById (client_id)
      .then (client => {
        if (!client)
          return {failureCode: 'unknown_client', failureMessage: 'The client does not exist.'};

        if (client.enabled !== true)
          return {failureCode: 'client_disabled', failureMessage: 'The client is disabled.'};

        req.gatekeeperClient = client;

        return true;
      });
  }
});
