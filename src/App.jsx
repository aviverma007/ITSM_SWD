import React, { useState, useRef, useEffect, useMemo } from "react";
import { apiService } from "./api_service";
import * as XLSX from "xlsx";

// ====== DATA ======
const SPRINTS = ["Sprint 12", "Sprint 13", "Backlog"];
const COLS = ["To Do", "In Progress", "In Review", "Done"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES = ["To Do", "In Progress", "In Review", "Done"];
const VIEWS = [
  { id:"dashboard", label:"Dashboard", icon:"📊" },
  { id:"kanban",    label:"Kanban",    icon:"📋" },
  { id:"list",      label:"List View", icon:"≡" },
];

// ====== APPLICATIONS - LOAD FROM DATABASE VIA API ======
// Removed hardcoded APPS - now loaded from backend in useEffect
const APPS = []; // Will be populated from database

const T = {
  // Background & base colors - modern deep blue/purple gradient
  bg:"#0a0e27", 
  text:"#ffffff", 
  dim:"#a0aec0", 
  panel:"rgba(30, 41, 59, 0.6)", 
  card:"rgba(15, 23, 42, 0.5)",
  border:"rgba(71, 85, 105, 0.4)",
  faint:"#64748b",
  
  // Primary colors with better vibrancy
  indigo:"#6366f1", 
  violet:"#a855f7", 
  sky:"#0ea5e9", 
  emerald:"#10b981", 
  rose:"#f43f5e",
  
  // New colors for enhanced feel
  cyan:"#06b6d4",
  amber:"#f59e0b",
  pink:"#ec4899"
};

const PRI_COLOR = { 
  Critical:"#ff4757", 
  High:"#ffa502", 
  Medium:"#2ed573", 
  Low:"#5f27cd" 
};

const STATUS_COLOR = { 
  "To Do":"#95a3b3", 
  "In Progress":"#0ea5e9", 
  "In Review":"#f59e0b", 
  "Done":"#10b981",
  "OPEN":"#3b82f6",
  "CLOSED":"#10b981",
  "WIP":"#06b6d4"
};
const TYPE_ICON = { Bug:"🐛", Task:"✓", Story:"📖", Incident:"⚠️", Change:"🔄", Problem:"❌" };

// ====== EMPTY SEED DATA (Load from backend) ======
const SEED = [];

// ====== HELPERS ======
const appOf = (id, apps = []) => apps.find(a=>a.id===id) || { id, name: id, color: "#6366f1", icon: "📦" };
const ago = ts => {
  const s = Math.floor((Date.now()-ts)/1000);
  return s<60?"now":s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:`${Math.floor(s/86400)}d ago`;
};
const pct = (done,total) => total>0?Math.round(done*100/total):0;

// ====== COMPONENTS ======
function Badge({label, color}) {
  return <span style={{fontSize:10, background:color+"22", color:color, border:`1px solid ${color}40`, padding:"3px 8px", borderRadius:5, fontWeight:700}}>{label}</span>;
}

function Btn({onClick, children, sm, disabled, style}) {
  return <button onClick={onClick} disabled={disabled} style={{...style, background:T.indigo, color:"#fff", border:"none", borderRadius:8, padding:sm?"6px 12px":"10px 16px", fontSize:sm?11:12, fontWeight:700, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1, transition:"all 0.2s"}} onMouseEnter={e=>!disabled&&(e.currentTarget.style.background=T.violet)} onMouseLeave={e=>e.currentTarget.style.background=T.indigo}>{children}</button>;
}

function Dashboard({tasks, applications, onSelect, statuses}) {
  // Count based on actual database statuses
  const total = tasks.length;
  
  // IN PROGRESS = All statuses EXCEPT "CLOSED" and "Done"
  const completedStatuses = ["Done", "CLOSED"];
  const inProgress = tasks.filter(t => !completedStatuses.includes(t.status)).length;
  
  // COMPLETED = "Done" or "CLOSED" statuses only
  const completed = tasks.filter(t => t.status === "Done" || t.status === "CLOSED").length;
  
  // CRITICAL = Critical priority with IN PROGRESS statuses (not Done/Closed)
  const critical = tasks.filter(t => t.priority === "Critical" && !completedStatuses.includes(t.status)).length;
  
  const stats = [
    { label:"Total Tasks", value:total, color:T.sky, filter:"all" },
    { label:"In Progress", value:inProgress, color:T.indigo, filter:"inprogress" },
    { label:"Completed", value:completed, color:T.emerald, filter:"done" },
    { label:"Critical (Unblock)", value:critical, color:T.rose, filter:"critical" },
  ];
  const appBreakdown = useMemo(()=>(applications || []).map(a=>({ app:a, count:tasks.filter(t=>t.app===a.id).length, done:tasks.filter(t=>t.app===a.id&&(t.status==="Done"||t.status==="CLOSED")).length })).sort((x,y)=>y.count-x.count),[tasks, applications]);

  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:20}}>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, width:"100%", flexShrink:0}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:`${T.card}`, backdropFilter:"blur(10px)", border:`1.5px solid ${T.border}`, borderRadius:16, padding:24, cursor:"pointer", transition:"all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", minHeight:140, display:"flex", flexDirection:"column", justifyContent:"space-between", boxShadow:"0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)", position:"relative", overflow:"hidden"}} onClick={()=>onSelect({type:"filter", filter:s.filter})} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-8px) scale(1.02)"; e.currentTarget.style.boxShadow="0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)"; e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"}}>
            {/* Glass effect background */}
            <div style={{position:"absolute", top:-50, right:-50, width:150, height:150, background:`${s.color}15`, borderRadius:"50%", filter:"blur(40px)"}}/>
            
            <div>
              <div style={{fontSize:11, color:T.dim, fontWeight:700, textTransform:"uppercase", letterSpacing:".12em", marginBottom:12, position:"relative", zIndex:1}}>● {s.label}</div>
              <div style={{fontSize:48, fontWeight:900, color:s.color, position:"relative", zIndex:1, textShadow:`0 0 20px ${s.color}40`}}>{s.value}</div>
            </div>
            
            <div style={{fontSize:12, color:T.dim, position:"relative", zIndex:1, marginTop:8}}>Click to view</div>
          </div>
        ))}
      </div>

      <div style={{background:`${T.card}`, backdropFilter:"blur(10px)", border:`1.5px solid ${T.border}`, borderRadius:16, padding:28, width:"100%", minHeight:320, boxShadow:"0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"}}>
        <div style={{fontSize:13, fontWeight:800, color:T.text, textTransform:"uppercase", letterSpacing:".12em", marginBottom:24}}>📊 Workload by Application</div>
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {appBreakdown.map(ab=>(
            <div key={ab.app.id} style={{width:"100%", cursor:"pointer", transition:"all 0.3s"}} onClick={()=>onSelect({type:"app", app:ab.app.id})} onMouseEnter={e=>e.currentTarget.style.opacity=0.8} onMouseLeave={e=>e.currentTarget.style.opacity=1}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                <span style={{display:"flex", alignItems:"center", gap:8, fontSize:13}}>
                  <span style={{width:10, height:10, borderRadius:"50%", background:ab.app.color, flexShrink:0, boxShadow:`0 0 12px ${ab.app.color}80`}}/>
                  <strong style={{fontSize:13, fontWeight:700}}>{ab.app.name}</strong>
                </span>
                <span style={{fontSize:11, color:T.dim, fontWeight:600}}>{ab.count} tasks ({ab.done} done)</span>
              </div>
              <div style={{background:`rgba(0,0,0,0.2)`, height:12, borderRadius:8, overflow:"hidden", cursor:"pointer", border:`1px solid ${ab.app.color}30`}}>
                <div style={{background:`linear-gradient(90deg, ${ab.app.color}, ${ab.app.color}dd)`, height:"100%", width:`${pct(ab.done,ab.count)}%`, transition:"width 0.6s cubic-bezier(0.4, 0, 0.2, 1)", boxShadow:`0 0 20px ${ab.app.color}60`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kanban({tasks, onSelect, onUpdate, statuses, applications}) {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  const assignees = [...new Set(tasks.map(t => t.assignee))].sort();
  const apps = [...new Set(tasks.map(t => t.app))].sort();
  
  let filtered = tasks;
  if(priorityFilter !== "all") filtered = filtered.filter(t => t.priority === priorityFilter);
  if(assigneeFilter !== "all") filtered = filtered.filter(t => t.assignee === assigneeFilter);
  if(appFilter !== "all") filtered = filtered.filter(t => t.app === appFilter);
  if(search.trim()) filtered = filtered.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));
  
  return (
    <div style={{display:"flex", flexDirection:"column", gap:12, width:"100%", height:"100%"}}>
      <div style={{display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
        <input type="text" placeholder="Search tasks..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, outline:"none", minWidth:200}} />
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Priority:</label>
        <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Application:</label>
        <select value={appFilter} onChange={e=>setAppFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          {apps.map(a=><option key={a} value={a}>{appOf(a, applications)?.name || a}</option>)}
        </select>
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Assignee:</label>
        <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          {assignees.map(a=><option key={a} value={a}>{a.split(" ")[0]}</option>)}
        </select>
      </div>
      
      <div style={{display:"flex", gap:18, width:"100%", overflowX:"auto", overflowY:"hidden", paddingBottom:8, flex:1}}>
        {(statuses && statuses.length > 0 ? statuses : COLS).map(col=>{
          const col_tasks = filtered.filter(t=>t.status===col);
          return (
            <div key={col} style={{flex:"1 1 340px", minWidth:340, display:"flex", flexDirection:"column", flexShrink:0}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, paddingBottom:14, borderBottom:`2px solid ${T.border}`, gap:8}}>
                <strong style={{fontSize:14, color:T.text}}>{col}</strong>
                <span style={{fontSize:12, background:T.bg, color:T.dim, padding:"4px 10px", borderRadius:5, fontWeight:600}}>{col_tasks.length}</span>
              </div>
              <div style={{display:"flex", flexDirection:"column", gap:14, overflowY:"auto", maxHeight:"calc(100vh - 250px)", paddingRight:8}}>
                {col_tasks.map(t=>{
                  const app = appOf(t.app, applications);
                  return (
                    <div key={t.id} onClick={()=>onSelect({type:"task", task:t})} style={{background:T.card, border:`2px solid ${app.color}30`, borderRadius:10, padding:14, cursor:"pointer", transition:"all 0.2s", minHeight:110}} onMouseEnter={e=>{e.currentTarget.style.borderColor=app.color; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 4px 12px ${app.color}20`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=app.color+"30"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none";}}>
                      <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10, gap:8}}>
                        <span style={{fontSize:12, fontWeight:700, color:app.color, textTransform:"uppercase", letterSpacing:".06em", background:app.bg, padding:"3px 8px", borderRadius:5}}>{app.icon}</span>
                        <Badge label={t.priority} color={PRI_COLOR[t.priority]}/>
                      </div>
                      <div style={{fontSize:14, fontWeight:700, color:T.text, lineHeight:1.4, marginBottom:10}}>{t.title}</div>
                      <div style={{display:"flex", gap:5, flexWrap:"wrap", marginBottom:10}}>
                        {t.labels.slice(0,2).map(l=><span key={l} style={{fontSize:9, background:T.bg, color:T.dim, padding:"3px 7px", borderRadius:3, fontWeight:600}}>{l}</span>)}
                      </div>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:T.dim}}>
                        <span>{t.assignee.split(" ")[0]}</span>
                        <span>{ago(t.updated)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({tasks, onSelect, applications, statuses}) {
  const [sort, setSort] = useState("updated");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appFilter, setAppFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  const assignees = [...new Set(tasks.map(t => t.assignee))].sort();
  const apps = [...new Set(tasks.map(t => t.app))].sort();
  
  let filtered = tasks;
  if(priorityFilter !== "all") filtered = filtered.filter(t => t.priority === priorityFilter);
  if(assigneeFilter !== "all") filtered = filtered.filter(t => t.assignee === assigneeFilter);
  if(statusFilter !== "all") filtered = filtered.filter(t => t.status === statusFilter);
  if(appFilter !== "all") filtered = filtered.filter(t => t.app === appFilter);
  if(search.trim()) filtered = filtered.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));
  
  const sorted = [...filtered].sort((a,b)=>
    sort==="updated"?b.updated-a.updated:
    sort==="priority"?PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority):
    a.created-b.created
  );

  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:12}}>
      <div style={{marginBottom:6, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", flexShrink:0}}>
        <input type="text" placeholder="Search tasks..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, outline:"none", minWidth:200}} />
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Sort:</label>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:180}}>
          <option value="updated">Recently Updated</option>
          <option value="priority">By Priority</option>
          <option value="created">Oldest First</option>
        </select>
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Priority:</label>
        <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Status:</label>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          {(statuses && statuses.length > 0 ? statuses : ["To Do", "In Progress", "Done"]).map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Application:</label>
        <select value={appFilter} onChange={e=>setAppFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          {apps.map(a=><option key={a} value={a}>{appOf(a, applications)?.name || a}</option>)}
        </select>
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Assignee:</label>
        <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          {assignees.map(a=><option key={a} value={a}>{a.split(" ")[0]}</option>)}
        </select>
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:10, overflowY:"auto", maxHeight:"calc(100vh - 220px)", paddingRight:8}}>
        {sorted.length === 0 ? (
          <div style={{padding:"40px 20px", textAlign:"center", color:T.dim}}>
            <div style={{fontSize:14, fontWeight:600}}>No tasks found</div>
          </div>
        ) : (
          sorted.map(t=>{
            const app = appOf(t.app, applications);
            return (
              <div key={t.id} onClick={()=>onSelect({type:"task", task:t})} style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:16, cursor:"pointer", display:"grid", gridTemplateColumns:"50px 1fr 140px 140px 120px", gap:16, alignItems:"center", transition:"all 0.2s", minHeight:70}} onMouseEnter={e=>{e.currentTarget.style.background=T.panel; e.currentTarget.style.borderColor=T.indigo;}} onMouseLeave={e=>{e.currentTarget.style.background=T.card; e.currentTarget.style.borderColor=T.border;}}>
                <div style={{width:50, height:50, background:app.bg, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700}}>{TYPE_ICON[t.type]}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, marginBottom:5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.title}</div>
                  <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                    <span style={{fontSize:11, color:app.color, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", background:app.bg, padding:"2px 7px", borderRadius:4}}>{app.name.split(" ")[0]}</span>
                    <span style={{fontSize:11, color:T.dim}}>{t.type}</span>
                  </div>
                </div>
                <Badge label={t.priority} color={PRI_COLOR[t.priority]}/>
                <div style={{fontSize:12, color:STATUS_COLOR[t.status], fontWeight:700, textAlign:"center"}}>{t.status}</div>
                <div style={{fontSize:11, color:T.dim, textAlign:"right"}}>{ago(t.updated)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



function TaskDrawer({task, tasks, onClose, onUpdate, assignees, applications, statuses}) {
  if(!task) return null;
  
  const [formData, setFormData] = useState(null);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(T.indigo);
  const [showDetail, setShowDetail] = useState(false);
  
  // Initialize form data when task changes
  useEffect(() => {
    if(task.type === "task") {
      setFormData({...task.task});
      setShowDetail(true);
      setFilteredTasks([]);
    } else {
      setFormData(null);
      setShowDetail(false);
      
      if(task.filter === "all") {
        setFilteredTasks([...tasks]);
        setTitle("All Tasks");
        setColor(T.sky);
      } else if(task.filter === "inprogress") {
        // Include all statuses EXCEPT "Done" and "CLOSED"
        const completedStatuses = ["Done", "CLOSED"];
        setFilteredTasks(tasks.filter(t => !completedStatuses.includes(t.status)));
        setTitle("In Progress Tasks");
        setColor(T.indigo);
      } else if(task.filter === "done") {
        // Include Done and CLOSED statuses
        setFilteredTasks(tasks.filter(t => t.status === "Done" || t.status === "CLOSED"));
        setTitle("Completed Tasks");
        setColor(T.emerald);
      } else if(task.filter === "critical") {
        // Critical priority that are not done/closed
        const completedStatuses = ["Done", "CLOSED"];
        setFilteredTasks(tasks.filter(t => t.priority === "Critical" && !completedStatuses.includes(t.status)));
        setTitle("Critical Tasks (Unblocked)");
        setColor(T.rose);
      } else if(task.type === "app") {
        const app = appOf(task.app, applications);
        setFilteredTasks(tasks.filter(t => t.app === task.app));
        setTitle(app.name);
        setColor(app.color);
      }
    }
  }, [task, tasks, applications]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = () => {
    if(formData && formData.id) {
      onUpdate(formData.id, formData);
      onClose();
    }
  };

  const sortedTasks = [...filteredTasks].sort((a,b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));

  // If showing detail view for a single task
  if(showDetail && formData) {
    const selectedTask = formData;
    const app = selectedTask ? appOf(selectedTask.app, applications) : null;
    return (
      <div style={{position:"fixed", right:0, top:0, height:"100vh", width:"min(45%,600px)", background:T.panel, borderLeft:`3px solid ${app.color}`, display:"flex", flexDirection:"column", zIndex:1000, boxShadow:"-4px 0 40px rgba(0,0,0,0.4)", animation:"slideIn 0.3s ease"}}>
        <div style={{padding:"20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0}}>
          <div>
            <div style={{fontSize:12, fontWeight:700, color:app.color, textTransform:"uppercase", letterSpacing:".08em"}}>{app.icon} {app.name}</div>
            <div style={{fontSize:11, color:T.dim, marginTop:4}}>{selectedTask.id}</div>
          </div>
          <button onClick={onClose} style={{background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.dim}}>✕</button>
        </div>

        <div style={{flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:16}}>
          <div>
            <div style={{fontSize:16, fontWeight:900, marginBottom:10, lineHeight:1.4, color:T.text}}>{selectedTask.title}</div>
            <div style={{fontSize:12, color:T.dim}}>{ago(selectedTask.updated)}</div>
          </div>

          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <Badge label={selectedTask.priority} color={PRI_COLOR[selectedTask.priority]}/>
            <Badge label={selectedTask.type} color={T.indigo}/>
            <Badge label={selectedTask.status} color={STATUS_COLOR[selectedTask.status]}/>
            <Badge label={`${selectedTask.story}pt`} color={T.violet}/>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Status</label>
            <select value={selectedTask.status} onChange={e=>handleChange("status", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {(statuses && statuses.length > 0 ? statuses : ["To Do", "In Progress", "Done"]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Priority</label>
            <select value={selectedTask.priority} onChange={e=>handleChange("priority", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Type</label>
            <select value={selectedTask.type} onChange={e=>handleChange("type", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {Object.keys(TYPE_ICON).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Assignee</label>
            <select value={selectedTask.assignee} onChange={e=>handleChange("assignee", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {(assignees && assignees.length > 0 ? assignees : ["Unassigned"]).map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Labels</label>
            <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
              {selectedTask.labels.map(l=><span key={l} style={{fontSize:11, background:T.bg, color:T.dim, padding:"4px 10px", borderRadius:5, fontWeight:600}}>{l}</span>)}
            </div>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Description</label>
            <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px", fontSize:12, color:T.text, lineHeight:1.6}}>
              {selectedTask.title} • {selectedTask.type} • Assigned to {selectedTask.assignee}
            </div>
          </div>

          <button onClick={handleSaveChanges} style={{width:"100%", background:T.indigo, color:"#fff", border:"none", borderRadius:8, padding:"14px 16px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s", marginTop:10}} onMouseEnter={e=>e.currentTarget.style.background=T.violet} onMouseLeave={e=>e.currentTarget.style.background=T.indigo}>Save Changes</button>
        </div>
      </div>
    );
  }

  // Task List View
  return (
    <div style={{position:"fixed", right:0, top:0, height:"100vh", width:"min(45%,600px)", background:T.panel, borderLeft:`3px solid ${color}`, display:"flex", flexDirection:"column", zIndex:1000, boxShadow:"-4px 0 40px rgba(0,0,0,0.4)", animation:"slideIn 0.3s ease"}}>
      <div style={{padding:"20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0}}>
        <div>
          <div style={{fontSize:12, fontWeight:700, color:color, textTransform:"uppercase", letterSpacing:".08em"}}>{title}</div>
          <div style={{fontSize:11, color:T.dim, marginTop:4}}>{filteredTasks.length} tasks</div>
        </div>
        <button onClick={onClose} style={{background:"none", border:"none", fontSize:20, cursor:"pointer", color:T.dim}}>✕</button>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10}}>
        {sortedTasks.length === 0 ? (
          <div style={{padding:"40px 20px", textAlign:"center", color:T.dim}}>
            <div style={{fontSize:14, fontWeight:600, marginBottom:8}}>No tasks found</div>
            <div style={{fontSize:12}}>Try a different filter</div>
          </div>
        ) : (
          sortedTasks.map(t=>(
            <div key={t.id} onClick={()=>onClose({type:"task", task:t})} style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:14, cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.background=T.panel; e.currentTarget.style.borderColor=color;}} onMouseLeave={e=>{e.currentTarget.style.background=T.card; e.currentTarget.style.borderColor=T.border;}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:8}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, fontWeight:700, color:T.text, marginBottom:4, wordBreak:"break-word"}}>{t.title}</div>
                  <div style={{fontSize:10, color:T.dim}}>{t.id} • {ago(t.updated)}</div>
                </div>
                <Badge label={t.priority} color={PRI_COLOR[t.priority]}/>
              </div>
              <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                <Badge label={t.status} color={STATUS_COLOR[t.status]}/>
                <Badge label={t.type} color={T.indigo}/>
                <span style={{fontSize:10, color:T.dim}}>{appOf(t.app, applications)?.name?.split(" ")[0]}</span>
                {t.priority==="Critical"&&<span style={{fontSize:9, background:T.rose+"22", color:T.rose, padding:"2px 6px", borderRadius:3, fontWeight:700}}>🔥</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewTaskModal({onClose, onCreate, assignees, applications, statuses}) {
  const defaultStatus = (statuses && statuses.length > 0) ? statuses[0] : "To Do";
  const [form, setForm] = useState({ app:"sap", title:"", description:"", priority:"Medium", type:"Task", assignee:assignees && assignees.length > 0 ? assignees[0] : "Unassigned", status: defaultStatus });

  function handleCreate() {
    if(!form.title.trim()) return;
    onCreate({ id:`T${Date.now()}`, ...form, labels:[], created:Date.now(), updated:Date.now(), sprint:"Backlog", story:5 });
    onClose();
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(2px)"}}>
      <div style={{background:T.panel, borderRadius:14, padding:"28px", width:"min(90vw,500px)", maxHeight:"90vh", overflowY:"auto", border:`1px solid ${T.border}`}}>
        <h2 style={{fontSize:18, fontWeight:900, marginBottom:20, color:T.text}}>Create New Task</h2>

        <div style={{display:"flex", flexDirection:"column", gap:14}}>
          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Application</label>
            <select value={form.app} onChange={e=>setForm({...form, app:e.target.value})} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {applications && applications.length > 0 ? applications.map(a=><option key={a.id} value={a.id}>{a.name}</option>) : <option value="">No applications</option>}
            </select>
          </div>

          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Title</label>
            <input type="text" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="Task title..." style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13, outline:"none"}}/>
          </div>

          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Description</label>
            <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Task description..." style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13, outline:"none", minHeight:100, fontFamily:"inherit", resize:"vertical"}}/>
          </div>

          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Priority</label>
            <select value={form.priority} onChange={e=>setForm({...form, priority:e.target.value})} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Status</label>
            <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {(statuses && statuses.length > 0 ? statuses : ["To Do", "In Progress", "Done"]).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Type</label>
            <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {Object.keys(TYPE_ICON).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:6, display:"block"}}>Assignee</label>
            <select value={form.assignee} onChange={e=>setForm({...form, assignee:e.target.value})} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {(assignees && assignees.length > 0 ? assignees : ["Unassigned"]).map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div style={{display:"flex", gap:10, marginTop:10}}>
            <button onClick={handleCreate} style={{flex:1, background:T.indigo, color:"#fff", border:"none", borderRadius:8, padding:"14px 16px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=T.violet} onMouseLeave={e=>e.currentTarget.style.background=T.indigo}>Create Task</button>
            <button onClick={onClose} style={{flex:1, background:T.border, color:T.text, border:"none", borderRadius:8, padding:"14px 16px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background=T.border}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({tasks = [], onDeleteTask, onRestoreTask}) {
  const [assignees, setAssignees] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [applications, setApplications] = useState([...APPS]);
  const [deletedTickets, setDeletedTickets] = useState([]);
  const [newAssignee, setNewAssignee] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newApp, setNewApp] = useState("");
  const [newAppColor, setNewAppColor] = useState("#6366f1");
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("manage"); // manage or tickets
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState("all");
  const [ticketAppFilter, setTicketAppFilter] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);

  // Load from backend on mount
  async function loadData() {
    // Load assignees from backend
    const assigneesData = await apiService.getAllAssignees();
    if (assigneesData && assigneesData.length > 0) {
      setAssignees(assigneesData.map(a => a.name));
    } else {
      setAssignees([]);
    }

    // Load status options from backend
    const statusesData = await apiService.getAllStatusOptions();
    if (statusesData && statusesData.length > 0) {
      setStatuses(statusesData.map(s => s.name));
    } else {
      setStatuses([]);
    }

    // Load applications from backend
    const applicationsData = await apiService.getAllApplications();
    if (applicationsData && applicationsData.length > 0) {
      setApplications(applicationsData);
    } else {
      setApplications([]);
    }

    // Load deleted tickets from backend
    const deletedData = await apiService.getDeletedTickets();
    if (deletedData && deletedData.length > 0) {
      setDeletedTickets(deletedData);
    } else {
      setDeletedTickets([]);
    }
    
    setHasChanges(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function addAssignee() {
    if(newAssignee.trim() && !assignees.includes(newAssignee)) {
      // Update local state only - DON'T save to backend yet
      setAssignees([...assignees, newAssignee]);
      setNewAssignee("");
      setHasChanges(true); // Mark as having unsaved changes
    }
  }

  async function removeAssignee(name) {
    // Update local state only - DON'T save to backend yet
    setAssignees(assignees.filter(a=>a!==name));
    setHasChanges(true); // Mark as having unsaved changes
  }

  async function addStatus() {
    if(newStatus.trim() && !statuses.includes(newStatus)) {
      // Update local state only - DON'T save to backend yet
      setStatuses([...statuses, newStatus]);
      setNewStatus("");
      setHasChanges(true); // Mark as having unsaved changes
    }
  }

  async function removeStatus(status) {
    // Update local state only - DON'T save to backend yet
    setStatuses(statuses.filter(s=>s!==status));
    setHasChanges(true); // Mark as having unsaved changes
  }

  function addApplication() {
    if(newApp.trim() && !applications.find(a => a.name === newApp)) {
      const newAppObj = {
        id: newApp.toLowerCase().replace(/\s+/g, ''),
        name: newApp,
        color: newAppColor,
        icon: "📱"
      };
      setApplications([...applications, newAppObj]);
      setNewApp("");
      setHasChanges(true); // Mark as having unsaved changes
    }
  }

  function removeApplication(id) {
    setApplications(applications.filter(a=>a.id!==id));
    setHasChanges(true); // Mark as having unsaved changes
  }

  async function submitChanges() {
    // Save all changes to backend on submit
    
    // Remove all old assignees
    const oldAssignees = await apiService.getAllAssignees();
    for (const assignee of oldAssignees) {
      await apiService.deleteAssignee(assignee.id);
    }
    // Add new assignees
    for (const name of assignees) {
      await apiService.addAssignee({ name, email: "", role: "user" });
    }

    // Remove all old statuses
    const oldStatuses = await apiService.getAllStatusOptions();
    for (const status of oldStatuses) {
      await apiService.deleteStatusOption(status.id);
    }
    // Add new statuses
    for (const name of statuses) {
      await apiService.addStatusOption({ name, color: "#3b82f6" });
    }

    // Remove all old applications
    const oldApplications = await apiService.getAllApplications();
    for (const app of oldApplications) {
      await apiService.deleteApplication(app.id);
    }
    // Add new applications
    for (const app of applications) {
      await apiService.addApplication({ 
        id: app.id || app.name.toLowerCase().replace(/\s+/g, '_'),
        name: app.name, 
        color: app.color || '#6366f1',
        icon: app.icon || '📦'
      });
    }

    setHasChanges(false);
    alert("✅ All changes saved to database!");
  }

  // Filter and search tickets
  const activeTickets = tasks.filter(t => !deletedTickets.find(dt => dt.id === t.id));
  let displayTickets = showDeleted ? deletedTickets : activeTickets;
  
  let filteredTickets = displayTickets;
  if(ticketSearch.trim()) {
    filteredTickets = filteredTickets.filter(t => 
      t.title.toLowerCase().includes(ticketSearch.toLowerCase()) || 
      t.id.toLowerCase().includes(ticketSearch.toLowerCase())
    );
  }
  if(ticketTypeFilter !== "all") {
    filteredTickets = filteredTickets.filter(t => t.type === ticketTypeFilter);
  }
  if(ticketStatusFilter !== "all") {
    filteredTickets = filteredTickets.filter(t => t.status === ticketStatusFilter);
  }
  if(ticketPriorityFilter !== "all") {
    filteredTickets = filteredTickets.filter(t => t.priority === ticketPriorityFilter);
  }
  if(ticketAppFilter !== "all") {
    filteredTickets = filteredTickets.filter(t => t.app === ticketAppFilter);
  }

  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:24}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{fontSize:24, fontWeight:900, color:T.text}}>🔐 Admin Panel</div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex", gap:8, borderBottom:`2px solid ${T.border}`, paddingBottom:12}}>
        <button 
          onClick={() => setActiveTab("manage")}
          style={{fontSize:14, fontWeight:700, color:activeTab==="manage"?T.indigo:T.dim, background:"none", border:"none", cursor:"pointer", paddingBottom:8, borderBottom:activeTab==="manage"?`2px solid ${T.indigo}`:"none"}}
        >
          ⚙️ Manage System
        </button>
        <button 
          onClick={() => setActiveTab("tickets")}
          style={{fontSize:14, fontWeight:700, color:activeTab==="tickets"?T.indigo:T.dim, background:"none", border:"none", cursor:"pointer", paddingBottom:8, borderBottom:activeTab==="tickets"?`2px solid ${T.indigo}`:"none"}}
        >
          📋 Manage Tickets
        </button>
      </div>

      {/* Manage System Tab */}
      {activeTab === "manage" && (
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(350px,1fr))", gap:24}}>
          {/* Assignees Management */}
          <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:20}}>
            <h3 style={{fontSize:16, fontWeight:700, marginBottom:16, color:T.text}}>👥 Manage Assignees</h3>
            
            <div style={{display:"flex", gap:8, marginBottom:16}}>
              <input type="text" value={newAssignee} onChange={e=>setNewAssignee(e.target.value)} placeholder="Full name" style={{flex:1, background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 12px", fontSize:12, outline:"none"}}/>
              <button onClick={addAssignee} style={{background:T.emerald, color:"#fff", border:"none", borderRadius:6, padding:"10px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.opacity=0.8} onMouseLeave={e=>e.currentTarget.style.opacity=1}>Add</button>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:8, maxHeight:300, overflowY:"auto"}}>
              {assignees.map(a=>(
                <div key={a} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:T.bg, padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12, color:T.text}}>{a}</span>
                  <button onClick={()=>removeAssignee(a)} style={{background:"none", border:"none", color:T.rose, cursor:"pointer", fontSize:14, fontWeight:700}}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Status Management */}
          <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:20}}>
            <h3 style={{fontSize:16, fontWeight:700, marginBottom:16, color:T.text}}>📋 Manage Status</h3>
            
            <div style={{display:"flex", gap:8, marginBottom:16}}>
              <input type="text" value={newStatus} onChange={e=>setNewStatus(e.target.value)} placeholder="Status name" style={{flex:1, background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 12px", fontSize:12, outline:"none"}}/>
              <button onClick={addStatus} style={{background:T.sky, color:"#fff", border:"none", borderRadius:6, padding:"10px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.opacity=0.8} onMouseLeave={e=>e.currentTarget.style.opacity=1}>Add</button>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:8, maxHeight:300, overflowY:"auto"}}>
              {statuses.map(s=>(
                <div key={s} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:T.bg, padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12, color:T.text}}>{s}</span>
                  <button onClick={()=>removeStatus(s)} style={{background:"none", border:"none", color:T.rose, cursor:"pointer", fontSize:14, fontWeight:700}}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Applications Management */}
          <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:20}}>
            <h3 style={{fontSize:16, fontWeight:700, marginBottom:16, color:T.text}}>📱 Manage Applications</h3>
            
            <div style={{display:"flex", gap:8, marginBottom:10}}>
              <input type="text" value={newApp} onChange={e=>setNewApp(e.target.value)} placeholder="App name" style={{flex:1, background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 12px", fontSize:12, outline:"none"}}/>
              <input type="color" value={newAppColor} onChange={e=>setNewAppColor(e.target.value)} style={{width:40, height:40, border:"none", borderRadius:6, cursor:"pointer"}}/>
              <button onClick={addApplication} style={{background:T.violet, color:"#fff", border:"none", borderRadius:6, padding:"10px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.opacity=0.8} onMouseLeave={e=>e.currentTarget.style.opacity=1}>Add</button>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:8, maxHeight:300, overflowY:"auto"}}>
              {applications.map(a=>(
                <div key={a.id} style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:T.bg, padding:"10px 12px", borderRadius:6, border:`1px solid ${T.border}`}}>
                  <div style={{display:"flex", alignItems:"center", gap:8, flex:1}}>
                    <span style={{width:16, height:16, borderRadius:4, background:a.color}}/>
                    <span style={{fontSize:12, color:T.text}}>{a.name}</span>
                  </div>
                  <button onClick={()=>removeApplication(a.id)} style={{background:"none", border:"none", color:T.rose, cursor:"pointer", fontSize:14, fontWeight:700}}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* System Stats */}
          <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:20}}>
            <h3 style={{fontSize:16, fontWeight:700, marginBottom:16, color:T.text}}>📊 System Stats</h3>
            
            <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <div style={{background:T.bg, padding:"12px", borderRadius:6, border:`1px solid ${T.border}`}}>
                <div style={{fontSize:11, color:T.dim, marginBottom:4}}>Total Assignees</div>
                <div style={{fontSize:24, fontWeight:900, color:T.indigo}}>{assignees.length}</div>
              </div>
              <div style={{background:T.bg, padding:"12px", borderRadius:6, border:`1px solid ${T.border}`}}>
                <div style={{fontSize:11, color:T.dim, marginBottom:4}}>Total Status Options</div>
                <div style={{fontSize:24, fontWeight:900, color:T.sky}}>{statuses.length}</div>
              </div>
              <div style={{background:T.bg, padding:"12px", borderRadius:6, border:`1px solid ${T.border}`}}>
                <div style={{fontSize:11, color:T.dim, marginBottom:4}}>Active Applications</div>
                <div style={{fontSize:24, fontWeight:900, color:T.emerald}}>{applications.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Tickets Tab */}
      {activeTab === "tickets" && (
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {/* Search and Filters */}
          <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:16}}>
            <h3 style={{fontSize:14, fontWeight:700, marginBottom:12, color:T.text}}>🔍 Search & Filter</h3>
            
            <div style={{display:"flex", flexDirection:"column", gap:12}}>
              <input 
                type="text" 
                value={ticketSearch} 
                onChange={e=>setTicketSearch(e.target.value)} 
                placeholder="Search by title or ID..." 
                style={{width:"100%", background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 12px", fontSize:12, outline:"none"}}
              />
              
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10}}>
                <div>
                  <label style={{fontSize:11, fontWeight:700, color:T.dim, marginBottom:4, display:"block"}}>Type</label>
                  <select value={ticketTypeFilter} onChange={e=>setTicketTypeFilter(e.target.value)} style={{width:"100%", background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px", fontSize:12}}>
                    <option value="all">All Types</option>
                    {Object.keys(TYPE_ICON).map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{fontSize:11, fontWeight:700, color:T.dim, marginBottom:4, display:"block"}}>Status</label>
                  <select value={ticketStatusFilter} onChange={e=>setTicketStatusFilter(e.target.value)} style={{width:"100%", background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px", fontSize:12}}>
                    <option value="all">All Status</option>
                    {statuses.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{fontSize:11, fontWeight:700, color:T.dim, marginBottom:4, display:"block"}}>Priority</label>
                  <select value={ticketPriorityFilter} onChange={e=>setTicketPriorityFilter(e.target.value)} style={{width:"100%", background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px", fontSize:12}}>
                    <option value="all">All Priority</option>
                    {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{fontSize:11, fontWeight:700, color:T.dim, marginBottom:4, display:"block"}}>Application</label>
                  <select value={ticketAppFilter} onChange={e=>setTicketAppFilter(e.target.value)} style={{width:"100%", background:T.bg, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px", fontSize:12}}>
                    <option value="all">All Apps</option>
                    {applications && applications.length > 0 ? applications.map(a=><option key={a.id} value={a.id}>{a.name}</option>) : null}
                  </select>
                </div>
              </div>

              <button 
                onClick={() => setShowDeleted(!showDeleted)}
                style={{background:showDeleted?T.rose:T.border, color:showDeleted?"#fff":T.text, border:"none", borderRadius:6, padding:"10px 12px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}}
              >
                {showDeleted ? "🔴 Showing Deleted Tickets" : "⚪ Show Active Tickets"}
              </button>
            </div>
          </div>

          {/* Tickets List */}
          <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:16}}>
            <h3 style={{fontSize:14, fontWeight:700, marginBottom:12, color:T.text}}>📋 {showDeleted?"Deleted":"Active"} Tickets ({filteredTickets.length})</h3>
            
            <div style={{display:"flex", flexDirection:"column", gap:10, maxHeight:"500px", overflowY:"auto"}}>
              {filteredTickets.length === 0 ? (
                <div style={{padding:"20px", textAlign:"center", color:T.dim, fontSize:12}}>No tickets found</div>
              ) : (
                filteredTickets.map(t=>(
                  <div key={t.id} style={{background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:12, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10}}>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:12, fontWeight:700, color:T.text, marginBottom:4}}>{t.title}</div>
                      <div style={{display:"flex", gap:6, alignItems:"center", fontSize:10, color:T.dim, flexWrap:"wrap"}}>
                        <span>{t.id}</span>
                        <span style={{color:PRI_COLOR[t.priority]}}>{t.priority}</span>
                        <span style={{color:STATUS_COLOR[t.status]}}>{t.status}</span>
                        <span>{t.type}</span>
                        <span>{appOf(t.app)?.name}</span>
                      </div>
                    </div>
                    {!showDeleted ? (
                      <button 
                        onClick={async () => {
                          if(window.confirm("Delete this ticket? Users won't see it anymore.")) {
                            try {
                              console.log("Deleting ticket:", t.id);
                              const result = await apiService.deleteTask(t.id);
                              console.log("Delete result:", result);
                              
                              // Remove from active list by updating parent
                              onDeleteTask(t.id);
                              
                              // Add to deleted list locally
                              setDeletedTickets([...deletedTickets, t]);
                              
                              alert("Ticket deleted successfully!");
                            } catch (err) {
                              console.error("Error deleting ticket:", err);
                              alert("Failed to delete ticket: " + err.message);
                            }
                          }
                        }}
                        style={{background:T.rose, color:"#fff", border:"none", borderRadius:6, padding:"8px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}
                        title="Soft delete (can restore)"
                      >
                        Delete
                      </button>
                    ) : (
                      <div style={{display:"flex", gap:8}}>
                        <button 
                          onClick={async () => {
                            if(window.confirm("Restore this ticket?")) {
                              try {
                                console.log("Restoring ticket:", t.id);
                                const result = await apiService.restoreTicket(t.id);
                                console.log("Restore result:", result);
                                
                                // Remove from local deleted list immediately
                                setDeletedTickets(deletedTickets.filter(dt => dt.id !== t.id));
                                console.log("Removed from local deletedTickets");
                                
                                // Small delay to ensure DB transaction completes
                                await new Promise(resolve => setTimeout(resolve, 100));
                                
                                // Reload deleted tickets from backend
                                const deletedData = await apiService.getDeletedTickets();
                                if (deletedData) {
                                  setDeletedTickets(deletedData);
                                  console.log("Reloaded deletedTickets from backend:", deletedData.length);
                                }
                                
                                // Also call parent to reload active tasks
                                onRestoreTask(t.id);
                                
                                alert("✅ Ticket restored successfully!");
                              } catch (err) {
                                console.error("Error restoring ticket:", err);
                                alert("❌ Failed to restore: " + err.message);
                              }
                            }
                          }}
                          style={{background:T.emerald, color:"#fff", border:"none", borderRadius:6, padding:"8px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}
                        >
                          ↩️ Restore
                        </button>
                        <button 
                          onClick={async () => {
                            if(window.confirm("Permanently delete this ticket? This cannot be undone.")) {
                              try {
                                console.log("Permanently deleting ticket:", t.id);
                                const result = await apiService.permanentlyDeleteTicket(t.id);
                                console.log("Permanent delete result:", result);
                                
                                // Remove from deleted list
                                setDeletedTickets(deletedTickets.filter(dt => dt.id !== t.id));
                                
                                alert("Ticket permanently deleted!");
                              } catch (err) {
                                console.error("Error permanently deleting ticket:", err);
                                alert("Failed to permanently delete ticket: " + err.message);
                              }
                            }
                          }}
                          style={{background:"#8b3a3a", color:"#fff", border:"none", borderRadius:6, padding:"8px 10px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}
                          title="Permanently delete (cannot restore)"
                        >
                          🗑️ Perm Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      {hasChanges && (
        <div style={{position:"fixed", bottom:24, right:24, left:24, background:T.card, border:`2px solid ${T.border}`, borderRadius:12, padding:16, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16}}>
          <span style={{color:T.text, fontSize:14, fontWeight:700}}>💾 You have unsaved changes</span>
          <button 
            onClick={submitChanges} 
            style={{background:T.emerald, color:"#fff", border:"none", borderRadius:8, padding:"12px 20px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s"}} 
            onMouseEnter={e=>e.currentTarget.style.opacity=0.8} 
            onMouseLeave={e=>e.currentTarget.style.opacity=1}
          >
            ✓ Submit Changes
          </button>
        </div>
      )}
    </div>
  );
}

export default function ITSM() {
  const [view, setView] = useState(() => localStorage.getItem("lastView") || "dashboard");
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [applications, setApplications] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [appFilter, setAppFilter] = useState(() => localStorage.getItem("lastAppFilter") || "all");
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("lastUser") || "user");

  // Save view to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("lastView", view);
  }, [view]);

  // Save appFilter to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("lastAppFilter", appFilter);
  }, [appFilter]);

  // Save currentUser to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("lastUser", currentUser);
  }, [currentUser]);

  // Load tasks, assignees, applications, and statuses from backend on mount
  useEffect(() => {
    const loadData = async () => {
      // Load tasks
      const data = await apiService.getAllTasks();
      if (data && data.length > 0) {
        setTasks(data);
      }
      
      // Load assignees
      const assigneesData = await apiService.getAllAssignees();
      if (assigneesData && assigneesData.length > 0) {
        setAssignees(assigneesData.map(a => a.name));
      }

      // Load applications
      const applicationsData = await apiService.getAllApplications();
      if (applicationsData && applicationsData.length > 0) {
        setApplications(applicationsData);
      }

      // Load statuses
      const statusesData = await apiService.getAllStatusOptions();
      if (statusesData && statusesData.length > 0) {
        setStatuses(statusesData.map(s => s.name));
      }
    };
    loadData();
  }, []);

  function updateTask(id, keyOrData, value) {
    // Handle both single field updates: updateTask(id, "status", "Done")
    // And full object updates: updateTask(id, {status: "Done", priority: "High"})
    const updates = typeof keyOrData === 'string' ? { [keyOrData]: value } : keyOrData;
    
    setTasks(ts=>ts.map(t=>t.id===id?{...t,...updates}:t));
    setSelected(s=>s?.id===id?{...s,...updates}:s);
    
    // Save to backend
    apiService.updateTask(id, updates);
  }

  function addTask(t) {
    setTasks(ts=>[t,...ts]);
    // Save to backend
    apiService.createTask(t);
  }

  function exportToExcel() {
    // Prepare data for export
    const exportData = tasks.map(t => ({
      "Task ID": t.id,
      "Title": t.title,
      "Description": t.description || "",
      "Application": appOf(t.app)?.name || t.app,
      "Status": t.status,
      "Priority": t.priority,
      "Type": t.type,
      "Assignee": t.assignee,
      "Story Points": t.story,
      "Labels": t.labels?.join(", ") || "",
      "Created": new Date(t.created).toLocaleDateString(),
      "Updated": new Date(t.updated).toLocaleDateString()
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks Report");

    // Auto-fit columns
    const colWidths = [
      {wch: 15}, // Task ID
      {wch: 30}, // Title
      {wch: 30}, // Description
      {wch: 20}, // Application
      {wch: 15}, // Status
      {wch: 12}, // Priority
      {wch: 12}, // Type
      {wch: 18}, // Assignee
      {wch: 12}, // Story Points
      {wch: 20}, // Labels
      {wch: 12}, // Created
      {wch: 12}  // Updated
    ];
    worksheet['!cols'] = colWidths;

    // Generate filename with timestamp
    const filename = `ITSM-Report-${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  const visibleTasks = appFilter==="all"?tasks:tasks.filter(t=>t.app===appFilter);
  const criticalCount = tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done").length;

  return (
    <div style={{height:"100vh", width:"100vw", background:`linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d0f2d 100%)`, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:T.text, display:"flex", flexDirection:"column", overflow:"hidden", margin:0, padding:0, position:"relative"}}>
      {/* Animated background elements */}
      <div style={{position:"absolute", top:-100, left:-100, width:300, height:300, background:"radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", borderRadius:"50%", filter:"blur(60px)", zIndex:0, pointerEvents:"none"}}/>
      <div style={{position:"absolute", bottom:-50, right:-50, width:400, height:400, background:"radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)", borderRadius:"50%", filter:"blur(80px)", zIndex:0, pointerEvents:"none"}}/>
      {/* Top bar */}
      <div style={{background:`${T.panel}`, backdropFilter:"blur(12px)", borderBottom:`1.5px solid ${T.border}`, padding:"0 24px", height:68, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12, flexWrap:"nowrap", position:"relative", zIndex:100, boxShadow:"0 4px 20px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex", alignItems:"center", gap:12, minWidth:"auto"}}>
          <div style={{background:`linear-gradient(135deg,${T.indigo},${T.violet})`, borderRadius:12, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#fff", flexShrink:0, boxShadow:`0 0 20px ${T.indigo}60`}}>IT</div>
          <div>
            <div style={{fontWeight:800, fontSize:15, color:T.text, lineHeight:1.1}}>ITSM Monitor</div>
            <div style={{fontSize:9, color:T.dim, letterSpacing:".12em", fontWeight:600}}>MULTI-APP INTELLIGENCE</div>
          </div>
        </div>

        <div style={{display:"flex", gap:8, flex:1, justifyContent:"center", flexWrap:"nowrap", minWidth:0, overflowX:"auto"}}>
          <button onClick={()=>setAppFilter("all")} style={{fontSize:12, padding:"10px 16px", borderRadius:6, border:`1px solid ${appFilter==="all"?T.indigo:T.border}`, background:appFilter==="all"?T.indigo+"22":"transparent", color:appFilter==="all"?T.indigo:T.faint, cursor:"pointer", fontWeight:700, transition:"all 0.2s", whiteSpace:"nowrap"}}>All</button>
          {APPS.map(a=>(
            <button key={a.id} onClick={()=>setAppFilter(a.id)} style={{fontSize:11, padding:"8px 14px", borderRadius:6, border:`1px solid ${appFilter===a.id?a.color:T.border}`, background:appFilter===a.id?a.bg:"transparent", color:appFilter===a.id?a.color:T.faint, cursor:"pointer", fontWeight:700, display:"flex", alignItems:"center", gap:4, transition:"all 0.2s", whiteSpace:"nowrap"}}>
              <span style={{width:6, height:6, borderRadius:"50%", background:a.color}}/>
              {a.name.split(" ")[0]}
            </button>
          ))}
        </div>

        <div style={{display:"flex", gap:6, alignItems:"center", minWidth:"auto", justifyContent:"flex-end", flexShrink:0}}>
          {criticalCount>0&&<span style={{fontSize:8, background:T.rose+"22", color:T.rose, border:`1px solid ${T.rose}40`, padding:"2px 8px", borderRadius:4, fontWeight:700, whiteSpace:"nowrap"}}>🔥 {criticalCount}</span>}
          <button onClick={exportToExcel} style={{background:T.sky, color:"#fff", border:"none", borderRadius:8, padding:"10px 14px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap"}} onMouseEnter={e=>e.currentTarget.style.opacity=0.8} onMouseLeave={e=>e.currentTarget.style.opacity=1}>📊 Export</button>
          <button onClick={()=>setShowProfile(!showProfile)} style={{background:T.indigo, color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap"}} onMouseEnter={e=>e.currentTarget.style.background=T.violet} onMouseLeave={e=>e.currentTarget.style.background=T.indigo}>{currentUser==="admin"?"👤 Admin":"👤 User"}</button>
          <button onClick={()=>setShowNew(true)} style={{background:T.indigo, color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.2s", whiteSpace:"nowrap"}} onMouseEnter={e=>e.currentTarget.style.background=T.violet} onMouseLeave={e=>e.currentTarget.style.background=T.indigo}>+ New</button>
        </div>
        
        {showProfile && (
          <div style={{position:"absolute", top:52, right:20, background:T.panel, border:`1px solid ${T.border}`, borderRadius:8, zIndex:1001, boxShadow:"-4px 0 40px rgba(0,0,0,0.4)", minWidth:200}}>
            <div style={{padding:"12px 0"}}>
              <button onClick={()=>{setCurrentUser("user"); setShowProfile(false);}} style={{width:"100%", background:"none", border:"none", padding:"12px 16px", textAlign:"left", color:currentUser==="user"?T.indigo:T.dim, cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:8, transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>👤 User Profile</button>
              <button onClick={()=>{setCurrentUser("admin"); setShowProfile(false);}} style={{width:"100%", background:"none", border:"none", padding:"12px 16px", textAlign:"left", color:currentUser==="admin"?T.indigo:T.dim, cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:8, transition:"all 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>🔐 Admin Panel</button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{background:T.panel, borderBottom:`1px solid ${T.border}`, padding:"0 20px", display:"flex", gap:0, overflowX:"auto", flexShrink:0, height:44}}>
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{border:"none", background:"none", padding:"10px 12px", borderBottom:view===v.id?`2px solid ${T.indigo}`:"2px solid transparent", color:view===v.id?T.indigo:T.dim, fontWeight:view===v.id?700:600, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", transition:"all 0.2s"}}>
            <span style={{fontSize:14}}>{v.icon}</span>{v.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{flex:1, overflowY:"auto", overflowX:"hidden", padding:"12px 20px", width:"100%", boxSizing:"border-box"}}>
        {currentUser==="admin" && <AdminPanel tasks={tasks} onDeleteTask={async (id)=>{const updated = await apiService.getAllTasks(); setTasks(updated);}} onRestoreTask={async (id)=>{const updated = await apiService.getAllTasks(); setTasks(updated);}}/>}
        {currentUser==="user" && (
          <>
            {view==="dashboard" && <Dashboard tasks={visibleTasks} applications={applications} onSelect={setSelected} statuses={statuses}/>}
            {view==="kanban" && <Kanban tasks={visibleTasks} onSelect={setSelected} onUpdate={updateTask} statuses={statuses} applications={applications}/>}
            {view==="list" && <ListView tasks={visibleTasks} onSelect={setSelected} applications={applications} statuses={statuses}/>}
          </>
        )}
      </div>

      {/* Drawer */}
      {selected && <TaskDrawer task={selected} tasks={tasks} onClose={(detail)=>{if(detail && detail.type==="task") setSelected(detail); else setSelected(null);}} onUpdate={(id,k,v)=>updateTask(id, k, v)} assignees={assignees} applications={applications} statuses={statuses}/>}

      {/* Modal */}
      {showNew && <NewTaskModal onClose={()=>setShowNew(false)} onCreate={addTask} assignees={assignees} applications={applications} statuses={statuses}/>}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.dim}; }
      `}</style>
    </div>
  );
}
