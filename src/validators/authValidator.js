// validators/authValidators.js

const { body } = require('express-validator');

const registerValidator = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('role').optional().isIn(['academy', 'exam_manager', 'judge', 'participant']),
];

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password required'),
];

// ✅ export everything at the bottom
module.exports = {
  registerValidator,
  loginValidator,
};
