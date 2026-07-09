import { useState, useMemo, useRef, useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
// Subject: ITSM command surface for multi-application IT teams.
// Palette: slate-900 (#0F172A) bg, slate-800 (#1E293B) panel, slate-700 (#334155) card,
//          indigo (#4F46E5) primary action, emerald (#10B981) done, amber (#F59E0B) warn,
//          rose (#F43F5E) critical, sky (#0EA5E9) info, violet (#8B5CF6) AI accent.
// Signature: each application gets a persistent color identity that follows tasks
//            across every view — kanban column headers, list badges, chart bars — making
//            the multi-app nature legible at a glance without needing to read labels.

const APPS = [
  { id: "sap",      name: "SAP S/4HANA",       color: "#4F46E5", bg: "#4F46E522", icon: "S" },
  { id: "zoho",     name: "Zoho CRM",           color: "#10B981", bg: "#10B98122", icon: "Z" },
  { id: "ms365",    name: "Microsoft 365",      color: "#0EA5E9", bg: "#0EA5E922", icon: "M" },
  { id: "security", name: "Cybersecurity",      color: "#F43F5E", bg: "#F43F5E22", icon: "C" },
  { id: "infra",    name: "Infrastructure",     color: "#F59E0B", bg: "#F59E0B22", icon: "I" },
  { id: "portal",   name: "Property Portal",    color: "#8B5CF6", bg: "#8B5CF622", icon: "P" },
];

const PRIORITIES = ["Critical","High","Medium","Low"];
const TYPES      = ["Bug","Task","Story","Incident","Change","Problem"];
const ASSIGNEES  = ["Alex Rivera","Sam Patel","Jordan Lee","Casey Morgan","Dana Torres","Unassigned"];
const SPRINTS    = ["Sprint 12 — Current","Sprint 13 — Next","Backlog"];
const COLS       = ["To Do","In Progress","In Review","Done"];

const PRI_COLOR  = { Critical:"#F43F5E", High:"#F59E0B", Medium:"#4F46E5", Low:"#64748B" };
const TYPE_ICON  = { Bug:"🐛", Task:"✓", Story:"📖", Incident:"🔥", Change:"⚙", Problem:"⚡" };
const STATUS_COLOR = {
  "To Do":"#64748B","In Progress":"#0EA5E9","In Review":"#F59E0B","Done":"#10B981",
  "Open":"#F43F5E","Resolved":"#10B981","Closed":"#334155",
};

let _id = 200;
const uid = () => `ITSM-${_id++}`;

function ago(ts) {
  const m = Math.floor((Date.now()-ts)/60000);
  if(m<1) return "just now"; if(m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if(h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
function pct(a,b){ return b===0?0:Math.round(a/b*100); }
function appOf(id){ return APPS.find(a=>a.id===id)||APPS[0]; }

// ─── Seed tasks ───────────────────────────────────────────────────────────────
const SEED = [
  { app:"sap",  type:"Incident", priority:"Critical", status:"In Progress", title:"Pricing condition KSCHL mapping failure — 312 records stuck in error queue", assignee:"Alex Rivera", sprint:"Sprint 12 — Current", story:5, created:Date.now()-3.5*3600000, updated:Date.now()-1800000, desc:"KSCHL not mapping from legacy. Vendor contacted. Patch ETA 18:00.", comments:["Escalated to SAP OSS","Workaround applied for top 50 records"], labels:["migration","pricing","p1"] },
  { app:"sap",  type:"Bug",      priority:"High",     status:"In Review",   title:"Open sales orders — delivery block conversion incomplete for 62 orders", assignee:"Sam Patel",   sprint:"Sprint 12 — Current", story:3, created:Date.now()-6*3600000,  updated:Date.now()-2*3600000, desc:"Legacy ZB1/ZB2 block codes have no S/4HANA equivalent. Mapping needed.", comments:[], labels:["sd","cutover"] },
  { app:"sap",  type:"Task",     priority:"Medium",   status:"To Do",       title:"Customer credit limits reconciliation — 18 accounts showing zero post-migration", assignee:"Jordan Lee",  sprint:"Sprint 12 — Current", story:2, created:Date.now()-8*3600000,  updated:Date.now()-4*3600000, desc:"FD32 transformation LSMW issue. Data confirmed correct in source.", comments:["Scheduled for Monday batch"], labels:["credit","fd32"] },
  { app:"sap",  type:"Change",   priority:"Low",      status:"Done",        title:"Sales org structure migration — all 240 records validated", assignee:"Alex Rivera", sprint:"Sprint 12 — Current", story:1, created:Date.now()-24*3600000, updated:Date.now()-12*3600000, desc:"Completed and signed off by business.", comments:["Business sign-off received"], labels:["complete"] },
  { app:"zoho", type:"Bug",      priority:"High",     status:"In Progress", title:"Mobile CRM app crashes on call log screen — iOS + Android", assignee:"Casey Morgan", sprint:"Sprint 12 — Current", story:3, created:Date.now()-5*3600000,  updated:Date.now()-1*3600000, desc:"v2.1 regression. Affects 40+ field agents. Hotfix in test.", comments:["Hotfix build ready for QA"], labels:["mobile","regression","crm"] },
  { app:"zoho", type:"Story",    priority:"Medium",   status:"To Do",       title:"CRM pipeline dashboard — add 90-day forecast view for brokers", assignee:"Dana Torres",  sprint:"Sprint 13 — Next",    story:5, created:Date.now()-2*24*3600000, updated:Date.now()-1*24*3600000, desc:"Brokers need rolling 90-day deal forecast. Zoho Analytics report needed.", comments:[], labels:["analytics","dashboard"] },
  { app:"zoho", type:"Task",     priority:"Low",      status:"Done",        title:"Phase 1 CRM rollout — agent onboarding complete across 3 branches", assignee:"Sam Patel",   sprint:"Sprint 12 — Current", story:2, created:Date.now()-3*24*3600000, updated:Date.now()-6*3600000, desc:"120 agents onboarded. Satisfaction score 4.2/5.", comments:["Training materials distributed"], labels:["complete","rollout"] },
  { app:"ms365", type:"Incident",priority:"High",     status:"In Progress", title:"SharePoint permissions broken — 15 users cannot access deal room folders", assignee:"Jordan Lee",  sprint:"Sprint 12 — Current", story:3, created:Date.now()-4*3600000,  updated:Date.now()-3600000, desc:"Azure AD group sync issue following tenant policy change.", comments:["Ticket raised with Microsoft"], labels:["sharepoint","permissions","m365"] },
  { app:"ms365", type:"Task",    priority:"Medium",   status:"In Review",   title:"Teams channel restructure for regional branches — 12 offices", assignee:"Casey Morgan", sprint:"Sprint 12 — Current", story:2, created:Date.now()-1*24*3600000, updated:Date.now()-5*3600000, desc:"New channel naming convention. Governance policy to publish.", comments:["Draft structure reviewed by IT manager"], labels:["teams","governance"] },
  { app:"ms365", type:"Change",  priority:"Low",      status:"Done",        title:"Microsoft 365 licence audit — 34 unused licences reclaimed", assignee:"Dana Torres",  sprint:"Sprint 12 — Current", story:1, created:Date.now()-5*24*3600000, updated:Date.now()-2*24*3600000, desc:"$8,400/yr saving achieved.", comments:["Finance notified of saving"], labels:["licences","cost"] },
  { app:"security", type:"Incident",priority:"Critical", status:"In Progress", title:"Suspicious wire transfer phishing email — 3 agents targeted, 1 clicked", assignee:"Alex Rivera", sprint:"Sprint 12 — Current", story:8, created:Date.now()-9*3600000,  updated:Date.now()-30*60000, desc:"Email quarantined. Affected workstation isolated. Forensics in progress.", comments:["CISO notified","Sender domain blocked","Affected agent interviewed"], labels:["phishing","incident","p1"] },
  { app:"security", type:"Task", priority:"High",     status:"To Do",       title:"EDR false positives — whitelist DocuSign on 40 endpoints", assignee:"Sam Patel",   sprint:"Sprint 12 — Current", story:2, created:Date.now()-14*3600000, updated:Date.now()-6*3600000, desc:"CrowdStrike flagging DocuSign as suspicious. Exclusion policy needed.", comments:[], labels:["edr","crowdstrike","whitelist"] },
  { app:"security", type:"Story",priority:"Medium",   status:"To Do",       title:"Security awareness training — Q3 phishing simulation for 200 staff", assignee:"Jordan Lee",  sprint:"Sprint 13 — Next",    story:3, created:Date.now()-2*24*3600000, updated:Date.now()-1*24*3600000, desc:"Quarterly phishing sim. Real estate wire fraud scenarios.", comments:[], labels:["training","awareness"] },
  { app:"infra", type:"Incident",priority:"High",     status:"In Review",   title:"Property portal 504 timeout — load test fails at 510 concurrent users", assignee:"Casey Morgan", sprint:"Sprint 12 — Current", story:5, created:Date.now()-11*3600000, updated:Date.now()-2*3600000, desc:"AWS auto-scaling config incorrect. Launch in 22 days.", comments:["AWS support engaged","Scaling policy patch applied","Re-test scheduled 09:00 tomorrow"], labels:["performance","aws","portal"] },
  { app:"infra", type:"Task",    priority:"Medium",   status:"To Do",       title:"Network switch firmware update — 8 branch offices scheduled", assignee:"Dana Torres",  sprint:"Sprint 13 — Next",    story:2, created:Date.now()-3*24*3600000, updated:Date.now()-2*24*3600000, desc:"EOL firmware on Cisco switches. Change window: Saturday 02:00–04:00.", comments:[], labels:["network","firmware","change"] },
  { app:"infra", type:"Change",  priority:"Low",      status:"Done",        title:"Backup retention policy updated — 90 days across all production servers", assignee:"Alex Rivera", sprint:"Sprint 12 — Current", story:1, created:Date.now()-4*24*3600000, updated:Date.now()-1*24*3600000, desc:"Policy aligned with compliance requirement. Tested and verified.", comments:["Compliance team signed off"], labels:["backup","complete"] },
  { app:"portal", type:"Bug",    priority:"Critical", status:"In Progress", title:"Property search returns wrong suburb results — MLS data mismatch", assignee:"Sam Patel",   sprint:"Sprint 12 — Current", story:5, created:Date.now()-7*3600000,  updated:Date.now()-3600000, desc:"Suburb boundary data not updated post-migration. Agents showing wrong listings.", comments:["Data team investigating","MLS vendor contacted"], labels:["mls","data","search"] },
  { app:"portal", type:"Story",  priority:"High",     status:"To Do",       title:"Agent dashboard — add sold/leased status toggle to listing management", assignee:"Jordan Lee",  sprint:"Sprint 13 — Next",    story:3, created:Date.now()-1*24*3600000, updated:Date.now()-5*3600000, desc:"Agents manually updating status outside portal. Workflow gap.", comments:[], labels:["ux","listings"] },
  { app:"portal", type:"Task",   priority:"Medium",   status:"In Review",   title:"Performance optimisation — image lazy loading for property galleries", assignee:"Casey Morgan", sprint:"Sprint 12 — Current", story:2, created:Date.now()-2*24*3600000, updated:Date.now()-8*3600000, desc:"LCP score currently 4.2s. Target <2.5s. Lazy load + CDN config.", comments:["LCP improved to 2.8s — further tweaks needed"], labels:["performance","web"] },
  { app:"portal", type:"Change", priority:"Low",      status:"Done",        title:"Backend API documentation updated — all endpoints versioned", assignee:"Dana Torres",  sprint:"Sprint 12 — Current", story:1, created:Date.now()-5*24*3600000, updated:Date.now()-3*24*3600000, desc:"Swagger docs published. v2 endpoints documented.", comments:["Dev team notified"], labels:["docs","api"] },
].map(t => ({ ...t, id: uid() }));

// ─── Micro components ─────────────────────────────────────────────────────────
const T = {
  bg:"#0F172A", panel:"#1E293B", card:"#1E293B", border:"#334155",
  text:"#F1F5F9", dim:"#94A3B8", faint:"#475569",
  indigo:"#4F46E5", emerald:"#10B981", amber:"#F59E0B",
  rose:"#F43F5E", sky:"#0EA5E9", violet:"#8B5CF6",
};

const Btn = ({children, onClick, sm, variant="primary", disabled}) => {
  const bg = variant==="primary"?T.indigo:variant==="ghost"?"transparent":T.rose;
  const fg = variant==="primary"?"white":variant==="ghost"?T.dim:T.rose;
  const border = variant==="ghost"?`1px solid ${T.border}`:"none";
  return <button onClick={onClick} disabled={disabled} style={{ background:bg, color:fg, border, padding:sm?"6px 12px":"8px 16px", borderRadius:6, fontSize:sm?11:13, fontWeight:600, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.5:1 }}>{children}</button>;
};

const Badge = ({label, color, dark}) => <span style={{ background:dark?color+"40":color+"22", color:dark?color:"inherit", padding:"3px 8px", borderRadius:4, fontSize:10, fontWeight:700, whiteSpace:"nowrap", textTransform:"uppercase", letterSpacing:".05em" }}>{label}</span>;

function Dashboard({tasks, onSelect}) {
  const done = tasks.filter(t=>t.status==="Done").length;
  const inProgress = tasks.filter(t=>t.status==="In Progress").length;
  const blocked = tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done").length;
  const stats = [
    { label:"Total Tasks",        value:tasks.length,    color:T.sky },
    { label:"In Progress",        value:inProgress,      color:T.indigo },
    { label:"Completed",          value:done,            color:T.emerald },
    { label:"Critical (Unblock)", value:blocked,         color:T.rose },
  ];
  const appBreakdown = useMemo(()=>APPS.map(a=>({ app:a, count:tasks.filter(t=>t.app===a.id).length, done:tasks.filter(t=>t.app===a.id&&t.status==="Done").length })).sort((x,y)=>y.count-x.count),[tasks]);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16, marginBottom:20 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:16, cursor:"pointer" }} onClick={()=>onSelect(tasks[0])}>
            <div style={{ fontSize:12, color:T.dim, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:12 }}>Workload by Application</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {appBreakdown.map(ab=>(
            <div key={ab.app.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:ab.app.color }}/>
                  <strong>{ab.app.name}</strong>
                </span>
                <span style={{ fontSize:11, color:T.dim }}>{ab.count} ({ab.done} done)</span>
              </div>
              <div style={{ background:T.bg, height:6, borderRadius:3, overflow:"hidden" }}>
                <div style={{ background:ab.app.color, height:"100%", width:`${pct(ab.done,ab.count)}%`, transition:"width 0.3s" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kanban({tasks, onSelect, onUpdate}) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${COLS.length},minmax(320px,1fr))`, gap:16, overflowX:"auto", paddingRight:20 }}>
      {COLS.map(col=>{
        const col_tasks = tasks.filter(t=>t.status===col);
        return (
          <div key={col} style={{ minWidth:320 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, paddingBottom:12, borderBottom:`2px solid ${T.border}` }}>
              <strong style={{ fontSize:13, color:T.text }}>{col}</strong>
              <span style={{ fontSize:11, background:T.bg, color:T.dim, padding:"2px 8px", borderRadius:4 }}>{col_tasks.length}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {col_tasks.map(t=>{
                const app = appOf(t.app);
                return (
                  <div key={t.id} onClick={()=>onSelect(t)} style={{ background:T.card, border:`1px solid ${app.color}40`, borderRadius:8, padding:12, cursor:"pointer", transition:"all 0.2s", minHeight:100 }} onMouseEnter={e=>e.currentTarget.style.borderColor=app.color} onMouseLeave={e=>e.currentTarget.style.borderColor=app.color+"40"}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8, gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:app.color, textTransform:"uppercase", letterSpacing:".05em" }}>{app.icon}</span>
                      <Badge label={t.priority} color={PRI_COLOR[t.priority]}/>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, lineHeight:1.4, marginBottom:8 }}>{t.title}</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
                      {t.labels.slice(0,2).map(l=><span key={l} style={{ fontSize:9, background:T.bg, color:T.dim, padding:"2px 6px", borderRadius:3 }}>{l}</span>)}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:10, color:T.dim }}>
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
  );
}

function ListView({tasks, onSelect}) {
  const [sort, setSort] = useState("updated");
  const sorted = [...tasks].sort((a,b)=>
    sort==="updated"?b.updated-a.updated:
    sort==="priority"?PRIORITIES.indexOf(a.priority)-PRIORITIES.indexOf(b.priority):
    a.created-b.created
  );

  return (
    <div>
      <div style={{ marginBottom:12, display:"flex", gap:8, alignItems:"center" }}>
        <label style={{ fontSize:12, color:T.dim, fontWeight:600 }}>Sort:</label>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{ background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 10px", fontSize:12 }}>
          <option value="updated">Recently Updated</option>
          <option value="priority">By Priority</option>
          <option value="created">Oldest First</option>
        </select>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {sorted.map(t=>{
          const app = appOf(t.app);
          return (
            <div key={t.id} onClick={()=>onSelect(t)} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:12, cursor:"pointer", display:"grid", gridTemplateColumns:"40px 1fr 120px 120px 100px", gap:12, alignItems:"center" }}>
              <div style={{ width:40, height:40, background:app.bg, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{TYPE_ICON[t.type]}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{t.title}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:10, color:app.color, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>{app.name}</span>
                  <span style={{ fontSize:10, color:T.dim }}>{t.type}</span>
                </div>
              </div>
              <Badge label={t.priority} color={PRI_COLOR[t.priority]}/>
              <div style={{ fontSize:11, color:STATUS_COLOR[t.status], fontWeight:700 }}>{t.status}</div>
              <div style={{ fontSize:10, color:T.dim, textAlign:"right" }}>{ago(t.updated)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SprintBoard({tasks, onSelect}) {
  const sprints = SPRINTS.map(s=>({ name:s, tasks:tasks.filter(t=>t.sprint===s) }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {sprints.map(s=>(
        <div key={s.name}>
          <div style={{ marginBottom:12, paddingBottom:12, borderBottom:`2px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <strong>{s.name}</strong>
            <span style={{ fontSize:11, color:T.dim }}>{s.tasks.length} tasks</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {s.tasks.map(t=>{
              const app = appOf(t.app);
              return (
                <div key={t.id} onClick={()=>onSelect(t)} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:12, cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:app.color, textTransform:"uppercase", letterSpacing:".05em" }}>{app.icon}</span>
                    <span style={{ fontSize:10, color:T.dim }}>{t.id}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:8, lineHeight:1.4 }}>{t.title}</div>
                  <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
                    <Badge label={t.priority} color={PRI_COLOR[t.priority]}/>
                    <Badge label={t.type} color={T.indigo}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.dim }}>
                    <span>{t.assignee.split(" ")[0]}</span>
                    <span>📊 {t.story}pt</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIChat({tasks}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role:"assistant", text:"Welcome! Ask me anything about your IT tasks — I can summarize, suggest priorities, or generate reports." }]);

  function handleSend() {
    if(!input.trim()) return;
    setMessages(m=>[...m, { role:"user", text:input }]);
    // Simulate AI response (would call Anthropic API in production)
    const critical = tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done");
    const response = input.toLowerCase().includes("critical")?`Found ${critical.length} critical issues: ${critical.map(t=>t.title).join("; ")}`:input.toLowerCase().includes("summary")?`You have ${tasks.length} total tasks. ${tasks.filter(t=>t.status==="Done").length} completed, ${tasks.filter(t=>t.status==="In Progress").length} in progress.`:"I'm an AI assistant. Ask about your tasks!";
    setMessages(m=>[...m, { role:"assistant", text:response }]);
    setInput("");
  }

  return (
    <div style={{ maxWidth:800, margin:"0 auto", display:"flex", flexDirection:"column", height:"60vh" }}>
      <div style={{ flex:1, overflowY:"auto", marginBottom:12, display:"flex", flexDirection:"column", gap:8 }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ background:m.role==="user"?T.indigo:T.card, color:T.text, padding:"8px 12px", borderRadius:8, maxWidth:"70%", fontSize:13, wordBreak:"break-word" }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSend()} placeholder="Ask about your tasks..." style={{ flex:1, background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 12px", fontSize:12 }}/>
        <Btn onClick={handleSend}>Send</Btn>
      </div>
    </div>
  );
}

function TaskDrawer({task, onClose, onUpdate}) {
  const app = appOf(task.app);
  return (
    <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"35%", background:T.panel, boxShadow:`0 -4px 40px rgba(0,0,0,0.3)`, display:"flex", flexDirection:"column", zIndex:10 }}>
      <div style={{ padding:16, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontWeight:900, fontSize:14 }}>Task Details</div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:T.dim, cursor:"pointer" }}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>ID & Status</div>
          <div style={{ fontSize:14, fontWeight:900, color:app.color, marginBottom:6 }}>{task.id}</div>
          <div style={{ display:"flex", gap:8 }}>
            <select value={task.status} onChange={e=>onUpdate(task.id,{status:e.target.value})} style={{ background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 8px", fontSize:11, flex:1 }}>
              {COLS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>Title</div>
          <div style={{ fontSize:13, fontWeight:600, lineHeight:1.4 }}>{task.title}</div>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>Description</div>
          <div style={{ fontSize:12, lineHeight:1.6, color:T.dim }}>{task.desc}</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>Priority</div>
            <select value={task.priority} onChange={e=>onUpdate(task.id,{priority:e.target.value})} style={{ background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 8px", fontSize:11, width:"100%" }}>
              {PRIORITIES.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>Type</div>
            <select value={task.type} onChange={e=>onUpdate(task.id,{type:e.target.value})} style={{ background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 8px", fontSize:11, width:"100%" }}>
              {TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>Assignee</div>
          <select value={task.assignee} onChange={e=>onUpdate(task.id,{assignee:e.target.value})} style={{ background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 8px", fontSize:11, width:"100%" }}>
            {ASSIGNEES.map(a=><option key={a}>{a}</option>)}
          </select>
        </div>

        {task.comments.length>0&&(
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.dim, textTransform:"uppercase", letterSpacing:".08em", marginBottom:8 }}>Comments ({task.comments.length})</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {task.comments.map((c,i)=><div key={i} style={{ background:T.bg, padding:8, borderRadius:6, fontSize:11, color:T.dim }}>{c}</div>)}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding:16, borderTop:`1px solid ${T.border}`, display:"flex", gap:8 }}>
        <Btn onClick={onClose} variant="ghost">Close</Btn>
      </div>
    </div>
  );
}

function NewTaskForm({onSubmit, onClose}) {
  const [form, setForm] = useState({ app:"sap", title:"", priority:"Medium", type:"Task", assignee:"Unassigned", status:"To Do" });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:20 }}>
      <div style={{ background:T.panel, borderRadius:12, padding:20, width:400, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 100px rgba(0,0,0,0.5)" }}>
        <div style={{ fontSize:16, fontWeight:900, marginBottom:16 }}>Create Task</div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.dim, marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Application</label>
            <select value={form.app} onChange={e=>setForm({...form,app:e.target.value})} style={{ width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px" }}>
              {APPS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.dim, marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Title</label>
            <input type="text" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Task title..." style={{ width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px" }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.dim, marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Priority</label>
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={{ width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px" }}>
                {PRIORITIES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.dim, marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Type</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{ width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px" }}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.dim, marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Assignee</label>
              <select value={form.assignee} onChange={e=>setForm({...form,assignee:e.target.value})} style={{ width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px" }}>
                {ASSIGNEES.map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.dim, marginBottom:6, textTransform:"uppercase", letterSpacing:".08em" }}>Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={{ width:"100%", background:T.card, color:T.text, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px" }}>
                {COLS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, marginTop:16 }}>
          <Btn onClick={()=>{ onSubmit({...form, id:uid(), created:Date.now(), updated:Date.now(), desc:"", comments:[], labels:[], story:3, sprint:"Sprint 12 — Current"}); onClose(); }}>Create</Btn>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

const VIEWS = [
  { id:"dashboard", label:"Dashboard",   icon:"📊" },
  { id:"kanban",    label:"Kanban",      icon:"📋" },
  { id:"list",      label:"List View",   icon:"≡" },
  { id:"sprint",    label:"Sprint Board",icon:"🏃" },
  { id:"ai",        label:"AI Chat",     icon:"✨" },
];

export default function ITSM() {
  const [view, setView] = useState("dashboard");
  const [tasks, setTasks]       = useState(SEED);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew]   = useState(false);
  const [appFilter, setAppFilter] = useState("all");

  function updateTask(id, changes) {
    setTasks(ts=>ts.map(t=>t.id===id?{...t,...changes}:t));
    setSelected(s=>s?.id===id?{...s,...changes}:s);
  }
  function addTask(t) { setTasks(ts=>[t,...ts]); }

  const visibleTasks = appFilter==="all"?tasks:tasks.filter(t=>t.app===appFilter);
  const criticalCount = tasks.filter(t=>t.priority==="Critical"&&t.status!=="Done").length;

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:T.text, display:"flex", flexDirection:"column" }}>
      {/* Top bar */}
      <div style={{ background:T.panel, borderBottom:`1px solid ${T.border}`, padding:"0 20px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ background:`linear-gradient(135deg,${T.indigo},${T.violet})`, borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color:"#fff" }}>IT</div>
          <div>
            <div style={{ fontWeight:900, fontSize:14, color:T.text }}>ITSM Task Monitor</div>
            <div style={{ fontSize:10, color:T.dim, letterSpacing:".08em" }}>MULTI-APPLICATION · AI-ENABLED · REAL-TIME</div>
          </div>
        </div>

        {/* App filter pills — top level */}
        <div style={{ display:"flex", gap:6, flex:1, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={()=>setAppFilter("all")} style={{ fontSize:11, padding:"4px 10px", borderRadius:5, border:`1px solid ${appFilter==="all"?T.indigo:T.border}`, background:appFilter==="all"?T.indigo+"22":"transparent", color:appFilter==="all"?T.indigo:T.faint, cursor:"pointer", fontWeight:600 }}>All</button>
          {APPS.map(a=>(
            <button key={a.id} onClick={()=>setAppFilter(a.id)} style={{ fontSize:11, padding:"4px 10px", borderRadius:5, border:`1px solid ${appFilter===a.id?a.color:T.border}`, background:appFilter===a.id?a.bg:"transparent", color:appFilter===a.id?a.color:T.faint, cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:a.color }}/>
              {a.name}
            </button>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {criticalCount>0&&<span style={{ fontSize:11, background:T.rose+"22", color:T.rose, border:`1px solid ${T.rose}40`, padding:"3px 10px", borderRadius:5, fontWeight:700 }}>🔥 {criticalCount} critical</span>}
          <Btn onClick={()=>setShowNew(true)} sm>+ Create</Btn>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background:T.panel, borderBottom:`1px solid ${T.border}`, padding:"0 20px", display:"flex", gap:0 }}>
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{ border:"none", background:"none", padding:"12px 16px", borderBottom:view===v.id?`2px solid ${T.indigo}`:"2px solid transparent", color:view===v.id?T.indigo:T.dim, fontWeight:view===v.id?700:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
            <span style={{ fontSize:14 }}>{v.icon}</span>{v.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px", maxWidth:1400, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>
        {view==="dashboard" && <Dashboard tasks={visibleTasks} onSelect={setSelected}/>}
        {view==="kanban"    && <Kanban tasks={visibleTasks} onSelect={setSelected} onUpdate={updateTask}/>}
        {view==="list"      && <ListView tasks={visibleTasks} onSelect={setSelected}/>}
        {view==="sprint"    && <SprintBoard tasks={visibleTasks} onSelect={setSelected}/>}
        {view==="ai"        && <AIChat tasks={tasks}/>}
      </div>

      {selected&&<TaskDrawer task={selected} onClose={()=>setSelected(null)} onUpdate={updateTask}/>}
      {showNew&&<NewTaskForm onSubmit={addTask} onClose={()=>setShowNew(false)}/>}

      <style>{`
        select option { background:#1E293B; color:#F1F5F9; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:2px; }
      `}</style>
    </div>
  );
}
