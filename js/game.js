// ---- game ----
var mode="all", pickArtist=null, multiSet=null, usedCycle={}, recent=[], lastAnswerId=null;
var score=0, streak=0, played=0, solved=0, R=null, runLog=[], lastStart=null, runBest0=0;
var BEST={}; try{ BEST=JSON.parse(localStorage.getItem("drop_best")||"{}")||{}; }catch(e){ BEST={}; }
function saveBest(){ try{ localStorage.setItem("drop_best", JSON.stringify(BEST)); }catch(e){} }
var runSeen={}, runDone={}, wonAll=false;
function openModal(el){ clearTimeout(el._ct); el.classList.remove("closing"); el.classList.add("open"); }
function closeModal(el){
  if(!el.classList.contains("open")) return;
  if(!prefs.anim || matchMedia("(prefers-reduced-motion: reduce)").matches){ el.classList.remove("open","closing"); return; }
  el.classList.add("closing"); clearTimeout(el._ct);
  el._ct=setTimeout(function(){ el.classList.remove("open","closing"); }, 220);
}
function resetRun(){ setTimeout(setProgress,0); muffle(false); PENDING=[]; skipUsed=null; runLog=[]; runSeen={}; runDone={}; wonAll=false; runBest0=BEST[curDiff()]||0; $("failModal").classList.remove("open","won"); }

function sample(arr,n){ var p=arr.slice(); for(var i=p.length-1;i>0;i--){var j=Math.random()*(i+1)|0;var t=p[i];p[i]=p[j];p[j]=t;} return p.slice(0,n); }
function shuffle(a){ for(var i=a.length-1;i>0;i--){var j=Math.random()*(i+1)|0;var t=a[i];a[i]=a[j];a[j]=t;} return a; }
function includedArtists(){
  if(mode==="artist"&&pickArtist) return [pickArtist];
  if(mode==="multi"&&multiSet) return ARTISTS.filter(function(a){return multiSet[a];});
  return ARTISTS;
}
var DIFFS={
  easy:   {goal:20, lo:0,   hi:1, min:6, mult:0.9,  w:function(p){ return 0.04+Math.pow(1-p,4); },  label:"Easy",    note:"The easiest of the easy: every artist\u2019s most popular hits."},
  normal: {goal:50, lo:0,   hi:1, min:8, mult:1,    w:function(p){ return 0.35+Math.pow(1-p,1.4); }, label:"Normal",  note:"The middlest of middle grounds: mostly their big hits."},
  hard:   {goal:75, lo:.2,  hi:1, min:8, mult:1.15, w:function(p){ return 0.3+p; },                   label:"Hard",    note:"Big hits are few and far between. You\u2019d better know your stuff."},
  extreme:{goal:90, lo:.55, hi:1, min:8, mult:1.5,  w:function(p){ return 0.15+p*p; },               label:"Extreme", note:"No big hits here. You must really think you know your stuff, huh?"},
  random: {goal:60, lo:0,   hi:1, min:1, mult:1.25, w:function(){ return 1; },                         label:"Random",  note:"A Mashup of difficulties, to give you the most varied experience"}
};
// songs out in the last ~3 months play like hits: they sit higher in the pool and show up more on easy
function freshF(t){ var d=(Date.now()-Date.parse(t.date||""))/864e5; if(!(d>=0) || d>120) return 1; return d<=90 ? 0.3+0.3*(d/90) : 0.6+0.4*((d-90)/30); }
function popOf(t){ return (t.pop!=null ? t.pop : 0.5)*freshF(t); }
function weightedPick(list){
  var f=DIFFS[curDiff()].w, ws=list.map(function(t){ return Math.max(0.0001,f(popOf(t))); }), tot=ws.reduce(function(a,b){return a+b;},0), r=Math.random()*tot;
  for(var i=0;i<list.length;i++){ r-=ws[i]; if(r<=0) return list[i]; }
  return list[list.length-1];
}
function multOf(d){ return DIFFS[d||curDiff()].mult; }
function multTxt(d){ var m=multOf(d); return "\u00d7"+(m%1?m.toFixed(m*100%10?2:1):m); }
// more artists, more credit: every artist past the 3rd adds +0.05 to the score multiplier
function artistBonusFor(n){ return 1+Math.max(0,n-3)*0.05; }
function artistBonus(){ return mode==="artist" ? 1 : artistBonusFor(includedArtists().length); }
function bonusTag(){ var b=artistBonus(); return b>1 ? "<div class='modtags'><span class='modtag'>\uD83D\uDC65 "+includedArtists().length+" artists "+bonusTxt(b)+"</span></div>" : ""; }
function bonusTxt(b){ return "\u00d7"+b.toFixed(2).replace(/0+$/,"").replace(/\.$/,""); }
function ptsAt(i){ return Math.round(PTS[Math.min(i,PTS.length-1)]*Math.max(0.1,multOf()+modMult()+artistBonus()-2)); }
// ---- modifiers ----
var MODS=[
  {k:"blind", icon:"\uD83D\uDE48", label:"My ears are trained", mult:1.3, desc:"Artist names and features (feat./ft./with) are hidden on every choice. Only counts with 3+ artists (all artists, or 3+ picked in Choose artists)."},
  {k:"peek",  icon:"\uD83D\uDDBC\uFE0F", label:"Just a peek", mult:0.85, desc:"The album cover and artist show as soon as the round starts, but the choices lose their covers."},
  {k:"lives", icon:"\u2764\uFE0F", label:"Extra life", mult:0.7,  desc:"One extra guess per song. A miss greys out that choice and unlocks the next snippet length."},
  {k:"half",  icon:"\u23F1\uFE0F", label:"1 second is too much anyways", mult:1.3, desc:"You only get the 0.5 second snippet. No hearing more, no ifs, ands or buts."},
  {k:"rand",  icon:"\uD83C\uDFB2", label:"Anywhere but the beginning", mult:1.15, desc:"The snippet starts at a random spot between 0 and 15 seconds into the song."},
  {k:"mc",    icon:"\u26CF\uFE0F", label:"I want Minecraft", mult:1.05, desc:"Everything in the game gets pixelated, text included."},
  {k:"skip",  icon:"\u23ED\uFE0F", label:"Get out of jail free", mult:0.8, desc:"One skip per run: pass on a song you don't know without losing. The end screen and shared scores show if you used it."}
];
function modPct(m){ return (m.mult>1?"+":"\u2212")+Math.round(Math.abs(m.mult-1)*100)+"%"; }
function modActive(k){ if(!prefs.mods[k]) return false; if(k==="blind") return mode!=="artist" && includedArtists().length>=3; return true; }
function activeMods(){ return MODS.filter(function(m){ return modActive(m.k); }); }
function modMult(){ return activeMods().reduce(function(a,m){ return a+m.mult-1; },1); }
function skipTxt(used){ return used ? "<div class='skipnote'>\u23ED\uFE0F skip used on <b>"+escapeHtml(String(used))+"</b></div>" : ""; }
function modTags(keys){ var ms=MODS.filter(function(m){ return keys.indexOf(m.k)!==-1; }); if(!ms.length) return "";
  return "<div class='modtags'>"+ms.map(function(m){ return "<span class='modtag"+(m.k==="blind"?" shiny":"")+"'>"+m.icon+" "+m.label+" "+modPct(m)+"</span>"; }).join("")+"</div>"; }
