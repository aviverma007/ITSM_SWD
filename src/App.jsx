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
  { id:"ai",        label:"AI Chat",   icon:"✨" },
];

// ====== APPLICATIONS - LOAD FROM DATABASE VIA API ======
// Removed hardcoded APPS - now loaded from backend in useEffect
const APPS = []; // Will be populated from database

const T = {
  bg:"#0f172a", text:"#e2e8f0", dim:"#94a3b8", panel:"#1e293b", card:"#1a2332", border:"#334155", faint:"#64748b",
  indigo:"#6366f1", violet:"#a855f7", sky:"#0ea5e9", emerald:"#10b981", rose:"#f43f5e"
};

const PRI_COLOR = { Critical:"#f43f5e", High:"#f59e0b", Medium:"#3b82f6", Low:"#8b5cf6" };
const STATUS_COLOR = { "To Do":"#94a3b8", "In Progress":"#3b82f6", "In Review":"#f59e0b", "Done":"#10b981" };
const TYPE_ICON = { Bug:"🐛", Task:"✓", Story:"📖", Incident:"⚠️", Change:"🔄", Problem:"❌" };

// ====== EMPTY SEED DATA (Load from backend) ======
const SEED = [];

// ====== HELPERS ======
const appOf = id => APPS.find(a=>a.id===id);
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

