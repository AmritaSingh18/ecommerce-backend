const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
require('dotenv').config();

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const register = async (req, res, next) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return sendError(res, 'first_name, last_name, email and password are required', 400);
    }
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing.length > 0) {
      return sendError(res, 'Email already registered', 409);
    }
    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO customers (first_name, last_name, email, phone, password_hash) VALUES (?,?,?,?,?)',
      [first_name, last_name, email, phone || null, password_hash]
    );
    const token = generateToken({ id: result.insertId, email });
    sendSuccess(res, { token, customer_id: result.insertId }, 'Registered successfully', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }
    const [rows] = await pool.query('SELECT * FROM customers WHERE email = ?', [email]);
    if (rows.length === 0) {
      return sendError(res, 'Invalid credentials', 401);
    }
    const customer = rows[0];
    if (!customer.is_active) {
      return sendError(res, 'Account is deactivated', 403);
    }
    const match = await bcrypt.compare(password, customer.password_hash);
    if (!match) {
      return sendError(res, 'Invalid credentials', 401);
    }
    const token = generateToken({ id: customer.id, email: customer.email });
    sendSuccess(res, {
      token,
      customer: {
        id: customer.id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email
      }
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, first_name, last_name, email, phone, created_at FROM customers WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return sendError(res, 'Customer not found', 404);
    sendSuccess(res, rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
