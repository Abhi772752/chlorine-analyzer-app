const pages = ["dashboard","measure","history","device","settings"];
let records = JSON.parse(localStorage.getItem("chlorineRecords") || "[]");
const $ = id => document.getElementById(id);
function save(){localStorage.setItem("chlorineRecords",JSON.stringify(records));renderRecords();}
function showPage(name){
  pages.forEach(p=>$(p+"Page").classList.toggle("active",p===name));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  window.scrollTo({top:0,behavior:"smooth"});
}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}
function renderRecords(){
  const html = records.length ? records.slice().reverse().map(r=>`<div class="record"><div><b>${escapeHtml(r.sample)}</b><small>${r.channel} · ${r.location || "Location not specified"} · ${r.time} · ${r.demo?"Demo": "Device"}</small></div><strong>${r.value.toFixed(2)} <small>mg/L</small></strong></div>`).join("") : '<div class="empty">No measurements saved yet.</div>';
  $("recentList").innerHTML=html;
  $("historyList").innerHTML=html;
  $("historyCount").textContent=`${records.length} record${records.length===1?"":"s"}`;
  if(records.length){const r=records[records.length-1];$("mainReading").textContent=r.value.toFixed(2);$("lastMeasured").textContent=r.time;$("readingStatus").textContent="Latest saved result";}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
$("settingsQuick").addEventListener("click",()=>showPage("settings"));
$("demoMeasure").addEventListener("click",()=>{
  const channel=$("channelSelect").value;
  const sample=$("sampleName").value.trim() || `Sample-${String(records.length+1).padStart(3,"0")}`;
  const location=$("sampleLocation").value.trim();
  const value=Number((Math.random()*1.8+0.1).toFixed(2));
  const time=new Date().toLocaleString();
  records.push({sample,location,channel,value,time,demo:true});
  save();$("mainReading").textContent=value.toFixed(2);$("lastMeasured").textContent=time;$("readingStatus").textContent="Demo result — not a real test";
  toast("Demo measurement saved. This is simulated data.");
  showPage("dashboard");
});
$("connectBtn").addEventListener("click",()=>toast("Hardware connection is not enabled yet. We will add it after ESP32 testing."));
$("exportCsv").addEventListener("click",()=>{
  if(!records.length){toast("No records to export yet.");return;}
  const rows=[["Sample","Location","Channel","Result mg/L","Time","Type"],...records.map(r=>[r.sample,r.location,r.channel,r.value,r.time,r.demo?"Demo":"Device"])];
  const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="chlorine-measurements.csv";a.click();URL.revokeObjectURL(a.href);toast("CSV exported.");
});
$("clearData").addEventListener("click",()=>{if(confirm("Delete all saved demo measurements from this browser?")){records=[];save();$("mainReading").textContent="0.00";$("lastMeasured").textContent="No readings yet";$("readingStatus").textContent="Waiting for measurement";toast("Demo history cleared.");}});
renderRecords();
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
