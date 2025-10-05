-- database.sql
-- Create database
CREATE DATABASE IF NOT EXISTS restaurant_db;
USE restaurant_db;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS avatars;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS tables;

-- Tables table
CREATE TABLE tables (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_number VARCHAR(10) UNIQUE NOT NULL,
  status ENUM('free', 'occupied', 'reserved', 'dirty') DEFAULT 'free',
  capacity INT DEFAULT 4,
  qr_code VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sessions table (dining sessions)
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  table_id INT NOT NULL,
  people_count INT NOT NULL,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- Avatars table (people in a session)
CREATE TABLE avatars (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  avatar_index INT NOT NULL,
  animal_emoji VARCHAR(10),
  nickname VARCHAR(50),
  is_ordering BOOLEAN DEFAULT TRUE,
  payment_method ENUM('cash', 'qr', 'card') DEFAULT 'cash',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Menu items table
CREATE TABLE menu_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_en VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_th TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category ENUM('appetizers', 'mains', 'desserts', 'drinks') NOT NULL,
  icon VARCHAR(10),
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  is_popular BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  table_id INT NOT NULL,
  queue_number VARCHAR(10) UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'preparing', 'cooking', 'ready', 'served', 'cancelled') DEFAULT 'pending',
  payment_mode ENUM('split', 'together') DEFAULT 'split',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

-- Order items table
CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  avatar_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT DEFAULT 1,
  base_price DECIMAL(10, 2) NOT NULL,
  final_price DECIMAL(10, 2) NOT NULL,
  spicy_level INT DEFAULT 0,
  protein_choice VARCHAR(50) DEFAULT 'Original',
  special_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (avatar_id) REFERENCES avatars(id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Admin users table
CREATE TABLE admin_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tables
INSERT INTO tables (table_number, capacity, qr_code) VALUES
('T01', 2, 'QR-T01'),
('T02', 2, 'QR-T02'),
('T03', 4, 'QR-T03'),
('T04', 4, 'QR-T04'),
('T05', 4, 'QR-T05'),
('T06', 4, 'QR-T06'),
('T07', 6, 'QR-T07'),
('T08', 6, 'QR-T08'),
('T09', 8, 'QR-T09'),
('T10', 8, 'QR-T10'),
('T11', 4, 'QR-T11'),
('T12', 4, 'QR-T12');

-- Insert menu items
INSERT INTO menu_items (name_en, name_th, description_en, description_th, price, category, icon, is_vegetarian, is_spicy, is_popular) VALUES
('Spring Rolls', 'ปอเปี๊ยะทอด', 'Crispy vegetable spring rolls', 'ปอเปี๊ยะผักกรอบ', 120.00, 'appetizers', '🥢', TRUE, FALSE, FALSE),
('Chicken Satay', 'ไก่สะเต๊ะ', 'Grilled chicken skewers', 'ไก่ย่างเสียบไม้', 150.00, 'appetizers', '🗡', FALSE, TRUE, TRUE),
('Tom Yum Soup', 'ต้มยำ', 'Spicy Thai soup', 'ต้มยำรสเผ็ด', 140.00, 'appetizers', '🍲', FALSE, TRUE, TRUE),
('Pad Thai', 'ผัดไทย', 'Thai stir-fried noodles', 'ก๋วยเตี๋ยวผัดไทย', 180.00, 'mains', '🍜', FALSE, TRUE, TRUE),
('Green Curry', 'แกงเขียวหวาน', 'Spicy green curry', 'แกงเขียวหวาน', 220.00, 'mains', '🍛', FALSE, TRUE, FALSE),
('Vegetable Stir Fry', 'ผัดผักรวม', 'Mixed vegetables', 'ผักสดผัดรวม', 140.00, 'mains', '🥬', TRUE, FALSE, FALSE),
('Massaman Curry', 'แกงมัสมั่น', 'Rich curry', 'แกงมัสมั่น', 200.00, 'mains', '🍖', FALSE, FALSE, TRUE),
('Fried Rice', 'ข้าวผัด', 'Thai fried rice', 'ข้าวผัดไทย', 160.00, 'mains', '🍚', FALSE, FALSE, TRUE),
('Mango Sticky Rice', 'ข้าวเหนียวมะม่วง', 'Sweet rice with mango', 'ข้าวเหนียวหวาน', 90.00, 'desserts', '🥭', TRUE, FALSE, TRUE),
('Thai Ice Cream', 'ไอศกรีมไทย', 'Coconut ice cream', 'ไอศกรีมกะทิ', 70.00, 'desserts', '🍨', TRUE, FALSE, FALSE),
('Thai Iced Tea', 'ชาไทยเย็น', 'Thai tea with milk', 'ชาไทยนมสด', 60.00, 'drinks', '🧋', TRUE, FALSE, TRUE),
('Coconut Water', 'น้ำมะพร้าว', 'Fresh coconut', 'น้ำมะพร้าวสด', 50.00, 'drinks', '🥥', TRUE, FALSE, FALSE),
('Thai Coffee', 'กาแฟไทย', 'Traditional Thai coffee', 'กาแฟโบราณ', 65.00, 'drinks', '☕', TRUE, FALSE, FALSE),
('Fresh Juice', 'น้ำผลไม้', 'Seasonal fresh juice', 'น้ำผลไม้สด', 70.00, 'drinks', '🧃', TRUE, FALSE, FALSE);

-- Insert default admin user (password: admin123)
-- This is a bcrypt hash of 'admin123'
INSERT INTO admin_users (username, password_hash, role) VALUES
('admin', '$2b$10$YQm7XqPSXJ5EKp5HvO5gZOKxEKvRxK3HQGlLhGjPqzJ5XqKhEQwJi', 'admin');

-- Create indexes for better performance
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_table ON sessions(table_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_queue ON orders(queue_number);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_menu_category ON menu_items(category);
CREATE INDEX idx_menu_available ON menu_items(is_available);
CREATE INDEX idx_avatars_session ON avatars(session_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Display success message
SELECT 'Database setup completed successfully!' AS message;
SELECT CONCAT('Total tables: ', COUNT(*)) AS tables FROM tables;
SELECT CONCAT('Total menu items: ', COUNT(*)) AS menu_items FROM menu_items;
SELECT CONCAT('Admin users: ', COUNT(*)) AS admin_users FROM admin_users;