var gatekeeper = require ('../../../../lib')
  ;

module.exports = exports = {
  '/token': {
    post: { action: 'oauth2.token@issueToken', policy: 'gatekeeper.issueToken' }
  },

  '/logout' : {
    policy: 'gatekeeper.auth.bearer',
    post: { action : 'oauth2.token@logout' }
  }
};
