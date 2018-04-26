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

'use strict';

const blueprint = require ('@onehilltech/blueprint')
  , granters    = require ('../../middleware/granters')
  , clients     = require ('./clients')
  ;

const {
  policies: { all }
} = require ('@onehilltech/blueprint');


module.exports = all ([
  /*
   * The client must be in good standing.
   */
  function (req, callback) {
    return callback (null, req.client.enabled, {reason: 'client_disabled', message: 'Client is disabled'});
  },

  all ([
    /*
     * Check the policies for the client type.
     */
    function (req, callback) {
      var clientPolicies = clients[req.client.type] || function (req, callback) { return callback (null, true); };
      clientPolicies (req, callback);
    },

    /*
     * Evaluate the policies for the granter.
     */
    function (req, callback) {
      const grantType = req.body.grant_type;
      const policies = granters[grantType].policies || function (req, callback) { return callback (null, true); };

      return policies (req, callback);
    }
  ])
]);

