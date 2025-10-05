// routes/sessions.js
const express = require('express');
const router = express.Router();

// Create new session
router.post('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { tableId, peopleCount, avatars } = req.body;
    
    if (!tableId || !peopleCount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Create session
    const [sessionResult] = await db.query(
      'INSERT INTO sessions (table_id, people_count) VALUES (?, ?)',
      [tableId, peopleCount]
    );
    
    const sessionId = sessionResult.insertId;
    
    // Create avatars if provided
    if (avatars && avatars.length > 0) {
      const avatarValues = avatars.map((avatar, index) => [
        sessionId,
        index,
        avatar.animal || '🧑',
        avatar.nickname || `Person ${index + 1}`,
        avatar.isOrdering !== undefined ? avatar.isOrdering : true,
        avatar.paymentMethod || 'cash'
      ]);
      
      await db.query(
        'INSERT INTO avatars (session_id, avatar_index, animal_emoji, nickname, is_ordering, payment_method) VALUES ?',
        [avatarValues]
      );
    }
    
    // Update table status
    await db.query('UPDATE tables SET status = ? WHERE id = ?', ['occupied', tableId]);
    
    // Emit socket event
    io.to('admin-room').emit('session-created', { sessionId, tableId, peopleCount });
    
    res.json({
      success: true,
      data: { sessionId, tableId, peopleCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get session by table
router.get('/table/:tableId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { tableId } = req.params;
    
    const [sessions] = await db.query(
      'SELECT * FROM sessions WHERE table_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1',
      [tableId, 'active']
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }
    
    const session = sessions[0];
    
    // Get avatars for this session
    const [avatars] = await db.query(
      'SELECT * FROM avatars WHERE session_id = ? ORDER BY avatar_index',
      [session.id]
    );
    
    res.json({
      success: true,
      data: { ...session, avatars }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// End session
router.post('/:sessionId/end', async (req, res) => {
  try {
    const db = req.app.get('db');
    const io = req.app.get('io');
    const { sessionId } = req.params;
    
    // Get session to find table
    const [sessions] = await db.query('SELECT table_id FROM sessions WHERE id = ?', [sessionId]);
    
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const tableId = sessions[0].table_id;
    
    // End session
    await db.query(
      'UPDATE sessions SET status = ?, ended_at = NOW() WHERE id = ?',
      ['completed', sessionId]
    );
    
    // Free the table
    await db.query('UPDATE tables SET status = ? WHERE id = ?', ['dirty', tableId]);
    
    // Emit socket event
    io.to('admin-room').emit('session-ended', { sessionId, tableId });
    
    res.json({ success: true, message: 'Session ended successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get session by ID
router.get('/:sessionId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { sessionId } = req.params;
    
    const [sessions] = await db.query('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const session = sessions[0];
    
    // Get avatars
    const [avatars] = await db.query(
      'SELECT * FROM avatars WHERE session_id = ? ORDER BY avatar_index',
      [sessionId]
    );
    
    res.json({
      success: true,
      data: { ...session, avatars }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;