function Dashboard({tasks, onSelect}) {
  const done = tasks.filter(t=>t.status==="Done").length;
  const inProgress = tasks.filter(t=>t.status==="In Progress").length;
  const blocked = tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done").length;
  const stats = [
    { label:"Total Tasks", value:tasks.length, color:T.sky, filter:"all" },
    { label:"In Progress", value:inProgress, color:T.indigo, filter:"inprogress" },
    { label:"Completed", value:done, color:T.emerald, filter:"done" },
    { label:"Critical (Unblock)", value:blocked, color:T.rose, filter:"critical" },
  ];
  const appBreakdown = useMemo(()=>APPS.map(a=>({ app:a, count:tasks.filter(t=>t.app===a.id).length, done:tasks.filter(t=>t.app===a.id&&t.status==="Done").length })).sort((x,y)=>y.count-x.count),[tasks]);

  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:12}}>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, width:"100%", flexShrink:0}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:12, cursor:"pointer", transition:"all 0.3s", minHeight:95, display:"flex", flexDirection:"column", justifyContent:"space-between"}} onClick={()=>onSelect({type:"filter", filter:s.filter})} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{fontSize:10, color:T.dim, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:28, fontWeight:900, color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:12, width:"100%", minHeight:300}}>
        <div style={{fontSize:10, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:10}}>Workload Distribution by Application</div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {appBreakdown.map(ab=>(
            <div key={ab.app.id} style={{width:"100%", cursor:"pointer"}} onClick={()=>onSelect({type:"app", app:ab.app.id})}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                <span style={{display:"flex", alignItems:"center", gap:6, fontSize:11}}>
                  <span style={{width:7, height:7, borderRadius:"50%", background:ab.app.color, flexShrink:0}}/>
                  <strong style={{fontSize:11}}>{ab.app.name}</strong>
                </span>
                <span style={{fontSize:9, color:T.dim, fontWeight:600}}>{ab.count} ({ab.done})</span>
              </div>
              <div style={{background:T.bg, height:6, borderRadius:3, overflow:"hidden", cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity=0.8} onMouseLeave={e=>e.currentTarget.style.opacity=1}>
                <div style={{background:ab.app.color, height:"100%", width:`${pct(ab.done,ab.count)}%`, transition:"width 0.4s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kanban({tasks, onSelect, onUpdate}) {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  const assignees = [...new Set(tasks.map(t => t.assignee))].sort();
  
  let filtered = tasks;
  if(priorityFilter !== "all") filtered = filtered.filter(t => t.priority === priorityFilter);
  if(assigneeFilter !== "all") filtered = filtered.filter(t => t.assignee === assigneeFilter);
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
        
        <label style={{fontSize:13, color:T.dim, fontWeight:600}}>Assignee:</label>
        <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:7, padding:"8px 12px", fontSize:12, fontWeight:500, cursor:"pointer", minWidth:140}}>
          <option value="all">All</option>
          {assignees.map(a=><option key={a} value={a}>{a.split(" ")[0]}</option>)}
        </select>
      </div>
      
      <div style={{display:"flex", gap:18, width:"100%", overflowX:"auto", overflowY:"hidden", paddingBottom:8, flex:1}}>
        {COLS.map(col=>{
          const col_tasks = filtered.filter(t=>t.status===col);
          return (
            <div key={col} style={{flex:"1 1 340px", minWidth:340, display:"flex", flexDirection:"column", flexShrink:0}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, paddingBottom:14, borderBottom:`2px solid ${T.border}`, gap:8}}>
                <strong style={{fontSize:14, color:T.text}}>{col}</strong>
                <span style={{fontSize:12, background:T.bg, color:T.dim, padding:"4px 10px", borderRadius:5, fontWeight:600}}>{col_tasks.length}</span>
              </div>
              <div style={{display:"flex", flexDirection:"column", gap:14, overflowY:"auto", maxHeight:"calc(100vh - 250px)", paddingRight:8}}>
                {col_tasks.map(t=>{
                  const app = appOf(t.app);
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

function ListView({tasks, onSelect}) {
  const [sort, setSort] = useState("updated");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [search, setSearch] = useState("");
  
  const assignees = [...new Set(tasks.map(t => t.assignee))].sort();
  
  let filtered = tasks;
  if(priorityFilter !== "all") filtered = filtered.filter(t => t.priority === priorityFilter);
  if(assigneeFilter !== "all") filtered = filtered.filter(t => t.assignee === assigneeFilter);
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
            const app = appOf(t.app);
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


function AIChat({tasks}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role:"assistant", text:"Welcome! Ask me about your tasks. Try: 'show critical', 'summary', 'high priority', or ask anything!" }]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function handleSend() {
    if(!input.trim()) return;
    setMessages(m=>[...m, { role:"user", text:input }]);
    const q = input.toLowerCase();
    const critical = tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done");
    const high = tasks.filter(t=>t.priority==="High"&&t.status!=="Done");
    const response = q.includes("critical")?`🚨 Found ${critical.length} critical issues:\n${critical.map(t=>`• ${t.title} (${t.assignee})`).join("\n")}`:q.includes("summary")?`📊 Summary:\n• Total: ${tasks.length}\n• Done: ${tasks.filter(t=>t.status==="Done").length}\n• In Progress: ${tasks.filter(t=>t.status==="In Progress").length}\n• To Do: ${tasks.filter(t=>t.status==="To Do").length}`:q.includes("high")?`⚠️ Found ${high.length} high priority tasks:\n${high.map(t=>`• ${t.title}`).join("\n")}`:q.includes("app")?`📱 Applications:\n${APPS.map(a=>`• ${a.name}: ${tasks.filter(t=>t.app===a.id).length} tasks`).join("\n")}`:"I'm your AI assistant. Ask me about tasks, priorities, summaries, or specific applications!";
    setMessages(m=>[...m, { role:"assistant", text:response }]);
    setInput("");
  }

  return (
    <div style={{maxWidth:900, margin:"0 auto", display:"flex", flexDirection:"column", height:"calc(100vh - 200px)", width:"100%"}}>
      <div style={{flex:1, overflowY:"auto", marginBottom:16, display:"flex", flexDirection:"column", gap:12, paddingRight:8}}>
        {messages.map((m,i)=>(
          <div key={i} style={{display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            <div style={{background:m.role==="user"?T.indigo:T.card, color:T.text, padding:"12px 16px", borderRadius:12, maxWidth:"75%", fontSize:14, wordBreak:"break-word", lineHeight:1.5, border:m.role==="assistant"?`1px solid ${T.border}`:"none", whiteSpace:"pre-wrap"}}>{m.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{display:"flex", gap:10, alignItems:"flex-end", flexShrink:0}}>
        <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(), handleSend())} placeholder="Ask about tasks (Enter to send, Shift+Enter for new line)..." style={{flex:1, background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13, fontWeight:500, outline:"none", minHeight:40}}/>
        <Btn onClick={handleSend}>Send</Btn>
      </div>
    </div>
  );
}

function TaskDrawer({task, tasks, onClose, onUpdate, assignees}) {
  if(!task) return null;
  
  let selectedTask = null;
  let filteredTasks = [];
  let title = "";
  let color = T.indigo;
  let showDetail = false;

  if(task.type === "task") {
    selectedTask = task.task;
    showDetail = true;
  } else {
    if(task.filter === "all") {
      filteredTasks = [...tasks];
      title = "All Tasks";
      color = T.sky;
    } else if(task.filter === "inprogress") {
      filteredTasks = tasks.filter(t => t.status === "In Progress");
      title = "In Progress Tasks";
      color = T.indigo;
    } else if(task.filter === "done") {
      filteredTasks = tasks.filter(t => t.status === "Done");
      title = "Completed Tasks";
      color = T.emerald;
    } else if(task.filter === "critical") {
      filteredTasks = tasks.filter(t => t.priority === "Critical" && t.status !== "Done");
      title = "Critical Tasks (Unblocked)";
      color = T.rose;
    } else if(task.type === "app") {
      const app = appOf(task.app);
      filteredTasks = tasks.filter(t => t.app === task.app);
      title = app.name;
      color = app.color;
    }
  }

  const sortedTasks = [...filteredTasks].sort((a,b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const app = selectedTask ? appOf(selectedTask.app) : null;

  // Task Detail View
  if(showDetail && selectedTask) {
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
            <select value={selectedTask.status} onChange={e=>onUpdate(selectedTask.id, "status", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Priority</label>
            <select value={selectedTask.priority} onChange={e=>onUpdate(selectedTask.id, "priority", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Type</label>
            <select value={selectedTask.type} onChange={e=>onUpdate(selectedTask.id, "type", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
              {Object.keys(TYPE_ICON).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", marginBottom:8, display:"block"}}>Assignee</label>
            <select value={selectedTask.assignee} onChange={e=>onUpdate(selectedTask.id, "assignee", e.target.value)} style={{width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 14px", fontSize:13}}>
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

          <button onClick={onClose} style={{background:T.indigo, color:"#fff", border:"none", borderRadius:8, padding:"14px 16px", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s", marginTop:10}} onMouseEnter={e=>e.currentTarget.style.background=T.violet} onMouseLeave={e=>e.currentTarget.style.background=T.indigo}>Save Changes</button>
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
                <span style={{fontSize:10, color:T.dim}}>{appOf(t.app).name.split(" ")[0]}</span>
                {t.priority==="Critical"&&<span style={{fontSize:9, background:T.rose+"22", color:T.rose, padding:"2px 6px", borderRadius:3, fontWeight:700}}>🔥</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewTaskModal({onClose, onCreate, assignees}) {
  const [form, setForm] = useState({ app:"sap", title:"", description:"", priority:"Medium", type:"Task", assignee:assignees && assignees.length > 0 ? assignees[0] : "Unassigned", status:"To Do" });

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
              {APPS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
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
  const [deletedTicketIds, setDeletedTicketIds] = useState(() => {
    const stored = localStorage.getItem("deletedTickets");
    return stored ? JSON.parse(stored) : [];
  });

  // Load from backend on mount
  useEffect(() => {
    loadData();
  }, []);

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
    
    setHasChanges(false);
  }

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
  const deletedTickets = tasks.filter(t => deletedTicketIds.includes(t.id));
  const activeTickets = tasks.filter(t => !deletedTicketIds.includes(t.id));
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

  // Save deletedTicketIds to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("deletedTickets", JSON.stringify(deletedTicketIds));
  }, [deletedTicketIds]);

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
                    {APPS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
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
                      <div style={{display:"flex", gap:6}}>
                        <button 
                          onClick={() => {
                            setDeletedTicketIds([...deletedTicketIds, t.id]);
                          }}
                          style={{background:T.rose, color:"#fff", border:"none", borderRadius:6, padding:"8px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}
                          title="Mark as deleted (can restore)"
                        >
                          Delete
                        </button>
                        <button 
                          onClick={async () => {
                            await apiService.deleteTask(t.id);
                            onDeleteTask?.(t.id);
                          }}
                          style={{background:"#8b3a3a", color:"#fff", border:"none", borderRadius:6, padding:"8px 10px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}
                          title="Permanently delete (cannot restore)"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setDeletedTicketIds(deletedTicketIds.filter(id => id !== t.id));
                        }}
                        style={{background:T.emerald, color:"#fff", border:"none", borderRadius:6, padding:"8px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"}}
                      >
                        Restore
                      </button>
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
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [appFilter, setAppFilter] = useState(() => localStorage.getItem("lastAppFilter") || "all");
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("lastUser") || "user"); // "user" or "admin"

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

  // Load tasks and assignees from backend on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await apiService.getAllTasks();
      if (data && data.length > 0) {
        setTasks(data);
      }
      
      const assigneesData = await apiService.getAllAssignees();
      if (assigneesData && assigneesData.length > 0) {
        setAssignees(assigneesData.map(a => a.name));
      }
    };
    loadData();
  }, []);

  function updateTask(id, key, value) {
    setTasks(ts=>ts.map(t=>t.id===id?{...t,[key]:value}:t));
    setSelected(s=>s?.id===id?{...s,[key]:value}:s);
    // Save to backend
    apiService.updateTask(id, { [key]: value });
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
    <div style={{height:"100vh", width:"100vw", background:T.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:T.text, display:"flex", flexDirection:"column", overflow:"hidden", margin:0, padding:0}}>
      {/* Top bar */}
      <div style={{background:T.panel, borderBottom:`1px solid ${T.border}`, padding:"0 20px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12, flexWrap:"nowrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:10, minWidth:"auto"}}>
          <div style={{background:`linear-gradient(135deg,${T.indigo},${T.violet})`, borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#fff", flexShrink:0}}>IT</div>
          <div>
            <div style={{fontWeight:800, fontSize:13, color:T.text, lineHeight:1.1}}>ITSM Monitor</div>
            <div style={{fontSize:8, color:T.dim, letterSpacing:".08em"}}>MULTI-APP</div>
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
        {currentUser==="admin" && <AdminPanel tasks={tasks} onDeleteTask={(id)=>{}} onRestoreTask={(id)=>{}}/>}
        {currentUser==="user" && (
          <>
            {view==="dashboard" && <Dashboard tasks={visibleTasks} onSelect={setSelected}/>}
            {view==="kanban" && <Kanban tasks={visibleTasks} onSelect={setSelected} onUpdate={updateTask}/>}
            {view==="list" && <ListView tasks={visibleTasks} onSelect={setSelected}/>}
            {view==="ai" && <AIChat tasks={tasks}/>}
          </>
        )}
      </div>

      {/* Drawer */}
      {selected && <TaskDrawer task={selected} tasks={tasks} onClose={(detail)=>{if(detail && detail.type==="task") setSelected(detail); else setSelected(null);}} onUpdate={(id,k,v)=>updateTask(id, k, v)} assignees={assignees}/>}

      {/* Modal */}
      {showNew && <NewTaskModal onClose={()=>setShowNew(false)} onCreate={addTask} assignees={assignees}/>}

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
