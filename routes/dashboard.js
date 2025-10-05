// routes/dashboard.js
const express = require('express');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    // Today's orders count
    const [orderCount] = await db.query(
      'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()'
    );
    
    // Today's revenue
    const [revenue] = await db.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE DATE(created_at) = CURDATE() AND status != "cancelled"'
    );
    
    // Occupied tables
    const [occupied] = await db.query(
      'SELECT COUNT(*) as count FROM tables WHERE status = "occupied"'
    );
    
    const [total] = await db.query('SELECT COUNT(*) as count FROM tables');
    
    // Average wait time (in minutes) - calculate from pending to ready
    const [avgTime] = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_time 
       FROM orders 
       WHERE DATE(created_at) = CURDATE() 
       AND status IN ('ready', 'served')
       AND updated_at IS NOT NULL`
    );
    
    const stats = {
      todayOrders: orderCount[0].count,
      todayRevenue: Math.round(revenue[0].total),
      occupiedTables: `${occupied[0].count}/${total[0].count}`,
      avgWaitTime: Math.round(avgTime[0].avg_time || 15)
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get today's order history
router.get('/orders/today', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const [orders] = await db.query(
      `SELECT o.*, t.table_number, COUNT(oi.id) as item_count
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE DATE(o.created_at) = CURDATE()
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get revenue by time period
router.get('/revenue/:period', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { period } = req.params; // 'today', 'week', 'month'
    
    let dateCondition;
    switch (period) {
      case 'week':
        dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateCondition = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      default:
        dateCondition = 'DATE(created_at) = CURDATE()';
    }
    
    const [revenue] = await db.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as total_revenue
       FROM orders 
       WHERE ${dateCondition} AND status != 'cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );
    
    res.json({ success: true, data: revenue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get popular menu items
router.get('/popular-items', async (req, res) => {
  try {
    const db = req.app.get('db');
    
    const [items] = await db.query(
      `SELECT 
        m.id,
        m.name_en,
        m.name_th,
        m.icon,
        m.category,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.final_price * oi.quantity) as total_revenue
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       JOIN orders o ON oi.order_id = o.id
       WHERE DATE(o.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY m.id
       ORDER BY order_count DESC
       LIMIT 10`
    );
    
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;