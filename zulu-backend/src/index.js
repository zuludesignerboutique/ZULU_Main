const path = require('path');
const dotenv = require("dotenv");

// Load .env from the backend folder regardless of the process cwd (so the
// same server can be started from the repo root when combined with the app).
// Must run before the requires below read process.env.
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require("express");
const cors = require("cors");
const { db } = require('./db');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ── Base URL for links inside customer emails (e.g. "View Order" button) ──
// Falls back to the local dev server until FRONTEND_URL is set in .env for production.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const ORDER_HISTORY_URL = `${FRONTEND_URL}/dashboard/order-history`;

/* ── JWT Auth Middleware ─────────────────────────── */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ error: 'Admin access required' });
};

// Escape user input before it is interpolated into HTML emails.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Simple in-memory sliding rate limiter for brute-force protection on
// login/signup. Keyed by IP + email so one client cannot lock out another.
const rateLimitStore = new Map();
function rateLimiter({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const key = `${keyPrefix}:${req.ip}:${email}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    rateLimitStore.set(key, entry);
    // Prune stale entries occasionally so the map cannot grow unbounded.
    if (rateLimitStore.size > 10000) {
      for (const [k, v] of rateLimitStore) {
        if (v.resetAt < now) rateLimitStore.delete(k);
      }
    }
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    }
    next();
  };
}

const app = express();

// Restrict CORS to the configured frontend origin(s). FRONTEND_URL can be a
// comma-separated list. When unset (local dev), allow any origin.
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!ALLOWED_ORIGINS.length || !origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());

/* =========================
   DATABASE (Supabase / PostgreSQL)
========================= */

// The connection pool + mysql2-compatible query adapter live in ./db.js.
// Verify connectivity at boot and seed any missing sellable balances.
// Table/column schema is managed by schema.postgres.sql (run once in Supabase).
db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to Zulu DB (PostgreSQL)");
    backfillSellableBalances();
  }
});
/* =========================
razorpay CONFIG
========================= */  
const Razorpay = require('razorpay');
const crypto   = require('crypto');
 
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* =========================
   RAZORPAY ROUTES
========================= */

// POST /api/razorpay/create-order
app.post('/api/razorpay/create-order', async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  try {
    const options = {
      amount:   Math.round(amount * 100),
      currency: 'INR',
      receipt:  `zulu_rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      key:       process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay create order error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/razorpay/verify-payment
app.post('/api/razorpay/verify-payment', (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ verified: false, error: 'Invalid payment signature' });
  }

  // ✅ Payment verified — attach payment_id, then this is the one place
  // "order placed successfully" emails fire from (not on order creation).
  db.query('UPDATE orders SET payment_id = ? WHERE id = ?', [razorpay_payment_id, orderId], (errU) => {
    if (errU) console.error('Failed to attach payment_id:', errU);

    db.query(
      `SELECT oi.*, p.name AS product_name
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id AND p.brand = oi.brand
       WHERE oi.order_id = ?`,
      [orderId],
      (errI, itemRows) => {
        if (errI) console.error('Failed to fetch order items for email:', errI);

        db.query('SELECT * FROM orders WHERE id = ?', [orderId], (errO, orderRows) => {
          if (errO) console.error('Failed to fetch order for email:', errO);

          if (!errO && orderRows && orderRows.length && orderRows[0].email) {
            const o = orderRows[0];
            const orderData = {
              orderId:      o.id,
              user_name:    o.user_name,
              email:        o.email,
              phone:        o.phone,
              address:      o.address,
              total_amount: o.total_amount
            };
            sendOrderConfirmation(orderData, itemRows || []);
            sendAdminNotification(orderData, itemRows || []);
          }

          res.json({ verified: true, paymentId: razorpay_payment_id });
        });
      }
    );
  });
});

/* =========================
   FILE UPLOAD CONFIG
========================= */

const storageApi = require('./storage');

const upload = multer({ storage: multer.memoryStorage() });

// Persist any uploaded buffers to Supabase Storage (or the local ./uploads
// fallback) and assign `file.filename` so the existing route code is unchanged.
// Must run right after a multer middleware.
function persistUploads() {
  return (req, res, next) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
      if (Array.isArray(req.files)) files.push(...req.files);
      else Object.keys(req.files).forEach((k) => files.push(...req.files[k]));
    }
    if (!files.length) return next();
    Promise.all(files.map((f) =>
      storageApi.saveBuffer(f.buffer, f.originalname)
        .then((name) => { f.filename = name; delete f.buffer; })
    ))
      .then(() => next())
      .catch((err) => {
        console.error('Upload persist error:', err);
        res.status(500).json({ error: 'File upload failed' });
      });
  };
}

// Extract stored filenames from image_url rows (/uploads/<name>) and delete
// the files from storage (Supabase or local ./uploads). Used when products,
// gallery rows, etc. are removed so orphaned files are cleaned up too.
function deleteStoredImages(imageUrls) {
  const names = (imageUrls || [])
    .filter((u) => typeof u === 'string' && u.startsWith('/uploads/'))
    .map((u) => u.replace(/^\/uploads\//, ''));
  return Promise.all(names.map((n) => storageApi.deleteFile(n).catch(() => {})));
}

// Serve uploaded images. In cloud mode (Supabase configured) redirect to the
// public bucket URL so `/uploads/<name>` keeps working unchanged; otherwise
// fall back to serving the local uploads directory.
app.use('/uploads', (req, res, next) => {
  const pub = storageApi.PUBLIC_URL();
  const name = req.path.replace(/^\//, '');
  if (pub) {
    if (!name || name.includes('..') || name.includes('\\')) return res.status(404).end();
    return res.redirect(302, pub + encodeURIComponent(name));
  }
  express.static(storageApi.LOCAL_DIR)(req, res, next);
});

/* =========================
   EMAIL SETUP
========================= */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Look up product name + code per line item for a single order ──────
// Used by the cancellation-approved email, which shows product details
// instead of a bare order number.
function getOrderItemsForEmail(orderId, callback) {
  const sql = `
    SELECT
      COALESCE(p.name, pp.name, pf.name, pa.name, oi.product_code, 'Product') AS product_name,
      oi.product_code AS product_code,
      oi.quantity AS quantity
    FROM order_items oi
    LEFT JOIN products           p  ON p.id  = oi.product_id AND oi.brand = 'zulu'
    LEFT JOIN pooboo_products    pp ON pp.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'apparel'
    LEFT JOIN pooboo_fabrics     pf ON pf.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'fabric'
    LEFT JOIN pooboo_accessories pa ON pa.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'accessory'
    WHERE oi.order_id = ?
  `;
  db.query(sql, [orderId], (err, rows) => {
    if (err) {
      console.error('getOrderItemsForEmail error:', err);
      return callback([]);
    }
    callback(rows);
  });
}

// ── Raw order line items (id/brand/type/code/qty) for stock adjustments ──────
function fetchStockAdjustItems(orderId, callback) {
  db.query(
    'SELECT product_id, brand, product_type, product_code, quantity FROM order_items WHERE order_id = ?',
    [orderId],
    (err, rows) => {
      if (err) {
        console.error('fetchStockAdjustItems error:', err);
        return callback([]);
      }
      callback(rows || []);
    }
  );
}

// ── Adjust sellable balance stock for order line items ──────────────
// deltaQty is negative to decrement (a sale) or positive to restore
// (cancelled/abandoned order). Balance is clamped at 0 so it can never
// go negative; total stock is NEVER touched automatically.
function adjustBalanceForItems(items, deltaQty, done) {
  if (!Array.isArray(items) || !items.length) {
    if (done) done();
    return;
  }

  let idx = 0;
  const processNext = () => {
    if (idx >= items.length) {
      if (done) done();
      return;
    }
    const item = items[idx++];
    const qty = Math.abs(parseInt(item.quantity) || 0);
    const delta = deltaQty * qty;
    const brand = (item.brand || 'zulu').toLowerCase();
    const type  = (item.product_type || 'apparel').toLowerCase();

    adjustOneItemBalance(brand, type, item, delta, processNext);
  };
  processNext();
}

// Route one line item to the right balance column across source + unified tables.
function adjustOneItemBalance(brand, type, item, delta, done) {
  const queries = [];

  if (brand === 'zulu' && type === 'apparel') {
    queries.push({
      sql: `UPDATE products SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE id = ? AND brand = 'zulu'`,
      params: [delta, item.product_id]
    });
  } else if (brand === 'pooboo') {
    const code = item.product_code || '';
    if (type === 'apparel') {
      queries.push({
        sql: `UPDATE pooboo_products SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE id = ?`,
        params: [delta, item.product_id]
      });
      if (code) queries.push({
        sql: `UPDATE products SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE brand='pooboo' AND product_type='apparel' AND product_code = ?`,
        params: [delta, code]
      });
    } else if (type === 'fabric') {
      queries.push({
        sql: `UPDATE pooboo_fabrics SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE id = ?`,
        params: [delta, item.product_id]
      });
      if (code) queries.push({
        sql: `UPDATE products SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE brand='pooboo' AND product_type='fabric' AND product_code = ?`,
        params: [delta, code]
      });
    } else if (type === 'accessory') {
      queries.push({
        sql: `UPDATE pooboo_accessories SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE id = ?`,
        params: [delta, item.product_id]
      });
      if (code) queries.push({
        sql: `UPDATE products SET balance_stock = GREATEST(balance_stock + ?, 0) WHERE brand='pooboo' AND product_type='accessory' AND product_code = ?`,
        params: [delta, code]
      });
    }
  }

  if (!queries.length) return done();

  let pending = queries.length;
  const complete = () => { if (--pending <= 0) done(); };
  queries.forEach(q => db.query(q.sql, q.params, (err) => {
    if (err) console.error('Stock adjust query error:', err.message);
    complete();
  }));
}

// ── Product-name label for customer emails — "Anarkali Gown" or
// "Anarkali Gown +2 more" — used everywhere a customer email would otherwise
// have shown a bare order number. Order numbers stay admin-only.
function buildProductLabel(items) {
  if (!Array.isArray(items) || !items.length) return 'your order';
  const name = items[0].product_name || items[0].product_code || 'Product';
  return items.length > 1 ? `${name} +${items.length - 1} more` : name;
}

// ── Shared product name/code list, used across the customer transactional emails ──
function buildEmailItemsList(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<table style="width:100%;max-width:400px;margin:0 auto 20px;border-collapse:collapse;text-align:left;">
    <tbody>
      ${items.map(it => `
        <tr>
          <td style="padding:7px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:13px;color:#1a1814;">
            ${it.product_name || 'Product'}
            ${it.product_code ? `<span style="display:block;font-size:10px;color:#9a9080;letter-spacing:0.06em;">Code: ${it.product_code}</span>` : ''}
          </td>
          <td style="padding:7px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:12px;color:#9a9080;text-align:right;white-space:nowrap;">
            ×${it.quantity || 1}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

// ── Shared item rows HTML builder ──────────────────────
function buildItemRows(items) {
  return items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ece4;">${item.product_name || item.name || 'Product'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ece4;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f0ece4;text-align:right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');
}

// ── Customer confirmation email ────────────────────────
function sendOrderConfirmation(order, items) {
  const itemRows = buildItemRows(items);

  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `✨ Order Placed — ${buildProductLabel(items)} | ZULU Boutique`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:40px 40px 32px;text-align:center;">
            <h1 style="font-size:36px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:10px;letter-spacing:4px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Boutique</p>
            <p style="font-size:11px;letter-spacing:2px;color:rgba(240,236,228,0.45);margin:8px 0 0;text-transform:uppercase;">Where Elegance Meets Identity</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:40px;">
            <p style="font-size:11px;letter-spacing:3px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Order Placed</p>
            <h2 style="font-size:28px;color:#1a1814;margin:0 0 16px;font-weight:400;">Thank You, ${order.user_name}!</h2>
            <p style="font-size:14px;color:#9a9080;line-height:1.7;margin:0 0 28px;">Your order has been placed successfully. We'll confirm and dispatch it shortly.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <thead>
                <tr style="background:#faf8f5;">
                  <th style="padding:10px 8px;text-align:left;font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;font-weight:600;">Item</th>
                  <th style="padding:10px 8px;text-align:center;font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;font-weight:600;">Qty</th>
                  <th style="padding:10px 8px;text-align:right;font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;font-weight:600;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding:14px 8px;font-size:13px;font-weight:700;color:#1a1814;">Total</td>
                  <td style="padding:14px 8px;text-align:right;font-size:18px;font-weight:700;color:#1a1814;">₹${Number(order.total_amount).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
            <div style="background:#faf8f5;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
              <p style="font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;margin:0 0 6px;">Delivering to</p>
              <p style="font-size:13px;color:#1a1814;margin:0;line-height:1.6;">${order.address}</p>
            </div>
            <div style="text-align:center;border-top:1px solid #f0ece4;padding-top:24px;margin-top:8px;">
              <p style="font-size:12px;color:#9a9080;margin:0;">🚚 Delivery in 10–15 business days &nbsp;·&nbsp; 📦 Track via order history</p>
            </div>
          </div>
          <div style="background:#0d0d0d;padding:24px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;letter-spacing:1px;">© 2024 ZULU Boutique. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Customer email error:', err);
    else console.log(`✅ Confirmation email sent to ${order.email}`);
  });
}

// ── Admin notification email ───────────────────────────
function sendAdminNotification(order, items) {
  const itemRows = buildItemRows(items);

  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: `🛍️ New Order #${order.orderId} — ₹${Number(order.total_amount).toLocaleString('en-IN')}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:32px 40px;text-align:center;">
            <h1 style="font-size:28px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU Admin</h1>
            <p style="font-size:11px;letter-spacing:2px;color:#c8a96e;margin:8px 0 0;text-transform:uppercase;">New Order Alert</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:32px 40px;">
            <p style="font-size:20px;font-weight:600;color:#1a1814;margin:0 0 20px;">Order #${order.orderId}</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tbody>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Customer</td><td style="padding:8px 0;font-weight:600;color:#1a1814;">${order.user_name}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Phone</td><td style="padding:8px 0;color:#1a1814;">${order.phone}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Email</td><td style="padding:8px 0;color:#1a1814;">${order.email || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Address</td><td style="padding:8px 0;color:#1a1814;">${order.address}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Total</td><td style="padding:8px 0;font-size:18px;font-weight:700;color:#c8a96e;">₹${Number(order.total_amount).toLocaleString('en-IN')}</td></tr>
              </tbody>
            </table>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#faf8f5;">
                  <th style="padding:10px 8px;text-align:left;font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;">Item</th>
                  <th style="padding:10px 8px;text-align:center;font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;">Qty</th>
                  <th style="padding:10px 8px;text-align:right;font-size:10px;letter-spacing:2px;color:#9a9080;text-transform:uppercase;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </div>
          <div style="background:#0d0d0d;padding:20px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;">© 2024 ZULU Boutique Admin</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Admin email error:', err);
    else console.log('✅ Admin notification sent');
  });
}

// ── Order confirmed email (admin manually sets status → confirmed) ────
function sendOrderConfirmedEmail(order, items) {
  const productLabel = buildProductLabel(items);
  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `✅ Order Confirmed — ${productLabel} | ZULU Boutique`,
    html: `
      <!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:40px 40px 32px;text-align:center;">
            <h1 style="font-size:36px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:10px;letter-spacing:4px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Boutique</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:40px;text-align:center;">
            <p style="font-size:11px;letter-spacing:3px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Order Confirmed</p>
            <h2 style="font-size:26px;color:#1a1814;margin:0 0 16px;font-weight:400;">We've confirmed your order, ${order.user_name}!</h2>
            ${buildEmailItemsList(items)}
            <p style="font-size:14px;color:#9a9080;line-height:1.7;margin:0;">Your order — <strong>${productLabel}</strong> — is now being prepared for dispatch.</p>
          </div>
          <div style="background:#0d0d0d;padding:24px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;letter-spacing:1px;">© 2024 ZULU Boutique. All rights reserved.</p>
          </div>
        </div>
      </body></html>
    `
  };
  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Order confirmed email error:', err);
    else console.log(`✅ Confirmed email sent to ${order.email}`);
  });
}

