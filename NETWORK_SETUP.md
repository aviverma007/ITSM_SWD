# Multi-System Network Setup Guide

## System Architecture

```
System 1 (Hosted): 192.168.66.34
  ├─ Backend (Node.js): http://192.168.66.34:5001
  └─ SQL Server: 192.168.66.33:1433

System 2 (Client): Any IP on same network
  └─ Frontend (Vite): http://192.168.66.34:3000
       └─ Connects to Backend API: http://192.168.66.34:5001/api
```

---

## Setup Instructions

### **SYSTEM 1 (Backend Host) - 192.168.66.34**

**Step 1:** Start the backend
```bash
cd ITSM_SWD
cd backend
npm install
npm start
```

Expected output:
```
✅ Backend server running on http://0.0.0.0:5001
📊 Database: SQL Server "itsm_swd" on 192.168.66.33:1433
```

The backend is now accessible at:
- `http://192.168.66.34:5001/api` (from other systems)
- `http://localhost:5001/api` (from same system)

---

### **SYSTEM 2 (Frontend Client)**

**Step 1:** Clone or pull the repository
```bash
git clone <repo-url> ITSM_SWD
cd ITSM_SWD
```

**Step 2:** Create/Update `.env.local` file
```bash
# Create the file with the correct backend URL
echo "VITE_API_URL=http://192.168.66.34:5001/api" > .env.local
```

**Step 3:** Install dependencies
```bash
npm install
```

**Step 4:** Start the frontend
```bash
npm run dev
```

Expected output:
```
VITE v8.1.3  ready in XXX ms
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.200:3000/
  ➜  Network: http://192.168.66.34:3000/
```

**Step 5:** Open the application
- **Option A (Same machine):** `http://localhost:3000/`
- **Option B (From System 1):** `http://192.168.66.34:3000/`
- **Option C (From other system):** `http://192.168.1.200:3000/` or `http://192.168.66.34:3000/`

---

## Environment Configuration

### File: `.env.local`

This file controls the backend API URL for the frontend.

**Location:** `ITSM_SWD/.env.local`

**Format:**
```
VITE_API_URL=http://192.168.66.34:5001/api
```

**Common scenarios:**

| Scenario | URL |
|----------|-----|
| Local development | `http://localhost:5001/api` |
| Backend on 192.168.66.34 | `http://192.168.66.34:5001/api` |
| Backend on 192.168.1.200 | `http://192.168.1.200:5001/api` |
| Using hostname | `http://HOSTNAME:5001/api` |

---

## Troubleshooting

### Issue: "Cannot connect to backend" or "Failed to fetch"

**Check 1: Backend is running**
```bash
# On System 1, verify backend is listening
netstat -ano | findstr :5001
```

**Check 2: Test connectivity from System 2**
```bash
# Ping the backend host
ping 192.168.66.34

# Test the API endpoint
curl http://192.168.66.34:5001/api/health

# Expected response:
# {"status":"ok","message":"Backend server is running",...}
```

**Check 3: Verify `.env.local` on System 2**
```bash
# View the current setting
cat .env.local

# Should show:
# VITE_API_URL=http://192.168.66.34:5001/api
```

**Check 4: Windows Firewall**
```bash
# On System 1, add firewall rule for port 5001
netsh advfirewall firewall add rule name="Allow Node Backend 5001" ^
  dir=in action=allow protocol=tcp localport=5001

# Verify the rule was added
netsh advfirewall firewall show rule name="Allow Node Backend 5001"
```

**Check 5: Clear browser cache**
```bash
# On System 2
# Press: Ctrl+Shift+Delete to open DevTools cache clear
# Or restart the dev server: npm run dev
```

### Issue: "Browser shows frontend but can't fetch data"

1. Open Browser DevTools (F12)
2. Go to Console tab
3. Check for errors like:
   - `Failed to fetch from http://192.168.66.34:5001/...`
   - `CORS error`
   - `Connection refused`

4. **If CORS error:** Backend needs to allow requests from different domains
   - Update `backend/server.js` to add CORS headers
   
5. **If connection refused:** 
   - Verify backend is running on correct port
   - Check firewall rules
   - Verify IP address is correct

---

## Quick Start Commands

### System 1 (Backend Host)
```bash
cd ITSM_SWD/backend
npm start
```

### System 2 (Frontend Client)
```bash
cd ITSM_SWD
echo "VITE_API_URL=http://192.168.66.34:5001/api" > .env.local
npm install
npm run dev
```

Then open: `http://192.168.66.34:3000` or `http://192.168.1.200:3000`

---

## Advanced: Using Hostname Instead of IP

If you want to use a hostname instead of IP address:

**On System 1:**
1. Find your hostname: `hostname` command
2. Ensure it's accessible on network

**On System 2:**
```bash
# Use the hostname in .env.local
echo "VITE_API_URL=http://YOUR_HOSTNAME:5001/api" > .env.local
npm run dev
```

Example:
```bash
echo "VITE_API_URL=http://ATTEND1:5001/api" > .env.local
```

---

## Port Configuration

- **Frontend (Vite):** Port `3000`
- **Backend (Node.js):** Port `5001`
- **Database (SQL Server):** Port `1433`

If any port is already in use, change in:
- Frontend: `package.json` (modify dev script)
- Backend: `backend/server.js` (change `PORT` variable)

---

## Network Diagram

```
192.168.66.33 (SQL Server)
    ↑
    │
192.168.66.34 (System 1 - Hosted)
    ├─ Backend: :5001
    └─ Frontend: :3000 (optional)
         ↓
System 2 (Any network)
    └─ Frontend: :3000
         └─ API calls: http://192.168.66.34:5001/api
```
