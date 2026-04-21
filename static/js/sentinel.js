// ── Sentinel helpers ──────────────────────────────────────
function sntCls(s){return s>=80?"snt-alto":s>=60?"snt-malt":s>=40?"snt-mbaj":"snt-bajo"}
function sntLbl(s){return s>=80?"ALTO":s>=60?"M.ALTO":s>=40?"M.BAJO":"BAJO"}
function dimClr(v){return v>=16?"var(--grn)":v>=12?"#ca8a04":v>=8?"#ea580c":"var(--red)"}

const ENC_CLR={descriptivo:"#38bdf8",interpretativo:"#a78bfa",selectivo:"#fb923c",amplificado:"#f87171",atenuado:"#4ade80",contextual:"#2dd4bf"};
const ENC_LBL={descriptivo:"Descriptivo",interpretativo:"Interpretativo",selectivo:"Selectivo",amplificado:"Amplificado",atenuado:"Atenuado",contextual:"Contextual"};
const INT_CLR={alta:"var(--red)",media:"#ca8a04",baja:"var(--grn)"};
const EMO_CLR={positiva:"var(--grn)",negativa:"var(--red)",neutra:"var(--t3)",mixta:"#a78bfa"};

// ── State ─────────────────────────────────────────────────
let _arts=[],_outlet="",_enc="",_open=new Set();

