const {
  policies: { check, all }
} = require ('@onehilltech/blueprint');

module.exports = all ([
  check ('gatekeeper.request.scope', 'gatekeeper.account.create'),

  /*
   * Check the password policy. The password policy is optional. If an application
   * wants to enable password policies, then they just need to overload this policy
   * in their application.
   */
  check ('?gatekeeper.account.password')
]);


