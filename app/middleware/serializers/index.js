var JwtToken = require ('./JwtToken')
  ;

var exports = module.exports = function (opts) {
  if (opts.kind === 'jwt')
    return new JwtToken (opts.options);
  else
    throw new Error ('Unsupported token type');
};

exports.JwtToken = JwtToken;