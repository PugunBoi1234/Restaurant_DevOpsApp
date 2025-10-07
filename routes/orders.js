// routes/orders.js
const express = require('express');
const router = express.Router();
const db = require('mysql2/promise');

// Update order details
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const { queue_number, table_number, status, total_amount } = req.body;

    // Update order fields
    await db.query(
      `UPDATE orders 
       SET queue_number = ?, status = ?, total_amount = ? 
       WHERE id = ?`,
      [queue_number, status, total_amount, id]
    );

    // Optionally update table number if changed
    if (table_number) {
      // Get table id for the new table_number
      const [tables] = await db.query('SELECT id FROM tables WHERE table_number = ?', [table_number]);
      if (tables.length > 0) {
        await db.query('UPDATE orders SET table_id = ? WHERE id = ?', [tables[0].id, id]);
      }
    }

    res.json({ success: true, message: 'Order updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate queue number
function generateQueueNumber() {
  const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const number = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  return `${prefix}${number}`;
}

// Create new order
router.post('/', async (req, res) => {
  const connection = await req.app.get('db').getConnection();

  // Log incoming request body for debugging
  console.log('Incoming order create request:', JSON.stringify(req.body, null, 2));

  try {
    await connection.beginTransaction();
    
    const { sessionId, tableId, items, totalAmount, paymentMode } = req.body;
    
    if (!sessionId || !tableId || !items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Generate unique queue number
    let queueNumber;
    let isUnique = false;
    while (!isUnique) {
      queueNumber = generateQueueNumber();
      const [existing] = await connection.query(
        'SELECT id FROM orders WHERE queue_number = ? AND DATE(created_at) = CURDATE()',
        [queueNumber]
      );
      isUnique = existing.length === 0;
    }
    
    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (session_id, table_id, queue_number, total_amount, payment_mode) VALUES (?, ?, ?, ?, ?)',
      [sessionId, tableId, queueNumber, totalAmount, paymentMode || 'split']
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order items
    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, avatar_id, menu_item_id, quantity, base_price, final_price, spicy_level, protein_choice, special_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.avatarId,
          item.itemId,
          item.quantity,
          item.basePrice,
          item.finalPrice,
          item.customizations?.spicyLevel || 0,
          item.customizations?.protein || 'Original',
          item.customizations?.notes || null
        ]
      );
    }
    
    await connection.commit();
    
    // Get table number for socket event
    const [tables] = await connection.query('SELECT table_number FROM tables WHERE id = ?', [tableId]);
    const tableNumber = tables[0]?.table_number;
    
    // Emit socket event to admin
    const io = req.app.get('io');
    io.to('admin-room').emit('new-order', {
      orderId,
      queueNumber,
      tableNumber,
      totalAmount,
      itemCount: items.length
    });
    
    res.json({
      success: true,
      data: { orderId, queueNumber, tableNumber }
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    const [orders] = await db.query(
      `SELECT o.*, t.table_number, s.people_count
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       JOIN sessions s ON o.session_id = s.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Get order items with menu details
    const [items] = await db.query(
      `SELECT oi.*, m.name_en, m.name_th, m.icon, a.nickname, a.animal_emoji
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       JOIN avatars a ON oi.avatar_id = a.id
       WHERE oi.order_id = ?`,
      [id]
    );
    
    res.json({ success: true, data: { ...order, items } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET all tables
router.get('/all', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tables ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.json({ success: false, message: 'Failed to fetch tables' });
  }
});


// Get all orders in queue
// Get all tables with their current active order (if any)
router.get('/queue/all', async (req, res) => {
  try {
    const db = req.app.get('db');
    // Get all tables
    const [tables] = await db.query('SELECT * FROM tables ORDER BY table_number');

    // Get today's active orders
    const [orders] = await db.query(
      `SELECT o.*, t.table_number, COUNT(oi.id) as item_count
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.status != 'served' AND o.status != 'cancelled'
       AND DATE(o.created_at) = CURDATE()
       GROUP BY o.id
       ORDER BY o.created_at ASC`
    );

    // Map orders by table_id for quick lookup
    const ordersByTable = {};
    for (const order of orders) {
      ordersByTable[order.table_id] = order;
    }

    // Build result: each table with its order (if any)
    const result = tables.map(table => {
      const order = ordersByTable[table.id] || null;
      return {
        table_id: table.id,
        table_number: table.table_number,
        status: table.status,
        capacity: table.capacity,
        order: order
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Order queue load error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'preparing', 'cooking', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    // Get order details
    const [orders] = await db.query(
      'SELECT queue_number, table_id FROM orders WHERE id = ?',
      [id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const { queue_number, table_id } = orders[0];
    
    // Update status
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    
    // Get table number
    const [tables] = await db.query('SELECT table_number FROM tables WHERE id = ?', [table_id]);
    const tableNumber = tables[0]?.table_number;
    
    // Emit to admin
    io.to('admin-room').emit('order-status-updated', {
      orderId: id,
      queueNumber: queue_number,
      status
    });
    
    // Emit to customer at that table
    io.to(`table-${tableNumber}`).emit('order-status-updated', {
      orderId: id,
      queueNumber: queue_number,
      status
    });
    
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get orders by table
router.get('/table/:tableId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { tableId } = req.params;
    
    const [orders] = await db.query(
      `SELECT o.*, COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.table_id = ? AND DATE(o.created_at) = CURDATE()
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [tableId]
    );
    
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;