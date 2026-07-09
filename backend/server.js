const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'itsm.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Tasks table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        app TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        type TEXT NOT NULL,
        assignee TEXT NOT NULL,
        sprint TEXT,
        story INTEGER,
        labels TEXT,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      )
    `);

    // Assignees table
    db.run(`
      CREATE TABLE IF NOT EXISTS assignees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        email TEXT,
        role TEXT,
        created INTEGER NOT NULL
      )
    `);

    // Status Options table
    db.run(`
      CREATE TABLE IF NOT EXISTS status_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        created INTEGER NOT NULL
      )
    `);

    // Applications table
    db.run(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        created INTEGER NOT NULL
      )
    `);

    // Activity Log table
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changed_field TEXT,
        old_value TEXT,
        new_value TEXT,
        changed_by TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `);

    // User table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created INTEGER NOT NULL
      )
    `);

    console.log('Database tables initialized');
  });
}

// ==================== TASK ENDPOINTS ====================

// Get all tasks
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY updated DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const tasks = rows.map(row => ({
      ...row,
      labels: row.labels ? JSON.parse(row.labels) : []
    }));
    res.json(tasks);
  });
});

// Get single task
app.get('/api/tasks/:id', (req, res) => {
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    row.labels = row.labels ? JSON.parse(row.labels) : [];
    res.json(row);
  });
});

// Create task
app.post('/api/tasks', (req, res) => {
  const { id, app, title, description, status, priority, type, assignee, sprint, story, labels } = req.body;
  const now = Date.now();

  db.run(
    `INSERT INTO tasks (id, app, title, description, status, priority, type, assignee, sprint, story, labels, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, app, title, description, status, priority, type, assignee, sprint, story, JSON.stringify(labels || []), now, now],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, success: true, message: 'Task created' });
    }
  );
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const { app, title, description, status, priority, type, assignee, sprint, story, labels } = req.body;
  const now = Date.now();

  // Log activity
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, oldTask) => {
    if (oldTask) {
      for (let key in req.body) {
        if (oldTask[key] !== req.body[key] && key !== 'labels') {
          db.run(
            `INSERT INTO activity_log (task_id, action, changed_field, old_value, new_value, changed_by, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, 'update', key, oldTask[key], req.body[key], 'user', now]
          );
        }
      }
    }
  });

  db.run(
    `UPDATE tasks SET app=?, title=?, description=?, status=?, priority=?, type=?, assignee=?, sprint=?, story=?, labels=?, updated=?
     WHERE id=?`,
    [app, title, description, status, priority, type, assignee, sprint, story, JSON.stringify(labels || []), now, req.params.id],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, message: 'Task updated' });
    }
  );
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    db.run('DELETE FROM activity_log WHERE task_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Task deleted' });
  });
});

// ==================== ASSIGNEE ENDPOINTS ====================

// Get all assignees
app.get('/api/assignees', (req, res) => {
  db.all('SELECT * FROM assignees ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add assignee
app.post('/api/assignees', (req, res) => {
  const { name, email, role } = req.body;
  const now = Date.now();

  db.run(
    `INSERT INTO assignees (name, email, role, created) VALUES (?, ?, ?, ?)`,
    [name, email, role || 'user', now],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, message: 'Assignee added' });
    }
  );
});

// Delete assignee
app.delete('/api/assignees/:id', (req, res) => {
  db.run('DELETE FROM assignees WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, message: 'Assignee deleted' });
  });
});

// ==================== STATUS OPTIONS ENDPOINTS ====================

// Get all status options
app.get('/api/status-options', (req, res) => {
  db.all('SELECT * FROM status_options ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add status option
app.post('/api/status-options', (req, res) => {
  const { name, color } = req.body;
  const now = Date.now();

  db.run(
    `INSERT INTO status_options (name, color, created) VALUES (?, ?, ?)`,
    [name, color || '#6366f1', now],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, message: 'Status option added' });
    }
  );
});

// Delete status option
app.delete('/api/status-options/:id', (req, res) => {
  db.run('DELETE FROM status_options WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, message: 'Status option deleted' });
  });
});

// ==================== ACTIVITY LOG ENDPOINTS ====================

// Get activity log for task
app.get('/api/activity-log/:taskId', (req, res) => {
  db.all(
    'SELECT * FROM activity_log WHERE task_id = ? ORDER BY timestamp DESC LIMIT 50',
    [req.params.taskId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// ==================== USER ENDPOINTS ====================

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add user
app.post('/api/users', (req, res) => {
  const { name, email, role } = req.body;
  const now = Date.now();

  db.run(
    `INSERT INTO users (name, email, role, created) VALUES (?, ?, ?, ?)`,
    [name, email, role || 'user', now],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, message: 'User added' });
    }
  );
});

// ==================== STATS ENDPOINTS ====================

// Get dashboard stats
app.get('/api/stats', (req, res) => {
  db.get(
    `SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN priority = 'Critical' AND status != 'Done' THEN 1 ELSE 0 END) as critical_tasks,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks
     FROM tasks`,
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    }
  );
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite at ${dbPath}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET    /api/tasks              - Get all tasks`);
  console.log(`  POST   /api/tasks              - Create new task`);
  console.log(`  PUT    /api/tasks/:id          - Update task`);
  console.log(`  DELETE /api/tasks/:id          - Delete task`);
  console.log(`  GET    /api/assignees          - Get all assignees`);
  console.log(`  POST   /api/assignees          - Add assignee`);
  console.log(`  GET    /api/status-options     - Get status options`);
  console.log(`  POST   /api/status-options     - Add status option`);
  console.log(`  GET    /api/stats              - Get dashboard stats`);
});
