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
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tickets_enhanced' AND xtype='U')
    CREATE TABLE tickets_enhanced (
      id NVARCHAR(50) PRIMARY KEY,
      ticket_number INT IDENTITY(1,1),
      app NVARCHAR(100) NOT NULL,
      title NVARCHAR(500) NOT NULL,
      description NVARCHAR(MAX),
      status NVARCHAR(50) NOT NULL,
      priority NVARCHAR(50) NOT NULL,
      type NVARCHAR(50) NOT NULL,
      assignee NVARCHAR(100),
      sprint NVARCHAR(100),
      story INT,
      story_points INT,
      due_date BIGINT,
      labels NVARCHAR(MAX),
      tags NVARCHAR(MAX),
      reporter NVARCHAR(100),
      watchers NVARCHAR(MAX),
      environment NVARCHAR(200),
      impact NVARCHAR(100),
      effort_estimate INT,
      time_spent_minutes INT,
      attachments NVARCHAR(MAX),
      related_tickets NVARCHAR(MAX),
      created BIGINT NOT NULL,
      updated BIGINT NOT NULL,
      created_by NVARCHAR(100),
      last_modified_by NVARCHAR(100)
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='deleted_tickets' AND xtype='U')
    CREATE TABLE deleted_tickets (
      id NVARCHAR(50) PRIMARY KEY,
      ticket_number INT,
      app NVARCHAR(100) NOT NULL,
      title NVARCHAR(500) NOT NULL,
      description NVARCHAR(MAX),
      status NVARCHAR(50) NOT NULL,
      priority NVARCHAR(50) NOT NULL,
      type NVARCHAR(50) NOT NULL,
      assignee NVARCHAR(100),
      sprint NVARCHAR(100),
      story INT,
      story_points INT,
      due_date BIGINT,
      labels NVARCHAR(MAX),
      tags NVARCHAR(MAX),
      reporter NVARCHAR(100),
      watchers NVARCHAR(MAX),
      environment NVARCHAR(200),
      impact NVARCHAR(100),
      effort_estimate INT,
      time_spent_minutes INT,
      attachments NVARCHAR(MAX),
      related_tickets NVARCHAR(MAX),
      created BIGINT NOT NULL,
      updated BIGINT NOT NULL,
      created_by NVARCHAR(100),
      last_modified_by NVARCHAR(100),
      deleted_at BIGINT NOT NULL,
      deleted_by NVARCHAR(100)
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

// Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM tickets_enhanced ORDER BY created DESC');
    const tickets = result.recordset.map(row => ({
      ...row,
      labels: row.labels ? JSON.parse(row.labels) : [],
      watchers: row.watchers ? JSON.parse(row.watchers) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      related_tickets: row.related_tickets ? JSON.parse(row.related_tickets) : []
    }));
    res.json(tickets);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get deleted tickets (Admin only)
app.get('/api/tickets/deleted/all', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM deleted_tickets ORDER BY deleted_at DESC');
    const tickets = result.recordset.map(row => ({
      ...row,
      labels: row.labels ? JSON.parse(row.labels) : [],
      watchers: row.watchers ? JSON.parse(row.watchers) : [],
      tags: row.tags ? JSON.parse(row.tags) : [],
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      related_tickets: row.related_tickets ? JSON.parse(row.related_tickets) : []
    }));
    res.json(tickets);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Restore deleted ticket
app.put('/api/tickets/:id/restore', async (req, res) => {
  try {
    console.log(`[RESTORE] Starting restore for ticket: ${req.params.id}`);
    
    // Get the ticket from deleted_tickets
    const getResult = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM deleted_tickets WHERE id = @id');
    
    console.log(`[RESTORE] Found in deleted_tickets:`, getResult.recordset.length);
    
    if (getResult.recordset.length === 0) {
      console.log(`[RESTORE] ERROR: Deleted ticket not found`);
      return res.status(404).json({ error: 'Deleted ticket not found' });
    }
    
    const ticket = getResult.recordset[0];
    console.log(`[RESTORE] Ticket data:`, ticket.title);
    
    // Insert back into tickets_enhanced
    const insertResult = await pool.request()
      .input('id', sql.NVarChar, ticket.id)
      .input('ticket_number', sql.Int, ticket.ticket_number)
      .input('app', sql.NVarChar, ticket.app)
      .input('title', sql.NVarChar, ticket.title)
      .input('description', sql.NVarChar, ticket.description)
      .input('status', sql.NVarChar, ticket.status)
      .input('priority', sql.NVarChar, ticket.priority)
      .input('type', sql.NVarChar, ticket.type)
      .input('assignee', sql.NVarChar, ticket.assignee)
      .input('sprint', sql.NVarChar, ticket.sprint)
      .input('story', sql.Int, ticket.story)
      .input('story_points', sql.Int, ticket.story_points)
      .input('due_date', sql.BigInt, ticket.due_date)
      .input('labels', sql.NVarChar, ticket.labels)
      .input('tags', sql.NVarChar, ticket.tags)
      .input('reporter', sql.NVarChar, ticket.reporter)
      .input('watchers', sql.NVarChar, ticket.watchers)
      .input('environment', sql.NVarChar, ticket.environment)
      .input('impact', sql.NVarChar, ticket.impact)
      .input('effort_estimate', sql.Int, ticket.effort_estimate)
      .input('time_spent_minutes', sql.Int, ticket.time_spent_minutes)
      .input('attachments', sql.NVarChar, ticket.attachments)
      .input('related_tickets', sql.NVarChar, ticket.related_tickets)
      .input('created', sql.BigInt, ticket.created)
      .input('updated', sql.BigInt, ticket.updated)
      .input('created_by', sql.NVarChar, ticket.created_by)
      .input('last_modified_by', sql.NVarChar, ticket.last_modified_by)
      .query(`INSERT INTO tickets_enhanced (id, ticket_number, app, title, description, status, priority, type, assignee, sprint, story, story_points, due_date, labels, tags, reporter, watchers, environment, impact, effort_estimate, time_spent_minutes, attachments, related_tickets, created, updated, created_by, last_modified_by) 
              VALUES (@id, @ticket_number, @app, @title, @description, @status, @priority, @type, @assignee, @sprint, @story, @story_points, @due_date, @labels, @tags, @reporter, @watchers, @environment, @impact, @effort_estimate, @time_spent_minutes, @attachments, @related_tickets, @created, @updated, @created_by, @last_modified_by)`);
    
    console.log(`[RESTORE] Inserted into tickets_enhanced`);
    
    // Delete from deleted_tickets
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM deleted_tickets WHERE id = @id');
    
    console.log(`[RESTORE] Deleted from deleted_tickets. Restore complete!`);
    
    res.json({ success: true, message: 'Ticket restored' });
  } catch (err) {
    console.error("[RESTORE] ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get single ticket
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM tickets_enhanced WHERE id = @id AND is_deleted = 0');
    const row = result.recordset[0];
    if (!row) {
      res.status(404).json({ error: 'Ticket not found' });
      return;
    }
    row.labels = row.labels ? JSON.parse(row.labels) : [];
    res.json(row);
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const { id, app: appName, title, description, status, priority, type, assignee, sprint, story, story_points, due_date, labels, tags, reporter, watchers, environment, impact, effort_estimate } = req.body;
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
      .input('story_points', sql.Int, story_points || null)
      .input('due_date', sql.BigInt, due_date || null)
      .input('labels', sql.NVarChar, JSON.stringify(labels || []))
      .input('tags', sql.NVarChar, JSON.stringify(tags || []))
      .input('reporter', sql.NVarChar, reporter || null)
      .input('watchers', sql.NVarChar, JSON.stringify(watchers || []))
      .input('environment', sql.NVarChar, environment || null)
      .input('impact', sql.NVarChar, impact || null)
      .input('effort_estimate', sql.Int, effort_estimate || null)
      .input('created', sql.BigInt, now)
      .input('updated', sql.BigInt, now)
      .input('created_by', sql.NVarChar, assignee)
      .input('last_modified_by', sql.NVarChar, assignee)
      .query(`INSERT INTO tickets_enhanced (id, app, title, description, status, priority, type, assignee, sprint, story, story_points, due_date, labels, tags, reporter, watchers, environment, impact, effort_estimate, created, updated, created_by, last_modified_by)
              VALUES (@id, @app, @title, @description, @status, @priority, @type, @assignee, @sprint, @story, @story_points, @due_date, @labels, @tags, @reporter, @watchers, @environment, @impact, @effort_estimate, @created, @updated, @created_by, @last_modified_by)`);

    res.json({ id, success: true, message: 'Ticket created' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update ticket
app.put('/api/tickets/:id', async (req, res) => {
  try {
    const { app: appName, title, description, status, priority, type, assignee, sprint, story, story_points, due_date, labels, tags, reporter, watchers, environment, impact, effort_estimate, time_spent_minutes } = req.body;
    const now = Date.now();

    // Log activity
    const oldResult = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM tickets_enhanced WHERE id = @id');
    const oldTicket = oldResult.recordset[0];

    if (oldTicket) {
      for (let key in req.body) {
        if (key !== 'labels' && key !== 'tags' && key !== 'watchers' && oldTicket[key] !== req.body[key]) {
          await pool.request()
            .input('ticket_id', sql.NVarChar, req.params.id)
            .input('action', sql.NVarChar, 'update')
            .input('changed_field', sql.NVarChar, key)
            .input('old_value', sql.NVarChar, String(oldTicket[key])) 
            .input('new_value', sql.NVarChar, String(req.body[key]))
            .input('changed_by', sql.NVarChar, 'user')
            .input('timestamp', sql.BigInt, now)
            .query(`INSERT INTO activity_log (task_id, action, changed_field, old_value, new_value, changed_by, timestamp)
                    VALUES (@ticket_id, @action, @changed_field, @old_value, @new_value, @changed_by, @timestamp)`);
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
      .input('story_points', sql.Int, story_points || null)
      .input('due_date', sql.BigInt, due_date || null)
      .input('labels', sql.NVarChar, JSON.stringify(labels || []))
      .input('tags', sql.NVarChar, JSON.stringify(tags || []))
      .input('reporter', sql.NVarChar, reporter || null)
      .input('watchers', sql.NVarChar, JSON.stringify(watchers || []))
      .input('environment', sql.NVarChar, environment || null)
      .input('impact', sql.NVarChar, impact || null)
      .input('effort_estimate', sql.Int, effort_estimate || null)
      .input('time_spent_minutes', sql.Int, time_spent_minutes || null)
      .input('updated', sql.BigInt, now)
      .input('last_modified_by', sql.NVarChar, 'user')
      .query(`UPDATE tickets_enhanced SET app=@app, title=@title, description=@description, status=@status, priority=@priority,
              type=@type, assignee=@assignee, sprint=@sprint, story=@story, story_points=@story_points, due_date=@due_date, 
              labels=@labels, tags=@tags, reporter=@reporter, watchers=@watchers, environment=@environment, impact=@impact, 
              effort_estimate=@effort_estimate, time_spent_minutes=@time_spent_minutes, updated=@updated, last_modified_by=@last_modified_by
              WHERE id=@id`);

    res.json({ success: true, message: 'Ticket updated' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete ticket (soft delete)
// Permanently delete ticket (hard delete - cannot be restored)
app.delete('/api/tickets/:id/permanent', async (req, res) => {
  try {
    // First delete from activity log
    await pool.request()
      .input('ticket_id', sql.NVarChar, req.params.id)
      .query('DELETE FROM activity_log WHERE task_id = @ticket_id');
    
    // Then permanently delete from deleted_tickets table
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM deleted_tickets WHERE id = @id');
    
    res.json({ success: true, message: 'Ticket permanently deleted' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Soft delete ticket (move to deleted_tickets table)
app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const now = Date.now();
    
    // Get the ticket first
    const getResult = await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('SELECT * FROM tickets_enhanced WHERE id = @id');
    
    if (getResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = getResult.recordset[0];
    
    // Insert into deleted_tickets table
    await pool.request()
      .input('id', sql.NVarChar, ticket.id)
      .input('ticket_number', sql.Int, ticket.ticket_number)
      .input('app', sql.NVarChar, ticket.app)
      .input('title', sql.NVarChar, ticket.title)
      .input('description', sql.NVarChar, ticket.description)
      .input('status', sql.NVarChar, ticket.status)
      .input('priority', sql.NVarChar, ticket.priority)
      .input('type', sql.NVarChar, ticket.type)
      .input('assignee', sql.NVarChar, ticket.assignee)
      .input('sprint', sql.NVarChar, ticket.sprint)
      .input('story', sql.Int, ticket.story)
      .input('story_points', sql.Int, ticket.story_points)
      .input('due_date', sql.BigInt, ticket.due_date)
      .input('labels', sql.NVarChar, ticket.labels)
      .input('tags', sql.NVarChar, ticket.tags)
      .input('reporter', sql.NVarChar, ticket.reporter)
      .input('watchers', sql.NVarChar, ticket.watchers)
      .input('environment', sql.NVarChar, ticket.environment)
      .input('impact', sql.NVarChar, ticket.impact)
      .input('effort_estimate', sql.Int, ticket.effort_estimate)
      .input('time_spent_minutes', sql.Int, ticket.time_spent_minutes)
      .input('attachments', sql.NVarChar, ticket.attachments)
      .input('related_tickets', sql.NVarChar, ticket.related_tickets)
      .input('created', sql.BigInt, ticket.created)
      .input('updated', sql.BigInt, ticket.updated)
      .input('created_by', sql.NVarChar, ticket.created_by)
      .input('last_modified_by', sql.NVarChar, ticket.last_modified_by)
      .input('deleted_at', sql.BigInt, now)
      .input('deleted_by', sql.NVarChar, 'admin')
      .query(`INSERT INTO deleted_tickets (id, ticket_number, app, title, description, status, priority, type, assignee, sprint, story, story_points, due_date, labels, tags, reporter, watchers, environment, impact, effort_estimate, time_spent_minutes, attachments, related_tickets, created, updated, created_by, last_modified_by, deleted_at, deleted_by) 
              VALUES (@id, @ticket_number, @app, @title, @description, @status, @priority, @type, @assignee, @sprint, @story, @story_points, @due_date, @labels, @tags, @reporter, @watchers, @environment, @impact, @effort_estimate, @time_spent_minutes, @attachments, @related_tickets, @created, @updated, @created_by, @last_modified_by, @deleted_at, @deleted_by)`);
    
    // Delete from tickets_enhanced
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM tickets_enhanced WHERE id = @id');
    
    // Delete activity log
    await pool.request()
      .input('ticket_id', sql.NVarChar, req.params.id)
      .query('DELETE FROM activity_log WHERE task_id = @ticket_id');
    
    res.json({ success: true, message: 'Ticket deleted and moved to deleted_tickets' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// Get ticket stats
app.get('/api/tickets/stats/summary', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed_tickets,
        SUM(CASE WHEN priority = 'Critical' AND status != 'Done' THEN 1 ELSE 0 END) as critical_tickets,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tickets,
        SUM(CASE WHEN impact = 'Critical' THEN 1 ELSE 0 END) as critical_impact_tickets
      FROM tickets_enhanced
      WHERE is_deleted = 0
    `);
    res.json(result.recordset[0]);
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

// Add application
app.post('/api/applications', async (req, res) => {
  try {
    const { id, name, color, icon } = req.body;
    const now = Date.now();
    await pool.request()
      .input('id', sql.NVarChar, id || name.toLowerCase().replace(/\s+/g, '_'))
      .input('name', sql.NVarChar, name)
      .input('color', sql.NVarChar, color || '#6366f1')
      .input('icon', sql.NVarChar, icon || '📦')
      .input('created', sql.BigInt, now)
      .query('INSERT INTO applications (id, name, color, icon, created) VALUES (@id, @name, @color, @icon, @created)');
    res.json({ success: true, message: 'Application added' });
  } catch (err) {
    console.error("ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete application
app.delete('/api/applications/:id', async (req, res) => {
  try {
    await pool.request()
      .input('id', sql.NVarChar, req.params.id)
      .query('DELETE FROM applications WHERE id = @id');
    res.json({ success: true, message: 'Application deleted' });
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
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN impact = 'Critical' THEN 1 ELSE 0 END) as critical_impact_count
      FROM tickets_enhanced
      WHERE is_deleted = 0
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
