'use strict';

const dab      = require ('@onehilltech/dab')
  , gatekeeper = require ('../../../../lib')
  ;


module.exports = {
  clients: [
    {
      name: 'client1',
      email: 'client1@gatekeeper.com',
      secret: 'client1',
      scope: [
        gatekeeper.scope.account.create,
        gatekeeper.scope.client.create,
        gatekeeper.scope.client.update,
        gatekeeper.scope.client.delete
      ]
    },
    {
      name: 'client2',
      email: 'client2@gatekeeper.com',
      secret: 'client2'
    },
    {
      name: 'client3',
      email: 'client3@gatekeeper.com',
      secret: 'client3',
      enabled: false
    }
  ],

  accounts: [
    { email: 'account1@gatekeeper.com', username: 'account1', password: 'account1', created_by: dab.ref ('clients.0')},
    { email: 'account2@gatekeeper.com', username: 'account2', password: 'account2', created_by: dab.ref ('clients.0')},
    { email: 'account3@gatekeeper.com', username: 'account3', password: 'account3', created_by: dab.ref ('clients.0')},
    { email: 'account4@gatekeeper.com', username: 'account4', password: 'account4', created_by: dab.ref ('clients.0'), scope: [gatekeeper.scope.superuser]},
    { email: 'account5@gatekeeper.com', username: 'account5', password: 'account5', created_by: dab.ref ('clients.0'), enabled: false}
  ]
};
