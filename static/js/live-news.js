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

let allNews=[],activeFilter='Todos',_newsPaused=false,_newsRaf=null,_newsOffset=0,_newsLastTs=null,_newsListenersAdded=false;
const NEWS_SPEED_PX_S=12.5; // antes: 0.2px/16ms (equivalente), ahora en px/segundo reales
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
  document.getElementById('news-track').innerHTML=html+html;
}

// Mueve `#news-track` con transform (sub-píxel, vía GPU) en vez de
// scrollTop (que el navegador redondea a enteros y se ve "a saltos" a
// velocidades bajas). requestAnimationFrame + delta de tiempo real en
// vez de un setInterval de paso fijo, para que sea fluido de verdad.
function _newsTick(ts){
  const track=document.getElementById('news-track');
  if(track && _newsLastTs!=null && !_newsPaused){
    const dt=ts-_newsLastTs;
    const half=track.scrollHeight/2;
    _newsOffset+=NEWS_SPEED_PX_S*dt/1000;
    if(half>0)_newsOffset%=half;
    track.style.transform=`translateY(${-_newsOffset}px)`;
  }
  _newsLastTs=ts;
  _newsRaf=requestAnimationFrame(_newsTick);
}

function startNewsScroll(){
  const feed=document.getElementById('news-feed');
  const track=document.getElementById('news-track');
  if(!feed||!track)return;
  if(_newsRaf)cancelAnimationFrame(_newsRaf);
  _newsOffset=0;
  _newsLastTs=null;
  _newsPaused=false;
  track.style.transform='translateY(0)';
  _newsRaf=requestAnimationFrame(_newsTick);

  if(!_newsListenersAdded){
    _newsListenersAdded=true;
    feed.addEventListener('mouseenter',()=>{_newsPaused=true;});
    feed.addEventListener('mouseleave',()=>{_newsPaused=false;});
    feed.addEventListener('wheel',e=>{
      e.preventDefault();
      const half=track.scrollHeight/2;
      _newsOffset+=e.deltaY*.7;
      if(half>0){_newsOffset%=half;if(_newsOffset<0)_newsOffset+=half;}
      track.style.transform=`translateY(${-_newsOffset}px)`;
    },{passive:false});
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
  }catch{document.getElementById('news-track').innerHTML='<div class="ni"><span class="nt">Error al cargar noticias</span></div>';}
}

loadNews();
setInterval(loadNews,3*60*1000);
setInterval(()=>{_CD_NEWS.r=Math.max(0,_CD_NEWS.r-1);const el=document.getElementById('cd-news');if(el)el.textContent=_fmtCd(_CD_NEWS.r);},1000);
