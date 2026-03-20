const Product = require('../models/Product');
const cache = require('../services/cache.service');

const CACHE_PREFIX = 'products';
const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/products
 */
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search, sort = '-createdAt' } = req.query;
    const skip = (page - 1) * limit;

    const cacheKey = `${CACHE_PREFIX}:list:${JSON.stringify(req.query)}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const filter = {};
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    const response = {
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
    };

    await cache.set(cacheKey, response, CACHE_TTL);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 */
const getProduct = async (req, res, next) => {
  try {
    const cacheKey = `${CACHE_PREFIX}:${req.params.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const product = await Product.findById(req.params.id).populate('createdBy', 'name email');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const response = { success: true, data: product };
    await cache.set(cacheKey, response, CACHE_TTL);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });
    await cache.delPattern(`${CACHE_PREFIX}:list:*`);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await cache.del(`${CACHE_PREFIX}:${req.params.id}`);
    await cache.delPattern(`${CACHE_PREFIX}:list:*`);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await product.deleteOne();
    await cache.del(`${CACHE_PREFIX}:${req.params.id}`);
    await cache.delPattern(`${CACHE_PREFIX}:list:*`);

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