// ── Row builder ───────────────────────────────────────────
function sntRow(a,rank){
  const s=a.score_total??0,cls=sntCls(s),lbl=sntLbl(s);
  const enc=a.encuadre??"",encC=ENC_CLR[enc]??"#94a3b8";
  const verbos=(()=>{try{return JSON.parse(a.verbos||"[]")}catch{return[]}})();
  const isOpen=_open.has(a.id);
  const dims=[
    ["Precisión factual",   a.score_factual],
    ["Claridad lingüística",a.score_linguistic],
    ["Integridad contexto", a.score_context],
    ["Balance encuadre",    a.score_framing],
    ["Transparencia fuente",a.score_transparency],
  ];
  const panel=isOpen?`<div class="snt-panel" onclick="event.stopPropagation()">
    <div class="snt-panel-grid">
      <div>
        ${a.hecho?`<span class="snt-panel-label">HECHO</span><p class="snt-panel-text">${a.hecho}</p>`:""}
        ${a.encuadre_just?`<span class="snt-panel-label" style="margin-top:10px;display:block">ENCUADRE</span><p class="snt-panel-text">${a.encuadre_just}</p>`:""}
        ${a.score_just?`<span class="snt-panel-label" style="margin-top:10px;display:block">EVALUACIÓN</span><p class="snt-panel-text">${a.score_just}</p>`:""}
        ${verbos.length?`<span class="snt-panel-label" style="margin-top:10px;display:block">VERBOS CLAVE</span><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${verbos.map(v=>`<span class="card-src">${v}</span>`).join("")}</div>`:""}
      </div>
      <div>
        <span class="snt-panel-label">DESGLOSE SCORE</span>
        ${dims.map(([l,v])=>{const n=v??0,pct=(n/20)*100,c=dimClr(n);
          return`<div class="snt-dim"><span class="snt-dim-lbl">${l}</span><div class="snt-dim-track"><div class="snt-dim-fill" style="width:${pct}%;background:${c}"></div></div><span class="snt-dim-val" style="color:${c}">${n}</span></div>`;
        }).join("")}
        <div class="snt-total ${cls}"><span>SENTINEL SCORE</span><strong>${s}<small> /100</small></strong></div>
        ${a.url&&a.url!=="#"?`<a class="snt-src-link" href="${a.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ Ver fuente original</a>`:""}
      </div>
    </div>
  </div>`:"";
  return`<div class="snt-row${isOpen?" open":""}" onclick="sntToggle(${a.id})">
    <div class="snt-row-main">
      <span class="snt-rank">#${String(rank).padStart(2,"0")}</span>
      <div class="snt-badge ${cls}"><span class="snt-badge-num">${s}</span><span class="snt-badge-lbl">${lbl}</span></div>
      <div>
        <p class="snt-title">${a.title}</p>
        <div class="snt-meta">
          <span class="card-src">${a.outlet}</span>
          ${enc?`<span class="snt-enc" style="color:${encC};border-color:${encC}50;background:${encC}12">${ENC_LBL[enc]??enc}</span>`:""}
          ${a.intensidad?`<span class="snt-pill" style="color:${INT_CLR[a.intensidad]??"var(--t3)"}">INT. ${a.intensidad.toUpperCase()}</span>`:""}
          ${a.carga_emocional?`<span class="snt-pill" style="color:${EMO_CLR[a.carga_emocional]??"var(--t3)"}">● ${a.carga_emocional.toUpperCase()}</span>`:""}
        </div>
      </div>
      <svg class="snt-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>${panel}
  </div>`;
}

// ── Toggle expand ─────────────────────────────────────────
function sntToggle(id){
  _open.has(id)?_open.delete(id):_open.add(id);
  renderSntFeed();
}

// ── Filters ───────────────────────────────────────────────
function sntFilter(type,val){
  if(type==="outlet")_outlet=val;else _enc=val;
  _open.clear();renderSnt();
}

function renderSntFilters(){
  const outlets=[...new Set(_arts.map(a=>a.outlet))].sort();
  const encs=[...new Set(_arts.filter(a=>!_outlet||a.outlet===_outlet).map(a=>a.encuadre).filter(Boolean))];
  const oEl=document.getElementById("snt-filter-outlet");
  if(oEl)oEl.innerHTML=["Todos",...outlets].map(o=>
    `<button class="fbtn${(!_outlet&&o==="Todos")||_outlet===o?" active":""}" onclick="sntFilter('outlet','${o==="Todos"?"":o}')">${o}</button>`
  ).join("");
  const eEl=document.getElementById("snt-filter-enc");
  if(eEl)eEl.innerHTML=["Todos",...encs].map(e=>
    `<button class="fbtn${(!_enc&&e==="Todos")||_enc===e?" active":""}" onclick="sntFilter('enc','${e==="Todos"?"":e}')">${e==="Todos"?"Todos":ENC_LBL[e]??e}</button>`
  ).join("");
}

// ── Render feed ───────────────────────────────────────────
function renderSntFeed(){
  const list=_arts.filter(a=>(!_outlet||a.outlet===_outlet)&&(!_enc||a.encuadre===_enc));
  const feed=document.getElementById("snt-feed");
  if(!feed)return;
  feed.innerHTML=list.length
    ?list.map((a,i)=>sntRow(a,i+1)).join("")
    :`<div class="dr"><span class="dr-name" style="padding:12px 0">Sin resultados para los filtros seleccionados.</span></div>`;
}

function renderSnt(){renderSntFilters();renderSntFeed();}

// ── Load stats ────────────────────────────────────────────
async function loadSntStats(){
  try{
    const d=await(await fetch("/sentinel/api/stats")).json();
    const avg=d.avg_score!=null?d.avg_score:"—";
    document.getElementById("snt-total").textContent=d.analyzed??0;
    document.getElementById("snt-avg").textContent=avg;
    const outEl=document.getElementById("snt-outlets-body");
    if(outEl)outEl.innerHTML=(d.outlets??[]).map(o=>
      row({code:o.outlet,name:`${o.total} artículos`,val:o.avg_score!=null?String(o.avg_score):"—",unit:"/100",noChg:true})
    ).join("")||`<div class="dr"><span class="dr-name">Sin datos</span></div>`;
  }catch{}
}

// ── Load news ─────────────────────────────────────────────
async function loadSntNews(){
  try{
    const d=await(await fetch("/sentinel/api/news")).json();
    _arts=d.results??[];
    renderSnt();
  }catch{
    const f=document.getElementById("snt-feed");
    if(f)f.innerHTML=`<div class="dr"><span class="dr-name" style="padding:12px 0">Error al cargar datos de Sentinel.</span></div>`;
  }
}

// ── Init ──────────────────────────────────────────────────
if(document.getElementById("snt-feed")){
  Promise.all([loadSntStats(),loadSntNews()]);
}
