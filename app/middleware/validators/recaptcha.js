'use strict';

module.exports = {
  recaptcha: {
    in: 'body',
    isLength: {
      options: {min: 1},
      errorMessage: 'This field is required.'
    }
  }
};
