module.exports = exports = {
  ':accountId' : 'AccountController@lookupAccountByParam',
  ':rawAccountId' : 'AccountController@storeParam',

  '/accounts' : {
    get : {action: 'AccountController@getAccounts'},
    post: {action: 'AccountController@createAccount'}
  },

  '/accounts/:rawAccountId': {
    get   : {action: 'AccountController@getAccount'},
    delete: {action: 'AccountController@deleteAccount'}
  },

  '/accounts/:accountId/enable' : {
    post: {action: 'AccountController@enableAccount'}
  },

  '/accounts/:accountId/roles' : {
    post: {action: 'AccountController@updateRoles'}
  },
};
