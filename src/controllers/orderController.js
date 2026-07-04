const { pool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getMyOrders = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.status, o.subtotal, o.tax, o.shipping_fee,
              o.discount_amt, o.total, o.placed_at,
              p.method AS payment_method, p.status AS payment_status
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.customer_id = ?
       ORDER BY o.placed_at DESC`, [req.user.id]);
    sendSuccess(res, rows);
  } catch (err) { next(err); }
};

const getOrderById = async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, p.method AS payment_method, p.status AS payment_status,
              p.transaction_ref,
              CONCAT_WS(', ', a.street_line1, a.city, a.state, a.postal_code) AS shipping_address
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
       LEFT JOIN addresses a ON a.id = o.shipping_address_id
       WHERE o.id = ? AND o.customer_id = ?`, [req.params.id, req.user.id]);
    if (orders.length === 0) return sendError(res, 'Order not found', 404);
    const [items] = await pool.query(
      `SELECT oi.quantity, oi.unit_price, oi.line_total,
              pr.name AS product_name, pr.sku
       FROM order_items oi
       JOIN products pr ON pr.id = oi.product_id
       WHERE oi.order_id = ?`, [req.params.id]);
    sendSuccess(res, { ...orders[0], items });
  } catch (err) { next(err); }
};

const placeOrder = async (req, res, next) => {
  try {
    const { address_id, payment_method, items, coupon_code } = req.body;
    if (!address_id || !payment_method || !items || items.length === 0) {
      return sendError(res, 'address_id, payment_method and items are required', 400);
    }
    const [addr] = await pool.query(
      'SELECT id FROM addresses WHERE id = ? AND customer_id = ?',
      [address_id, req.user.id]);
    if (addr.length === 0) return sendError(res, 'Address not found', 404);

    const itemsJson = JSON.stringify(items);
    const [result] = await pool.query(
      'CALL sp_place_order(?, ?, ?, ?, @order_id, @message)',
      [req.user.id, address_id, payment_method, itemsJson]);
    const [[out]] = await pool.query('SELECT @order_id AS order_id, @message AS message');

    if (!out.order_id) return sendError(res, out.message, 400);

    if (coupon_code) {
      const [[order]] = await pool.query('SELECT total FROM orders WHERE id = ?', [out.order_id]);
      const [coup] = await pool.query(
        'CALL sp_apply_coupon(?, ?, ?, NULL, @discount, @msg)',
        [coupon_code, req.user.id, order.total]);
      const [[coupOut]] = await pool.query('SELECT @discount AS discount, @msg AS msg');
      if (coupOut.discount > 0) {
        const [couponRow] = await pool.query('SELECT id FROM coupons WHERE code = ?', [coupon_code]);
        await pool.query(
          'UPDATE orders SET coupon_id = ?, discount_amt = ? WHERE id = ?',
          [couponRow[0].id, coupOut.discount, out.order_id]);
        await pool.query(
          'INSERT INTO coupon_usages (coupon_id, order_id, customer_id, discount_amt) VALUES (?,?,?,?)',
          [couponRow[0].id, out.order_id, req.user.id, coupOut.discount]);
      }
    }
    sendSuccess(res, { order_id: out.order_id, message: out.message }, 'Order placed', 201);
  } catch (err) { next(err); }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'Status is required', 400);
    await pool.query('CALL sp_update_order_status(?, ?, @success, @message)', [req.params.id, status]);
    const [[out]] = await pool.query('SELECT @success AS success, @message AS message');
    if (!out.success) return sendError(res, out.message, 400);
    sendSuccess(res, null, out.message);
  } catch (err) { next(err); }
};

module.exports = { getMyOrders, getOrderById, placeOrder, updateOrderStatus };