function applyMods(){
  if(modActive("mc") && !$("mcFont")){ var l=document.createElement("link"); l.id="mcFont"; l.rel="stylesheet"; l.href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;700&display=swap"; document.head.appendChild(l); }
  MODS.map(function(m){ return m.k; }).forEach(function(k){ document.body.classList.toggle("m-"+k, modActive(k)); }); }
function renderStartBtn(){ if(!$("modeGo")) return;
  var names=(typeof modeArtist!=="undefined"&&modeArtist) ? [modeArtist] : (typeof setNames==="function"&&setNames()) || ARTISTS, n=names.length;
  var x=Math.max(0.1,multOf()+(n>1?artistBonusFor(n)-1:0)+MODS.reduce(function(a,m){ return a+(prefs.mods[m.k]&&(m.k!=="blind"||n>=3)?m.mult-1:0); },0));
  $("modeGo").innerHTML="<span class='pl'>Start Game<span class='gox'>\u00d7"+(+x.toFixed(2))+"</span></span><span class='arr'>&rarr;</span>"; }
function renderModBtn(){ renderStartBtn(); var on=MODS.filter(function(m){ return prefs.mods[m.k]; }), x=on.reduce(function(a,m){ return a+m.mult-1; },1);
  $("modBtn").innerHTML="Modifiers"+(on.length?"<span class='mcount'>"+on.length+" \u00b7 \u00d7"+(+x.toFixed(3))+"</span>":""); }
function renderMods(){
  $("modList").innerHTML=MODS.map(function(m){ var on=!!prefs.mods[m.k];
    return "<button class='modcard"+(on?" on":"")+(on&&m.k==="blind"?" shiny":"")+"' data-k='"+m.k+"' role='switch' aria-checked='"+on+"'><span class='mi'>"+m.icon+"</span><span><div class='mt'>"+m.label+"</div><div class='md'>"+m.desc+"</div></span><span class='mx "+(m.mult>1?"up":"down")+"'>"+modPct(m)+"</span></button>"; }).join("");
  var on=MODS.filter(function(m){ return prefs.mods[m.k]; }), x=on.reduce(function(a,m){ return a+m.mult-1; },1);
  $("modSum").innerHTML = on.length ? "score <b>\u00d7"+(+x.toFixed(3))+"</b> with these on" : "no modifiers, normal scoring";
  var cs=$("modList").querySelectorAll(".modcard");
  for(var i=0;i<cs.length;i++){ (function(c){ c.onclick=function(){ var k=c.getAttribute("data-k"); prefs.mods[k]=!prefs.mods[k];
    if(prefs.mods[k] && k==="blind") prefs.mods.peek=false;       // blind hides the artist, peek shows it: can't have both
    if(prefs.mods[k] && k==="peek") prefs.mods.blind=false;
    savePrefs(); renderMods(); renderModBtn(); CLICK.toggle(prefs.mods[k]); }; })(cs[i]); }
}
function curDiff(){ return DIFFS[prefs.diff]?prefs.diff:"normal"; }
function rankOf(t){ return t.rank!=null ? t.rank*freshF(t) : 999; }
function windowed(p,dk){
  var d=DIFFS[dk||curDiff()], subs={}, out=[];
  p.forEach(function(t){ (subs[t.sub]=subs[t.sub]||[]).push(t); });
  for(var k in subs){
    var m=subs[k].slice().sort(function(x,y){ return rankOf(x)-rankOf(y); }), n=m.length;
    var a=Math.floor(d.lo*n), b=Math.max(a+d.min, Math.ceil(d.hi*n));
    if(b>n){ b=n; a=d.lo>0 ? Math.max(0,n-d.min) : 0; }
    out=out.concat(m.slice(a,b));
  }
  return out;
}
function renderDiff(){
  var d=curDiff(), bs=document.querySelectorAll("#diffRow .seg"), idx=0;
  for(var i=0;i<bs.length;i++){ var on=bs[i].getAttribute("data-d")===d; bs[i].classList.toggle("on",on); bs[i].setAttribute("aria-checked",on?"true":"false"); if(on) idx=i; }
  $("diffRow").style.setProperty("--idx",idx); $("menu").setAttribute("data-d",d); $("modePanel").setAttribute("data-d",d);
  var m=multOf(d); $("diffNote").textContent=DIFFS[d].note; goalNote();
  $("diffLabel").className="dlabel "+d; $("diffLabel").textContent=DIFFS[d].label+" "+multTxt(d);
  renderStartBtn();
}
var lastArtist=null, NEXT=null, roundSeq=0;
function chooseArtist(){
  var list=includedArtists().filter(function(a){ return !isUnavail(a) && !runDone[a]; });
  if(!list.length) return null;
  if(list.length>1) list=list.filter(function(a){ return a!==lastArtist; });
  return list[Math.random()*list.length|0];
}
function prefetchNext(){ NEXT=chooseArtist(); if(NEXT) ensureArtist(NEXT); }
// ---- play transition: menu zooms in, screen fades to black, game fades in once the first song has loaded ----
var waitReveal=false, revealT=0;
// letterbox bars: snap in to a cinema frame, slowly close while the screen goes black, then open again as it fades back
var LBOX=(function(){ var el=null, t=0;
  function close(shutAfter,shutMs){ el=el||$("lbox"); clearTimeout(t); el.style.setProperty("--shut",(shutMs||900)+"ms"); el.classList.remove("shut"); el.classList.add("in");
    t=setTimeout(function(){ el.classList.add("shut"); }, shutAfter||260); }
  function open(){ el=el||$("lbox"); clearTimeout(t); el.classList.remove("in","shut"); }
  return {close:close, open:open}; })();
// ---- menu music: muffled previews of in-game songs while hovering artists / with the game mode panel open ----
var MM=(function(){
  var ctx=null, filt=null, cur=null, key="", hoverA=null, nextT=null, noCors=false, seq=0, held=false;      // held: a game is starting, stay quiet until back at the menu
  function vol(){ return prefs.volume*prefs.mmvol*0.55; }
  function graph(){ if(ctx||noCors) return;
    try{ var C=window.AudioContext||window.webkitAudioContext; ctx=new C(); filt=ctx.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=650; filt.Q.value=0.8; filt.connect(ctx.destination); }catch(e){ noCors=true; } }
  function gv(el){ return el._g ? el._g.gain.value : el.volume; }
  function sv(el,v){ v=Math.max(0,Math.min(1,v)); if(el._g) el._g.gain.value=v; else el.volume=v; }
  function fade(el,to,ms,done){ clearInterval(el._f); var from=gv(el), t0=performance.now();
    el._f=setInterval(function(){ var k=Math.min(1,(performance.now()-t0)/ms); try{ sv(el,from+(to-from)*k); }catch(e){} if(k>=1){ clearInterval(el._f); if(done) done(); } },30); }
  function kill(el,ms){ if(!el) return; fade(el,0,ms,function(){ try{ el.pause(); el.removeAttribute("src"); el.load(); }catch(e){} }); }
  function targets(){
    if(held || !prefs.menumusic || document.hidden || document.body.classList.contains("playing") || !$("startScreen").classList.contains("active")) return null;
    if(hoverA) return [hoverA];
    if(document.body.classList.contains("modes-open")) return modeArtist ? [modeArtist] : (setNames()||ARTISTS);
    return null; }
  function playFrom(list,my){
    var ready=list.filter(hasArtist), pool=ready.length?ready:list;      // artists already loaded start instantly
    var a=pool[Math.floor(Math.random()*pool.length)];
    ensureArtist(a).then(function(ok){
      if(my!==seq) return;
      var tr=ok&&byArtist[a]&&byArtist[a].tracks.filter(function(t){ return t.preview; });
      if(!tr||!tr.length){ if(list.length>1) playFrom(list.filter(function(x){ return x!==a; }),my); return; }
      var t=tr[Math.floor(Math.random()*tr.length)], el=new Audio();
      graph(); if(!noCors) el.crossOrigin="anonymous";
      el.preload="auto"; el.volume=0; el.src=t.preview;
      if(ctx&&!noCors){ try{ var g=ctx.createGain(); g.gain.value=0; ctx.createMediaElementSource(el).connect(g); g.connect(filt); el._g=g; el.volume=1; ctx.resume(); }catch(e){} }
      el.addEventListener("loadedmetadata",function(){ try{ el.currentTime=Math.random()*Math.max(0,Math.min(15,(el.duration||30)-12)); }catch(e){} },{once:true});
      el.addEventListener("error",function(){ if(el.crossOrigin&&my===seq){ noCors=true; ctx=null; playFrom(list,my); } },{once:true});
      var pr=el.play(); if(pr&&pr.catch) pr.catch(function(){});
      var old=cur; cur=el; kill(old,1800); fade(el,vol(),1800);
      clearTimeout(nextT); nextT=setTimeout(function(){ if(my===seq) playFrom(list,my); }, 5000+Math.random()*10000);
    }); }
  function sync(){
    var l=targets(), k=l?l.join("|"):"";
    if(k===key) return; key=k; seq++; clearTimeout(nextT);
    kill(cur,700); cur=null;      // old song fades out right away, not once the next one has loaded
    if(l) playFrom(l,seq); }
  document.addEventListener("mouseover",function(e){ var b=e.target.closest&&e.target.closest("#artistList .lu[data-a]"); var a=b?b.getAttribute("data-a"):null; if(a!==hoverA){ hoverA=a; setTimeout(sync,a?60:350); } });
  setInterval(sync,600);
  return {sync:sync, setVol:function(){ if(cur) fade(cur,vol(),150); }, stop:function(ms){ held=true; seq++; key=""; clearTimeout(nextT); kill(cur,ms||250); cur=null; }, release:function(){ held=false; }};
})();
function menuTransition(go){
  MM.stop(250);
  if(!$("startScreen").classList.contains("active")){ go(); return; }
  var w=document.querySelector(".wrap"), r=w.getBoundingClientRect();
  w.style.transformOrigin="50% "+Math.round(window.innerHeight/2-r.top)+"px";     // zoom toward the middle of the screen
  document.body.classList.add("prelaunch"); void w.offsetWidth;
  requestAnimationFrame(function(){
    document.documentElement.classList.add("launching"); document.body.classList.add("launching"); $("blackout").classList.add("on"); LBOX.close(260,1000); CLICK.whoosh();
  });
  setTimeout(function(){
    waitReveal=true; go(); document.body.classList.remove("launching","prelaunch"); document.documentElement.classList.remove("launching"); w.style.transformOrigin="";
    clearTimeout(revealT); revealT=setTimeout(revealGame, 12000);        // never stay black forever
  }, 720);
}
function revealGame(){ if(!waitReveal) return; waitReveal=false; clearTimeout(revealT); $("blackout").classList.remove("on"); LBOX.open(); }
function startGame(artistKey){ menuTransition(function(){ startGameNow(artistKey); }); }
function startMulti(setObj){ menuTransition(function(){ startMultiNow(setObj); }); }
function startGameNow(artistKey){
  mode = artistKey ? "artist" : "all"; pickArtist=artistKey||null; multiSet=null;
  lastStart=function(){ startGame(artistKey); }; resetRun();
  usedCycle={}; recent=[]; lastAnswerId=null; lastArtist=null; NEXT=null; score=0; streak=0; played=0; solved=0;
  setModeLabel();
  document.body.classList.add("playing"); if(!prefs.gamevid) BGV.pause();
  $("startScreen").classList.remove("active"); $("gameScreen").classList.add("active");
  resizeViz();
  newRound();
}
function startMultiNow(setObj){
  mode="multi"; pickArtist=null; multiSet=setObj;
  lastStart=function(){ startMulti(setObj); }; resetRun();
  usedCycle={}; recent=[]; lastAnswerId=null; lastArtist=null; NEXT=null; score=0; streak=0; played=0; solved=0;
  setModeLabel();
  document.body.classList.add("playing"); if(!prefs.gamevid) BGV.pause();
  $("startScreen").classList.remove("active"); $("gameScreen").classList.add("active");
  resizeViz();
  newRound();
}
// mute everything while the tab is in the background, unmute when you come back
document.addEventListener("visibilitychange",function(){ try{ audio.muted=document.hidden; }catch(e){} });
// ---- back to menu: fade the game (and its audio) to black, swap, fade the menu in ----
var homing=false;
function goHomeFade(){
  if(homing) return; homing=true;
  var v0=audio.volume||0, t0=performance.now();
  (function dip(){ var k=Math.min(1,(performance.now()-t0)/450); try{ audio.volume=v0*(1-k); }catch(e){} if(k<1) requestAnimationFrame(dip); })();
  document.body.classList.add("leaving"); $("blackout").classList.add("on","quick"); LBOX.close(160,520);
  setTimeout(function(){
    goHome(); document.body.classList.remove("leaving"); document.body.classList.add("arriving");
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ $("blackout").classList.remove("on"); LBOX.open(); document.body.classList.remove("arriving"); }); });
    setTimeout(function(){ $("blackout").classList.remove("quick"); homing=false; }, 600);
  }, 480);
}
function goHome(){ muffle(false); PENDING=[]; fading=false; pendingSrc=null; pendingPlay=false; clearInterval(fadeI); clearTimeout(stopT); cancelAnimationFrame(rafId); try{audio.pause();}catch(e){}
  document.body.classList.remove("playing","lastlife"); MM.release(); renderArtistList(); BGV.resume(); setTimeout(fitLogo,0); MODS.forEach(function(m){ document.body.classList.remove("m-"+m.k); });
  $("gameScreen").classList.remove("active"); $("startScreen").classList.add("active"); }

