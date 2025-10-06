// routes/auth.js
// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // 🔹 Get user from database
    const [users] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];

    // 🔹 Allow plain 'admin' / 'admin123' login for testing
    let isValid = false;
    if (username === 'admin' && password === 'admin123') {
      isValid = true;
    } else {
      // Compare hashed password
      isValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 🔹 Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '2h' }
    );

    // ✅ Send response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: { username: user.username, role: user.role }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get current user (protected route example)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = req.app.get('db');
    const [users] = await db.query(
      'SELECT id, username, role, created_at FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;