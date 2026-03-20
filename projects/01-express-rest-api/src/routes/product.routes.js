const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', authenticate, validate(schemas.createProduct), createProduct);
router.put('/:id', authenticate, validate(schemas.updateProduct), updateProduct);
router.delete('/:id', authenticate, deleteProduct);

module.exports = router;