function newRound(){
  clearTimeout(stopT); cancelAnimationFrame(rafId);
  if(!fading){ clearInterval(fadeI); try{audio.pause();}catch(e){} audio.volume=prefs.volume; }
  pendingSrc=null; pendingPlay=false; viewSpan=targetSpan=SPANS[0]; availSec=STAGES[0];
  var seq=++roundSeq;
  R=null; $("stage").classList.remove("revealed","right","wrong","chroma","peek"); document.body.classList.remove("lastlife");
  $("artistHint").textContent=""; $("vlinks").innerHTML=""; $("barPlay").style.width="0"; $("nextBtn").classList.remove("show");
  $("opts").innerHTML="<div class='roundwait' id='roundWait'>loading songs\u2026</div>";
  $("playBtn").disabled=true; $("moreBtn").disabled=true;
  var first=(NEXT && includedArtists().indexOf(NEXT)!==-1) ? NEXT : chooseArtist(); NEXT=null;
  attempt(first,0);
  function attempt(a,n){
    if(seq!==roundSeq) return;
    if(!a && includedArtists().every(function(k){ return runDone[k]; })){ showWin(); return; }
    if(!a){ waitMsg("Couldn't reach Apple right now \u2014 retrying\u2026"); setTimeout(function(){ if(seq===roundSeq) attempt(chooseArtist(),0); },5000); return; }
    var settled=false;
    var slow=setTimeout(function(){
      if(settled||seq!==roundSeq) return;
      var ready=includedArtists().filter(hasArtist);
      ready=ready.filter(function(k){ return !runDone[k]; });
      if(ready.length){ settled=true; if(!setupRound(ready[Math.random()*ready.length|0])){ settled=false; attempt(chooseArtist(),n+1); } }
      else waitMsg(applePausedFor()?"Apple is rate limiting \u2014 resuming in "+applePausedFor()+"s\u2026":"loading songs\u2026");
    },3500);
    ensureArtist(a).then(function(ok){
      if(settled||seq!==roundSeq) return;
      if(ok){ settled=true; clearTimeout(slow); if(setupRound(a)) return; settled=false; attempt(chooseArtist(),n+1); return; }
      clearTimeout(slow); attempt(n<8?chooseArtist():null, n+1);
    });
  }
  function waitMsg(t){ var w=$("roundWait"); if(w) w.textContent=t; }
}
// top bar: game mode + who's in it ("Classic · Featuring Ken Carson + Yeat + 3 more")
function setModeLabel(){
  var gm=GMODES.filter(function(m){ return m.k===gmode(); })[0], who=includedArtists();
  var names=who.length>=ARTISTS.length ? "All artists" : "Featuring "+who.slice(0,3).join(" + ")+(who.length>3?" + "+(who.length-3)+" more":"");
  $("modeLabel").textContent=(gm?gm.name:"Classic")+" \u00b7 "+names; }