// ── Status update email (shipped / delivered / cancelled) ─────────────
function sendStatusUpdateEmail(order, status, items) {
  const statusText = { shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }[status] || status;
  const productLabel = buildProductLabel(items);
  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `📦 ${statusText} — ${productLabel} | ZULU Boutique`,
    html: `
      <!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:40px 40px 32px;text-align:center;">
            <h1 style="font-size:36px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:10px;letter-spacing:4px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Boutique</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:40px;text-align:center;">
            <p style="font-size:11px;letter-spacing:3px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Order Update</p>
            <h2 style="font-size:26px;color:#1a1814;margin:0 0 16px;font-weight:400;">Your order — ${productLabel} — is now ${statusText}</h2>
            ${buildEmailItemsList(items)}
          </div>
          <div style="background:#0d0d0d;padding:24px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;letter-spacing:1px;">© 2024 ZULU Boutique. All rights reserved.</p>
          </div>
        </div>
      </body></html>
    `
  };
  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Status update email error:', err);
    else console.log(`✅ Status update (${status}) email sent to ${order.email}`);
  });
}

// ── Cancellation requested email (customer just asked to cancel) ──────
function sendCancellationRequestedEmail(order, items) {
  const productLabel = buildProductLabel(items);
  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `⏳ Cancellation Requested — ${productLabel} | ZULU Boutique`,
    html: `
      <!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:40px 40px 32px;text-align:center;">
            <h1 style="font-size:36px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:10px;letter-spacing:4px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Boutique</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:40px;text-align:center;">
            <p style="font-size:11px;letter-spacing:3px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Cancellation Requested</p>
            <h2 style="font-size:26px;color:#1a1814;margin:0 0 16px;font-weight:400;">We've received your request, ${order.user_name}</h2>
            ${buildEmailItemsList(items)}
            <p style="font-size:14px;color:#9a9080;line-height:1.7;margin:0;">
              Your cancellation request for <strong>${productLabel}</strong> has been sent to our team for review.
              We'll email you as soon as it's been processed.
            </p>
          </div>
          <div style="background:#0d0d0d;padding:24px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;letter-spacing:1px;">© 2024 ZULU Boutique. All rights reserved.</p>
          </div>
        </div>
      </body></html>
    `
  };
  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Cancellation requested email error:', err);
    else console.log(`✅ Cancellation-requested email sent to ${order.email}`);
  });
}

// ── Cancellation approved email (sent once the refund is actually completed —
//    NOT at the moment admin approves; see /complete-refund endpoint) ─────
function sendCancellationApprovedEmail(order, refundAmount, penaltyAmount) {
  const penaltyLine = penaltyAmount > 0
    ? `<p style="font-size:13px;color:#9a9080;line-height:1.7;margin:0 0 12px;">
         As per our cancellation policy, since this order was already confirmed, a 25% cancellation fee
         of <strong>₹${Number(penaltyAmount).toLocaleString('en-IN')}</strong> has been applied.
       </p>`
    : '';

  const items = Array.isArray(order.items) ? order.items : [];
  const productLabel = buildProductLabel(items);

  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `✅ Cancellation Approved — ${productLabel} | ZULU Boutique`,
    html: `
      <!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:40px 40px 32px;text-align:center;">
            <h1 style="font-size:36px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:10px;letter-spacing:4px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Boutique</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:40px;text-align:center;">
            <p style="font-size:11px;letter-spacing:3px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Cancellation Approved</p>
            <h2 style="font-size:26px;color:#1a1814;margin:0 0 20px;font-weight:400;">Your order has been cancelled</h2>
            ${buildEmailItemsList(items)}
            ${penaltyLine}
            <p style="font-size:14px;color:#1a1814;line-height:1.7;margin:0 0 4px;">
              Refund amount: <strong>₹${Number(refundAmount).toLocaleString('en-IN')}</strong>
            </p>
            <p style="font-size:13px;color:#9a9080;line-height:1.7;margin:0;">
              This refund has been processed and credited back to you.
            </p>
            <div style="margin:28px 0 4px;">
              <a href="${ORDER_HISTORY_URL}" style="display:inline-block;padding:13px 34px;background:linear-gradient(135deg,#b76e79,#c8a96e);color:#0d0d0d;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:40px;">View Order</a>
            </div>
          </div>
          <div style="background:#0d0d0d;padding:24px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;letter-spacing:1px;">© 2024 ZULU Boutique. All rights reserved.</p>
          </div>
        </div>
      </body></html>
    `
  };
  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Cancellation approved email error:', err);
    else console.log(`✅ Cancellation-approved email sent to ${order.email}`);
  });
}

// ── Cancellation rejected email (admin declined the request) ──────────
function sendCancellationRejectedEmail(order, items) {
  const productLabel = buildProductLabel(items);
  const mailOptions = {
    from: `"ZULU Boutique" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Cancellation Update — ${productLabel} | ZULU Boutique`,
    html: `
      <!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:40px 40px 32px;text-align:center;">
            <h1 style="font-size:36px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:10px;letter-spacing:4px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Boutique</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:40px;text-align:center;">
            <p style="font-size:11px;letter-spacing:3px;color:#c8a96e;text-transform:uppercase;margin:0 0 8px;">Cancellation Request</p>
            <h2 style="font-size:26px;color:#1a1814;margin:0 0 16px;font-weight:400;">We couldn't process your cancellation</h2>
            ${buildEmailItemsList(items)}
            <p style="font-size:14px;color:#9a9080;line-height:1.7;margin:0;">
              Your cancellation request for <strong>${productLabel}</strong> was not approved.
              Your order remains active and will continue as usual.
            </p>
            <div style="margin:28px 0 4px;">
              <a href="${ORDER_HISTORY_URL}" style="display:inline-block;padding:13px 34px;background:linear-gradient(135deg,#b76e79,#c8a96e);color:#0d0d0d;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;border-radius:40px;">View Order</a>
            </div>
          </div>
          <div style="background:#0d0d0d;padding:24px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.3);margin:0;letter-spacing:1px;">© 2024 ZULU Boutique. All rights reserved.</p>
          </div>
        </div>
      </body></html>
    `
  };
  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('Cancellation rejected email error:', err);
    else console.log(`✅ Cancellation-rejected email sent to ${order.email}`);
  });
}

/* =========================
   AUTH ROUTES
========================= */

// POST /login
const loginHandler = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  db.query('SELECT * FROM users WHERE email = ?', [cleanEmail], (err, results) => {
    if (err) {
      console.error('Login DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = results[0];

    // Check if stored password is already bcrypt-hashed (starts with $2b$, $2a$, $2y$)
    const isBcrypt = /^\$2[aby]\$/.test(user.password);

    if (isBcrypt) {
      bcrypt.compare(password, user.password, (err, match) => {
        if (err) return res.status(500).json({ error: 'Authentication error' });
        if (match) return loginSuccess();
        return res.status(401).json({ error: 'Invalid email or password' });
      });
    } else {
      // Plain text comparison for legacy users — migrate on success
      if (password !== user.password) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      bcrypt.hash(password, 10, (_, hashed) => {
        db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id], () => {});
      });
      loginSuccess();
    }

    function loginSuccess() {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log(`Login success: ${user.email} (${user.role})`);
      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }
  });
};

// Mounted under /api as well: Vercel only routes /api/* to the serverless
// function (root /login cannot be POSTed to — see vercel.json), so the
// frontend calls /api/login.
app.post('/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'login' }), loginHandler);
app.post('/api/login', rateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'login' }), loginHandler);

// POST /signup
const signupHandler = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  db.query('SELECT id FROM users WHERE email = ?', [cleanEmail], (err, results) => {
    if (err) {
      console.error('Signup check DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Bcrypt hash error:', err);
        return res.status(500).json({ error: 'Signup failed' });
      }

      db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, cleanEmail, hashedPassword, 'user'],
        (err2, result) => {
          if (err2) {
            console.error('Signup insert error:', err2);
            return res.status(500).json({ error: 'Signup failed' });
          }

          const token = jwt.sign(
            { id: result.insertId, email: cleanEmail, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          console.log(`New user registered: ${cleanEmail}`);

          res.status(201).json({
            message: 'Account created successfully',
            token,
            user: { id: result.insertId, name, email: cleanEmail, role: 'user' }
          });
        }
      );
    });
  });
};

app.post('/signup', rateLimiter({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'signup' }), signupHandler);
app.post('/api/signup', rateLimiter({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'signup' }), signupHandler);

// Passwords are now hashed with bcrypt

/* =========================
   HELPER FUNCTIONS
========================= */

// Accept sizes as comma string "S,M,L" or JSON array, always store as JSON
// Accept sizes as comma string "S,M,L" or JSON array; return a JS array so the
// pg driver serializes it into the JSONB column (no JSON.stringify strings).
function normalizeSizes(sizes) {
  if (!sizes) return [];
  if (Array.isArray(sizes)) return sizes.filter(Boolean);
  try {
    const parsed = JSON.parse(sizes);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return sizes.split(',').map(s => s.trim()).filter(Boolean);
  }
}

// Accept details as newline/comma string or JSON array; return a JS array.
function normalizeDetails(details) {
  if (!details) return [];
  if (Array.isArray(details)) return details.filter(Boolean);
  try {
    const parsed = JSON.parse(details);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Split by newline or bullet
    return details.split(/\n|,/)
      .map(s => s.replace(/^\*\s*/, '').trim())
      .filter(Boolean);
  }
}

// ── Multi-image helpers ──────────────────────────────────────────────
// Fetch gallery rows for a set of product ids in one query and return a
// { productId: [ { id, image_url, display_order, label }, ... ] } map,
// sorted by display_order. Used by every product GET endpoint.
function fetchProductImages(productIds, callback) {
  if (!productIds || !productIds.length) return callback({});
  db.query(
    `SELECT id, product_id, image_url, display_order, label
       FROM product_images
      WHERE product_id IN (?)
      ORDER BY display_order ASC, id ASC`,
    [productIds],
    (err, rows) => {
      if (err) {
        console.error('fetchProductImages error:', err);
        return callback({});
      }
      const map = {};
      rows.forEach(r => {
        if (!map[r.product_id]) map[r.product_id] = [];
        map[r.product_id].push({
          id: r.id,
          image_url: r.image_url,
          display_order: r.display_order,
          label: r.label
        });
      });
      callback(map);
    }
  );
}

// Attach an `images` array (defaulting to []) onto each product row.
function attachImagesToProducts(products, callback) {
  fetchProductImages(products.map(p => p.id), (imgMap) => {
    products.forEach(p => { p.images = imgMap[p.id] || []; });
    callback(products);
  });
}

// Parse the optional `labels` form field (JSON string array) sent alongside
// the uploaded files — e.g. '["Front","Back"]'. Falls back to [''] per file.
function parseImageLabels(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(l => String(l || '').trim()) : [];
  } catch {
    return [];
  }
}

// Parse the `meta` form field for bulk gallery uploads — a JSON array of
// { title, description } objects, index-aligned with the uploaded files
// (mirrors parseImageLabels above, but carries two fields per photo).
function parseGalleryMeta(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(m => ({
      title: String((m && m.title) || '').trim().slice(0, 150),
      description: String((m && m.description) || '').trim().slice(0, 500)
    }));
  } catch {
    return [];
  }
}

// Collect uploaded files regardless of which field name they arrived under
// (`image` = legacy single upload, `images` = new multi-upload).
function collectUploadedFiles(req) {
  const files = req.files || {};
  return [
    ...(Array.isArray(files.image) ? files.image : []),
    ...(Array.isArray(files.images) ? files.images : [])
  ];
}

