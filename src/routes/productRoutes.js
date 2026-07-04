const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, getProductStats, getLowStock } = require('../controllers/productController');
const { protect } = require('../middleware/auth');

router.get('/',          getAllProducts);
router.get('/stats',     protect, getProductStats);
router.get('/lowstock',  protect, getLowStock);
router.get('/:id',       getProductById);

module.exports = router;