function setupRound(a){
  var all=byArtist[a].tracks, solo=mode==="artist", p=poolFor(a,solo), answer;
  var fresh=p.filter(function(t){ return !runSeen[t.id]; });
  if(!fresh.length){ runDone[a]=1; return false; }            // every allowed song by this artist already played this run
  answer=weightedPick(fresh);
  lastAnswerId=answer.id; lastArtist=a;
  var strict = curDiff()==="hard" || curDiff()==="extreme";
  function near(list,n){
    list=list.filter(function(t){ return t.id!==answer.id; });
    list.sort(function(x,y){ return Math.abs(rankOf(x)-rankOf(answer)) - Math.abs(rankOf(y)-rankOf(answer)); });
    return sample(list.slice(0, Math.max(n*3,8)), n);
  }
  // wrong options: never a song already played this run; same artist and similar popularity first
  function unused(list){ return list.filter(function(t){ return t.id!==answer.id && !runSeen[t.id] && dis.indexOf(t)===-1; }); }
  var dis=[];
  dis=dis.concat(near(unused(p.filter(function(t){return t.sub===answer.sub;})),3));
  if(dis.length<3) dis=dis.concat(near(unused(p),3-dis.length));
  if(dis.length<3 && !strict && !solo) dis=dis.concat(near(unused(all),3-dis.length));
  if(dis.length<3 && mode!=="artist"){ var rest=[]; includedArtists().forEach(function(k){ if(k!==a&&hasArtist(k)) rest=rest.concat(strict?windowed(byArtist[k].tracks):byArtist[k].tracks); });
    dis=dis.concat(sample(unused(rest),3-dis.length)); }
  if(dis.length<3 && !solo){   // not enough unplayed songs left, so reuse played ones (one-artist runs grey the empty slots instead)
    var used=(strict?p:all).filter(function(t){ return t.id!==answer.id && dis.indexOf(t)===-1; });
    dis=dis.concat(near(used,3-dis.length)); }
  var opts=shuffle([answer].concat(dis));
  var allSame=opts.every(function(o){ return o.artist===answer.artist; });
  R={ghosts:Math.max(0,4-opts.length),answer:answer,opts:opts,artist:answer.artist,unlocked:0,over:false,picked:null,t0:performance.now(),started:false,lives:modActive("lives")?2:1,tried:{},offset:modActive("rand")?Math.random()*15:0};
  applyMods(); document.body.classList.remove("lastlife"); $("stage").classList.toggle("peek", modActive("peek"));
  if(fading) pendingSrc=answer.preview; else { audio.src=answer.preview; audio.load(); }
  $("cover").src=answer.art; $("coverA").src=answer.art; $("coverB").src=answer.art;
  $("artistHint").textContent = modActive("peek") ? (answer.credit||answer.artist) : allSame ? R.artist : "";
  render(); paintBar();
  if(prefs.autoplay){ if(fading) pendingPlay=true; else play(); }
  prefetchNext();
  if(waitReveal){                                   // first round after pressing play: reveal once the song can play
    var ready=function(){ audio.removeEventListener("canplay",ready); setTimeout(revealGame,150); };
    if(audio.readyState>=3) ready(); else { audio.addEventListener("canplay",ready); setTimeout(revealGame,4000); }
  }
  return true;
}
var PREVIEW_LEN=30, SPANS=[1.5,3,6,10,15,15], viewSpan=1.5, targetSpan=1.5, availSec=0.5, TICKS=[];
function paintBar(){
  availSec = R.over ? PREVIEW_LEN : Math.min(STAGES[R.unlocked],BAR_FULL);
  targetSpan = R.over ? PREVIEW_LEN : SPANS[Math.min(R.unlocked,SPANS.length-1)];
  $("barNow").textContent = R.over ? "full" : stageLabel(R.unlocked);
  $("barPts").textContent = "+"+ptsAt(R.unlocked);
}
function renderStreak(){
  var sc=1+Math.min(streak,15)*0.09;
  $("streak").textContent = String(streak);
}
function render(){
  var box=$("opts"); box.innerHTML="";
  R.opts.forEach(function(o){
    var b=document.createElement("button"); b.className="opt";
    b.innerHTML="<span class='optk'>"+"ABCD".charAt(R.opts.indexOf(o))+"</span><img class='optart' src='"+escapeHtml(o.art)+"' alt=''><span class='opttext'><span class='optt'>"+escapeHtml(o.title)+"</span><span class='opta'>"+escapeHtml(o.credit||o.artist)+"</span></span>";
    if(R.over){ b.disabled=true; if(o.id===R.answer.id) b.classList.add("correct"); else if(o.id===R.picked) b.classList.add("wrong"); else b.classList.add(R.tried[o.id]?"tried":"dim"); }
    else if(R.tried[o.id]){ b.disabled=true; b.classList.add("tried"); }
    b.onclick=function(){ guess(o); };
    box.appendChild(b);
  });
  for(var gi=0;gi<(R.ghosts||0);gi++){ var g=document.createElement("button"); g.className="opt ghostslot"; g.disabled=true; g.setAttribute("aria-hidden","true");
    g.innerHTML="<span class='optk'>"+"ABCD".charAt(R.opts.length+gi)+"</span><span class='opttext'><span class='optt'>\u2014</span></span>"; box.appendChild(g); }
  $("moreBtn").disabled = R.over || R.unlocked>=STAGES.length-1 || modActive("half");
  $("playBtn").disabled = R.over;
  $("skipBtn").disabled = R.over || !!skipUsed; $("skipBtn").innerHTML = skipUsed ? "skip used" : "&#9197; skip";
  $("score").textContent=score; $("acc").textContent=solved+"/"+played; renderStreak();
  $("lives").innerHTML = modActive("lives") ? "<i>Lives</i><span>"+(R.over?"\u2013":(R.lives>1?"2":"1"))+"</span>" : "";
}
// waits for the seek to land before playing, otherwise mobile browsers start late and clip the snippet
function seek0(cb,at){ function go(){ var t=at||0; if(Math.abs((audio.currentTime||0)-t)<0.02){ cb(); return; }
    var done=false, h=function(){ if(done) return; done=true; audio.removeEventListener("seeked",h); cb(); };
    audio.addEventListener("seeked",h); setTimeout(h,700); try{audio.currentTime=t;}catch(e){ h(); } } if(audio.readyState>=2) go(); else { var h=function(){audio.removeEventListener("canplay",h); go();}; audio.addEventListener("canplay",h); } }
