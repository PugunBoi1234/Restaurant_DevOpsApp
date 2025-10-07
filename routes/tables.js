// routes/tables.js
const express = require('express');
const router = express.Router();

// Get all tables
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const [tables] = await db.query('SELECT * FROM tables ORDER BY table_number');
    res.json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tables/all - return all tables
router.get('/all', async (req, res) => {
    try {
        const db = req.app.get('db');
        const [tables] = await db.query('SELECT * FROM tables');
        res.json({ success: true, data: tables });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// Get table by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const [tables] = await db.query('SELECT * FROM tables WHERE id = ?', [req.params.id]);
    
    if (tables.length === 0) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    
    res.json({ success: true, data: tables[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Scan QR code (by table number)
router.post('/scan/:tableNumber', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { tableNumber } = req.params;
    
    const [tables] = await db.query('SELECT * FROM tables WHERE table_number = ?', [tableNumber]);
    
    if (tables.length === 0) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }
    
    const table = tables[0];
    
    // Update table status to occupied
    await db.query('UPDATE tables SET status = ? WHERE id = ?', ['occupied', table.id]);
    
    // Emit socket event
    io.to('admin-room').emit('table-scanned', {
      tableId: table.id,
      tableNumber: table.table_number,
      status: 'occupied'
    });
    
    res.json({
      success: true,
      data: {
        tableId: table.id,
        tableNumber: table.table_number,
        capacity: table.capacity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset table
router.post('/reset/:tableId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { tableId } = req.params;
    
    // Update table status to free
    await db.query('UPDATE tables SET status = ? WHERE id = ?', ['free', tableId]);
    
    // End active sessions for this table
    await db.query(
      'UPDATE sessions SET status = ?, ended_at = NOW() WHERE table_id = ? AND status = ?',
      ['completed', tableId, 'active']
    );
    
    // Emit socket event
    io.to('admin-room').emit('table-reset', { tableId });
    
    res.json({ success: true, message: 'Table reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update table status
router.put('/:tableId/status', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { tableId } = req.params;
    const { status } = req.body;
    
    if (!['free', 'occupied', 'reserved', 'dirty'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    await db.query('UPDATE tables SET status = ? WHERE id = ?', [status, tableId]);
    
    // Emit socket event
    io.to('admin-room').emit('table-status-updated', { tableId, status });
    
    res.json({ success: true, message: 'Table status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;