// The thumbnail shown on listing pages is products.image_url — always keep it
// pointing at the first gallery image (or null).
function syncThumbnailFromImages(productId, nextImageUrl, callback) {
  db.query('UPDATE products SET image_url = ? WHERE id = ?', [nextImageUrl || null, productId], (err) => {
    if (err) console.error('syncThumbnailFromImages error:', err);
    if (callback) callback();
  });
}

// Re-point products.image_url at the first remaining gallery image (keeps the
// listing thumbnail in sync after add/delete/reorder operations).
function refreshThumbnail(productId, callback) {
  db.query(
    `SELECT image_url FROM product_images
      WHERE product_id = ?
      ORDER BY display_order ASC, id ASC
      LIMIT 1`,
    [productId],
    (err, rows) => {
      if (err) return callback();
      const first = rows && rows.length ? rows[0].image_url : null;
      db.query('UPDATE products SET image_url = ? WHERE id = ?', [first, productId], (uErr) => {
        if (uErr) console.error('refreshThumbnail error:', uErr);
        callback();
      });
    }
  );
}

/* =========================
newsletter API
========================= */
// POST /api/newsletter/subscribe
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const sql = `
    INSERT INTO newsletter_subscribers (email)
    VALUES (?)
    ON CONFLICT (email) DO UPDATE SET subscribed_at = now(), is_active = 1
  `;

  db.query(sql, [email.trim().toLowerCase()], (err) => {
    if (err) {
      console.error('Newsletter subscribe error:', err);
      return res.status(500).json({ error: 'Failed to subscribe' });
    }
    console.log(`✅ Newsletter subscription: ${email}`);
    res.json({ message: 'Subscribed successfully' });
  });
});
/* =========================
contact form API
========================= */
// POST /api/contact — Contact form submission
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  const mailOptions = {
    from: `"ZULU Boutique Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: `📩 New Contact Message from ${name} | ZULU Boutique`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#faf8f5;font-family:'Georgia',serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#0d0d0d;padding:32px 40px;text-align:center;">
            <h1 style="font-size:32px;color:#f0ece4;margin:0;letter-spacing:4px;font-weight:400;">ZULU</h1>
            <p style="font-size:11px;letter-spacing:2px;color:rgba(240,236,228,0.45);margin:8px 0 0;text-transform:uppercase;">New Contact Form Message</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#b76e79,#c8a96e,#b76e79);"></div>
          <div style="padding:32px 40px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;color:#9a9080;font-size:13px;width:100px;">Name</td>
                <td style="padding:10px 0;font-weight:600;color:#1a1814;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#9a9080;font-size:13px;">Email</td>
                <td style="padding:10px 0;color:#1a1814;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#9a9080;font-size:13px;vertical-align:top;">Message</td>
                <td style="padding:10px 0;color:#1a1814;line-height:1.7;">${safeMessage}</td>
              </tr>
            </table>
          </div>
          <div style="background:#0d0d0d;padding:16px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(240,236,228,0.4);margin:0;">© ZULU Boutique — Contact Notification</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error('Contact email error:', err);
      return res.status(500).json({ error: 'Failed to send message' });
    }
    console.log(`✅ Contact message from ${name} (${email})`);
    res.json({ message: 'Message sent successfully' });
  });
});

/* =========================
   PRODUCT APIs
========================= */

// GET all products (unified across brands, with optional brand/product_type/category filters)
app.get('/api/products', (req, res) => {
  const { brand, product_type, category, search, sort } = req.query;
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (brand && brand !== 'all') { sql += ' AND brand = ?'; params.push(brand); }
  if (product_type && product_type !== 'all') { sql += ' AND product_type = ?'; params.push(product_type); }
  if (category) { sql += ' AND category = ?'; params.push(category); }

  if (search && search.trim()) {
    sql += ' AND (name LIKE ? OR product_code LIKE ?)';
    const likeTerm = `%${search.trim()}%`;
    params.push(likeTerm, likeTerm);
  }

  // "Popular" isn't a sort — it's a filter to only products tagged 'Popular'.
  // LOWER() guards against any collation so free-typed "popular" still matches.
  if (sort === 'popular') {
    sql += ' AND LOWER(tag) = ?';
    params.push('popular');
  }

  const sortMap = {
    price_asc: 'price ASC',
    price_desc: 'price DESC',
    newest: 'created_at DESC'
  };
  sql += ' ORDER BY ' + (sort === 'popular' ? 'created_at DESC' : (sortMap[sort] || 'created_at DESC'));

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    // Parse JSON fields
    results.forEach(p => {
      ['sizes', 'colours', 'details'].forEach(field => {
        if (p[field] && typeof p[field] === 'string') {
          try { p[field] = JSON.parse(p[field]); } catch { p[field] = []; }
        }
      });
    });
    // Attach the multi-image gallery (falls back to [] for old single-image products)
    attachImagesToProducts(results, (withImages) => {
      res.json(withImages);
    });
  });
});

// GET /api/products/all — all products including inactive (admin only)
app.get('/api/products/all', authenticateToken, requireAdmin, (req, res) => {
  const { brand, product_type } = req.query;
  let sql = 'SELECT * FROM products';
  const params = [];
  const where = [];
  if (brand && brand !== 'all') { where.push('brand = ?'); params.push(brand); }
  if (product_type && product_type !== 'all') { where.push('product_type = ?'); params.push(product_type); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    attachImagesToProducts(results, (withImages) => {
      res.json(withImages);
    });
  });
});

// GET single product
app.get('/api/products/:id', (req, res) => {
  db.query('SELECT * FROM products WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!result.length) return res.status(404).json({ error: 'Not found' });
    const p = result[0];
    if (p.sizes && typeof p.sizes === 'string') {
      try { p.sizes = JSON.parse(p.sizes); } catch { p.sizes = p.sizes.split(',').map(s => s.trim()).filter(Boolean); }
    }
    if (p.details && typeof p.details === 'string') {
      try { p.details = JSON.parse(p.details); } catch { p.details = []; }
    }
    fetchProductImages([p.id], (imgMap) => {
      p.images = imgMap[p.id] || [];
      res.json(p);
    });
  });
});

// ADD product (admin only)
app.post('/api/products', authenticateToken, requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 4 }]), persistUploads(), (req, res) => {

  const uploaded = collectUploadedFiles(req);
  if (uploaded.length > 4) {
    return res.status(400).json({ error: 'A maximum of 4 images can be uploaded per product.' });
  }

  const labels = parseImageLabels(req.body.labels);

  const {
    name, description, price, category, subcategory,
    stock, product_code, size, tag,
    colour, fit, care, details, sizes
  } = req.body;

  // The first uploaded image becomes the listing/thumbnail image (backward compat)
  const image = uploaded.length ? uploaded[0].filename : null;

  // Normalize sizes → JSON array string
  const sizesJson = normalizeSizes(sizes);
  // Normalize details → JSON array string
  const detailsJson = normalizeDetails(details);

  const sql = `
    INSERT INTO products
    (brand, product_type, name, description, price, category, subcategory, image_url, stock, balance_stock, product_code, size, tag, colour, fit, care, details, sizes)
    VALUES ('zulu', 'apparel', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, description, price, category, subcategory, image, stock, stock || 0, product_code, size, tag || null, colour, fit, care, detailsJson, sizesJson],
    (err, result) => {
      if (err) {
        console.error("Insert product error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      const productId = result.insertId;
      if (!uploaded.length) {
        return res.json({ message: "Product added successfully", id: productId });
      }

      // Persist every uploaded image into product_images
      const rows = uploaded.map((file, i) => [
        productId,
        file.filename,
        i + 1,
        labels[i] || ''
      ]);
      const insertImages = `
        INSERT INTO product_images (product_id, image_url, display_order, label)
        VALUES ?
      `;
      db.query(insertImages, [rows], (imgErr) => {
        if (imgErr) {
          console.error("Insert product_images error:", imgErr);
          return res.status(500).json({ error: "Product created but image gallery save failed" });
        }
        res.json({ message: "Product added successfully", id: productId });
      });
    }
  );
});

// UPDATE product (admin only)
app.put("/api/products/:id", authenticateToken, requireAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 4 }]), persistUploads(), (req, res) => {
  const id = req.params.id;
  const name         = req.body.name || '';
  const description  = req.body.description || '';
  const price        = req.body.price || 0;
  const category     = req.body.category === 'null' ? '' : (req.body.category || '');
  const subcategory  = req.body.subcategory === 'null' ? '' : (req.body.subcategory || '');
  const stock        = req.body.stock === 'null' ? 0 : parseInt(req.body.stock) || 0;
  const product_code = req.body.product_code || '';
  const size         = req.body.size || '';
  const tag          = req.body.tag || null;
  const colour       = req.body.colour || '';
  const fit          = req.body.fit || '';
  const care         = req.body.care || '';
  const sizesJson    = normalizeSizes(req.body.sizes);
  const detailsJson  = normalizeDetails(req.body.details);

  const uploaded = collectUploadedFiles(req);
  if (uploaded.length > 4) {
    return res.status(400).json({ error: 'A maximum of 4 images can be uploaded per product.' });
  }

  // `image` = legacy single-file thumbnail replace; `images` = new multi-upload
  const legacyFile = Array.isArray(req.files?.image) ? req.files.image[0] : null;
  const newFiles   = Array.isArray(req.files?.images) ? req.files.images : [];
  const labels     = parseImageLabels(req.body.labels);

  db.query("SELECT image_url, stock FROM products WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error('Product image lookup error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!result.length) return res.status(404).json({ error: 'Product not found' });

    const finalImage = legacyFile ? legacyFile.filename : result[0].image_url;

    // Keep sellable balance in sync with the entered total: raising stock adds
    // the difference to balance_stock (GREATEST(...,0) guards against going
    // negative), lowering it reduces balance the same amount.
    const stockDelta = (parseInt(stock) || 0) - (parseInt(result[0].stock) || 0);

    db.query(
      `UPDATE products
       SET brand='zulu', product_type='apparel',
           name=?, description=?, price=?, category=?, subcategory=?, image_url=?,
           stock=?, balance_stock = GREATEST(balance_stock + ?, 0), product_code=?, size=?, tag=?, colour=?, fit=?, care=?, details=?, sizes=?
       WHERE id=?`,
      [name, description, price, category, subcategory, finalImage,
       stock, stockDelta, product_code, size, tag, colour, fit, care, detailsJson, sizesJson, id],
      (uErr) => {
        if (uErr) return res.status(500).json({ error: "Update failed" });

        // Enforce the 4-image cap when appending new gallery files
        if (newFiles.length) {
          db.query('SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = ?', [id], (cErr, cRes) => {
            const existingCount = cErr ? 0 : (cRes[0]?.cnt || 0);
            if (existingCount + newFiles.length > 4) {
              return res.status(400).json({ error: 'A maximum of 4 images can be uploaded per product.' });
            }
            db.query('SELECT COALESCE(MAX(display_order),0) AS mx FROM product_images WHERE product_id = ?', [id], (mErr, mRes) => {
              const start = mErr ? 0 : (mRes[0]?.mx || 0);
              const rows = newFiles.map((file, i) => [id, file.filename, start + i + 1, labels[i] || '']);
              db.query('INSERT INTO product_images (product_id, image_url, display_order, label) VALUES ?', [rows], (imgErr) => {
                if (imgErr) {
                  console.error('Insert product_images error:', imgErr);
                  return res.status(500).json({ error: 'Image gallery save failed' });
                }
                refreshThumbnail(id, () => res.json({ message: "Product updated successfully" }));
              });
            });
          });
          return;
        }

        // Legacy single-file replace — keep thumbnail + first gallery slot in sync
        if (legacyFile) {
          db.query('SELECT id FROM product_images WHERE product_id = ? AND display_order = 1', [id], (eErr, eRes) => {
            if (eRes && eRes.length) {
              db.query('UPDATE product_images SET image_url = ? WHERE id = ?', [legacyFile.filename, eRes[0].id], (upErr) => {
                if (upErr) console.error('Update product_images thumbnail row error:', upErr);
                res.json({ message: "Product updated successfully" });
              });
            } else {
              db.query(
                'INSERT INTO product_images (product_id, image_url, display_order, label) VALUES (?, ?, 1, ?)',
                [id, legacyFile.filename, labels[0] || ''],
                (inErr) => {
                  if (inErr) console.error('Insert product_images thumbnail row error:', inErr);
                  res.json({ message: "Product updated successfully" });
                }
              );
            }
          });
          return;
        }

        res.json({ message: "Product updated successfully" });
      }
    );
  });
});

// DELETE product (admin only) — also removes stored image files
app.delete("/api/products/:id", authenticateToken, requireAdmin, (req, res) => {
  db.query("SELECT image_url FROM products WHERE id = ?", [req.params.id], (selErr, rows) => {
    const imageUrls = rows && rows.length ? [rows[0].image_url] : [];
    db.query("SELECT image_url FROM product_images WHERE product_id = ?", [req.params.id], (gErr, gRows) => {
      if (gErr) console.error('Select product_images error:', gErr);
      (gRows || []).forEach((r) => imageUrls.push(r.image_url));
      deleteStoredImages(imageUrls).then(() => {
        db.query("DELETE FROM product_images WHERE product_id = ?", [req.params.id], (imgErr) => {
          if (imgErr) console.error('Delete product_images error:', imgErr);
          db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json({ message: "Product deleted" });
          });
        });
      });
    });
  });
});

// ══════════════════════════════════════════════════════
// PRODUCT IMAGE GALLERY MANAGEMENT (admin only)
// ══════════════════════════════════════════════════════

