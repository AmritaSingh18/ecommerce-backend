const express = require('express');
const router = express.Router();
const { getMyOrders, getOrderById, placeOrder, updateOrderStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/',         protect, getMyOrders);
router.get('/:id',      protect, getOrderById);
router.post('/',        protect, placeOrder);
router.patch('/:id',    protect, updateOrderStatus);

module.exports = router;
