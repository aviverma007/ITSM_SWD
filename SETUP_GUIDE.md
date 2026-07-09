# ITSM Task Monitor - Setup & Usage Guide

## 📦 Project Overview
This is a React + Vite project running your **ITSM Task Monitor** — a multi-application IT task management dashboard with real-time updates, kanban views, sprint boards, and AI chat.

## 🚀 Quick Start

### 1. Navigate to the project folder
Open your PowerShell and go to the project directory:
```powershell
cd C:\Users\anirudh.verma\Downloads\claude.ai\itsm-project
```

### 2. Start the development server
```powershell
npm run dev
```

You'll see output like:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h + enter to show help
```

### 3. Open in browser
Click the local URL or open your browser to **http://localhost:5173/**

---

## 📋 Features

Your app includes:

- **Dashboard** 📊 - Task overview with stats and progress bars
- **Kanban Board** 📋 - Drag-friendly task columns (To Do, In Progress, In Review, Done)
- **List View** ≡ - Sortable task list with filtering
- **Sprint Board** 🏃 - Sprint-based task organization
- **AI Chat** ✨ - Query tasks with simple AI responses

### Application Filter
At the top, filter by application:
- SAP S/4HANA
- Zoho CRM
- Microsoft 365
- Cybersecurity
- Infrastructure
- Property Portal

---

## 🔧 Available Commands

```powershell
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 📁 Project Structure
```
itsm-project/
├── src/
│   ├── App.jsx          ← Your ITSM component (all-in-one)
│   ├── main.jsx         ← React entry point
│   └── index.css        ← Global styles
├── index.html           ← HTML template
├── vite.config.js       ← Vite configuration
└── package.json         ← Dependencies
```

---

## 🎨 Customization

### Change colors
Edit the `T` (themes) object in `src/App.jsx`:
```javascript
const T = {
  bg:"#0F172A",        // Dark background
  panel:"#1E293B",     // Panel color
  indigo:"#4F46E5",    // Primary accent
  // ... more colors
};
```

### Add/Edit Task Data
Modify the `SEED` array in `src/App.jsx` to change initial tasks.

### Modify Applications
Edit the `APPS` array to add/remove IT applications.

---

## ⚡ Performance Tips

- The app runs entirely in the browser (no backend needed)
- Hot Module Replacement (HMR) enabled — changes auto-refresh
- All data is in-memory state (resets on page refresh)
- For persistent storage, consider adding localStorage or a backend

---

## 🐛 Troubleshooting

### Port 5173 already in use?
```powershell
npm run dev -- --port 3000
```

### Dependencies issues?
```powershell
npm install
```

### Clear cache:
```powershell
rm -r node_modules
npm install
```

---

## 📝 Next Steps

1. **Add real data sources** - Connect to your actual databases or APIs
2. **Implement persistence** - Use localStorage or a backend database
3. **Enable real AI chat** - Integrate with Anthropic's Claude API
4. **Deploy** - Use Vercel, Netlify, or your preferred hosting

---

## 💡 Need Help?

- **Vite docs**: https://vitejs.dev/
- **React docs**: https://react.dev/
- **VS Code**: Open with `code .` in this folder

Happy coding! 🎉