// POST /api/admin/products/:id/images — add new image(s) to an existing product
app.post('/api/admin/products/:id/images', authenticateToken, requireAdmin, upload.array('images', 4), persistUploads(), (req, res) => {
  const id = req.params.id;
  const files = req.files || [];

  if (!files.length) {
    return res.status(400).json({ error: 'No image files were uploaded.' });
  }
  if (files.length > 4) {
    return res.status(400).json({ error: 'A maximum of 4 images can be uploaded per product.' });
  }

  const labels = parseImageLabels(req.body.labels);

  db.query('SELECT COUNT(*) AS cnt FROM product_images WHERE product_id = ?', [id], (cErr, cRes) => {
    if (cErr) return res.status(500).json({ error: 'Database error' });
    const existingCount = cRes[0]?.cnt || 0;
    if (existingCount + files.length > 4) {
      return res.status(400).json({ error: 'A maximum of 4 images can be uploaded per product.' });
    }

    db.query('SELECT COALESCE(MAX(display_order),0) AS mx FROM product_images WHERE product_id = ?', [id], (mErr, mRes) => {
      const start = mErr ? 0 : (mRes[0]?.mx || 0);
      const rows = files.map((file, i) => [id, file.filename, start + i + 1, labels[i] || '']);
      db.query('INSERT INTO product_images (product_id, image_url, display_order, label) VALUES ?', [rows], (imgErr, result) => {
        if (imgErr) {
          console.error('Add product_images error:', imgErr);
          return res.status(500).json({ error: 'Image gallery save failed' });
        }
        refreshThumbnail(id, () => {
          res.json({ message: 'Image(s) added successfully', count: files.length });
        });
      });
    });
  });
});

// DELETE /api/admin/products/:id/images/:imageId — remove one gallery image
app.delete('/api/admin/products/:id/images/:imageId', authenticateToken, requireAdmin, (req, res) => {
  const { id, imageId } = req.params;

  db.query('SELECT image_url FROM product_images WHERE id = ? AND product_id = ?', [imageId, id], (selErr, rows) => {
    if (selErr) {
      console.error('Select product_images error:', selErr);
      return res.status(500).json({ error: 'Database error' });
    }
    db.query('DELETE FROM product_images WHERE id = ? AND product_id = ?', [imageId, id], (err, result) => {
      if (err) {
        console.error('Delete product_images error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Image not found' });
      }
      deleteStoredImages(rows.map((r) => r.image_url)).then(() => {
        refreshThumbnail(id, () => {
          res.json({ message: 'Image deleted successfully' });
        });
      });
    });
  });
});

// POST /api/admin/products/:id/images/reorder — set gallery order,
// body: { orderedIds: [..], labels?: { [imageId]: 'Front' } }
app.post('/api/admin/products/:id/images/reorder', authenticateToken, requireAdmin, (req, res) => {
  const id = req.params.id;
  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : null;
  const labelsMap = (req.body?.labels && typeof req.body.labels === 'object') ? req.body.labels : null;

  if (!orderedIds || !orderedIds.length) {
    return res.status(400).json({ error: 'orderedIds array is required.' });
  }

  db.query('SELECT id, label FROM product_images WHERE product_id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const owned = new Set(rows.map(r => r.id));
    if (orderedIds.some(pid => !owned.has(pid))) {
      return res.status(400).json({ error: 'Invalid image id in orderedIds.' });
    }

    const labelById = {};
    rows.forEach(r => { labelById[r.id] = r.label; });

    let pending = orderedIds.length;
    let failed = false;
    orderedIds.forEach((imageId, index) => {
      const newLabel = (labelsMap && labelsMap[String(imageId)] !== undefined)
        ? String(labelsMap[String(imageId)])
        : (labelById[imageId] || '');
      db.query(
        'UPDATE product_images SET display_order = ?, label = ? WHERE id = ? AND product_id = ?',
        [index + 1, newLabel, imageId, id],
        (uErr) => {
          if (uErr) { console.error('Reorder product_images error:', uErr); failed = true; }
          if (--pending === 0) {
            if (failed) return res.status(500).json({ error: 'Failed to update image order' });
            refreshThumbnail(id, () => {
              res.json({ message: 'Image order updated successfully' });
            });
          }
        }
      );
    });
  });
});

// ══════════════════════════════════════════════════════
// GALLERY MANAGEMENT (ZULU storefront Gallery page)
// ══════════════════════════════════════════════════════

// GET /api/gallery — public; powers the storefront Gallery page and doubles
// as the admin panel's listing endpoint (nothing here is sensitive).
app.get('/api/gallery', (req, res) => {
  db.query(
    'SELECT id, title, description, image_url, display_order FROM gallery_images ORDER BY display_order ASC, id ASC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      const withUrls = rows.map(r => ({ ...r, image_url: `/uploads/${r.image_url}` }));
      res.json(withUrls);
    }
  );
});

// POST /api/admin/gallery — bulk upload; each file gets its own title/description
// via the `meta` field (JSON array, index-aligned with the uploaded files).
app.post('/api/admin/gallery', authenticateToken, requireAdmin, upload.array('images', 20), persistUploads(), (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'No image files were uploaded.' });
  }

  const meta = parseGalleryMeta(req.body.meta);

  db.query('SELECT COALESCE(MAX(display_order),0) AS mx FROM gallery_images', (mErr, mRes) => {
    const start = mErr ? 0 : (mRes[0]?.mx || 0);
    const rows = files.map((file, i) => [
      meta[i]?.title || '',
      meta[i]?.description || '',
      file.filename,
      start + i + 1
    ]);

    db.query(
      'INSERT INTO gallery_images (title, description, image_url, display_order) VALUES ?',
      [rows],
      (insErr, result) => {
        if (insErr) {
          console.error('Insert gallery_images error:', insErr);
          return res.status(500).json({ error: 'Gallery upload failed' });
        }
        // PostgreSQL returns every inserted id via RETURNING (result.rows);
        // fall back to sequential ids from the first id only if unavailable.
        const insertedIds = (result.rows || []).map((r) => r.id);
        const firstId = result.insertId;
        const inserted = rows.map((r, i) => ({
          id: insertedIds[i] ?? (firstId + i),
          title: r[0],
          description: r[1],
          image_url: `/uploads/${r[2]}`,
          display_order: r[3]
        }));
        res.json({ message: 'Uploaded successfully', images: inserted });
      }
    );
  });
});

// PATCH /api/admin/gallery/:id — edit title/description only (no re-upload;
// delete + re-add if the photo itself needs to change)
app.patch('/api/admin/gallery/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const title = String(req.body.title || '').trim().slice(0, 150);
  const description = String(req.body.description || '').trim().slice(0, 500);

  db.query(
    'UPDATE gallery_images SET title = ?, description = ? WHERE id = ?',
    [title, description, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Image not found' });
      res.json({ message: 'Updated successfully' });
    }
  );
});

// DELETE /api/admin/gallery/:id — removes the DB row and the file on disk
app.delete('/api/admin/gallery/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.query('SELECT image_url FROM gallery_images WHERE id = ?', [id], (selErr, rows) => {
    if (selErr) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.status(404).json({ error: 'Image not found' });

    db.query('DELETE FROM gallery_images WHERE id = ?', [id], (delErr) => {
      if (delErr) return res.status(500).json({ error: 'Database error' });

      storageApi.deleteFile(rows[0].image_url).catch((err) => {
        // Non-fatal — the DB row is already gone either way
        console.error('Gallery file cleanup warning:', err.message);
      });

      res.json({ message: 'Deleted successfully' });
    });
  });
});

// POST /api/admin/gallery/reorder — body: { orderedIds: [...] }
// Frontend does the up/down move locally, then submits the full new order.
app.post('/api/admin/gallery/reorder', authenticateToken, requireAdmin, (req, res) => {
  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : null;
  if (!orderedIds || !orderedIds.length) {
    return res.status(400).json({ error: 'orderedIds array is required.' });
  }

  db.query('SELECT id FROM gallery_images', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const owned = new Set(rows.map(r => r.id));
    if (orderedIds.some(imgId => !owned.has(imgId))) {
      return res.status(400).json({ error: 'Invalid image id in orderedIds.' });
    }

    let pending = orderedIds.length;
    let failed = false;
    orderedIds.forEach((imgId, index) => {
      db.query('UPDATE gallery_images SET display_order = ? WHERE id = ?', [index + 1, imgId], (uErr) => {
        if (uErr) { console.error('Reorder gallery_images error:', uErr); failed = true; }
        if (--pending === 0) {
          if (failed) return res.status(500).json({ error: 'Failed to update image order' });
          res.json({ message: 'Order updated successfully' });
        }
      });
    });
  });
});

// ══════════════════════════════════════════════════════
// CATEGORIES & SUBCATEGORIES (ZULU)
// ══════════════════════════════════════════════════════

// GET all categories (public read — used by add/edit product forms & storefront)
app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// POST new category (admin only)
app.post('/api/categories', authenticateToken, requireAdmin, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  db.query('SELECT id FROM categories WHERE name = ?', [name], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existing.length) return res.status(409).json({ error: 'That category already exists' });

    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ id: result.insertId, name });
    });
  });
});

// GET subcategories — optionally filter by ?category_id=
app.get('/api/subcategories', (req, res) => {
  const { category_id } = req.query;
  let sql = 'SELECT * FROM subcategories';
  const params = [];
  if (category_id) {
    sql += ' WHERE category_id = ?';
    params.push(category_id);
  }
  sql += ' ORDER BY name';
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// POST new subcategory (admin only)
app.post('/api/subcategories', authenticateToken, requireAdmin, (req, res) => {
  const category_id = req.body.category_id;
  const name = (req.body.name || '').trim();

  if (!category_id || !name) {
    return res.status(400).json({ error: 'Category and subcategory name are required' });
  }

  db.query(
    'SELECT id FROM subcategories WHERE category_id = ? AND name = ?',
    [category_id, name],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (existing.length) return res.status(409).json({ error: 'That subcategory already exists for this category' });

      db.query(
        'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
        [category_id, name],
        (err, result) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ id: result.insertId, category_id, name });
        }
      );
    }
  );
});

// PUT rename category (admin only) — also cascades new name onto existing products
app.put('/api/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  db.query('SELECT id, name FROM categories WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });

    const oldName = rows[0].name;

    db.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id], (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (existing.length) return res.status(409).json({ error: 'That category name already exists' });

      db.query('UPDATE categories SET name = ? WHERE id = ?', [name, id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // Cascade the renamed category onto any products currently using the old name
        db.query('UPDATE products SET category = ? WHERE category = ?', [name, oldName], (err) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ id: Number(id), name, oldName });
        });
      });
    });
  });
});

// DELETE category (admin only) — blocks with a list of affected products unless ?force=true
app.delete('/api/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  db.query('SELECT id, name FROM categories WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.status(404).json({ error: 'Category not found' });

    const categoryName = rows[0].name;

    db.query('SELECT name, product_code FROM products WHERE category = ?', [categoryName], (err, products) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (products.length && !force) {
        return res.status(409).json({
          inUse: true,
          products: products.map(p => ({ name: p.name, product_code: p.product_code }))
        });
      }

      db.query('DELETE FROM subcategories WHERE category_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        db.query('DELETE FROM categories WHERE id = ?', [id], (err) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ success: true });
        });
      });
    });
  });
});

// PUT rename subcategory (admin only) — also cascades new name onto existing products
app.put('/api/subcategories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Subcategory name is required' });

  db.query('SELECT id, category_id, name FROM subcategories WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.status(404).json({ error: 'Subcategory not found' });

    const oldName = rows[0].name;
    const categoryId = rows[0].category_id;

    db.query(
      'SELECT id FROM subcategories WHERE category_id = ? AND name = ? AND id != ?',
      [categoryId, name, id],
      (err, existing) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (existing.length) return res.status(409).json({ error: 'That subcategory already exists for this category' });

        db.query('UPDATE subcategories SET name = ? WHERE id = ?', [name, id], (err) => {
          if (err) return res.status(500).json({ error: 'Database error' });

          // Cascade the renamed subcategory onto any products currently using the old name
          db.query('UPDATE products SET subcategory = ? WHERE subcategory = ?', [name, oldName], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ id: Number(id), category_id: categoryId, name, oldName });
          });
        });
      }
    );
  });
});

// DELETE subcategory (admin only) — blocks with a list of affected products unless ?force=true
app.delete('/api/subcategories/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const force = req.query.force === 'true';

  db.query('SELECT id, name FROM subcategories WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!rows.length) return res.status(404).json({ error: 'Subcategory not found' });

    const subName = rows[0].name;

    db.query('SELECT name, product_code FROM products WHERE subcategory = ?', [subName], (err, products) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (products.length && !force) {
        return res.status(409).json({
          inUse: true,
          products: products.map(p => ({ name: p.name, product_code: p.product_code }))
        });
      }

      db.query('DELETE FROM subcategories WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
      });
    });
  });
});


/* =========================
   USER API
========================= */

// GET /api/users — get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(results);
    }
  );
});