// the guess timer starts once the snippet is actually heard, not when Play is pressed
audio.addEventListener("playing",function(){ if(R && R.started && !R.t0 && !R.over) R.t0=performance.now(); });
function play(){ if(!R||R.over) return; if(!R.started){ R.started=true; R.t0=0; } if(fading){ pendingPlay=false; finishFade(); } runPlayback(true); }
function runPlayback(fromStart){
  clearTimeout(stopT); cancelAnimationFrame(rafId);
  if(AC){ try{AC.resume();}catch(e){} }
  // output latency: on phones the sound reaches the speaker a moment after currentTime moves, so stop that much later
  var lat=AC ? Math.min(0.5,(AC.outputLatency||0)+(AC.baseLatency||0)) : 0;
  var off=R.offset||0, end = off+Math.min(STAGES[R.unlocked],BAR_FULL)+lat;
  function go(){
    // a suspended audio context plays silence while the clock runs, so wait until it's actually running
    if(AC && AC.state!=="running"){ var rs; try{ rs=AC.resume(); }catch(e){} if(rs&&rs.then){ rs.then(go2,go2); return; } }
    go2(); }
  function go2(){
    audio.volume=prefs.volume; var p=audio.play();
    function begin(){
      (function tick(){
        var ct=audio.currentTime;
        if(!R.over && ct>=end){ audio.pause(); return; }
        rafId=requestAnimationFrame(tick);
      })();
      if(!R.over) stopT=setTimeout(function(){ audio.pause(); }, (Math.max(0,end-audio.currentTime)+0.4)*1000);
    }
    if(p&&p.then) p.then(begin).catch(begin); else begin();
  }
  if(fromStart || (audio.currentTime||0)<off-0.05) seek0(go,off); else go();
}
function hearMore(){ if(!R||R.over||R.unlocked>=STAGES.length-1||modActive("half")) return; R.unlocked++; paintBar(); render(); runPlayback(false); }
function guess(o){
  if(!R||R.over||R.tried[o.id]) return;
  if(o.id!==R.answer.id && R.lives>1){           // double life: burn a life, grey the choice, unlock the next snippet
    R.lives--; R.tried[o.id]=1;
    if(R.unlocked<STAGES.length-1 && !modActive("half")) R.unlocked++;
    document.body.classList.add("lastlife");
    var fl=$("flash"); fl.classList.remove("win","lose"); void fl.offsetWidth; fl.classList.add("lose");
    paintBar(); render(); if(R.started) runPlayback(true);
    return;
  }
  R.over=true; R.picked=o.id; played++;
  var win=(o.id===R.answer.id);
  bump(R.answer, win);
  R.secs=R.t0 ? (performance.now()-R.t0)/1000 : 0;
  var pts=win?ptsAt(R.unlocked):0;
  runLog.push({t:R.answer, win:win, secs:R.secs, clip:STAGES[R.unlocked], pts:pts});
  runSeen[R.answer.id]=1;
  var lastOne=null;
  if(win && mode==="artist"){ var pa=poolFor(pickArtist,true), left=pa.filter(function(t){ return !runSeen[t.id]; });
    // down to the final two and you got it: the last standing song counts as won too, no need to pick it
    if(left.length===1){ lastOne=left[0]; runSeen[lastOne.id]=1; runLog.push({t:lastOne, win:true, secs:0, clip:0, pts:0, auto:true}); }
    wonAll=pa.every(function(t){ return runSeen[t.id]; });
  }
  if(win){ score+=pts; streak++; solved++; if(lastOne){ solved++; streak++; } if(goalOf() && solved>=goalOf()) wonAll=true; }
  if(win) setProgress();
  else { streak=0; if(mode==="artist"){ usedCycle={}; } }
  if(!win || wonAll) commitRun();          // the run is over: now it counts
  end(win);
}
function setProgress(){ var g=goalOf(), el=$("goalTag"); if(!el) return;
  el.textContent = g ? Math.min(solved,g)+" / "+g : (isEndless() ? "\u221E "+solved : ""); }
