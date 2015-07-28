var passport = require ('passport')
  , express  = require ('express')
  ;

var bearer   = require ('../authentication/bearer')
  ;

function ProtectedRouter () {

}

ProtectedRouter.prototype.newRouter = function () {
  var router = express.Router ();
  router.use (passport.authenticate ('bearer', {session : false}));

  return router;
};

exports = module.exports = ProtectedRouter;
