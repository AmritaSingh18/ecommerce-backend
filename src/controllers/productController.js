const { pool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getAllProducts = async (req, res, next) => {
  try {
    const { category_id, min_price, max_price, search, page = 1, limit = 10 } = req.query;
    let query = `SELECT p.*, c.name AS category FROM products p
                 LEFT JOIN categories c ON c.id = p.category_id
                 WHERE p.is_active = 1`;
    const params = [];
    if (category_id) { query += ' AND p.category_id = ?'; params.push(category_id); }
    if (min_price)   { query += ' AND p.base_price >= ?'; params.push(min_price); }
    if (max_price)   { query += ' AND p.base_price <= ?'; params.push(max_price); }
    if (search)      { query += ' AND p.name LIKE ?';     params.push(`%${search}%`); }
    const offset = (page - 1) * limit;
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(query, params);
    sendSuccess(res, rows);
  } catch (err) { next(err); }
};

const getProductById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? AND p.is_active = 1`, [req.params.id]);
    if (rows.length === 0) return sendError(res, 'Product not found', 404);
    const [variants] = await pool.query(
      `SELECT pv.id, pv.sku, pv.price_delta, pv.stock_qty,
              (p.base_price + pv.price_delta) AS final_price,
              GROUP_CONCAT(CONCAT(va.name,': ',vav.value) ORDER BY va.name SEPARATOR ' | ') AS attributes
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       JOIN variant_option_values vov ON vov.variant_id = pv.id
       JOIN variant_attribute_values vav ON vav.id = vov.attribute_value_id
       JOIN variant_attributes va ON va.id = vav.attribute_id
       WHERE pv.product_id = ? AND pv.is_active = 1
       GROUP BY pv.id`, [req.params.id]);
    const [reviews] = await pool.query(
      `SELECT r.rating, r.body, r.is_verified, r.created_at,
              CONCAT(c.first_name,' ',c.last_name) AS customer
       FROM reviews r
       JOIN customers c ON c.id = r.customer_id
       WHERE r.product_id = ? ORDER BY r.created_at DESC`, [req.params.id]);
    sendSuccess(res, { ...rows[0], variants, reviews });
  } catch (err) { next(err); }
};

const getProductStats = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v_product_stats ORDER BY total_revenue DESC');
    sendSuccess(res, rows);
  } catch (err) { next(err); }
};

const getLowStock = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v_low_stock_alert');
    sendSuccess(res, rows);
  } catch (err) { next(err); }
};

module.exports = { getAllProducts, getProductById, getProductStats, getLowStock };