function end(win){
  clearTimeout(stopT); cancelAnimationFrame(rafId); document.body.classList.remove("lastlife");
  var fl=$("flash"); fl.classList.remove("win","lose"); void fl.offsetWidth; fl.classList.add(win?"win":"lose");
  if(win) CONF.burst(wonAll?220:90);
  var st=$("stage"); st.classList.add("revealed"); if(prefs.chroma) st.classList.add("chroma"); st.classList.remove("right","wrong");
  void st.offsetWidth; st.classList.add(win?"right":"wrong");
  $("vtag").textContent = win ? "\u2713 got it  +"+ptsAt(R.unlocked) : "\u2717 it was";
  $("vtag").style.color = win ? "var(--good)" : "var(--bad)";
  $("vtitle").textContent=R.answer.title; $("vartist").textContent=(R.answer.credit||R.answer.artist);
  var ans=R.answer, peers=((byArtist[ans.artist]&&byArtist[ans.artist].tracks)||[]).filter(function(t){ return t.sub===ans.sub; });
  var rank=1; peers.forEach(function(t){ if((t.pop||0)<(ans.pop||0)) rank++; });
  $("vdate").textContent = fmtDate(ans.date) + (peers.length>1 && ans.pop!=null ? "  \u00b7  #"+rank+" of "+peers.length+" on Apple" : "") + "  \u00b7  "+R.secs.toFixed(2)+"s";
  var q=encodeURIComponent(leadArtist(R.answer.credit||R.answer.artist)+" "+baseTitle(R.answer.title));
  var am=R.answer.viewUrl || ("https://music.apple.com/search?term="+q);
  var sp="https://open.spotify.com/search/"+q;
  $("vlinks").innerHTML=
    "<a class='vlink' target='_blank' rel='noopener' href='"+escapeHtml(am)+"'>Apple Music \u2197</a>"+
    "<a class='vlink' target='_blank' rel='noopener' href='"+sp+"'>Spotify \u2197</a>";
  $("nextBtn").innerHTML = wonAll ? "You got every song &rarr;" : (win ? "Next song &rarr;" : "See results &rarr;"); $("nextBtn").classList.add("show");
  if(!win){ var fs=roundSeq; setTimeout(function(){ if(fs===roundSeq && R && R.over && $("gameScreen").classList.contains("active")) showFail(); }, 600); }
  if(wonAll){ var ws=roundSeq; setTimeout(function(){ if(ws===roundSeq && $("gameScreen").classList.contains("active")) showWin(); }, 900); }
  paintBar(); render();
  if(prefs.endmusic) seek0(function(){ audio.volume=prefs.volume; if(AC){try{AC.resume();}catch(e){}} var p=audio.play(); if(p&&p.catch)p.catch(function(){}); });
}
var fading=false, pendingSrc=null, pendingPlay=false;
function finishFade(){
  clearInterval(fadeI); fading=false; try{audio.pause();}catch(e){} audio.volume=prefs.volume;
  if(pendingSrc){ audio.src=pendingSrc; audio.load(); pendingSrc=null; }
  if(pendingPlay){ pendingPlay=false; play(); }
}
var skipUsed=null;            // title of the song skipped this run (Get out of jail free)
function skipSong(){
  if(!R||R.over||skipUsed||!modActive("skip")) return;
  skipUsed=R.answer.title+" by "+(R.answer.credit||R.answer.artist); runSeen[R.answer.id]=1;
  R.over=true; nextSong();
}
function nextSong(){
  clearInterval(fadeI); cancelAnimationFrame(rafId); clearTimeout(stopT);
  if(!audio.paused){
    fading=true; var v=audio.volume||prefs.volume, step=0, N=16;
    fadeI=setInterval(function(){ step++; audio.volume=Math.max(0, v*(1-step/N)); if(step>=N) finishFade(); }, 40);
  }
  newRound();
}

