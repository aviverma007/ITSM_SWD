# ITSM Backend Setup Guide

## Overview
This backend provides a complete REST API for the ITSM system with SQLite database to persist all data.

## Database Structure

### Tables

1. **tasks** - All task/ticket information
   - id, app, title, description, status, priority, type, assignee, sprint, story, labels
   - created, updated timestamps

2. **assignees** - Team members
   - id, name, email, role, created

3. **status_options** - Custom status types
   - id, name, color, created

4. **applications** - Applications/systems
   - id, name, color, icon, created

5. **activity_log** - Track changes
   - task_id, action, changed_field, old_value, new_value, changed_by, timestamp

6. **users** - System users
   - id, name, email, role, created

## Setup Instructions

### Step 1: Start Backend Server

```bash
cd /home/claude/ITSM_SWD/backend
npm start
```

You should see:
```
✅ Backend server running on http://localhost:5000
📊 Database: SQLite at /path/to/itsm.db
```

### Step 2: Keep Frontend Running

In another terminal:
```bash
cd /home/claude/ITSM_SWD
npm start
```

The frontend will run on `http://localhost:3000`

### Step 3: Update React App to Use Backend

In your React code (App.jsx), add this at the top:

```javascript
import { apiService } from './api_service';
```

### Step 4: Replace Data Operations

**Before (local state):**
```javascript
const [tasks, setTasks] = useState(SEED);
```

**After (with backend):**
```javascript
const [tasks, setTasks] = useState([]);

useEffect(() => {
  apiService.getAllTasks().then(data => setTasks(data));
}, []);
```

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Create Task Example:**
```javascript
await apiService.createTask({
  id: `T${Date.now()}`,
  app: "sap",
  title: "Fix authentication",
  description: "Fix SAP auth timeout",
  status: "To Do",
  priority: "Critical",
  type: "Bug",
  assignee: "Alice Johnson",
  sprint: "Sprint 12",
  story: 5,
  labels: ["urgent"]
});
```

**Update Task Example:**
```javascript
await apiService.updateTask(taskId, {
  status: "In Progress",
  priority: "High"
});
```

### Assignees
- `GET /api/assignees` - Get all assignees
- `POST /api/assignees` - Add new assignee
- `DELETE /api/assignees/:id` - Delete assignee

**Add Assignee Example:**
```javascript
await apiService.addAssignee({
  name: "John Doe",
  email: "john@example.com",
  role: "developer"
});
```

### Status Options
- `GET /api/status-options` - Get all status options
- `POST /api/status-options` - Add new status
- `DELETE /api/status-options/:id` - Delete status

**Add Status Example:**
```javascript
await apiService.addStatusOption({
  name: "Testing",
  color: "#3b82f6"
});
```

### Stats
- `GET /api/stats` - Get dashboard statistics

**Response:**
```json
{
  "total_tasks": 20,
  "completed_tasks": 8,
  "critical_tasks": 3,
  "in_progress_tasks": 5
}
```

### Activity Log
- `GET /api/activity-log/:taskId` - Get task history

### Health Check
- `GET /api/health` - Check backend status

## Integration Steps

### 1. Update Task Creation

In `NewTaskModal`:
```javascript
async function handleCreate() {
  if(!form.title.trim()) return;
  const newTask = { 
    id:`T${Date.now()}`, 
    ...form, 
    labels:[], 
    created:Date.now(), 
    updated:Date.now(), 
    sprint:"Backlog", 
    story:5 
  };
  await apiService.createTask(newTask);
  addTask(newTask); // Also update local state for UI
}
```

### 2. Update Task Changes

In `ITSM` component:
```javascript
function updateTask(id, key, value) {
  setTasks(ts=>ts.map(t=>t.id===id?{...t,[key]:value}:t));
  // Also save to backend
  apiService.updateTask(id, { [key]: value });
}
```

### 3. Load Tasks on Mount

Add `useEffect` to `ITSM`:
```javascript
useEffect(() => {
  apiService.getAllTasks().then(data => {
    if(data.length > 0) setTasks(data);
  });
}, []);
```

## Database File Location

The SQLite database is created at:
```
/home/claude/ITSM_SWD/backend/itsm.db
```

To inspect the database:
```bash
cd /home/claude/ITSM_SWD/backend
sqlite3 itsm.db

# View all tables
.tables

# View task table
SELECT * FROM tasks;

# View assignees
SELECT * FROM assignees;
```

## Running Both Together

**Terminal 1 - Backend:**
```bash
cd /home/claude/ITSM_SWD/backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd /home/claude/ITSM_SWD
npm start
```

Now your data will persist in the SQLite database!

## Troubleshooting

**Backend won't start:**
- Check port 5000 is not in use: `lsof -i :5000`
- Delete old database: `rm backend/itsm.db`

**CORS errors:**
- Make sure backend is running on port 5000
- Check API_URL in api_service.js matches backend URL

**Data not persisting:**
- Check network requests in browser DevTools
- Verify backend API responses in Network tab

## Next Steps

1. Start backend server
2. Integrate apiService into React components
3. Replace SEED data with API calls
4. Test all CRUD operations
5. Monitor database growth

The backend is ready to accept requests!
