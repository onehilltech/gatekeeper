var uid       = require ('uid-safe')
  , blueprint = require ('blueprint')
  ;

const DEFAULT_SECRET_LENGTH = 128;

var schema = new blueprint.Schema({
  /// Name of the client.
  name: {type: String, required: true, trim: true, unique: true},

  /// Contact email address for the client.
  email: {type: String, required: true, trim: true, unique: true},

  /// Client secret.
  secret: {type: String, required: true},

  /// Redirect URI for the client.
  redirect_uri: {type: String, required: true, trim: true, unique: true},

  /// Enabled state of the client.
  enabled: {type: Boolean, default: true},

  /// The different roles of the client.
  roles: {type: [String], default: []}
});

schema.statics.registerNewClient = function (name, email, redirect_uri, secretLength, done) {
  if (typeof secretLength === 'function') {
    done = secretLength;
    secretLength = undefined;
  }

  secretLength = secretLength || DEFAULT_SECRET_LENGTH;
  done = done || function (err, client) { };

  var secret = uid.sync(secretLength);
  var client = new this({
    name: name,
    email: email,
    secret: secret,
    redirect_uri: redirect_uri
  });

  client.save (function (err) {
    return err ? done(err) : done(null, client);
  });
};

schema.statics.upsertClient = function (name, email, redirect_uri, secretLength, done) {
  if (typeof secretLength === 'function') {
    done = secretLength;
    secretLength = undefined;
  }

  secretLength = secretLength || DEFAULT_SECRET_LENGTH;
  done = done || function (err, client) {
    };

  var secret = uid.sync(secretLength);
  var client = new this({
    name: name,
    email: email,
    secret: secret,
    redirect_uri: redirect_uri
  });

  var upsertData = client.toObject();
  delete upsertData._id;

  this.findOneAndUpdate({name: client.name}, upsertData, {upsert: true, new: true}, done);
};

const COLLECTION_NAME = 'gatekeeper_client';
module.exports = exports = blueprint.model (COLLECTION_NAME, schema);
