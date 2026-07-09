# ITSM_SWD Dashboard — Setup & Deployment Guide

## ✅ What's Ready

### Database
- **Server**: ATTEND1
- **Database**: itsm_swd
- **Tables**: tasks, assignees, status_options, applications, activity_log, users
- **User**: itsm_app_user
- **Password**: Itsm@App2024Secure

### Backend
- **Language**: Node.js + Express
- **Database Driver**: mssql (connects to SQL Server)
- **Port**: 5001
- **Configuration**: `backend/.env` (credentials stored here, not in source code)
- **Status**: ✅ Installed & Ready

### Frontend
- **Framework**: React 19 + Vite
- **Port**: 3000
- **API URL**: Configurable via `.env.local`
- **Status**: ✅ Installed & Ready

---

## 🚀 How to Run Locally

### On the same machine where you'll run the backend:

```bash
# 1. Clone the repo (if you don't have it)
git clone https://github.com/aviverma007/ITSM_SWD.git
cd ITSM_SWD

# 2. Start the backend (Terminal 1)
cd backend
npm start
# Should print: ✅ Backend server running on http://0.0.0.0:5001
# Should print: Connected to SQL Server database "itsm_swd" on ATTEND1:1433

# 3. In another terminal, start the frontend (Terminal 2)
cd .. (back to root)
npm run dev
# Should print: VITE v8.1.1  ready in XXX ms
# Should print: ➜  Local:   http://localhost:3000/

# 4. Open http://localhost:3000 in your browser
```

---

## 🌐 How to Access from Another System (Different Machine)

If the frontend runs on a **different machine** than the backend:

### Option 1: Update `.env.local` on the frontend machine

Before running `npm run dev`, edit `.env.local` and change:

```env
# If backend is on ATTEND1 machine (your SQL Server machine):
VITE_API_URL=http://ATTEND1:5001/api

# Or if you know the IP of the backend machine:
VITE_API_URL=http://192.168.x.x:5001/api
```

Then run `npm run dev` — the frontend will point to your backend.

### Option 2: Run backend on a public/shared IP

If ATTEND1 machine is on the network and reachable, backend automatically listens on all interfaces (`0.0.0.0:5001`), so any machine on the network can reach it.

---

## 📝 Environment Variables

### Backend (`backend/.env`)
```
DB_SERVER=ATTEND1          # SQL Server machine name or IP
DB_PORT=1433               # SQL Server port (default 1433)
DB_NAME=itsm_swd           # Database name
DB_USER=itsm_app_user      # SQL login username
DB_PASSWORD=Itsm@App2024Secure  # SQL login password
PORT=5001                  # Backend server port
NODE_ENV=development       # development or production
```

### Frontend (`.env.local`)
```
VITE_API_URL=http://localhost:5001/api  # Where backend is running
```

---

## ✨ Features

- ✅ Real-time task management (CRUD operations)
- ✅ Multiple applications (SAP, Salesforce, Jira, ServiceNow, etc.)
- ✅ Task filtering (by app, status, priority, assignee)
- ✅ Activity logging (track all changes to tasks)
- ✅ Dashboard statistics (total tasks, completed, critical, in progress)
- ✅ Assignee management
- ✅ Status customization
- ✅ Excel export (download tasks as .xlsx)
- ✅ SQL Server persistence (all data stored in database)

---

## 🔧 API Endpoints

All endpoints are prefixed with `/api`:

### Tasks
- `GET    /api/tasks` — Get all tasks
- `GET    /api/tasks/:id` — Get single task
- `POST   /api/tasks` — Create new task
- `PUT    /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task

### Assignees
- `GET    /api/assignees` — Get all assignees
- `POST   /api/assignees` — Add assignee
- `DELETE /api/assignees/:id` — Delete assignee

### Status Options
- `GET    /api/status-options` — Get all status options
- `POST   /api/status-options` — Add status option
- `DELETE /api/status-options/:id` — Delete status option

### Applications
- `GET    /api/applications` — Get all applications

### Activity Log
- `GET    /api/activity-log/:taskId` — Get activity for a task

### Stats
- `GET    /api/stats` — Get dashboard statistics

### Health
- `GET    /api/health` — Check backend status

---

## 🛠️ Troubleshooting

### "Cannot connect to ATTEND1"
- Make sure you're on the same network as the SQL Server machine
- Try using the IP address instead: `DB_SERVER=192.168.x.x`
- Check that SQL Server TCP/IP is enabled (see SSMS → SQL Server Configuration Manager)

### "Frontend shows no data / API calls fail"
- Check `VITE_API_URL` in `.env.local` — is it pointing to the right backend?
- Test backend health: Open `http://your-backend-ip:5001/api/health` in browser
- Check browser console (F12) for network errors

### "SQL Server authentication failed"
- Verify username and password in `backend/.env`
- Make sure `itsm_app_user` login exists in SQL Server
- Check that the user has permissions on `itsm_swd` database

---

## 📦 Files Overview

```
ITSM_SWD/
├── backend/
│   ├── server.js          # Express server + API endpoints
│   ├── package.json       # Backend dependencies
│   ├── .env               # Database credentials (DO NOT COMMIT)
│   └── .env.example       # Template for .env
├── src/
│   ├── App.jsx            # Main React component (1000+ lines, all the UI)
│   ├── api_service.js     # API client (calls backend endpoints)
│   ├── main.jsx           # React entry point
│   └── index.css          # Global styles
├── public/
│   └── icons.svg          # UI icons
├── package.json           # Frontend dependencies
├── .env.local             # Frontend API URL (DO NOT COMMIT)
├── .env.example           # Template for .env.local
└── vite.config.js         # Vite configuration
```

---

## 🔒 Security Notes

- **Never commit** `.env` or `.env.local` files (they contain passwords)
- Use strong passwords for SQL Server logins
- If hosting publicly, use HTTPS and proper authentication
- Consider using environment variables (not files) in production

---

## 📞 Support

If you make changes:
1. Test locally first (`npm run dev` + backend running)
2. All changes auto-push to GitHub (configured in memory)
3. Pull on other machines to get latest code
4. Update `.env` files if needed (they're not in git)

---

**Last Updated**: July 2026
**Created for**: Smartworld Developers ITSM Dashboard
