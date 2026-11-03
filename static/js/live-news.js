// ── Ciclo de Noticias en Vivo (réplica del dashboard principal) ──

function outletCls(o){
  const l=o.toLowerCase();
  if(l.includes('valor')||l.includes('vagro'))return'o-vagro';
  if(l.includes('rural')||l.includes('rurales'))return'o-rural';
  if(l.includes('abc'))return'o-abc';
  if(l.includes('ltima')||l.includes('hora'))return'o-uh';
  if(l.includes('naci'))return'o-ln';
  if(l.includes('hoy'))return'o-hoy';
  return'o-other';
}

function outletBdr(o){
  const l=o.toLowerCase();
  if(l.includes('vagro')||l.includes('rural')||l.includes('rurales'))return'#16a34a';
  if(l.includes('abc'))return'#b91c1c';
  if(l.includes('ltima')||l.includes('hora'))return'#1d4ed8';
  if(l.includes('naci'))return'#15803d';
  if(l.includes('hoy'))return'#c2410c';
  return'#2a3d50';
}

let allNews=[],activeFilter='Todos',_newsPaused=false,_newsTimer=null,_scrollAcc=0,_newsListenersAdded=false;
const _CD_NEWS={r:180,t:180};

function _fmtCd(s){return s>=60?Math.floor(s/60)+'m'+(s%60?String(s%60).padStart(2,'0')+'s':''):s+'s';}
function _resetCdNews(){_CD_NEWS.r=_CD_NEWS.t;const el=document.getElementById('cd-news');if(el)el.textContent=_fmtCd(_CD_NEWS.t);}

function buildFilters(){
  const outlets=['Todos',...new Set(allNews.filter(n=>!n.agro).map(n=>n.outlet))];
  const hasAgro=allNews.some(n=>n.agro);
  const btns=outlets.map(o=>`<button class="fbtn${o===activeFilter?' on':''}" onclick="filterNews('${o}')">${o}</button>`).join('');
  const agroBtn=hasAgro?`<button class="fbtn fbtn--agro${activeFilter==='Agro'?' on':''}" onclick="filterNews('Agro')">Agro</button>`:'';
  document.getElementById('news-filter').innerHTML=btns+agroBtn;
}

function renderNews(items){
  const html=items.map(n=>`
    <div class="ni" style="border-left-color:${outletBdr(n.outlet)}">
      <span class="no ${outletCls(n.outlet)}">${n.outlet}</span>
      <a class="nt" href="${n.url}" target="_blank" rel="noopener">${n.title}</a>
    </div>`).join('');
  document.getElementById('news-feed').innerHTML=html+html;
}

function startNewsScroll(){
  const feed=document.getElementById('news-feed');
  if(!feed)return;
  if(_newsTimer)clearInterval(_newsTimer);
  feed.scrollTop=0;
  _scrollAcc=0;
  _newsPaused=false;
  _newsTimer=setInterval(()=>{
    if(_newsPaused||!feed)return;
    _scrollAcc+=0.45;
    const step=Math.floor(_scrollAcc);
    if(step>0){
      feed.scrollTop+=step;
      _scrollAcc-=step;
      if(feed.scrollTop>=feed.scrollHeight/2)feed.scrollTop-=feed.scrollHeight/2;
    }
  },16);

  if(!_newsListenersAdded){
    _newsListenersAdded=true;
    feed.addEventListener('mouseenter',()=>{_newsPaused=true;});
    feed.addEventListener('mouseleave',()=>{_newsPaused=false;});
    feed.addEventListener('wheel',e=>{e.preventDefault();feed.scrollTop+=e.deltaY*.7;},{passive:false});
  }
}

function filterNews(o){
  activeFilter=o; buildFilters();
  const items=o==='Todos'?allNews:o==='Agro'?allNews.filter(n=>n.agro):allNews.filter(n=>n.outlet===o&&!n.agro);
  renderNews(items);
  startNewsScroll();
}

async function loadNews(){
  try{
    allNews=await(await fetch('/api/news')).json();
    buildFilters();
    renderNews(allNews);
    startNewsScroll();
    _resetCdNews();
  }catch{document.getElementById('news-feed').innerHTML='<div class="ni"><span class="nt">Error al cargar noticias</span></div>';}
}

loadNews();
setInterval(loadNews,3*60*1000);
setInterval(()=>{_CD_NEWS.r=Math.max(0,_CD_NEWS.r-1);const el=document.getElementById('cd-news');if(el)el.textContent=_fmtCd(_CD_NEWS.r);},1000);