// ---- win screen (one-artist run with every song correct) ----
// what this run counts: total songs, the word for them, and how to name the mode/difficulty
function runTotal(){ return goalOf(); }                 // 0 = endless (no total)
function runUnit(g,n){ var one=n===1; return g==="singles" ? (one?"single":"singles") : g==="albums" ? (one?"album song":"album songs") : (one?"song":"songs"); }
function diffLocked(){ return mode==="artist" && soloSingles(); }
function modeLine(){ var g=GMODES.filter(function(m){ return m.k===gmode(); })[0], nm=g?g.name:"Classic";
  return diffLocked() ? "<b>"+nm+"</b>" : "<b>"+DIFFS[curDiff()].label+"</b>"+(gmode()!=="classic"?" \u00b7 <b>"+nm+"</b>":""); }
function showWin(){
  if($("failModal").classList.contains("open")) return;
  showFail(); muffle(false);
  var n=solved, wins=runLog.filter(function(x){return x.win && !x.auto;}), u=runUnit(gmode(),n);
  var avg=wins.length?wins.reduce(function(s,x){return s+x.secs;},0)/wins.length:0;
  $("failTitle").textContent=n+" "+u+", no misses"; $("failModal").classList.add("won"); $("failRetry").innerHTML="&#8635; Play again";
  $("failSub").innerHTML="You got all <b>"+n+"</b> "+(pickArtist?escapeHtml(pickArtist)+" ":"")+u+" on "+modeLine()+(wins.length?"<br>average "+avg.toFixed(2)+"s per song":"")+bonusTag()+modTags(activeMods().map(function(m){return m.k;}))+(modActive("skip")?(skipUsed?skipTxt(skipUsed):"<div class='skipnote'>\u23ED\uFE0F skip not used</div>"):"");
}
// ---- fail screen ----
function showFail(){
  if($("failModal").classList.contains("open")) return;
  muffle(true);
  $("failTitle").textContent="Wrong song"; $("failModal").classList.remove("won"); $("failRetry").innerHTML="&#8635; Retry";
  commitRun();
  var dk=curDiff(), isNew=score>runBest0 && score>0, last=runLog[runLog.length-1], wins=runLog.filter(function(x){return x.win;});
  var fast=wins.length?Math.min.apply(null,wins.map(function(x){return x.secs;})):0;
  var avg=wins.length?wins.reduce(function(s,x){return s+x.secs;},0)/wins.length:0;
  $("fScore").textContent=score; $("fBest").textContent=BEST[dk]||0; var tot=runTotal(); $("fSolved").textContent = tot ? Math.min(solved,tot)+"/"+tot : solved;
  $("fBestLbl").textContent="best ("+(diffLocked()?"Single Mingle":DIFFS[dk].label)+")"; $("fBestBox").classList.toggle("new",isNew);
  $("failSub").innerHTML = last ? "It was <b>"+escapeHtml(last.t.title)+"</b> by "+escapeHtml(last.t.credit||last.t.artist)+"<br>"+modeLine()+(wins.length?"<br>fastest "+fast.toFixed(2)+"s, average "+avg.toFixed(2)+"s":"")+bonusTag()+modTags(activeMods().map(function(m){return m.k;}))+(modActive("skip")?(skipUsed?skipTxt(skipUsed):"<div class='skipnote'>\u23ED\uFE0F skip not used</div>"):"") : "";
  $("failList").innerHTML="<div class='sslabel'>This run: "+runLog.length+" song"+(runLog.length===1?"":"s")+"</div>"+runLog.slice().reverse().map(function(x){
    var st=STATS[x.t.id]||{}, miss=(st.s||0)-(st.c||0);
    return "<div class='sres"+(x.win?"":" lost")+"'><img src='"+escapeHtml(x.t.art)+"' alt=''><div class='st'><div class='stt'>"+(x.win?"\u2713 ":"\u2717 ")+escapeHtml(x.t.title)+"</div><div class='sta'>"+escapeHtml(x.t.credit||x.t.artist)+"</div></div>"+
      "<div class='fstat'><b>"+x.secs.toFixed(2)+"s</b><span>"+x.clip+"s snippet"+(x.win?", +"+x.pts:"")+"</span><span"+(miss&&!x.win?" class='miss'":"")+">"+(miss?"missed "+miss+"\u00d7 all-time":"never missed")+"</span></div></div>";
  }).join("");
  openModal($("failModal"));
  if(location.protocol!=="file:") makeShortLink();
}

