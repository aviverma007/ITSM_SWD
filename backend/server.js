require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== SQL SERVER CONFIG ====================
const dbConfig = {
  server: process.env.DB_SERVER || 'ATTEND1',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'itsm_swd',
  user: process.env.DB_USER || 'itsm_app_user',
  password: process.env.DB_PASSWORD || 'Itsm@App2024Secure',
  options: {
    encrypt: false,             // on-prem SQL Server, not Azure
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

async function initDb() {
  try {
    pool = await sql.connect(dbConfig);
    console.log(`Connected to SQL Server database "${dbConfig.database}" on ${dbConfig.server}:${dbConfig.port}`);
    await ensureTables();
  } catch (err) {
    console.error('Error connecting to SQL Server:', err.message);
  }
}

// Create tables if they don't already exist (safe no-op if they do)
async function ensureTables() {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tasks' AND xtype='U')
    CREATE TABLE tasks (
      id NVARCHAR(50) PRIMARY KEY,
      app NVARCHAR(100) NOT NULL,
      title NVARCHAR(500) NOT NULL,
      description NVARCHAR(MAX),
      status NVARCHAR(50) NOT NULL,
      priority NVARCHAR(50) NOT NULL,
      type NVARCHAR(50) NOT NULL,
      assignee NVARCHAR(100) NOT NULL,
      sprint NVARCHAR(100),
      story INT,
      labels NVARCHAR(MAX),
      created BIGINT NOT NULL,
      updated BIGINT NOT NULL
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='assignees' AND xtype='U')
    CREATE TABLE assignees (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(200) UNIQUE NOT NULL,
      email NVARCHAR(200),
      role NVARCHAR(50),
      created BIGINT NOT NULL
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='status_options' AND xtype='U')
    CREATE TABLE status_options (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(100) UNIQUE NOT NULL,
      color NVARCHAR(20),
      created BIGINT NOT NULL
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='applications' AND xtype='U')
    CREATE TABLE applications (
      id NVARCHAR(100) PRIMARY KEY,
      name NVARCHAR(200) NOT NULL,
      color NVARCHAR(20),
      icon NVARCHAR(20),
      created BIGINT NOT NULL
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activity_log' AND xtype='U')
    CREATE TABLE activity_log (
      id INT IDENTITY(1,1) PRIMARY KEY,
      task_id NVARCHAR(50) NOT NULL,
      action NVARCHAR(50) NOT NULL,
      changed_field NVARCHAR(100),
      old_value NVARCHAR(MAX),
      new_value NVARCHAR(MAX),
      changed_by NVARCHAR(100),
      timestamp BIGINT NOT NULL
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
    CREATE TABLE users (
      id INT IDENTITY(1,1) PRIMARY KEY,
      name NVARCHAR(200) UNIQUE NOT NULL,
      email NVARCHAR(200) UNIQUE NOT NULL,
      role NVARCHAR(50) NOT NULL DEFAULT 'user',
      created BIGINT NOT NULL
    )
  `);

  console.log('Database tables verified/initialized');
}

// ==================== TASK ENDPOINTS ====================

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM tasks ORDER BY updated DESC');
    const tasks = result.recordset.map(row => ({
      ...row,
      labels: row.labels ? JSON.parse(row.labels) : []
    }));
    res.json(tasks);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM tasks WHERE id = @id');
    const row = result.recordset[0];
    if (!row) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    row.labels = row.labels ? JSON.parse(row.labels) : [];
    res.json(row);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { id, app: appName, title, description, status, priority, type, assignee, sprint, story, labels } = req.body;
    const now = Date.now();

    await pool.request()
      .input('id', sql.NVarChar, id)
      .input('app', sql.NVarChar, appName)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status)
      .input('priority', sql.NVarChar, priority)
      .input('type', sql.NVarChar, type)
      .input('assignee', sql.NVarChar, assignee)
      .input('sprint', sql.NVarChar, sprint || null)
      .input('story', sql.Int, story || null)
      .input('labels', sql.NVarChar, JSON.stringify(labels || []))
      .input('created', sql.BigInt, now)
      .input('updated', sql.BigInt, now)
      .query(`INSERT INTO tasks (id, app, title, description, status, priority, type, assignee, sprint, story, labels, created, updated)
              VALUES (@id, @app, @title, @description, @status, @priority, @type, @assignee, @sprint, @story, @labels, @created, @updated)`);

    res.json({ id, success: true, message: 'Task created' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { app: appName, title, description, status, priority, type, assignee, sprint, story, labels } = req.body;
    const now = Date.now();

    // Log activity (best-effort diff against previous row)
    const oldResult = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM tasks WHERE id = @id');
    const oldTask = oldResult.recordset[0];

    if (oldTask) {
      for (let key in req.body) {
        if (key !== 'labels' && oldTask[key] !== req.body[key]) {
          await pool.request()
            .input('task_id', sql.NVarChar, req.params.id)
            .input('action', sql.NVarChar, 'update')
            .input('changed_field', sql.NVarChar, key)
            .input('old_value', sql.NVarChar, String(oldTask[key])) 
            .input('new_value', sql.NVarChar, String(req.body[key]))
            .input('changed_by', sql.NVarChar, 'user')
            .input('timestamp', sql.BigInt, now)
            .query(`INSERT INTO activity_log (task_id, action, changed_field, old_value, new_value, changed_by, timestamp)
                    VALUES (@task_id, @action, @changed_field, @old_value, @new_value, @changed_by, @timestamp)`);
        }
      }
    }

    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .input('app', sql.NVarChar, appName)
      .input('title', sql.NVarChar, title)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status)
      .input('priority', sql.NVarChar, priority)
      .input('type', sql.NVarChar, type)
      .input('assignee', sql.NVarChar, assignee)
      .input('sprint', sql.NVarChar, sprint || null)
      .input('story', sql.Int, story || null)
      .input('labels', sql.NVarChar, JSON.stringify(labels || []))
      .input('updated', sql.BigInt, now)
      .query(`UPDATE tasks SET app=@app, title=@title, description=@description, status=@status, priority=@priority,
              type=@type, assignee=@assignee, sprint=@sprint, story=@story, labels=@labels, updated=@updated
              WHERE id=@id`);

    res.json({ success: true, message: 'Task updated' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM tasks WHERE id = @id');
    await pool.request()
      .input('task_id', sql.NVarChar, req.params.id)
      .query('DELETE FROM activity_log WHERE task_id = @task_id');
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ASSIGNEE ENDPOINTS ====================

// Get all assignees
app.get('/api/assignees', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM assignees ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add assignee
app.post('/api/assignees', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const now = Date.now();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email || null)
      .input('role', sql.NVarChar, role || 'user')
      .input('created', sql.BigInt, now)
      .query('INSERT INTO assignees (name, email, role, created) VALUES (@name, @email, @role, @created)');
    res.json({ success: true, message: 'Assignee added' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete assignee
app.delete('/api/assignees/:id', async (req, res) => {
  try {
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM assignees WHERE id = @id');
    res.json({ success: true, message: 'Assignee deleted' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATUS OPTIONS ENDPOINTS ====================

// Get all status options
app.get('/api/status-options', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM status_options ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add status option
app.post('/api/status-options', async (req, res) => {
  try {
    const { name, color } = req.body;
    const now = Date.now();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('color', sql.NVarChar, color || '#6366f1')
      .input('created', sql.BigInt, now)
      .query('INSERT INTO status_options (name, color, created) VALUES (@name, @color, @created)');
    res.json({ success: true, message: 'Status option added' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete status option
app.delete('/api/status-options/:id', async (req, res) => {
  try {
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM status_options WHERE id = @id');
    res.json({ success: true, message: 'Status option deleted' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== APPLICATIONS ENDPOINTS ====================

// Get all applications
app.get('/api/applications', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM applications ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ACTIVITY LOG ENDPOINTS ====================

// Get activity log for task
app.get('/api/activity-log/:taskId', async (req, res) => {
  try {
    const result = await pool.request()
      .input('task_id', sql.NVarChar, req.params.taskId)
      .query('SELECT TOP 50 * FROM activity_log WHERE task_id = @task_id ORDER BY timestamp DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== USER ENDPOINTS ====================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM users ORDER BY name');
    res.json(result.recordset);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const now = Date.now();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('role', sql.NVarChar, role || 'user')
      .input('created', sql.BigInt, now)
      .query('INSERT INTO users (name, email, role, created) VALUES (@name, @email, @role, @created)');
    res.json({ success: true, message: 'User added' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATS ENDPOINTS ====================

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN priority = 'Critical' AND status != 'Done' THEN 1 ELSE 0 END) as critical_tasks,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks
      FROM tasks
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server is running', database: dbConfig.database, server: dbConfig.server });
});

// Start server after DB connects
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 Database: SQL Server "${dbConfig.database}" on ${dbConfig.server}:${dbConfig.port}`);
    console.log(`\nAPI Endpoints:`);
    console.log(`  GET    /api/tasks              - Get all tasks`);
    console.log(`  POST   /api/tasks              - Create new task`);
    console.log(`  PUT    /api/tasks/:id          - Update task`);
    console.log(`  DELETE /api/tasks/:id          - Delete task`);
    console.log(`  GET    /api/assignees          - Get all assignees`);
    console.log(`  POST   /api/assignees          - Add assignee`);
    console.log(`  GET    /api/status-options     - Get status options`);
    console.log(`  POST   /api/status-options     - Add status option`);
    console.log(`  GET    /api/applications       - Get applications`);
    console.log(`  GET    /api/stats              - Get dashboard stats`);
  });
});
