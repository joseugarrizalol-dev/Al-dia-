// ── Mercados (réplica del dashboard principal: cambio, crypto, índices) ──

const N=(n,d=0)=>n==null?'—':new Intl.NumberFormat('es-PY',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);

function cc(s){
  if(!s||s==='—')return'n';
  const v=parseFloat(String(s).replace(',','.'));
  if(!isNaN(v))return v>0?'p':v<0?'m':'n';
  return String(s).startsWith('+')?'p':String(s).startsWith('-')?'m':'n';
}
function cbg(s){const c=cc(s);return c==='p'?'cu':c==='m'?'cd':'cn';}

let _sparkIdx=0;
function spark(seed,chg,w,h){
  w=w||88;h=h||26;
  let r=String(seed).split('').reduce((a,c)=>a+c.charCodeAt(0)*31,0)^0xdeadbeef;
  const rnd=()=>{r=(r*1664525+1013904223)&0xffffffff;return(r>>>0)/0xffffffff;};
  const dir=cc(chg)==='p'?0.013:cc(chg)==='m'?-0.013:0;
  const d=[0.5];
  for(let i=1;i<28;i++) d.push(Math.max(.05,Math.min(.95,d[i-1]+(rnd()-.5)*.17+dir)));
  const mn=Math.min(...d),mx=Math.max(...d),rg=mx-mn||.1;
  const pts=d.map((v,i)=>`${((i/27)*w).toFixed(1)},${(h-((v-mn)/rg)*(h-5)-2.5).toFixed(1)}`);
  const isP=cc(chg)==='p',isM=cc(chg)==='m';
  const col=isP?'#0dc98a':isM?'#f0405a':'#4a6a84';
  const ly=parseFloat(pts[pts.length-1].split(',')[1]);
  const uid='sg'+(++_sparkIdx);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity=".4"/>
      <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${pts.join(' ')} ${w},${h} 0,${h}" fill="url(#${uid})"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${w}" cy="${ly.toFixed(1)}" r="3" fill="${col}"/>
  </svg>`;
}

const _CDS={'cd-rates':{r:60,t:60},'cd-crypto':{r:30,t:30},'cd-indexes':{r:30,t:30}};
function _fmtCd(s){return s>=60?Math.floor(s/60)+'m'+(s%60?String(s%60).padStart(2,'0')+'s':''):s+'s';}
function _resetCd(id){if(_CDS[id]){_CDS[id].r=_CDS[id].t;const el=document.getElementById(id);if(el)el.textContent=_fmtCd(_CDS[id].t);}}

async function loadRates(){
  try{
    const d=await(await fetch('/api/rates')).json();
    const FLAGS={USD:'🇺🇸',EUR:'🇪🇺',BRL:'🇧🇷',ARS:'🇦🇷'};
    const PAIRS={USD:'USD / PYG',EUR:'EUR / PYG',BRL:'BRL / PYG',ARS:'ARS / PYG'};
    const ORDER=['USD','EUR','BRL','ARS'];
    document.getElementById('rates-list').innerHTML=ORDER.filter(c=>d[c]).map(c=>{
      const v=d[c];
      const chg=v.change||'—';
      return `<div class="dr">
        <span class="dr-flag">${FLAGS[c]||''}</span>
        <div class="dr-info"><span class="dr-code">${PAIRS[c]}</span></div>
        <div class="dr-spark">${spark(c,chg)}</div>
        <span class="dr-val">${N(v.sell)}<span class="dr-unit">₲</span></span>
        <span class="dr-chg ${cbg(chg)}">${chg}</span>
      </div>`;
    }).join('');
    _resetCd('cd-rates');
  }catch{document.getElementById('rates-list').innerHTML='<div class="mac-row"><span class="mac-label">Sin datos</span></div>';}
}

async function loadCrypto(){
  try{
    const rates=await(await fetch('/api/rates')).json();
    const usd_pyg=rates.USD?.sell||7300;
    const d=await(await fetch('/api/crypto')).json();
    const IC={BTC:'₿',ETH:'Ξ',XMR:'ɱ',SOL:'◎',BNB:'⬡'};
    document.getElementById('crypto-list').innerHTML=Object.values(d).map(v=>{
      const chg=v.change_1y;
      const dec=v.usd>=1000?0:v.usd>=1?2:4;
      return `<div class="dr">
        <span class="dr-flag" style="font-family:'JetBrains Mono',monospace;font-size:clamp(12px,1.2vw,19px);color:var(--amber)">${IC[v.symbol]||'●'}</span>
        <div class="dr-info"><span class="dr-code">${v.symbol}</span><span class="dr-name">${v.symbol} / USD</span></div>
        <div class="dr-spark">${spark(v.symbol,chg)}</div>
        <span class="dr-val">$${N(v.usd,dec)}<span class="dr-unit">USD</span></span>
        <span class="dr-chg ${cbg(chg)}">${chg||'—'}</span>
      </div>`;
    }).join('');
    _resetCd('cd-crypto');
  }catch{document.getElementById('crypto-list').innerHTML='<div class="mac-row"><span class="mac-label">Sin datos</span></div>';}
}

async function loadIndexes(){
  try{
    const d=await(await fetch('/api/markets')).json();
    const {indexes}=d;
    if(indexes){
      document.getElementById('indexes-list').innerHTML=Object.values(indexes).map(v=>`
        <div class="dr dr-ns">
          <span class="dr-flag">${v.flag||'🇺🇸'}</span>
          <div class="dr-info"><span class="dr-code">${v.label}</span><span class="dr-name">NYSE / NASDAQ</span></div>
          <span class="dr-val">${N(v.price,0)}</span>
          <span class="dr-chg ${cbg(v.change)}">${v.change||'—'}</span>
        </div>`).join('');
    }
    _resetCd('cd-indexes');
  }catch{}
}

function _tickMarketCds(){
  for(const[id,cd]of Object.entries(_CDS)){
    cd.r=Math.max(0,cd.r-1);
    const el=document.getElementById(id);
    if(el)el.textContent=_fmtCd(cd.r);
  }
}

Promise.all([loadRates(),loadCrypto(),loadIndexes()]);
setInterval(loadRates,60*1000);
setInterval(loadCrypto,30*1000);
setInterval(loadIndexes,30*1000);
setInterval(_tickMarketCds,1000);