// GET /api/users/me — logged-in user's own profile (for the dashboard)
app.get('/api/users/me', authenticateToken, (req, res) => {
  db.query(
    `SELECT id, name, email, phone1, phone2, address1, address2, district, state, pincode, role, created_at
     FROM users WHERE id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error('Get profile error:', err);
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      res.json(rows[0]);
    }
  );
});

// PUT /api/users/me — update the logged-in user's own profile
// Note: email is intentionally NOT editable here — cart (cart_<email>) and orders
// are both keyed by email, so changing it here would silently orphan a user's
// cart/order history. A real email change needs its own verified flow.
app.put('/api/users/me', authenticateToken, (req, res) => {
  const { name, phone1, phone2, address1, address2, district, state, pincode } = req.body;

  if (!name || !phone1 || !address1 || !district || !state || !pincode) {
    return res.status(400).json({ error: 'Name, primary phone, address 1, district, state, and pincode are required' });
  }

  db.query(
    `UPDATE users
       SET name = ?, phone1 = ?, phone2 = ?, address1 = ?, address2 = ?,
           district = ?, state = ?, pincode = ?
     WHERE id = ?`,
    [name, phone1, phone2 || null, address1, address2 || null, district, state, pincode, req.user.id],
    (err) => {
      if (err) {
        console.error('Update profile error:', err);
        return res.status(500).json({ error: 'Failed to update profile' });
      }
      console.log(`✅ Profile updated for user ${req.user.id}`);
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

/* =========================
   ORDER APIs
========================= */

// POST /api/orders — Place a new order (brand-aware)
app.post('/api/orders', authenticateToken, (req, res) => {
  const { user_name, phone, email, address, total_amount, items, payment_id } = req.body;

  if (!user_name || !phone || !address || !total_amount || !items?.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const orderSql = `
    INSERT INTO orders (user_name, phone, email, address, total_amount, payment_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
  `;

  db.query(orderSql, [user_name, phone, email || '', address, total_amount, payment_id || null], (err, orderResult) => {
    if (err) {
      console.error('Order insert error:', err);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    const orderId = orderResult.insertId;
    const itemValues = items.map(item => [
      orderId, item.product_id,
      item.brand || 'zulu',
      item.product_type || 'apparel',
      item.product_code || '',
      item.quantity, item.price, item.size || null
    ]);

    db.query(
      'INSERT INTO order_items (order_id, product_id, brand, product_type, product_code, quantity, price, size) VALUES ?',
      [itemValues],
      (err2) => {
        if (err2) {
          console.error('Order items insert error:', err2);
          return res.status(500).json({ error: 'Failed to save order items' });
        }

        // ✅ No emails here anymore — those now fire from /api/razorpay/verify-payment
        // once payment is actually confirmed, so an abandoned/failed checkout never
        // notifies anyone about an order that isn't real yet.

        // Reserve sellable balance for the order at creation time. Total (entered)
        // stock is never adjusted automatically.
        adjustBalanceForItems(items, -1, () => {
          res.status(201).json({ message: 'Order created', orderId });
        });
      }
    );
  });
});

// DELETE /api/orders/:id — remove an order, but only while it's still untouched
// by payment (pending + no payment_id). Used to clean up abandoned checkouts.
app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM orders WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to look up order' });
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];

    if (req.user.role !== 'admin' && req.user.email !== order.email) {
      return res.status(403).json({ error: 'You can only remove your own orders' });
    }
    if (order.status !== 'pending' || order.payment_id) {
      return res.status(400).json({ error: 'Order cannot be removed once payment has been attempted' });
    }

    fetchStockAdjustItems(id, (items) => {
      db.query('DELETE FROM order_items WHERE order_id = ?', [id], (errI) => {
        if (errI) return res.status(500).json({ error: 'Failed to remove order items' });
        db.query('DELETE FROM orders WHERE id = ?', [id], (err3) => {
          if (err3) return res.status(500).json({ error: 'Failed to remove order' });
          console.log(`🗑️  Abandoned order #${id} removed`);
          // Balance was reserved at order creation — release it back, this
          // checkout never became a real sale.
          adjustBalanceForItems(items, 1, () => {
            res.json({ message: 'Order removed', orderId: id });
          });
        });
      });
    });
  });
});

// GET /api/orders/user/:email — brand-aware order history
// Only the matching user (or an admin) may read these orders.
app.get('/api/orders/user/:email', authenticateToken, (req, res) => {
  const requestedEmail = String(req.params.email || '').trim().toLowerCase();
  const callerEmail = String(req.user?.email || '').trim().toLowerCase();
  if (req.user.role !== 'admin' && callerEmail !== requestedEmail) {
    return res.status(403).json({ error: 'You can only view your own orders' });
  }

  const sql = `
    SELECT
      o.id, o.user_name, o.phone, o.email,
      o.address, o.total_amount, o.status,
      o.refund_amount, o.penalty_amount, o.created_at,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'product_id',   oi.product_id,
            'product_name', COALESCE(p.name, pp.name, pf.name, pa.name, oi.product_code, 'Product'),
            'image_url',    COALESCE(p.image_url, pp.image_url, pf.image_url, pa.image_url),
            'quantity',     oi.quantity,
            'price',        oi.price,
            'brand',        oi.brand,
            'product_type', oi.product_type,
            'product_code', oi.product_code
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products           p  ON p.id  = oi.product_id AND oi.brand = 'zulu'
    LEFT JOIN pooboo_products    pp ON pp.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'apparel'
    LEFT JOIN pooboo_fabrics     pf ON pf.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'fabric'
    LEFT JOIN pooboo_accessories pa ON pa.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'accessory'
    WHERE o.email = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  db.query(sql, [req.params.email], (err, results) => {
    if (err) {
      console.error('Fetch user orders error:', err);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }
    res.json(results);
  });
});

// GET /api/orders — All orders (admin only, brand-aware)
app.get('/api/orders', authenticateToken, requireAdmin, (req, res) => {
  const { brand, status, search, startDate, endDate } = req.query;
  let where = [];
  let params = [];

  if (brand && brand !== 'all') { where.push('oi.brand = ?'); params.push(brand); }
  if (status && status !== 'all') { where.push('o.status = ?'); params.push(status); }
  // Search matches consumer name, email, phone, order ID, and now product code too
  // (oi.product_code — order_items is already joined below, so this just widens the WHERE)
  if (search) { where.push('(o.user_name LIKE ? OR o.email LIKE ? OR o.phone LIKE ? OR CAST(o.id AS TEXT) LIKE ? OR oi.product_code LIKE ?)'); const s = `%${search}%`; params.push(s, s, s, s, s); }
  if (startDate) { where.push('o.created_at >= ?'); params.push(startDate); }
  if (endDate) { where.push('o.created_at <= ?'); params.push(endDate + ' 23:59:59'); }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const sql = `
    SELECT
      o.id, o.user_name, o.phone, o.email,
      o.address, o.total_amount, o.status,
      o.refund_amount, o.penalty_amount, o.created_at,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'product_id',   oi.product_id,
            'product_name', COALESCE(p.name, pp.name, pf.name, pa.name, oi.product_code, 'Product'),
            'image_url',    COALESCE(p.image_url, pp.image_url, pf.image_url, pa.image_url),
            'quantity',     oi.quantity,
            'price',        oi.price,
            'brand',        oi.brand,
            'product_type', oi.product_type,
            'product_code', oi.product_code
          )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products           p  ON p.id  = oi.product_id AND oi.brand = 'zulu'
    LEFT JOIN pooboo_products    pp ON pp.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'apparel'
    LEFT JOIN pooboo_fabrics     pf ON pf.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'fabric'
    LEFT JOIN pooboo_accessories pa ON pa.id = oi.product_id AND oi.brand = 'pooboo' AND oi.product_type = 'accessory'
    ${whereClause}
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch orders' });
    res.json(results);
  });
});

// PATCH /api/orders/:id/status (admin only)
app.patch('/api/orders/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) return res.status(500).json({ error: 'Failed to update status' });

    db.query('SELECT id AS orderId, user_name, email FROM orders WHERE id = ?', [id], (err2, rows) => {
      if (!err2 && rows.length && rows[0].email) {
        const order = rows[0];
        getOrderItemsForEmail(id, (items) => {
          if (status === 'confirmed') {
            sendOrderConfirmedEmail(order, items);
          } else if (['shipped', 'delivered', 'cancelled'].includes(status)) {
            sendStatusUpdateEmail(order, status, items);
          }
        });
      }
      // Cancelled → goods return to sellable balance (total stock untouched).
      if (status === 'cancelled') {
        fetchStockAdjustItems(id, (items) => adjustBalanceForItems(items, 1));
      }
      res.json({ message: 'Order status updated', orderId: id, status });
    });
  });
});

// PATCH /api/orders/:id/cancel — customer-facing "request cancellation"
// Any logged-in user can call this (not admin-only), but only for their own order,
// and only while it's still 'pending' or 'confirmed'.
// This does NOT cancel the order outright anymore — it moves the order into
// 'cancellation_requested' and computes/stores the refund split up front so it
// survives a reload. The actual cancellation only happens once an admin approves
// it from the admin dashboard notification panel.
// 'pending'   -> full refund
// 'confirmed' -> 25% cancellation fee, 75% refunded
app.patch('/api/orders/:id/cancel', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM orders WHERE id = ?', [id], (err, rows) => {
    if (err) {
      console.error('Cancel order lookup error:', err);
      return res.status(500).json({ error: 'Failed to look up order' });
    }
    if (!rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];

    // Customers may only request cancellation on their own orders; admins may act on any order
    if (req.user.role !== 'admin' && req.user.email !== order.email) {
      return res.status(403).json({ error: 'You can only cancel your own orders' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ error: `Order cannot be cancelled once it is ${order.status}` });
    }

    const penaltyPercent = order.status === 'confirmed' ? 25 : 0;
    const refundAmount   = Math.round(order.total_amount * (100 - penaltyPercent) / 100);
    const penaltyAmount  = order.total_amount - refundAmount;
    const preCancelStatus = order.status;

    db.query(
      `UPDATE orders
         SET status = 'cancellation_requested',
             refund_amount = ?, penalty_amount = ?,
             cancellation_requested_at = NOW(), pre_cancel_status = ?
       WHERE id = ?`,
      [refundAmount, penaltyAmount, preCancelStatus, id],
      (err2) => {
        if (err2) {
          console.error('Cancel request update error:', err2);
          return res.status(500).json({ error: 'Failed to request cancellation' });
        }
        console.log(`⏳ Cancellation requested for order #${id} by ${req.user.email} — refund ₹${refundAmount}, fee ₹${penaltyAmount} (pending admin approval)`);

        if (order.email) {
          getOrderItemsForEmail(id, (items) => {
            sendCancellationRequestedEmail({ orderId: id, user_name: order.user_name, email: order.email }, items);
          });
        }

        res.json({
          message: 'Cancellation requested — awaiting admin approval',
          orderId: id,
          status: 'cancellation_requested',
          refundAmount,
          penaltyAmount
        });
      }
    );
  });
});

// GET /api/admin/cancellation-requests — orders awaiting admin approval (admin only)
app.get('/api/admin/cancellation-requests', authenticateToken, requireAdmin, (req, res) => {
  const sql = `
    SELECT
      o.id, o.user_name, o.phone, o.email,
      o.address, o.total_amount, o.status,
      o.refund_amount, o.penalty_amount,
      o.cancellation_requested_at, o.pre_cancel_status, o.created_at
    FROM orders o
    WHERE o.status = 'cancellation_requested'
    ORDER BY o.cancellation_requested_at ASC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Fetch cancellation requests error:', err);
      return res.status(500).json({ error: 'Failed to fetch cancellation requests' });
    }
    res.json(results);
  });
});

// PATCH /api/admin/orders/:id/approve-cancel — admin approves a pending cancellation request
// Order becomes 'cancelled'. This does NOT email the customer yet — the "Cancellation
// Approved" email only goes out once the refund is actually paid out (see
// /api/admin/orders/:id/complete-refund below), since refunds are handled manually
// by the team and can lag behind the approval itself.
app.patch('/api/admin/orders/:id/approve-cancel', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM orders WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to look up order' });
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];

    if (order.status !== 'cancellation_requested') {
      return res.status(400).json({ error: 'This order has no pending cancellation request' });
    }

    db.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id], (err2) => {
      if (err2) {
        console.error('Approve cancellation error:', err2);
        return res.status(500).json({ error: 'Failed to approve cancellation' });
      }
      console.log(`✅ Cancellation approved for order #${id} by admin ${req.user.email} — refund ₹${order.refund_amount}, fee ₹${order.penalty_amount} (awaiting refund completion before customer is emailed)`);

      // Cancelled → goods return to sellable balance (total stock untouched).
      fetchStockAdjustItems(id, (items) => {
        adjustBalanceForItems(items, 1, () => {
          res.json({
            message: 'Cancellation approved — customer will be emailed once the refund is marked complete',
            orderId: id,
            status: 'cancelled',
            refundAmount: order.refund_amount,
            penaltyAmount: order.penalty_amount
          });
        });
      });
    });
  });
});

// PATCH /api/admin/orders/:id/complete-refund — admin marks a cancelled order's refund
// as actually paid out. THIS is what triggers the "Cancellation Approved" email —
// not the approval step — so the customer isn't told "cancelled" before their money
// has actually moved.
app.patch('/api/admin/orders/:id/complete-refund', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM orders WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to look up order' });
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];

    if (order.status !== 'cancelled') {
      return res.status(400).json({ error: 'Refund can only be completed for a cancelled order' });
    }
    if (order.refund_completed_at) {
      return res.status(400).json({ error: 'This refund has already been marked complete' });
    }

    db.query('UPDATE orders SET refund_completed_at = NOW() WHERE id = ?', [id], (err2) => {
      if (err2) {
        console.error('Complete refund error:', err2);
        return res.status(500).json({ error: 'Failed to mark refund complete' });
      }
      console.log(`💸 Refund marked complete for order #${id} by admin ${req.user.email} — refund ₹${order.refund_amount}`);

      if (order.email) {
        getOrderItemsForEmail(id, (items) => {
          sendCancellationApprovedEmail(
            { orderId: id, user_name: order.user_name, email: order.email, items },
            order.refund_amount,
            order.penalty_amount
          );
        });
      }

      res.json({
        message: 'Refund marked complete — customer notified',
        orderId: id,
        refundAmount: order.refund_amount,
        penaltyAmount: order.penalty_amount
      });
    });
  });
});

// PATCH /api/admin/orders/:id/reject-cancel — admin rejects a pending cancellation request
// Order reverts to whatever status it had before the request (pending/confirmed).
app.patch('/api/admin/orders/:id/reject-cancel', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM orders WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to look up order' });
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = rows[0];

    if (order.status !== 'cancellation_requested') {
      return res.status(400).json({ error: 'This order has no pending cancellation request' });
    }

    const revertStatus = order.pre_cancel_status || 'pending';

    db.query(
      `UPDATE orders
         SET status = ?, refund_amount = NULL, penalty_amount = NULL,
             cancellation_requested_at = NULL, pre_cancel_status = NULL
       WHERE id = ?`,
      [revertStatus, id],
      (err2) => {
        if (err2) {
          console.error('Reject cancellation error:', err2);
          return res.status(500).json({ error: 'Failed to reject cancellation' });
        }
        console.log(`✖️  Cancellation rejected for order #${id} by admin ${req.user.email} — reverted to ${revertStatus}`);

        if (order.email) {
          getOrderItemsForEmail(id, (items) => {
            sendCancellationRejectedEmail({ orderId: id, user_name: order.user_name, email: order.email }, items);
          });
        }

        res.json({
          message: 'Cancellation rejected',
          orderId: id,
          status: revertStatus
        });
      }
    );
  });
});

