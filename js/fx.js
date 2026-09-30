// ---- background sway ----
(function(){
  var el=$("bgfx"), tx=0, ty=0, x=0, y=0, t0=performance.now();
  function onMove(e){ var p=e.touches?e.touches[0]:e; if(!p) return; tx=(p.clientX/window.innerWidth-0.5)*-14; ty=(p.clientY/window.innerHeight-0.5)*-10; }
  window.addEventListener("pointermove",onMove,{passive:true}); window.addEventListener("touchmove",onMove,{passive:true});
  (function loop(now){
    var k=(now-t0)/1000, dx=Math.sin(k*0.23)*5+Math.sin(k*0.11)*3, dy=Math.cos(k*0.17)*3;
    var nx=x+(tx+dx-x)*0.04, ny=y+(ty+dy-y)*0.04;
    if(Math.abs(nx-x)+Math.abs(ny-y)>0.02){ x=nx; y=ny; el.style.transform="translate3d("+x.toFixed(1)+"px,"+y.toFixed(1)+"px,0)"; }
    if(LOWFX) setTimeout(function(){ requestAnimationFrame(loop); }, 66); else requestAnimationFrame(loop);
  })(t0);
})();
// ---- parallax: menu and game UI drift a few px with the mouse (uses the translate property, so existing transforms are untouched) ----
(function(){
  var tx=0, ty=0, x=0, y=0, running=false, MAX=7;
  function els(){ return [$("menu"), $("gameScreen")]; }
  function step(){
    x+=(tx-x)*0.08; y+=(ty-y)*0.08;
    var done=Math.abs(tx-x)+Math.abs(ty-y)<0.05, v=done?(tx+"px "+ty+"px"):(x.toFixed(2)+"px "+y.toFixed(2)+"px");
    els().forEach(function(e){ if(e) e.style.translate=v; });
    if(done){ running=false; return; } requestAnimationFrame(step); }
  window.addEventListener("pointermove",function(e){
    if(!prefs.plx || e.pointerType==="touch"){ if(tx||ty){ tx=ty=0; if(!running){ running=true; requestAnimationFrame(step); } } return; }
    tx=(e.clientX/innerWidth-0.5)*-MAX; ty=(e.clientY/innerHeight-0.5)*-MAX*0.7;
    if(!running){ running=true; requestAnimationFrame(step); } },{passive:true});
})();
// ---- menu background: an edit of music video previews from the artists (Apple previews, muted, blurred) ----
var BGV=(function(){
  var vids=[$("bgA"),$("bgB")], cur=0, timer=0, loading=false, started=0, CUT=5200, lastSrc="", recentA=[];
  // clips cached per artist for a week: {artist:{at, list:[previewUrl]}} (empty list = no videos on Apple)
  var CACHE={}; try{ CACHE=JSON.parse(localStorage.getItem("drop_bgclips11")||"{}")||{}; }catch(e){ CACHE={}; }
  var batches=0;
  // only videos whose lead artist IS this roster artist (no features, no similarly named artists)
  function credited(r,a){
    // exact name only: case-insensitive, but punctuation and spacing must match ("diamond*" != "Diamond", "Jace!" != "Ja Ce")
    function ex(x){ return (x||"").toLowerCase().replace(/\s+/g," ").trim(); }
    var names=[], parts=[];
    termsOf(a).concat([a]).forEach(function(t){ names.push(ex(t)); });
    (r.artistName||"").split(/\s*(?:,|&|\bx\b|\band\b|\bwith\b|feat\.?|ft\.?)\s*/i).forEach(function(p){ parts.push(p); });
    // title features ("Song (feat. X)") no longer count: those are other artists' videos (e.g. Brennan Jones) with a roster artist on the song
    return parts.some(function(p){ return names.indexOf(ex(p))!==-1; });
  }
  function onRoster(name,a){ var n=norm(leadArtist(name)); return termsOf(a).concat([a]).some(function(t){ return norm(t)===n; }); }
  function fresh(a){ var c=CACHE[a]; return ARTISTS.indexOf(a)!==-1 && c && Date.now()-c.at<7*864e5; }
  function saveCache(){ try{ localStorage.setItem("drop_bgclips11", JSON.stringify(CACHE)); }catch(e){} }
  function haveClips(){ for(var a in CACHE) if(fresh(a) && CACHE[a].list.length) return true; return false; }
  function want(){ return prefs.bgvid && (prefs.gamevid || !document.body.classList.contains("playing")) && !document.hidden; }
  // look artists up in batches: mastered first, then the bigger names (most likely to have videos), then everyone else.
  // keeps going right away until something is found, then a batch every 20s while the menu is open (max 8 per page load)
  // one artist = 2 requests (Apple ID lookup + name search). Search hits only count if they're credited by exact name (lead, "&" or feat.)
  var inflight={};
  function fetchArtist(a){
    if(inflight[a]) return inflight[a];
    var ids=termsOf(a).concat([a]).map(function(t){ return ARTIST_IDS[t]&&ARTIST_IDS[t].id; }).filter(function(x,i,arr){ return x && arr.indexOf(x)===i; });
    var reqs=ids.map(function(id){ return getJSON("https://itunes.apple.com/lookup?id="+id+"&entity=musicVideo&limit=200").catch(function(){ return null; }); });
    reqs.push(getJSON("https://itunes.apple.com/search?term="+encodeURIComponent(termsOf(a)[0])+"&entity=musicVideo&limit=200").catch(function(){ return null; }));
    return inflight[a]=Promise.all(reqs).then(function(ds){
      delete inflight[a];
      var got=[], seen={}, byId={}; ids.forEach(function(id){ byId[id]=1; });
      ds.forEach(function(d){ ((d&&d.results)||[]).forEach(function(r){
        if(!r.previewUrl || r.wrapperType!=="track" || seen[r.previewUrl]) return;
        if(!byId[r.artistId] && !credited(r,a)) return;
        seen[r.previewUrl]=1; got.push({u:r.previewUrl, t:noFeat(r.trackName||""), a:r.artistName||a}); }); });
      if(!got.length && ds.some(function(d){ return !d; })) return;   // a request failed (rate limit / offline): don't record "no videos", retry later
      CACHE[a]={at:got.length?Date.now():Date.now()-6*864e5, list:got}; saveCache();
    });
  }
  // background filler: 3 artists at a time, gently paced so Apple doesn't rate-limit the game
  function fetchClips(){
    if(loading || batches>=25) return;
    var tiers=mastery(), todo=ARTISTS.filter(function(a){ return !fresh(a) && !inflight[a]; });
    if(!todo.length) return;
    var big=ARTISTS.slice(0,30);
    var pool=shuffle(todo.filter(function(a){ return tiers[a]; })).concat(
      shuffle(todo.filter(function(a){ return !tiers[a] && big.indexOf(a)!==-1; })),
      shuffle(todo.filter(function(a){ return !tiers[a] && big.indexOf(a)===-1; }))).slice(0,3);
    loading=true; batches++;
    Promise.all(pool.map(fetchArtist)).then(function(){
      loading=false;
      if(want() && !vids[cur].classList.contains("on")) next();
      if(want()) setTimeout(fetchClips, haveClips() ? 15000 : 2500);
    });
  }
  // pick an artist (diamond x6, gold x4, others x1, avoiding the last few), then a random clip of theirs
  var nvT=0;
  function nowPlaying(c){         // small caption: what video is on screen
    var el=$("nowVid"), txt=c && (c.t||c.a) ? "\u25B6 "+(c.a||"")+(c.t?" \u2014 "+c.t:"") : "";
    el.classList.remove("on"); clearTimeout(nvT);
    nvT=setTimeout(function(){ el.textContent=txt; if(txt) el.classList.add("on"); }, 350);
  }
  // shuffled deck of every cached clip: nothing repeats until all have played, same artist never twice in a row
  var deck=[], played={};
  function pickClip(){
    var all=[];
    var only=prefs.bgArtist && ARTISTS.indexOf(prefs.bgArtist)!==-1 ? prefs.bgArtist : "";
    for(var a in CACHE){ if(!fresh(a) || (only && a!==only)) continue; CACHE[a].list.forEach(function(c){ var u=c.u||c; if(!played[u]) all.push([a,c]); }); }
    if(!all.length){ played={}; for(var a2 in CACHE){ if(fresh(a2) && (!only || a2===only)) CACHE[a2].list.forEach(function(c){ if((c.u||c)!==lastSrc) all.push([a2,c]); }); }
      if(!all.length && only && fresh(only)) CACHE[only].list.forEach(function(c){ all.push([only,c]); }); }
    if(!all.length) return null;
    deck=shuffle(all);
    var i=0; while(i<deck.length-1 && deck[i][0]===recentA[0]) i++;
    var pick=deck[i][0], clip=deck[i][1];
    recentA=[pick];
    if(typeof clip==="string") clip={u:clip, t:"", a:pick==="__mix"?"":pick};      // clips cached by older versions are plain URLs
    played[clip.u]=1; lastSrc=clip.u; return clip;
  }
  function next(){
    clearTimeout(timer); if(!want()) return;
    var clip=pickClip(); if(!clip) return; var src=clip.u, solo=!!prefs.bgArtist; $("bgv").classList.toggle("solo",solo);
    var v=vids[1-cur], old=vids[cur];
    v.src=src; v.muted=true;
    var shown=false;
    function show(){ if(shown) return; shown=true; v.classList.remove("on"); void v.offsetWidth; v.classList.add("on"); old.classList.remove("on"); cur=1-cur; nowPlaying(clip);
      setTimeout(function(){ if(!old.classList.contains("on")) try{ old.pause(); }catch(e){} }, solo?3300:1500);
      timer=setTimeout(next, solo?CUT*1.8:CUT); }
    v.onloadedmetadata=function(){ try{ v.currentTime=Math.min(Math.max(0,(v.duration||30)-(solo?CUT*1.8:CUT)/1000-1), 3+Math.random()*14); }catch(e){} };
    v.oncanplay=function(){ var p=v.play(); if(p&&p.then) p.then(show,function(){ timer=setTimeout(next,1500); }); else show(); };
    v.onerror=function(){ if(v===vids[cur]&&shown){ clearTimeout(timer); timer=setTimeout(next,300); } else if(!shown){ clearTimeout(timer); timer=setTimeout(next,300); } };
    // freeze guard: if the visible clip ends, stalls or stops advancing, cut to the next one
    v.onended=function(){ if(shown && v===vids[cur]) next(); };
    var lastT=-1; clearInterval(v._wd); v._wd=setInterval(function(){
      if(!shown || v!==vids[cur] || !want()){ if(v!==vids[cur]&&shown) clearInterval(v._wd); return; }
      if(v.paused){ var p=v.play(); if(p&&p.catch) p.catch(function(){}); }
      if(v.currentTime===lastT) next(); lastT=v.currentTime; }, 1200);
    timer=setTimeout(function(){ if(!shown) next(); }, 9000);
  }
  function resume(){
    document.body.classList.toggle("bgv-on", !!prefs.bgvid);
    if(!want()){ clearTimeout(timer); vids.forEach(function(v){ try{ v.pause(); }catch(e){} }); return; }
    if(Date.now()-started>60000){ started=Date.now(); setTimeout(fetchClips, 1500); }     // look up more artists each visit
    if(prefs.bgArtist && ARTISTS.indexOf(prefs.bgArtist)!==-1 && !fresh(prefs.bgArtist)){ var ba=prefs.bgArtist; fetchArtist(ba).then(function(){ if(prefs.bgArtist===ba && want()) next(); }); }
    if(!haveClips()) return;
    var v=vids[cur]; if(v.src && v.classList.contains("on")){ var p=v.play(); if(p&&p.catch) p.catch(function(){}); clearTimeout(timer); timer=setTimeout(next, CUT); } else next();
  }
  document.addEventListener("visibilitychange", resume);
  function noVids(a){ nowPlaying({a:"Apple has no music video previews for "+a, t:""}); }
  function loadPick(a,tries){       /* look the picked artist up now, skipping the queue; retry if Apple refused */
    fetchArtist(a).then(function(){ if(prefs.bgArtist!==a) return;
      if(!fresh(a)){ if(tries<3) setTimeout(function(){ loadPick(a,tries+1); }, 4000*(tries+1)); return; }
      if(!CACHE[a].list.length){ noVids(a); return; }
      if(want()) next(); }); }
  function setArtist(a){ played={}; clearTimeout(timer);
    var pend=vids[1-cur]; pend.oncanplay=pend.onloadedmetadata=pend.onerror=null; try{ pend.pause(); }catch(e){}     /* drop a clip that was still loading for the old pick */ vids.forEach(function(v){ v.classList.remove("on"); }); nowPlaying(null);  /* fade the current clip out right away */
    if(a && !fresh(a)) loadPick(a, 0);
    else if(a && !CACHE[a].list.length) noVids(a);
    else if(want()) next(); }
  return {setArtist:setArtist, nowPlaying:nowPlaying, pickClip:pickClip, cache:CACHE, resume:resume, toggle:resume, pause:function(){ clearTimeout(timer); vids.forEach(function(v){ try{ v.pause(); }catch(e){} }); }};
})();
// ---- TV effects: animated grain (tiny canvas scaled up, ~12fps) and random glitch bursts every few seconds ----
var TVFX=(function(){
  // fine grain: 4 noise tiles made once at 1:1 pixels, cycled as a background (no per-frame drawing)
  var el=$("tvgrain"), frames=[], fi=0, gT=0, bT=0;
  (function(){ var c=document.createElement("canvas"); c.width=c.height=220; var x=c.getContext("2d");
    for(var f=0;f<6;f++){ var im=x.createImageData(220,220), d=im.data; for(var i=0;i<d.length;i+=4){ var v=Math.random()*255|0; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255; }
      x.putImageData(im,0,0); frames.push("url("+c.toDataURL("image/png")+")"); } })();
  function grain(){ el.style.backgroundImage=frames[fi=(fi+1)%frames.length]; gT=setTimeout(grain, 45); }
  function burst(){
    if(!prefs.tv || document.hidden || document.body.classList.contains("launching")) return schedule();
    var tears=document.querySelector(".tvtears"), n=1+(Math.random()*3|0), h="";
    for(var i=0;i<n;i++) h+="<i style='top:"+(Math.random()*96).toFixed(1)+"%;height:"+(2+Math.random()*10).toFixed(0)+"px;animation-delay:"+(i*45)+"ms'></i>";
    tears.innerHTML=h;
    if(Math.random()<0.4){ document.body.classList.add("tv-glitch"); setTimeout(function(){ document.body.classList.remove("tv-glitch"); }, 240); }   // only the background video jitters
    setTimeout(function(){ tears.innerHTML=""; }, 500);
    schedule();
  }
  function schedule(){ clearTimeout(bT); bT=setTimeout(burst, 3500+Math.random()*6500); }
  function toggle(){ clearTimeout(gT); clearTimeout(bT); if(prefs.tv){ grain(); schedule(); } else document.body.classList.remove("tv-glitch"); }
  return {toggle:toggle, burst:burst};
})();
// ---- click sounds: soft keyboard-style "thock", synthesized so there are no sound files to host ----
var CLICK=(function(){
  var ctx=null, buf=null;
  function init(){ var C=window.AudioContext||window.webkitAudioContext; ctx=new C(); var n=Math.floor(ctx.sampleRate*0.03); buf=ctx.createBuffer(1,n,ctx.sampleRate);
    var d=buf.getChannelData(0); for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,7); }
  function play(up){
    if(!prefs.clicks || !prefs.volume || !prefs.uivol) return;
    try{
      if(!ctx) init(); if(ctx.state==="suspended") ctx.resume();
      var t=ctx.currentTime, v=prefs.volume*prefs.uivol*(up?0.45:1), jit=0.92+Math.random()*0.16;
      var s=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain();
      s.buffer=buf; s.playbackRate.value=(up?1.3:1)*jit; bp.type="bandpass"; bp.frequency.value=(up?3400:2300)*jit; bp.Q.value=1.4; g.gain.value=0.13*v;
      s.connect(bp); bp.connect(g); g.connect(ctx.destination); s.start(t);
      var o=ctx.createOscillator(), og=ctx.createGain();
      o.type="sine"; o.frequency.setValueAtTime((up?280:180)*jit,t); o.frequency.exponentialRampToValueAtTime(80,t+0.05);
      og.gain.setValueAtTime(0.09*v,t); og.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
      o.connect(og); og.connect(ctx.destination); o.start(t); o.stop(t+0.07);
    }catch(e){}
  }
  function blip(f1,f2,dur,gain){           // short pitched tone
    if(!prefs.clicks || !prefs.volume || !prefs.uivol) return;
    try{
      if(!ctx) init(); if(ctx.state==="suspended") ctx.resume();
      var t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
      o.type="triangle"; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gain*prefs.volume*prefs.uivol,t+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+dur+0.02);
    }catch(e){}
  }
  function toggle(on){ if(on){ blip(520,780,0.07,0.09); setTimeout(function(){ blip(780,1040,0.06,0.07); },55); } else { blip(700,460,0.07,0.08); setTimeout(function(){ blip(460,330,0.06,0.06); },55); } }
  var lastTick=0;
  function tick(){ var n=performance.now(); if(n-lastTick<45) return; lastTick=n; blip(1900+Math.random()*300,1500,0.018,0.035); }
  function whoosh(){                      // quiet rising air sweep for the zoom into a game
    if(!prefs.clicks || !prefs.volume || !prefs.uivol) return;
    try{
      if(!ctx) init(); if(ctx.state==="suspended") ctx.resume();
      var t=ctx.currentTime, dur=0.7, n=Math.floor(ctx.sampleRate*dur), nb=ctx.createBuffer(1,n,ctx.sampleRate), d=nb.getChannelData(0);
      for(var i=0;i<n;i++) d[i]=Math.random()*2-1;
      var src=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain();
      src.buffer=nb; bp.type="bandpass"; bp.Q.value=0.9;
      bp.frequency.setValueAtTime(260,t); bp.frequency.exponentialRampToValueAtTime(2600,t+dur*0.85);
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.07*prefs.volume*prefs.uivol,t+dur*0.55); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t+dur);
    }catch(e){}
  }
  return {play:play, toggle:toggle, tick:tick, whoosh:whoosh};
})();
// scroll ticks: a soft detent every ~36px scrolled in any list
(function(){ var acc=new WeakMap();
  document.addEventListener("scroll",function(e){ var el=e.target===document?document.scrollingElement:e.target; if(!el||el.scrollTop==null) return;
    var a=acc.get(el)||{y:el.scrollTop,d:0}; a.d+=Math.abs(el.scrollTop-a.y); a.y=el.scrollTop;
    if(a.d>=36){ a.d=0; CLICK.tick(); } acc.set(el,a); },{capture:true,passive:true});
})();
// ---- button tilt + ripple ----
(function(){
  var SEL=".btn,.opt,.modcard,.sw,.dbtn,.iconbtn,.pickrow,.filchip,.cchip,.ghost,.ghost2,.chip,.swatch,.vlink,.linkbtn,.lu,.seg,.flink,.modeopt,.bgpo,.fgroup", cur=null;
  function tilt(el,e){
    var r=el.getBoundingClientRect(), px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
    var max = el.classList.contains("lu") ? 9 : (r.width>220 ? 5 : 11);   // artist names tilt gently
    el.classList.add("tilt"); el.style.setProperty("--ry",(px*max).toFixed(2)+"deg"); el.style.setProperty("--rx",(-py*max).toFixed(2)+"deg");
  }
  function reset(el){ if(!el) return; el.style.setProperty("--rx","0deg"); el.style.setProperty("--ry","0deg"); el.classList.remove("pressed"); }
  document.addEventListener("pointermove",function(e){
    var el=e.target.closest&&e.target.closest(SEL);
    if(el!==cur){ reset(cur); cur=el; }
    if(el && !el.disabled) tilt(el,e);
  },{passive:true});
  document.addEventListener("pointerdown",function(e){
    if(prefs.ring!==false){ var ring=document.createElement("div"); ring.className="ring-fx"; ring.style.left=e.clientX+"px"; ring.style.top=e.clientY+"px";
    document.body.appendChild(ring); ring.addEventListener("animationend",function(){ ring.remove(); }); }
    var el=e.target.closest&&e.target.closest(SEL);
    if(el && !el.disabled){ cur=el; tilt(el,e); el.classList.add("pressed"); CLICK.play(false); if(e.pointerType==="touch" && navigator.vibrate){ try{navigator.vibrate(8);}catch(x){} } }
  },{passive:true});
  function up(e){ if(cur){ if(cur.classList.contains("pressed")) CLICK.play(true); cur.classList.remove("pressed"); if(e.pointerType!=="mouse"){ reset(cur); cur=null; } } }
  document.addEventListener("pointerup",up,{passive:true}); document.addEventListener("pointercancel",up,{passive:true});
  document.addEventListener("pointerleave",function(){ reset(cur); cur=null; });
})();
(function(){
  var st=$("stage"), tx=0, ty=0, x=0, y=0, hover=false, t0=performance.now();
  st.addEventListener("pointermove",function(e){ var r=st.getBoundingClientRect(); tx=(e.clientX-r.left)/r.width-0.5; ty=(e.clientY-r.top)/r.height-0.5; hover=true; },{passive:true});
  st.addEventListener("pointerleave",function(){ hover=false; });
  st.addEventListener("pointerup",function(e){ if(e.pointerType!=="mouse") hover=false; });
  (function loop(now){
    var on=st.classList.contains("revealed") && prefs.holo, k=(now-t0)/1000;
    var gx=on?(hover?tx:Math.sin(k*0.9)*0.28):0, gy=on?(hover?ty:Math.cos(k*0.7)*0.22):0;
    if(!on && Math.abs(x)+Math.abs(y)<0.0005){ requestAnimationFrame(loop); return; }
    x+=(gx-x)*0.1; y+=(gy-y)*0.1;
    st.style.setProperty("--trx",(-y*14).toFixed(2)+"deg"); st.style.setProperty("--try",(x*16).toFixed(2)+"deg");
    st.style.setProperty("--gx",(50+x*110).toFixed(1)+"%"); st.style.setProperty("--gy",(50+y*110).toFixed(1)+"%");
    requestAnimationFrame(loop);
  })(t0);
})();
// ---- confetti: falls from the top on a correct answer ----
var CONF=(function(){
  var cv=document.createElement("canvas"); cv.className="confetti"; cv.setAttribute("aria-hidden","true"); document.body.appendChild(cv);
  var cx=cv.getContext("2d"), parts=[], raf=0, dpr=1, W=0, H=0, last=0;
  function size(){ dpr=Math.min(2,window.devicePixelRatio||1); W=window.innerWidth; H=window.innerHeight; cv.width=W*dpr; cv.height=H*dpr; }
  window.addEventListener("resize",size); size();
  function burst(n){
    if(!prefs.confetti) return;
    var cs=getComputedStyle(document.documentElement);
    var cols=[cs.getPropertyValue("--accent").trim()||"#8c5cff", cs.getPropertyValue("--spot").trim()||"#9b6bff", "#ffffff", "#39e08b"];
    if(W!==window.innerWidth||H!==window.innerHeight) size();
    for(var i=0;i<n;i++) parts.push({x:Math.random()*W, y:-12-Math.random()*H*0.3, vx:(Math.random()-0.5)*2.4, vy:1.5+Math.random()*3.2,
      r:Math.random()*6.28, vr:(Math.random()-0.5)*0.24, w:5+Math.random()*5, h:8+Math.random()*7, c:cols[i%cols.length],
      t:0, life:160+Math.random()*80, round:Math.random()<0.2, sw:Math.random()*6.28});
    if(!raf){ last=performance.now(); raf=requestAnimationFrame(tick); }
  }
  function tick(now){
    var k=Math.min(4,(now-last)/16.667); last=now;          // time-based: same speed on 60Hz and 120Hz screens
    cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,W,H);
    parts=parts.filter(function(p){ return p.t<p.life && p.y<H+30; });
    for(var i=0;i<parts.length;i++){ var p=parts[i];
      p.t+=k; p.vy=Math.min(p.vy+0.055*k,5); p.vx*=Math.pow(0.99,k); p.sw+=0.07*k; p.x+=(p.vx+Math.sin(p.sw)*0.8)*k; p.y+=p.vy*k; p.r+=p.vr*k;
      cx.globalAlpha=Math.max(0,Math.min(1,(p.life-p.t)/35)); cx.fillStyle=p.c;
      cx.save(); cx.translate(p.x,p.y); cx.rotate(p.r); cx.scale(1,Math.cos(p.sw*1.3));        // flutter
      if(p.round){ cx.beginPath(); cx.arc(0,0,p.w/2,0,6.283); cx.fill(); } else cx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      cx.restore(); }
    cx.globalAlpha=1;
    raf = parts.length ? requestAnimationFrame(tick) : 0;
  }
  return {burst:burst, count:function(){ return parts.length; }};
})();
boot();
// ---- CRT bulge on the lineup: each name is nudged toward the middle by its distance from centre (barrel curve), text stays crisp ----
var BULGE=(function(){
  var raf=0;
  function apply(){ raf=0; var box=$("artistList"); if(!box) return; var on=document.body.classList.contains("tv-on");
    var ws=box.querySelectorAll(".luw"), br=box.getBoundingClientRect(); if(!br.width) return;
    for(var i=0;i<ws.length;i++){ var w=ws[i];
      if(!on){ if(w.style.transform) w.style.transform=""; continue; }
      w.style.transform=""; var r=w.getBoundingClientRect();
      var nx=((r.left+r.right)/2-br.left)/br.width*2-1, ny=((r.top+r.bottom)/2-br.top)/br.height*2-1;
      nx=Math.max(-1,Math.min(1,nx)); ny=Math.max(-1,Math.min(1,ny));
      var dy=-ny*nx*nx*16, dx=-nx*ny*ny*18, s=1-0.08*(nx*nx*ny*ny)-0.05*ny*ny, rot=nx*ny*3.4;
      w.style.transform="translate("+dx.toFixed(2)+"px,"+dy.toFixed(2)+"px) rotate("+rot.toFixed(2)+"deg) scale("+s.toFixed(3)+")"; } }
  function q(){ if(!raf) raf=requestAnimationFrame(apply); }
  window.addEventListener("resize",q); document.addEventListener("scroll",q,true);
  new MutationObserver(q).observe(document.body,{attributes:true,attributeFilter:["class"]});
  setTimeout(q,300);
  return {update:q};
})();
