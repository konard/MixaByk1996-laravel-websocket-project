const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    return res.status(422).json({ success: false, message: 'Validation error', errors: details });
  }
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createProduct: Joi.object({
    name: Joi.string().max(200).required(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().min(0).required(),
    stock: Joi.number().min(0).default(0),
    category: Joi.string().required(),
  }),

  updateProduct: Joi.object({
    name: Joi.string().max(200).optional(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().min(0).optional(),
    stock: Joi.number().min(0).optional(),
    category: Joi.string().optional(),
  }).min(1),
};

module.exports = { validate, schemas };
