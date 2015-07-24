var winston       = require ('winston')
  , LocalStrategy = require ('passport-local').Strategy;

var  Account = require ('../models/account');

module.exports = function (opts) {
  var opts = opts || {};

  return new LocalStrategy (opts, function (username, password, done) {
    winston.info ('using password authentication for ' + username);

    Account.findOne ({ username: username }, function (err, user) {
      if (err)
        return done (err);

      if (!user)
        return done (null, false, { message: 'User does not exist' });

      if (user.disabled)
        return done (null, false, { message: 'User account is disabled'});

      user.verifyPassword (password, function (err, match) {
        if (err)
          return done (err);

        if (!match)
          return done (null, false, { message: 'Incorrect password'});

        winston.info ('password authentication for %s successful', username);
        return done (null, user);
      });
    });
  });
};