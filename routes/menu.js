// routes/menu.js
const express = require('express');
const router = express.Router();

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const [items] = await db.query(
      'SELECT * FROM menu_items ORDER BY category, name_en'
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get menu item by ID
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const [items] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get menu items by category
router.get('/category/:category', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { category } = req.params;
    
    const [items] = await db.query(
      'SELECT * FROM menu_items WHERE category = ? AND is_available = TRUE ORDER BY name_en',
      [category]
    );
    
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new menu item
router.post('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const {
      name_en,
      name_th,
      description_en,
      description_th,
      price,
      category,
      icon,
      is_vegetarian,
      is_spicy,
      is_popular
    } = req.body;
    
    if (!name_en || !name_th || !price || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    const [result] = await db.query(
      `INSERT INTO menu_items (name_en, name_th, description_en, description_th, price, category, icon, is_vegetarian, is_spicy, is_popular)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name_en, name_th, description_en || '', description_th || '', price, category, icon || '🍽️', 
       is_vegetarian || false, is_spicy || false, is_popular || false]
    );
    
    const io = req.app.get('io');
    io.to('admin-room').emit('menu-item-created', { itemId: result.insertId });
    
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update menu item
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    const {
      name_en,
      name_th,
      description_en,
      description_th,
      price,
      category,
      icon,
      is_vegetarian,
      is_spicy,
      is_popular,
      is_available
    } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name_en !== undefined) { updates.push('name_en = ?'); values.push(name_en); }
    if (name_th !== undefined) { updates.push('name_th = ?'); values.push(name_th); }
    if (description_en !== undefined) { updates.push('description_en = ?'); values.push(description_en); }
    if (description_th !== undefined) { updates.push('description_th = ?'); values.push(description_th); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
    if (is_vegetarian !== undefined) { updates.push('is_vegetarian = ?'); values.push(is_vegetarian); }
    if (is_spicy !== undefined) { updates.push('is_spicy = ?'); values.push(is_spicy); }
    if (is_popular !== undefined) { updates.push('is_popular = ?'); values.push(is_popular); }
    if (is_available !== undefined) { updates.push('is_available = ?'); values.push(is_available); }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    values.push(id);
    
    await db.query(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const io = req.app.get('io');
    io.to('admin-room').emit('menu-item-updated', { itemId: id });
    
    res.json({ success: true, message: 'Menu item updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete menu item (soft delete by setting is_available to false)
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;
    
    await db.query('UPDATE menu_items SET is_available = FALSE WHERE id = ?', [id]);
    
    const io = req.app.get('io');
    io.to('admin-room').emit('menu-item-deleted', { itemId: id });
    
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;