/* ============================================================
   POOBOO — KIDS BOUTIQUE APIs
   All routes prefixed with /api/pooboo/
   Auth: shared users table (same JWT)
   DB tables: pooboo_products, pooboo_enquiries
============================================================ */

/* ── Helper: normalize colours JSON (same pattern as ZULU sizes) ── */
function normalizeColours(colours) {
  if (!colours) return [];
  if (Array.isArray(colours)) return colours.filter(Boolean);
  try {
    const parsed = JSON.parse(colours);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return colours.split(',').map(s => s.trim()).filter(Boolean);
  }
}

/* ── Helper: normalize tags JSON (preset badges + free-text custom tags, same array) ── */
function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map(t => String(t).trim()).filter(Boolean) : [];
  } catch {
    return tags.split(',').map(s => s.trim()).filter(Boolean);
  }
}

/* ── Helper: parse pooboo product JSON fields ── */
function parsePoobooProduct(p) {
  ['sizes', 'colours', 'details', 'tags'].forEach(field => {
    if (p[field] && typeof p[field] === 'string') {
      try { p[field] = JSON.parse(p[field]); } catch { p[field] = []; }
    } else if (!p[field]) {
      p[field] = [];
    }
  });
  // Convenience singular field for fabrics/accessories forms (first colour in the array)
  p.colour = Array.isArray(p.colours) && p.colours.length ? p.colours[0] : '';
  return p;
}

/* ── Helper: parse pooboo accessory JSON fields ── */
function parsePoobooAccessory(a) {
  if (a.tags && typeof a.tags === 'string') {
    try { a.tags = JSON.parse(a.tags); } catch { a.tags = []; }
  } else if (!a.tags) {
    a.tags = [];
  }
  return a;
}

/* ── Helper: parse pooboo fabric JSON fields ── */
function parsePoobooFabric(f) {
  if (f.tags && typeof f.tags === 'string') {
    try { f.tags = JSON.parse(f.tags); } catch { f.tags = []; }
  } else if (!f.tags) {
    f.tags = [];
  }
  return f;
}

// ── Helper: seed sellable balance from entered totals ──────────────────────
// balance_stock only ever moves when items are sold, so rows that predate the
// column (or products whose stock was raised without a sale) sit at the
// ALTER's DEFAULT 0 and get flagged "out of stock" even though stock exists.
// Idempotent: only matches rows with balance_stock = 0 and a positive entered
// total, so re-running on boot (or after restarts) is harmless.
function backfillSellableBalances() {
  // Unified products table (admin stock page + dashboard read this).
  // Fabrics track their entered total in total_meters; everything else in stock.
  db.query(
    `UPDATE products
       SET balance_stock = CASE WHEN product_type = 'fabric' THEN total_meters ELSE stock END
       WHERE balance_stock = 0
         AND (CASE WHEN product_type = 'fabric' THEN total_meters ELSE stock END) > 0`,
    (bfErr, bfRes) => {
      if (bfErr) console.error('❌ Balance backfill (products) error:', bfErr.message);
      else if (bfRes.affectedRows) console.log(`✅ Backfilled products.balance_stock (${bfRes.affectedRows} rows)`);
    }
  );

  // Pooboo source tables (apparel/accessories track stock; fabrics track meters).
  [
    { table: 'pooboo_products',  source: 'stock' },
    { table: 'pooboo_accessories', source: 'stock' },
    { table: 'pooboo_fabrics',   source: 'total_meters' }
  ].forEach(({ table, source }) => {
    db.query(
      `UPDATE ${table} SET balance_stock = ${source} WHERE balance_stock = 0 AND ${source} > 0`,
      (bfErr, bfRes) => {
        if (bfErr) console.error(`❌ Balance backfill (${table}) error:`, bfErr.message);
        else if (bfRes.affectedRows) console.log(`✅ Backfilled ${table}.balance_stock (${bfRes.affectedRows} rows)`);
      }
    );
  });
}

/* =========================
   POOBOO — PRODUCT APIs
========================= */

// GET /api/pooboo/products — all active products (storefront)
app.get('/api/pooboo/products', (req, res) => {
  const { category, age_group, gender, tag } = req.query;

  let sql = 'SELECT * FROM pooboo_products WHERE is_active = 1';
  const params = [];

  if (category)  { sql += ' AND category = ?';  params.push(category); }
  if (age_group) { sql += ' AND age_group = ?';  params.push(age_group); }
  if (gender)    { sql += ' AND gender = ?';     params.push(gender); }
  if (tag)       { sql += ' AND tags @> to_jsonb(?::text)'; params.push(tag); }

  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('POOBOO fetch products error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results.map(parsePoobooProduct));
  });
});

// GET /api/pooboo/products/tags/list — distinct tags across active products (for filter chips)
app.get('/api/pooboo/products/tags/list', (req, res) => {
  db.query("SELECT tags FROM pooboo_products WHERE is_active = 1 AND tags IS NOT NULL", (err, results) => {
    if (err) {
      console.error('POOBOO fetch tags error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const tagSet = new Set();
    results.forEach(r => {
      let list = r.tags;
      if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = []; } }
      (list || []).forEach(t => tagSet.add(t));
    });
    res.json([...tagSet]);
  });
});

// GET /api/pooboo/products/all — all products including inactive (admin only)
app.get('/api/pooboo/products/all', authenticateToken, requireAdmin, (req, res) => {
  db.query('SELECT * FROM pooboo_products ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results.map(parsePoobooProduct));
  });
});

// GET /api/pooboo/products/:id — single product
app.get('/api/pooboo/products/:id', (req, res) => {
  db.query('SELECT * FROM pooboo_products WHERE id = ?', [req.params.id], (err, result) => {
    if (err)            return res.status(500).json({ error: 'Database error' });
    if (!result.length) return res.status(404).json({ error: 'Product not found' });
    res.json(parsePoobooProduct(result[0]));
  });
});

// POST /api/pooboo/products — add apparel product (admin only)
app.post('/api/pooboo/products', authenticateToken, requireAdmin, upload.single('image'), persistUploads(), (req, res) => {
  const {
    name, description, price,
    category, age_group, gender,
    sizes, colours, details, tags,
    stock, product_code, is_customizable, is_active
  } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  const image       = req.file ? req.file.filename : null;
  const sizesJson   = normalizeSizes(sizes);
  const coloursJson = normalizeColours(colours);
  const detailsJson = normalizeDetails(details);
  const tagsJson    = normalizeTags(tags);

  const sql = `
    INSERT INTO pooboo_products
    (name, description, price, category, age_group, gender,
     sizes, colours, details, tags, image_url, stock, balance_stock, product_code,
     is_customizable, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    name, description || '', parseFloat(price) || 0,
    category || '', age_group || '', gender || 'unisex',
    sizesJson, coloursJson, detailsJson, tagsJson,
    image, parseInt(stock) || 0, parseInt(stock) || 0, product_code || '',
    Number(is_customizable) === 1 ? 1 : 0,
    Number(is_active) === 0 ? 0 : 1
  ], (err, result) => {
    if (err) {
      console.error('POOBOO add product error:', err);
      return res.status(500).json({ error: 'Failed to add product' });
    }
    // Also write to unified products table
    db.query(
      `INSERT INTO products (brand, product_type, name, description, price, category, image_url, stock, balance_stock, product_code, sizes, details, tags, age_group, gender, colours, is_customizable, is_active)
       VALUES ('pooboo', 'apparel', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', parseFloat(price) || 0, category || '', image, parseInt(stock) || 0,
       parseInt(stock) || 0,
       product_code || '', sizesJson, detailsJson, tagsJson, age_group || '', gender || 'unisex',
       coloursJson, Number(is_customizable) === 1 ? 1 : 0,
       Number(is_active) === 0 ? 0 : 1],
      (errU) => { if (errU) console.error('POOBOO unified product sync error:', errU.message); }
    );
    console.log(`✅ POOBOO product added: ${name}`);
    res.status(201).json({ message: 'Product added successfully', id: result.insertId });
  });
});

// PUT /api/pooboo/products/:id — update apparel product (admin only)
app.put('/api/pooboo/products/:id', authenticateToken, requireAdmin, upload.single('image'), persistUploads(), (req, res) => {
  const { id } = req.params;
  const {
    name, description, price,
    category, age_group, gender,
    sizes, colours, details, tags,
    stock, product_code, is_customizable, is_active
  } = req.body;

  const sizesJson   = normalizeSizes(sizes);
  const coloursJson = normalizeColours(colours);
  const detailsJson = normalizeDetails(details);
  const tagsJson    = normalizeTags(tags);

  db.query('SELECT image_url, stock FROM pooboo_products WHERE id = ?', [id], (err, result) => {
    if (err || !result.length) return res.status(404).json({ error: 'Product not found' });

    const finalImage = req.file ? req.file.filename : result[0].image_url;

    // Keep sellable balance in sync with the entered total (same reasoning as the
    // ZULU product edit — the apparel form has no balance field of its own).
    const stockDelta = (parseInt(stock) || 0) - (parseInt(result[0].stock) || 0);

    const sql = `
      UPDATE pooboo_products
      SET name=?, description=?, price=?, category=?, age_group=?, gender=?,
          sizes=?, colours=?, details=?, tags=?, image_url=?, stock=?,
          balance_stock = GREATEST(balance_stock + ?, 0), product_code=?,
          is_customizable=?, is_active=?
      WHERE id=?
    `;

    db.query(sql, [
      name || '', description || '', parseFloat(price) || 0,
      category || '', age_group || '', gender || 'unisex',
      sizesJson, coloursJson, detailsJson, tagsJson,
      finalImage, parseInt(stock) || 0, stockDelta, product_code || '',
      Number(is_customizable) === 1 ? 1 : 0,
      Number(is_active) === 0 ? 0 : 1,
      id
    ], (err2) => {
      if (err2) {
        console.error('POOBOO update product error:', err2);
        return res.status(500).json({ error: 'Update failed' });
      }
      // Also update unified products table (balance kept in sync by delta)
      db.query(
        `UPDATE products SET name=?, description=?, price=?, category=?, image_url=?, stock=?,
         balance_stock = GREATEST(balance_stock + ?, 0), product_code=?,
         sizes=?, details=?, tags=?, age_group=?, gender=?, colours=?, is_customizable=?, is_active=?
         WHERE brand='pooboo' AND product_type='apparel' AND product_code=?`,
        [name || '', description || '', parseFloat(price) || 0, category || '', finalImage,
         parseInt(stock) || 0, stockDelta, product_code || '', sizesJson, detailsJson, tagsJson, age_group || '',
         gender || 'unisex', coloursJson,
         Number(is_customizable) === 1 ? 1 : 0,
         Number(is_active) === 0 ? 0 : 1, product_code || ''],
        (errU) => { if (errU) console.error('POOBOO unified product update sync error:', errU.message); }
      );
      res.json({ message: 'Product updated successfully' });
    });
  });
});

// DELETE /api/pooboo/products/:id — delete product (admin only)
app.delete('/api/pooboo/products/:id', authenticateToken, requireAdmin, (req, res) => {
  // First get the product_code to find the matching unified record
  db.query('SELECT product_code, image_url FROM pooboo_products WHERE id = ?', [req.params.id], (err, rows) => {
    const code = rows && rows.length ? rows[0].product_code : null;
    const imageUrl = rows && rows.length ? rows[0].image_url : null;
    db.query('DELETE FROM pooboo_products WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Delete failed' });
      // Also delete from unified table
      if (code) {
        db.query("DELETE FROM products WHERE brand='pooboo' AND product_type='apparel' AND product_code=?", [code],
          (errU) => { if (errU) console.error('POOBOO unified product delete sync error:', errU.message); }
        );
      }
      deleteStoredImages([imageUrl]).then(() => {
        res.json({ message: 'Product deleted successfully' });
      });
    });
  });
});

/* =========================
   POOBOO — FABRICS APIs
========================= */

// GET /api/pooboo/fabrics — all active fabrics (storefront, optional ?type=, ?search=, ?sort=, ?tag= filters)
app.get('/api/pooboo/fabrics', (req, res) => {
  const { type, search, sort, tag } = req.query;
  let sql = 'SELECT * FROM pooboo_fabrics WHERE is_active = 1';
  const params = [];

  if (type) { sql += ' AND fabric_type = ?'; params.push(type); }

  if (search) {
    sql += ' AND (name LIKE ? OR product_code LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like);
  }

  if (tag) { sql += ' AND tags @> to_jsonb(?::text)'; params.push(tag); }

  switch (sort) {
    case 'price_asc':  sql += ' ORDER BY price_per_meter ASC';  break;
    case 'price_desc': sql += ' ORDER BY price_per_meter DESC'; break;
    case 'newest':      sql += ' ORDER BY created_at DESC';      break;
    default:            sql += ' ORDER BY created_at DESC';      break;
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results.map(parsePoobooFabric));
  });
});

// GET /api/pooboo/fabrics/tags/list — distinct tags across active fabrics (for filter dropdown)
app.get('/api/pooboo/fabrics/tags/list', (req, res) => {
  db.query("SELECT tags FROM pooboo_fabrics WHERE is_active = 1 AND tags IS NOT NULL", (err, results) => {
    if (err) {
      console.error('POOBOO fetch fabric tags error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const tagSet = new Set();
    results.forEach(r => {
      let list = r.tags;
      if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = []; } }
      (list || []).forEach(t => tagSet.add(t));
    });
    res.json([...tagSet]);
  });
});

// GET /api/pooboo/fabrics/all — all fabrics including inactive (admin only)
app.get('/api/pooboo/fabrics/all', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM pooboo_fabrics';
  const params = [];

  if (type) { sql += ' WHERE fabric_type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results.map(parsePoobooFabric));
  });
});

