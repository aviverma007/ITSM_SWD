# ITSM Task Monitor - Setup & Deployment Guide

## 🚀 Quick Start

### Run with `npm start`

```bash
# Install dependencies (first time only)
npm install

# Start the application
npm start
```

The application will start on **http://localhost:3000**

---

## 📋 Available Scripts

| Command | Purpose | URL |
|---------|---------|-----|
| `npm start` | 🚀 **Start server with public access** | http://localhost:3000 |
| `npm run dev` | 🔧 Development mode | http://localhost:5173 |
| `npm run build` | 📦 Build for production | — |
| `npm run preview` | 👁️ Preview production build | http://localhost:3000 |

---

## 🌐 Access from Other Machines

Once running with `npm start`, you can access the app from other devices on your network:

### Find Your Local IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" (usually starts with 192.168.x.x)

**Mac/Linux:**
```bash
ifconfig
```

### Share the Link

Replace `YOUR_IP` with your actual IP address:

```
http://YOUR_IP:3000
```

**Example:**
```
http://192.168.1.100:3000
```

---

## 📱 Share with Your Team

1. **Get your IP address** (see above)
2. **Start the server:**
   ```bash
   npm start
   ```
3. **Share this link:**
   ```
   http://YOUR_IP:3000
   ```
4. **Team members** can open it in their browser on the same network

---

## 🔒 Security Notes

- ⚠️ The app is accessible to anyone on your network
- ⚠️ For production, use proper authentication and HTTPS
- ✅ Fine for internal team usage on local network
- ✅ Fine for demos and testing

---

## 🏗️ Project Structure

```
ITSM_SWD/
├── src/
│   ├── App.jsx           ← Main ITSM component
│   ├── main.jsx          ← React entry point
│   └── index.css         ← Global styles
├── package.json          ← Scripts and dependencies
├── vite.config.js        ← Vite configuration
├── .env                  ← Environment variables
└── index.html            ← HTML template
```

---

## 💻 System Requirements

- **Node.js**: v16 or higher
- **npm**: v7 or higher
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

Check your versions:
```bash
node --version
npm --version
```

---

## ✨ Features

✅ **One-Page Dashboard** - Everything visible without scrolling
✅ **4 KPI Metrics** - Total, In Progress, Completed, Critical
✅ **Workload Charts** - Track 6 applications
✅ **Multiple Views** - Dashboard, Kanban, List, Sprint, AI Chat
✅ **Interactive UI** - Real-time filtering and updates
✅ **Professional Design** - Dark theme with color-coded apps
✅ **Responsive** - Works on different screen sizes

---

## 🐛 Troubleshooting

### Port 3000 Already in Use

The app will automatically try port 3001, 3002, etc. Or specify a different port:

```bash
npm start -- --port 8080
```

Then access at: `http://localhost:8080`

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Still Having Issues?

1. Check Node.js version: `node --version` (should be v16+)
2. Check npm version: `npm --version` (should be v7+)
3. Try in a fresh terminal
4. Check if port 3000 is available

---

## 📊 Dashboard Overview

### KPI Cards (Top Row)
- **Total Tasks**: Overall task count
- **In Progress**: Currently active tasks
- **Completed**: Finished tasks
- **Critical (Unblock)**: Urgent issues

### Workload Distribution (Chart)
- SAP S/4HANA
- Zoho CRM
- Microsoft 365
- Cybersecurity
- Infrastructure
- Property Portal

---

## 🔗 Navigation Tabs

| Tab | Purpose |
|-----|---------|
| 📊 Dashboard | Overview with KPIs and charts |
| 📋 Kanban | Drag-drop task columns |
| ≡ List View | Sortable task table |
| 🏃 Sprint Board | Sprint-organized tasks |
| ✨ AI Chat | Task query assistant |

---

## 🎨 App Filtering

Use the app filter buttons in the top bar to view tasks by application:
- **All** - Show all tasks
- **SAP** - SAP S/4HANA tasks
- **Zoho** - Zoho CRM tasks
- **MS365** - Microsoft 365 tasks
- **Security** - Cybersecurity tasks
- **Infra** - Infrastructure tasks
- **Portal** - Property Portal tasks

---

## 📝 Sample Data

The app comes with 20 sample tasks across different applications and statuses:

- **Statuses**: To Do, In Progress, In Review, Done
- **Priorities**: Critical, High, Medium, Low
- **Types**: Bug, Task, Story, Incident, Change, Problem
- **Assignees**: 6 sample team members

All data is stored in-memory (resets on refresh).

---

## 🚀 Production Deployment

For production deployment:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **This creates a `dist/` folder** with optimized files

3. **Deploy to hosting** (Vercel, Netlify, AWS, etc.)

4. **For production:**
   - Add authentication
   - Use HTTPS
   - Connect to real backend API
   - Persist data to database

---

## 📞 Support

For issues or questions:
1. Check this README first
2. Review the code comments in `src/App.jsx`
3. Check the GitHub repository
4. Review documentation files:
   - `ENHANCEMENTS.md`
   - `ONE_PAGE_OPTIMIZATION.md`

---

## 📦 Version History

- **v1.0.0** - Initial release with npm start support
- **Features**: Dashboard, Kanban, List, Sprint, AI Chat
- **Latest**: One-page optimized layout

---

## 🔗 Repository

**GitHub:** https://github.com/aviverma007/ITSM_SWD

---

## ✅ Checklist

Before sharing with team:

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Run `npm start` successfully
- [ ] App opens at http://localhost:3000
- [ ] All features working
- [ ] Team members have your IP address
- [ ] They can access http://YOUR_IP:3000

---

## 💡 Tips

- **Keep terminal open** while serving the app
- **Use Ctrl+C** to stop the server
- **Changes auto-reload** in dev mode
- **Check browser console** for any errors (F12)
- **Use different port** if 3000 is busy

---

**Ready to share!** 🎉

**Generated:** July 8, 2026
**Author:** Anirudh Verma
**Project:** ITSM Task Monitor
