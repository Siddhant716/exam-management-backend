const { validationResult } = require('express-validator');

const validateRequest = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errors.array();
  }
  return null;
};

module.exports = { validateRequest };