// GET /api/pooboo/fabrics/:id — single fabric
app.get('/api/pooboo/fabrics/:id', (req, res) => {
  db.query('SELECT * FROM pooboo_fabrics WHERE id = ?', [req.params.id], (err, result) => {
    if (err)            return res.status(500).json({ error: 'Database error' });
    if (!result.length) return res.status(404).json({ error: 'Fabric not found' });
    res.json(parsePoobooFabric(result[0]));
  });
});

// POST /api/pooboo/fabrics — add fabric (admin only)
app.post('/api/pooboo/fabrics', authenticateToken, requireAdmin, upload.single('image'), persistUploads(), (req, res) => {
  const {
    name, fabric_type, product_code, price_per_meter,
    colour, total_meters, balance_stock,
    description, tags, is_active
  } = req.body;

  if (!name || !price_per_meter || !fabric_type) {
    return res.status(400).json({ error: 'Name, price per meter, and fabric type are required' });
  }

  const image = req.file ? req.file.filename : null;
  const balQty = parseInt(balance_stock) || parseInt(total_meters) || 0;
  const tagsJson = normalizeTags(tags);

  const sql = `
    INSERT INTO pooboo_fabrics
    (name, fabric_type, product_code, price_per_meter, colour, total_meters, balance_stock, description, tags, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    name.trim(),
    fabric_type.trim(),
    product_code || '',
    parseFloat(price_per_meter) || 0,
    colour || '',
    parseInt(total_meters) || 0,
    balQty,
    description || '',
    tagsJson,
    image,
    Number(is_active) === 0 ? 0 : 1
  ], (err, result) => {
    if (err) {
      console.error('POOBOO add fabric error:', err);
      return res.status(500).json({ error: 'Failed to add fabric' });
    }
    db.query(
      `INSERT INTO products (brand, product_type, name, description, price_per_meter, colour, image_url, product_code, fabric_type, total_meters, balance_stock, tags, is_active)
       VALUES ('pooboo', 'fabric', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || '', parseFloat(price_per_meter) || 0, colour || '', image,
       product_code || '', fabric_type.trim(), parseInt(total_meters) || 0,
       balQty, tagsJson, Number(is_active) === 0 ? 0 : 1],
      (errU) => { if (errU) console.error('POOBOO unified fabric sync error:', errU.message); }
    );
    console.log(`✅ POOBOO fabric added: ${name}`);
    res.status(201).json({ message: 'Fabric added successfully', id: result.insertId });
  });
});

// PUT /api/pooboo/fabrics/:id — update fabric (admin only)
app.put('/api/pooboo/fabrics/:id', authenticateToken, requireAdmin, upload.single('image'), persistUploads(), (req, res) => {
  const { id } = req.params;
  const {
    name, fabric_type, product_code, price_per_meter,
    colour, total_meters, balance_stock,
    description, tags, is_active
  } = req.body;

  db.query('SELECT image_url FROM pooboo_fabrics WHERE id = ?', [id], (err, result) => {
    if (err || !result.length) return res.status(404).json({ error: 'Fabric not found' });

    const finalImage = req.file ? req.file.filename : result[0].image_url;
    const tagsJson = normalizeTags(tags);

    const sql = `
      UPDATE pooboo_fabrics
      SET name=?, fabric_type=?, product_code=?, price_per_meter=?, colour=?,
          total_meters=?, balance_stock=?, description=?, tags=?, image_url=?, is_active=?
      WHERE id=?
    `;

    db.query(sql, [
      name || '',
      fabric_type || '',
      product_code || '',
      parseFloat(price_per_meter) || 0,
      colour || '',
      parseInt(total_meters) || 0,
      parseInt(balance_stock) || 0,
      description || '',
      tagsJson,
      finalImage,
      Number(is_active) === 0 ? 0 : 1,
      id
    ], (err2) => {
      if (err2) {
        console.error('POOBOO update fabric error:', err2);
        return res.status(500).json({ error: 'Update failed' });
      }
      db.query(
        `UPDATE products SET name=?, description=?, price_per_meter=?, colour=?, image_url=?, product_code=?,
         fabric_type=?, total_meters=?, balance_stock=?, tags=?, is_active=?
         WHERE brand='pooboo' AND product_type='fabric' AND product_code=?`,
        [name || '', description || '', parseFloat(price_per_meter) || 0, colour || '', finalImage,
         product_code || '', fabric_type || '', parseInt(total_meters) || 0,
         parseInt(balance_stock) || 0, tagsJson, Number(is_active) === 0 ? 0 : 1, product_code || ''],
        (errU) => { if (errU) console.error('POOBOO unified fabric update sync error:', errU.message); }
      );
      res.json({ message: 'Fabric updated successfully' });
    });
  });
});

// DELETE /api/pooboo/fabrics/:id — delete fabric (admin only)
app.delete('/api/pooboo/fabrics/:id', authenticateToken, requireAdmin, (req, res) => {
  db.query('SELECT product_code, image_url FROM pooboo_fabrics WHERE id = ?', [req.params.id], (err, rows) => {
    const code = rows && rows.length ? rows[0].product_code : null;
    const imageUrl = rows && rows.length ? rows[0].image_url : null;
    db.query('DELETE FROM pooboo_fabrics WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Delete failed' });
      if (code) {
        db.query("DELETE FROM products WHERE brand='pooboo' AND product_type='fabric' AND product_code=?", [code],
          (errU) => { if (errU) console.error('POOBOO unified fabric delete sync error:', errU.message); }
        );
      }
      deleteStoredImages([imageUrl]).then(() => {
        res.json({ message: 'Fabric deleted successfully' });
      });
    });
  });
});

/* =========================
   POOBOO — ACCESSORIES APIs
========================= */

// GET /api/pooboo/accessories — all active accessories (storefront, optional ?type=, ?search=, ?sort=, ?tag= filters)
app.get('/api/pooboo/accessories', (req, res) => {
  const { type, search, sort, tag } = req.query;
  let sql = 'SELECT * FROM pooboo_accessories WHERE is_active = 1';
  const params = [];

  if (type) { sql += ' AND accessory_type = ?'; params.push(type); }

  if (search) {
    sql += ' AND (name LIKE ? OR product_code LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like);
  }

  if (tag) { sql += ' AND tags @> to_jsonb(?::text)'; params.push(tag); }

  switch (sort) {
    case 'price_asc':  sql += ' ORDER BY price ASC';   break;
    case 'price_desc': sql += ' ORDER BY price DESC';  break;
    case 'newest':      sql += ' ORDER BY created_at DESC'; break;
    default:            sql += ' ORDER BY created_at DESC'; break;
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results.map(parsePoobooAccessory));
  });
});

// GET /api/pooboo/accessories/tags/list — distinct tags across active accessories (for filter dropdown)
app.get('/api/pooboo/accessories/tags/list', (req, res) => {
  const { type } = req.query;
  let sql = "SELECT tags FROM pooboo_accessories WHERE is_active = 1 AND tags IS NOT NULL";
  const params = [];
  if (type) { sql += ' AND accessory_type = ?'; params.push(type); }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('POOBOO fetch accessory tags error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    const tagSet = new Set();
    results.forEach(r => {
      let list = r.tags;
      if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = []; } }
      (list || []).forEach(t => tagSet.add(t));
    });
    res.json([...tagSet]);
  });
});

// GET /api/pooboo/accessories/all — all accessories including inactive (admin only)
app.get('/api/pooboo/accessories/all', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM pooboo_accessories';
  const params = [];

  if (type) { sql += ' WHERE accessory_type = ?'; params.push(type); }
  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(results.map(parsePoobooAccessory));
  });
});

// GET /api/pooboo/accessories/:id — single accessory
app.get('/api/pooboo/accessories/:id', (req, res) => {
  db.query('SELECT * FROM pooboo_accessories WHERE id = ?', [req.params.id], (err, result) => {
    if (err)            return res.status(500).json({ error: 'Database error' });
    if (!result.length) return res.status(404).json({ error: 'Accessory not found' });
    res.json(parsePoobooAccessory(result[0]));
  });
});

// POST /api/pooboo/accessories — add accessory (admin only)
app.post('/api/pooboo/accessories', authenticateToken, requireAdmin, upload.single('image'), persistUploads(), (req, res) => {
  const {
    accessory_type, name, product_code,
    price, colour, stock, balance_stock,
    description, tags, is_active
  } = req.body;

  if (!name || !price || !accessory_type) {
    return res.status(400).json({ error: 'Name, price, and accessory type are required' });
  }

  const image = req.file ? req.file.filename : null;
  const balQty = parseInt(balance_stock) || parseInt(stock) || 0;
  const tagsJson = normalizeTags(tags);

  const sql = `
    INSERT INTO pooboo_accessories
    (accessory_type, name, product_code, price, colour, stock, balance_stock, description, tags, image_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    accessory_type.trim(),
    name.trim(),
    product_code || '',
    parseFloat(price) || 0,
    colour || '',
    parseInt(stock) || 0,
    balQty,
    description || '',
    tagsJson,
    image,
    Number(is_active) === 0 ? 0 : 1
  ], (err, result) => {
    if (err) {
      console.error('POOBOO add accessory error:', err);
      return res.status(500).json({ error: 'Failed to add accessory' });
    }
    db.query(
      `INSERT INTO products (brand, product_type, name, description, price, colour, image_url, product_code, accessory_type, stock, balance_stock, tags, is_active)
       VALUES ('pooboo', 'accessory', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || '', parseFloat(price) || 0, colour || '', image,
       product_code || '', accessory_type.trim(), parseInt(stock) || 0,
       balQty, tagsJson, Number(is_active) === 0 ? 0 : 1],
      (errU) => { if (errU) console.error('POOBOO unified accessory sync error:', errU.message); }
    );
    console.log(`✅ POOBOO accessory added: ${name} (${accessory_type})`);
    res.status(201).json({ message: 'Accessory added successfully', id: result.insertId });
  });
});

// PUT /api/pooboo/accessories/:id — update accessory (admin only)
app.put('/api/pooboo/accessories/:id', authenticateToken, requireAdmin, upload.single('image'), persistUploads(), (req, res) => {
  const { id } = req.params;
  const {
    accessory_type, name, product_code,
    price, colour, stock, balance_stock,
    description, tags, is_active
  } = req.body;

  db.query('SELECT image_url FROM pooboo_accessories WHERE id = ?', [id], (err, result) => {
    if (err || !result.length) return res.status(404).json({ error: 'Accessory not found' });

    const finalImage = req.file ? req.file.filename : result[0].image_url;
    const tagsJson = normalizeTags(tags);

    const sql = `
      UPDATE pooboo_accessories
      SET accessory_type=?, name=?, product_code=?, price=?,
          colour=?, stock=?, balance_stock=?, description=?, tags=?, image_url=?, is_active=?
      WHERE id=?
    `;

    db.query(sql, [
      accessory_type || '',
      name || '',
      product_code || '',
      parseFloat(price) || 0,
      colour || '',
      parseInt(stock) || 0,
      parseInt(balance_stock) || 0,
      description || '',
      tagsJson,
      finalImage,
      Number(is_active) === 0 ? 0 : 1,
      id
    ], (err2) => {
      if (err2) {
        console.error('POOBOO update accessory error:', err2);
        return res.status(500).json({ error: 'Update failed' });
      }
      db.query(
        `UPDATE products SET name=?, description=?, price=?, colour=?, image_url=?, product_code=?,
         accessory_type=?, stock=?, balance_stock=?, tags=?, is_active=?
         WHERE brand='pooboo' AND product_type='accessory' AND product_code=?`,
        [name || '', description || '', parseFloat(price) || 0, colour || '', finalImage,
         product_code || '', accessory_type || '', parseInt(stock) || 0,
         parseInt(balance_stock) || 0, tagsJson, Number(is_active) === 0 ? 0 : 1, product_code || ''],
        (errU) => { if (errU) console.error('POOBOO unified accessory update sync error:', errU.message); }
      );
      res.json({ message: 'Accessory updated successfully' });
    });
  });
});

// DELETE /api/pooboo/accessories/:id — delete accessory (admin only)
app.delete('/api/pooboo/accessories/:id', authenticateToken, requireAdmin, (req, res) => {
  db.query('SELECT product_code, image_url FROM pooboo_accessories WHERE id = ?', [req.params.id], (err, rows) => {
    const code = rows && rows.length ? rows[0].product_code : null;
    const imageUrl = rows && rows.length ? rows[0].image_url : null;
    db.query('DELETE FROM pooboo_accessories WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Delete failed' });
      if (code) {
        db.query("DELETE FROM products WHERE brand='pooboo' AND product_type='accessory' AND product_code=?", [code],
          (errU) => { if (errU) console.error('POOBOO unified accessory delete sync error:', errU.message); }
        );
      }
      deleteStoredImages([imageUrl]).then(() => {
        res.json({ message: 'Accessory deleted successfully' });
      });
    });
  });
});

/* =========================
   POOBOO — ENQUIRY APIs
========================= */

// POST /api/pooboo/enquiries — submit enquiry (customer)
app.post('/api/pooboo/enquiries', (req, res) => {
  const { name, phone, email, place, product_link } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  db.query(
    `INSERT INTO pooboo_enquiries (name, phone, email, place, product_link)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), phone.trim(), (email || '').trim(), (place || '').trim(), (product_link || '').trim()],
    (err, result) => {
      if (err) {
        console.error('POOBOO enquiry insert error:', err);
        return res.status(500).json({ error: 'Failed to submit enquiry' });
      }

      sendPoobooEnquiryNotification({
        id: result.insertId, name, phone, email, place, product_link
      });

      console.log(`✅ POOBOO enquiry from ${name} (${phone})`);
      res.status(201).json({ message: 'Enquiry submitted successfully', id: result.insertId });
    }
  );
});

// GET /api/pooboo/enquiries — all enquiries (admin only)
app.get('/api/pooboo/enquiries', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.query;

  let sql = 'SELECT * FROM pooboo_enquiries';
  const params = [];

  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch enquiries' });
    res.json(results);
  });
});

// GET /api/pooboo/enquiries/:id — single enquiry (admin only)
app.get('/api/pooboo/enquiries/:id', authenticateToken, requireAdmin, (req, res) => {
  db.query('SELECT * FROM pooboo_enquiries WHERE id = ?', [req.params.id], (err, result) => {
    if (err)            return res.status(500).json({ error: 'Database error' });
    if (!result.length) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(result[0]);
  });
});

// PATCH /api/pooboo/enquiries/:id/status — update enquiry status (admin only)
app.patch('/api/pooboo/enquiries/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['new', 'contacted', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  db.query(
    'UPDATE pooboo_enquiries SET status = ? WHERE id = ?',
    [status, id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update enquiry' });
      res.json({ message: 'Enquiry status updated', id, status });
    }
  );
});

// DELETE /api/pooboo/enquiries/:id — delete enquiry (admin only)
app.delete('/api/pooboo/enquiries/:id', authenticateToken, requireAdmin, (req, res) => {
  db.query('DELETE FROM pooboo_enquiries WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ message: 'Enquiry deleted successfully' });
  });
});

/* =========================
   POOBOO — EMAIL NOTIFICATION
========================= */

function sendPoobooEnquiryNotification(enquiry) {
  const safe = {
    id: enquiry.id,
    name: escapeHtml(enquiry.name),
    phone: escapeHtml(enquiry.phone),
    email: escapeHtml(enquiry.email),
    place: escapeHtml(enquiry.place),
    product_link: escapeHtml(enquiry.product_link)
  };
  const mailOptions = {
    from: `"POOBOO Kids Boutique" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: `👶 New Enquiry #${enquiry.id} — ${enquiry.name} | POOBOO`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#fff9f0;font-family:'Georgia',serif;">
        <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
          <div style="background:#ff6b9d;padding:32px 40px;text-align:center;">
            <h1 style="font-size:30px;color:#fff;margin:0;letter-spacing:3px;font-weight:600;">POOBOO</h1>
            <p style="font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.8);margin:8px 0 0;text-transform:uppercase;">New Enquiry Received</p>
          </div>
          <div style="height:3px;background:linear-gradient(90deg,#ff6b9d,#ffcc02,#ff6b9d);"></div>
          <div style="padding:32px 40px;">
            <p style="font-size:20px;font-weight:600;color:#1a1814;margin:0 0 20px;">Enquiry #${safe.id}</p>
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;width:80px;">Name</td><td style="padding:8px 0;font-weight:600;color:#1a1814;">${safe.name}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Phone</td><td style="padding:8px 0;color:#1a1814;">${safe.phone}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Email</td><td style="padding:8px 0;color:#1a1814;">${safe.email || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Place</td><td style="padding:8px 0;color:#1a1814;">${safe.place || '—'}</td></tr>
                <tr><td style="padding:8px 0;color:#9a9080;font-size:13px;">Regarding</td><td style="padding:8px 0;color:#1a1814;">${safe.product_link || '—'}</td></tr>
              </tbody>
            </table>
          </div>
          <div style="background:#ff6b9d;padding:20px 40px;text-align:center;">
            <p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0;">© 2024 POOBOO Kids Boutique Admin</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error('POOBOO enquiry email error:', err);
    else console.log(`✅ POOBOO enquiry notification sent for #${enquiry.id}`);
  });
}
/* =========================
   POOBOO — REVIEWS APIs
========================= */

// ── Helper: map DB row → camelCase for frontend ──────────
function mapReview(row) {
  return {
    id:            row.id,
    productId:     row.product_id   || null,
    productName:   row.product_name || null,
    customerId:    row.customer_id,
    customerName:  row.customer_name,
    customerEmail: row.customer_email,
    rating:        row.rating,
    title:         row.title,
    body:          row.body,
    photoUrl:      row.photo_url ? `/uploads/${row.photo_url}` : null,
    brand:         row.brand,
    isVisible:     row.is_visible === 1,
    createdAt:     row.created_at
  };
}

/* =========================================================
   REVIEWS APIs (unified — one shared table, brand-scoped)
   Single route set for ZULU + POOBOO + future AURUM.
   All reviews live in `pooboo_reviews`, distinguished by brand.
   GET is public; POST requires login; admin routes are guarded.
   ========================================================= */

// GET /api/zulu/reviews — public, visible reviews from ALL brands (shared page).
// Optional ?brand= narrows to one store; default shows every brand together.
app.get('/api/zulu/reviews', (req, res) => {
  const allowedBrands = ['zulu', 'pooboo', 'aurum'];
  const brand = req.query.brand;
  let sql = `
    SELECT * FROM pooboo_reviews
    WHERE is_visible = 1
  `;
  const params = [];
  if (brand && allowedBrands.includes(brand)) {
    sql += ' AND brand = ?';
    params.push(brand);
  }
  sql += ' ORDER BY created_at DESC';
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('GET reviews error:', err);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
    res.json(results.map(mapReview));
  });
});

// GET /api/zulu/reviews/admin/all — ALL reviews including hidden (admin only)
// NOTE: must be defined BEFORE /api/zulu/reviews/product/:productId to avoid route conflict
app.get('/api/zulu/reviews/admin/all', authenticateToken, requireAdmin, (req, res) => {
  const allowedBrands = ['zulu', 'pooboo', 'aurum'];
  const brand = req.query.brand;
  let sql = 'SELECT * FROM pooboo_reviews';
  const params = [];
  if (brand && allowedBrands.includes(brand)) {
    sql += ' WHERE brand = ?';
    params.push(brand);
  }
  sql += ' ORDER BY created_at DESC';
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Admin get reviews error:', err);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
    res.json(results.map(mapReview));
  });
});

// GET /api/zulu/reviews/product/:productId — reviews for a specific product (public).
// Product identity is brand + product_id, so callers pass ?brand= to disambiguate.
app.get('/api/zulu/reviews/product/:productId', (req, res) => {
  const allowedBrands = ['zulu', 'pooboo', 'aurum'];
  const brand = req.query.brand && allowedBrands.includes(req.query.brand) ? req.query.brand : 'zulu';
  const sql = `
    SELECT * FROM pooboo_reviews
    WHERE product_id = ? AND brand = ? AND is_visible = 1
    ORDER BY created_at DESC
  `;
  db.query(sql, [req.params.productId, brand], (err, results) => {
    if (err) {
      console.error('GET product reviews error:', err);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
    res.json(results.map(mapReview));
  });
});

// POST /api/zulu/reviews — submit a new review (authenticated customer).
// Brand comes from the request body (set by which store's page the user clicked
// "Write a Review" on), validated against a whitelist and defaulting to 'zulu'.
app.post('/api/zulu/reviews', authenticateToken, upload.single('photo'), persistUploads(), (req, res) => {
  const { productId, rating, title, body } = req.body;
  const allowedBrands = ['zulu', 'pooboo', 'aurum'];
  const submittedBrand = allowedBrands.includes(req.body.brand) ? req.body.brand : 'zulu';

  if (!rating || !title || !body) {
    return res.status(400).json({ error: 'Rating, title, and body are required' });
  }
  const ratingNum = parseInt(rating, 10);
  if (ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const customer = req.user; // set by authenticateToken

  db.query('SELECT name FROM users WHERE id = ?', [customer.id], (err, userRows) => {
    if (err) {
      console.error('Review - lookup user error:', err);
      return res.status(500).json({ error: 'Failed to submit review' });
    }
    const customerName = (userRows && userRows.length) ? userRows[0].name : customer.email;

    // Resolve a product-name snapshot scoped to the submitted brand. Product IDs
    // can collide across stores, so identity is always brand + product_id.
    //   zulu  -> shared `products` table (brand column)
    //   pooboo-> pooboo_products first, then pooboo_accessories / pooboo_fabrics
    //           (all three can be reviewed; ids are not unique across them)
    //   aurum -> shared `products` table (brand column, future)
    const resolveProductName = (cb) => {
      if (!productId) return cb(null);
      if (submittedBrand === 'pooboo') {
        const check = (i) => {
          if (i >= 3) return cb(null);
          const table = ['pooboo_products', 'pooboo_accessories', 'pooboo_fabrics'][i];
          db.query(`SELECT name FROM ${table} WHERE id = ?`, [productId], (err2, rows) => {
            if (err2 || !rows || !rows.length) return check(i + 1);
            cb(rows[0].name);
          });
        };
        check(0);
      } else {
        db.query('SELECT name FROM products WHERE id = ? AND brand = ?', [productId, submittedBrand], (err2, rows) => {
          if (err2) return cb(null);
          cb(rows && rows.length ? rows[0].name : null);
        });
      }
    };

    resolveProductName((productName) => {
      const photoFilename = req.file ? req.file.filename : null;

      const sql = `
        INSERT INTO pooboo_reviews
          (product_id, product_name, customer_id, customer_name, customer_email,
           rating, title, body, photo_url, brand, is_visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;

      db.query(sql, [
        productId || null,
        productName || null,
        customer.id,
        customerName,
        customer.email,
        ratingNum,
        title.trim(),
        body.trim(),
        photoFilename,
        submittedBrand
      ], (err3, result) => {
        if (err3) {
          console.error('Insert review error:', err3);
          return res.status(500).json({ error: 'Failed to submit review' });
        }
        db.query('SELECT * FROM pooboo_reviews WHERE id = ?', [result.insertId], (err4, rows) => {
          if (err4 || !rows.length) {
            return res.status(201).json({ message: 'Review submitted', id: result.insertId });
          }
          console.log(`✅ Review #${result.insertId} (${submittedBrand}) by ${customer.email}`);
          res.status(201).json(mapReview(rows[0]));
        });
      });
    });
  });
});

// DELETE /api/zulu/reviews/:id — delete a review (admin only)
app.delete('/api/zulu/reviews/:id', authenticateToken, requireAdmin, (req, res) => {
  db.query(
    'DELETE FROM pooboo_reviews WHERE id = ?',
    [req.params.id],
    (err, result) => {
      if (err) {
        console.error('Delete review error:', err);
        return res.status(500).json({ error: 'Delete failed' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Review not found' });
      }
      console.log(`🗑️  Review #${req.params.id} deleted`);
      res.json({ success: true, message: 'Review deleted successfully' });
    }
  );
});

/* =========================
   WISHLIST APIs
   Shared across ZULU + all three POOBOO catalogs (products/fabrics/accessories).
========================= */

// GET /api/wishlist — the logged-in user's own wishlist
app.get('/api/wishlist', authenticateToken, (req, res) => {
  db.query(
    'SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error('Fetch wishlist error:', err);
        return res.status(500).json({ error: 'Failed to fetch wishlist' });
      }
      res.json(rows);
    }
  );
});

// POST /api/wishlist — add an item (idempotent; re-adding just refreshes the
// snapshotted product details in case price/name changed since last time)
app.post('/api/wishlist', authenticateToken, (req, res) => {
  const { item_type, item_id, brand, category, product_name, product_code, image_url, price } = req.body;

  const validTypes = ['zulu_product', 'pooboo_product', 'pooboo_fabric', 'pooboo_accessory'];
  if (!item_type || !validTypes.includes(item_type)) {
    return res.status(400).json({ error: 'Invalid or missing item_type' });
  }
  if (!item_id || !brand || !product_name) {
    return res.status(400).json({ error: 'item_id, brand and product_name are required' });
  }

  db.query('SELECT name FROM users WHERE id = ?', [req.user.id], (errU, userRows) => {
    if (errU) {
      console.error('Wishlist add — user lookup error:', errU);
      return res.status(500).json({ error: 'Failed to add to wishlist' });
    }
    const userName = userRows[0]?.name || '';

    db.query(
      `INSERT INTO wishlist
         (user_id, user_name, user_email, item_type, item_id, brand, category, product_name, product_code, image_url, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET
         product_name = EXCLUDED.product_name,
         product_code = EXCLUDED.product_code,
         image_url    = EXCLUDED.image_url,
         price        = EXCLUDED.price,
         category     = EXCLUDED.category`,
      [
        req.user.id, userName, req.user.email,
        item_type, item_id, brand, category || null,
        product_name, product_code || null, image_url || null, price || null
      ],
      (err2) => {
        if (err2) {
          console.error('Wishlist add error:', err2);
          return res.status(500).json({ error: 'Failed to add to wishlist' });
        }
        res.json({ message: 'Added to wishlist' });
      }
    );
  });
});

// DELETE /api/wishlist/:itemType/:itemId — remove one item from the current user's wishlist
app.delete('/api/wishlist/:itemType/:itemId', authenticateToken, (req, res) => {
  const { itemType, itemId } = req.params;
  db.query(
    'DELETE FROM wishlist WHERE user_id = ? AND item_type = ? AND item_id = ?',
    [req.user.id, itemType, itemId],
    (err) => {
      if (err) {
        console.error('Wishlist remove error:', err);
        return res.status(500).json({ error: 'Failed to remove from wishlist' });
      }
      res.json({ message: 'Removed from wishlist' });
    }
  );
});

// GET /api/admin/wishlist — every wishlisted item across every user (admin dashboard card)
app.get('/api/admin/wishlist', authenticateToken, requireAdmin, (req, res) => {
  db.query('SELECT * FROM wishlist ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Fetch admin wishlist error:', err);
      return res.status(500).json({ error: 'Failed to fetch wishlist data' });
    }
    res.json(rows);
  });
});

/* =========================
   SERVER START
========================= */

// Test route — verify routing works
app.get('/api/test-routing', (req, res) => res.json({ ok: true, ver: 2 }));

// Only listen when run directly (`node src/index.js`). When this module is
// required by another process (e.g. a Vercel serverless function via
// serverless-http, or a test harness), it must NOT bind a port itself.
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log("🚀 Zulu API running at http://localhost:" + PORT);
  });
}

module.exports = app;