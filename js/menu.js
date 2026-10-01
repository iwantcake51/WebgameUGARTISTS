// ---- history ----
var catFilter="__all";
function histEntries(){
  var out=[];
  for(var id in STATS){ var e=STATS[id]; if(!e||!e.s) continue;
    var t=e.t, a=e.a;
    if(!t){ for(var k in byArtist){ var f=byArtist[k].tracks.filter(function(x){ return String(x.id)===String(id); })[0]; if(f){ t=f.title; a=f.artist; e.cr=f.credit; e.al=f.album; break; } } }
    if(!t) continue;
    out.push({id:id,t:noFeat(t),a:a||"?",cr:e.cr||a,al:e.al||"",art:e.art||"",vu:e.vu||"",c:e.c||0,s:e.s||0,at:e.at||0}); }
  return out;
}
var catOpen={};
function agoTxt(ms){ var d=(Date.now()-ms)/1000; return d<60?"now":d<3600?Math.floor(d/60)+"m":d<86400?Math.floor(d/3600)+"h":Math.floor(d/86400)+"d"; }
function openCatalog(){
  var all=histEntries(), q=($("catSearch").value||"").trim().toLowerCase(), E=escapeHtml;
  var tot=all.length, right=0, miss=0; all.forEach(function(x){ right+=x.c; miss+=x.s-x.c; });
  var artists=[]; all.forEach(function(x){ if(artists.indexOf(x.a)===-1) artists.push(x.a); });
  artists.sort(function(x,y){ return ARTISTS.indexOf(x)-ARTISTS.indexOf(y); });
  if(catFilter!=="__all" && artists.indexOf(catFilter)===-1) catFilter="__all";
  var keepLeft=$("catFilterRow").scrollLeft;
  var chips="<button class='cchip"+(catFilter==="__all"?" on":"")+"' data-f='__all'>All</button>";
  artists.forEach(function(a){ chips+="<button class='cchip"+(catFilter===a?" on":"")+"' data-f='"+E(a)+"'>"+E(a)+"</button>"; });
  $("catFilterRow").innerHTML=chips; $("catFilterRow").scrollLeft=keepLeft;
  var cr=$("catFilterRow").querySelectorAll(".cchip");
  for(var i=0;i<cr.length;i++){ (function(b){ b.onclick=function(){ catFilter=b.getAttribute("data-f"); openCatalog(); }; })(cr[i]); }
  var list=all.filter(function(x){ return (catFilter==="__all"||x.a===catFilter) &&
    (!q || (x.t+" "+x.cr+" "+x.a+" "+x.al).toLowerCase().indexOf(q)!==-1); });
  var body="";
  if(!tot) body="<div class='roundwait'>Nothing yet — songs you hear while playing show up here.</div>";
  else if(!q && catFilter==="__all"){
    var acc=right+miss?Math.round(right/(right+miss)*100):0;
    body+="<div class='catstats'>"+[[tot,"songs found"],[right,"got right"],[miss,"missed"],[acc+"%","accuracy"]].map(function(c){ return "<div><b>"+c[0]+"</b><span>"+c[1]+"</span></div>"; }).join("")+"</div>";
    if(RECENT.length){
      body+="<div class='sslabel'>Recent</div><div class='recent'>"+RECENT.slice(0,40).map(function(r){
        var href=r.vu||("https://music.apple.com/search?term="+encodeURIComponent(leadArtist(r.cr||r.a||"")+" "+baseTitle(r.t||"")));
        return "<div class='rcard"+(r.w?" got":" lost")+"'><button class='rimg' data-a='"+E(r.a||"")+"' data-id='"+E(String(r.id))+"' title='Show in history'>"+(r.art?"<img src='"+E(r.art)+"' alt='' loading='lazy'>":"")+"<span class='rbadge'>"+(r.w?"✓":"✗")+"</span></button>"+
          "<button class='rt' data-a='"+E(r.a||"")+"' data-id='"+E(String(r.id))+"' title='Show in history'>"+E(noFeat(r.t||""))+"</button><button class='ra' data-a='"+E(r.a||"")+"' title='Go to artist'>"+E(r.cr||r.a)+" · "+agoTxt(r.at)+"</button></div>"; }).join("")+"</div>";
    }
    body+="<div class='sslabel'>By artist</div>";
  }
  var forceOpen = !!q || catFilter!=="__all";
  (catFilter==="__all"?artists:[catFilter]).forEach(function(a){
    var rows=list.filter(function(x){ return x.a===a; }); if(!rows.length) return;
    rows.sort(function(x,y){ return (y.s-y.c)-(x.s-x.c) || y.at-x.at; });
    var c=0,sn=0; rows.forEach(function(x){ c+=x.c; sn+=x.s; });
    var open=forceOpen||catOpen[a], pct=Math.round(c/sn*100);
    body+="<div class='catsec"+(open?" open":"")+"' data-a='"+E(a)+"'><button class='cathdr' data-a='"+E(a)+"'><span class='cname'>"+E(a)+"</span><span class='cprog'>"+rows.length+" · "+pct+"%</span><span class='chev'>▾</span></button>";
    body+="<div class='catbarwrap'><div class='catbar' style='width:"+pct+"%'></div></div>";
    if(open){ body+="<div class='catsongs'>";
      rows.forEach(function(x){ var m=x.s-x.c;
        var href=x.vu||("https://music.apple.com/search?term="+encodeURIComponent(leadArtist(x.cr||x.a||"")+" "+baseTitle(x.t||"")));
        body+="<a class='catrow"+(x.c>0?" got":"")+"' data-id='"+E(String(x.id))+"' href='"+E(href)+"' target='_blank' rel='noopener' title='Open on Apple Music'>"+(x.art?"<img src='"+E(x.art)+"' alt='' loading='lazy'>":"<span class='noart'></span>")+"<span class='ct'>"+E(x.t)+"</span><span class='cc'>"+(x.c?"✓"+x.c:"")+(m?" <span class='miss'>✗"+m+"</span>":"")+"</span></a>"; });
      body+="</div>"; }
    body+="</div>";
  });
  if(tot && !list.length) body+="<div class='roundwait'>No matches.</div>";
  $("catalogHead").innerHTML="Your history";
  var st=$("catalogBody").scrollTop; $("catalogBody").innerHTML=body; $("catalogBody").scrollTop=st;
  var hs=$("catalogBody").querySelectorAll(".cathdr");
  for(var j=0;j<hs.length;j++){ (function(h){ h.onclick=function(){ var a=h.getAttribute("data-a"); catOpen[a]=!catOpen[a]; CLICK.toggle(catOpen[a]); openCatalog(); }; })(hs[j]); }
  var rc=$("catalogBody").querySelectorAll(".rimg,.rt,.ra");
  for(var k=0;k<rc.length;k++){ (function(b){ b.onclick=function(){ catJump(b.getAttribute("data-a"), b.getAttribute("data-id")); }; })(rc[k]); }
  openModal($("catalog"));
  syncCatSlider();
}
// jump from a Recent card to that artist (name) or the song itself (cover), scrolling smoothly
function catJump(a,id){
  if(!a) return;
  catOpen[a]=true; if(catFilter!=="__all"){ catFilter="__all"; } $("catSearch").value="";
  openCatalog();
  var box=$("catalogBody"), sel=id ? ".catrow[data-id='"+String(id).replace(/[^\w-]/g,"")+"']" : null, el=null;
  if(sel) el=box.querySelector(sel);
  if(!el){ var ss=box.querySelectorAll(".catsec"); for(var i=0;i<ss.length;i++) if(ss[i].getAttribute("data-a")===a){ el=ss[i]; break; } }
  if(!el) return;
  var top=el.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop-(id?box.clientHeight/2-20:12);
  box.scrollTo({top:Math.max(0,top), behavior:"smooth"});
  el.classList.remove("hit"); void el.offsetWidth; el.classList.add("hit");
}
function syncCatSlider(){ var row=$("catFilterRow"), max=row.scrollWidth-row.clientWidth; $("catSlider").style.visibility=max>2?"visible":"hidden"; $("catSlider").value = max>0 ? Math.round(row.scrollLeft/max*1000) : 0; }
function openCatalogFresh(){ if(typeof histTab==="function") histTab("songs"); $("catFilterRow").scrollLeft=0; catFilter="__all"; if($("catSearch")) $("catSearch").value=""; openCatalog(); }
function closeCatalog(){ closeModal($("catalog")); }

// ---- filter ----
var filState={}, filInit=false;
function openFilter(){
  if(!filInit){ ARTISTS.forEach(function(a){ filState[a]=true; }); filInit=true; }
  var h=""; ARTISTS.forEach(function(a){ h+="<button class='filchip"+(filState[a]?" on":"")+"' data-a='"+escapeHtml(a)+"'>"+escapeHtml(a)+"</button>"; });
  $("filChips").innerHTML=h; $("filNote").textContent=""; renderGroups();
  var chips=$("filChips").querySelectorAll(".filchip");
  for(var i=0;i<chips.length;i++){ (function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"); filState[a]=!filState[a]; b.classList.toggle("on",filState[a]); applyFilter(); }; })(chips[i]); }
  openModal($("filter"));
}
// closing Choose artists (X, outside, Esc or the button) keeps whatever is picked
function applyFilter(){ if(!filInit) return; var sel={}, cnt=0; ARTISTS.forEach(function(a){ if(filState[a]){ sel[a]=true; cnt++; } });
  modeSet = cnt===ARTISTS.length ? null : sel; if(typeof renderModes==="function" && $("modeList")) renderModes(); }
// preset crews: tap one to play just that group
var GROUPS=[
  {n:"Opium", a:["Playboi Carti","Ken Carson","Destroy Lonely","Homixide Gang"]},
  {n:"Slayworld", a:["Summrs","Autumn!","Kankan","Jace! / Iayze","Yeat"]},
  {n:"1C34", a:["Xaviersobased","Ksuuvi","Nettspend","OsamaSon"]},
  {n:"NXO", a:["OsamaSon","Nettspend"]},
  {n:"2016LYFE", a:["OsamaSon","1oneam","Ohsxnta","Boolymon","TDF"]}
];
function groupArtists(g){ return g.a.map(function(x){ var k=x.toLowerCase(); return ARTISTS.filter(function(a){ return a.toLowerCase()===k; })[0]; }).filter(Boolean); }
function renderGroups(){
  $("filGroups").innerHTML="<span class='fglab'>Groups</span>"+GROUPS.map(function(g,i){ return "<button class='fgroup' data-i='"+i+"' title='"+escapeHtml(groupArtists(g).join(", "))+"'>"+escapeHtml(g.n)+"</button>"; }).join("");
  [].forEach.call($("filGroups").querySelectorAll(".fgroup"),function(b){ b.onclick=function(){ var g=groupArtists(GROUPS[+b.getAttribute("data-i")]);
    ARTISTS.forEach(function(a){ filState[a]=g.indexOf(a)!==-1; }); filBuilt=true;
    [].forEach.call($("filChips").querySelectorAll(".filchip"),function(c){ c.classList.toggle("on",!!filState[c.getAttribute("data-a")]); }); applyFilter(); }; });
}
function closeFilter(){ applyFilter(); closeModal($("filter")); }
var filBuilt=false;        // true once you start from "none" and add artists yourself
function filterSetAll(v){ filBuilt=!v; ARTISTS.forEach(function(a){ filState[a]=v; }); openFilter(); applyFilter(); }
function filStart(){ closeFilter(); }
function openPicker(){
  var html="<button class='pickrow' data-a='__all'>All artists <span>mix of everyone</span></button>";
  ARTISTS.forEach(function(a){ html+="<button class='pickrow' data-a='"+escapeHtml(a)+"'>"+escapeHtml(a)+"</button>"; });
  $("pickerBody").innerHTML=html;
  var rows=$("pickerBody").querySelectorAll(".pickrow");
  for(var i=0;i<rows.length;i++){ (function(b){ b.onclick=function(){ var a=b.getAttribute("data-a"); closePicker(); startGame(a==="__all"?null:a); }; })(rows[i]); }
  openModal($("picker"));
}
function closePicker(){ closeModal($("picker")); }
// ---- dev stats (Settings > Advanced): fps, bandwidth, memory, media, storage ----
var DEV=(function(){
  var t0=performance.now(), frames=0, fps=0, worst=0, last=performance.now(), bytes=0, reqs=0, hist=[], longT=0, longMs=0;
  (function tick(now){ frames++; var d=now-last; last=now; if(d>worst) worst=d; requestAnimationFrame(tick); })(performance.now());
  setInterval(function(){ fps=frames; frames=0; hist.push({t:performance.now(),b:bytes}); if(hist.length>11) hist.shift(); },1000);
  function add(es){ es.forEach(function(e){ reqs++; bytes+=e.transferSize||e.encodedBodySize||0; }); }
  try{ add(performance.getEntriesByType("resource")); new PerformanceObserver(function(l){ add(l.getEntries()); }).observe({type:"resource",buffered:false}); }catch(e){}
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ longT++; longMs+=e.duration; }); }).observe({type:"longtask"}); }catch(e){}
  function kb(n){ return n>1048576 ? (n/1048576).toFixed(2)+" MB" : (n/1024).toFixed(1)+" KB"; }
  function text(){
    var h=hist.length>1?hist:null, bw=h?(h[h.length-1].b-h[0].b)/((h[h.length-1].t-h[0].t)/1000):0;
    var m=performance.memory, c=navigator.connection||{}, ls=0; try{ for(var k in localStorage) if(localStorage.hasOwnProperty(k)) ls+=(k.length+localStorage.getItem(k).length)*2; }catch(e){}
    var vids=[].filter.call(document.querySelectorAll("video"),function(v){ return !v.paused; }).length;
    var nav=performance.getEntriesByType("navigation")[0];
    var out=["fps: "+fps+"   worst frame: "+worst.toFixed(1)+" ms", "long tasks: "+longT+" ("+Math.round(longMs)+" ms total)",
      "bandwidth: "+kb(bw)+"/s (10s avg)", "downloaded: "+kb(bytes)+" over "+reqs+" requests",
      m?"js heap: "+kb(m.usedJSHeapSize)+" / "+kb(m.jsHeapSizeLimit):"js heap: n/a (Chrome only)",
      "dom nodes: "+document.getElementsByTagName("*").length, "videos playing: "+vids+"   game audio: "+(audio.paused?"paused":"playing"),
      "audio ctx: "+(AC?AC.state+" @ "+AC.sampleRate+" Hz":"none")+(corsFail?" (cors fallback)":""),
      "artists loaded: "+Object.keys(byArtist).length+" / "+ARTISTS.length+"   loading: "+Object.keys(LOADING).length,
      "localStorage: "+kb(ls), "network: "+(c.effectiveType||"?")+(c.downlink?", "+c.downlink+" Mbps":"")+(c.rtt!=null?", rtt "+c.rtt+" ms":"")+(c.saveData?", save-data":""),
      "device: "+(navigator.hardwareConcurrency||"?")+" cores, "+(navigator.deviceMemory?navigator.deviceMemory+" GB":"? GB")+" ram",
      "viewport: "+innerWidth+"x"+innerHeight+" @"+devicePixelRatio+"x", "page load: "+(nav?Math.round(nav.loadEventEnd||nav.duration)+" ms":"?")+"   uptime: "+Math.round((performance.now()-t0)/1000)+" s",
      "ua: "+navigator.userAgent];
    worst=0; return out.join("\n"); }
  setInterval(function(){ var el=$("devlog"); if(el && $("settings").classList.contains("open")) el.textContent=text(); },1000);
  return {text:text};
})();
function renderNet(){
  var L=["Apple: "+NET.ok+" ok, "+NET.limited+" rate-limited, "+NET.fail+" gave up",
         "mode: "+NET.mode+(NET.cache?"\ncache: "+NET.cache:"")+(NET.last?"\nlast issue: "+NET.last:""),
         "queue: "+AQ.length+" waiting, "+AS.running+" running"+(applePausedFor()?", paused "+applePausedFor()+"s (rate limit)":"")];
  var fails=DIAG.filter(function(x){ return /failed/.test(x); }); if(fails.length) L.push("\nFailed artists:\n  "+fails.slice(-15).join("\n  "));
  $("netlog").textContent=L.join("\n"); try{ $("devlog").textContent=DEV.text(); }catch(e){}
}
function showUid(){ var u=null; try{ u=localStorage.getItem("drop_uid"); }catch(e){}
  function set(t){ $("uidVal").textContent=t; placeUid(); }
  if(u){ set("@"+u); return; }
  set("@\u2026");
  fetch("/api/uid",{method:"POST"}).then(function(r){ return r.ok?r.json():null; }).then(function(j){
    if(j&&j.id){ try{ localStorage.setItem("drop_uid",String(j.id)); }catch(e){} set("@"+j.id); } else set("@?");
  }).catch(function(){ set("@?"); }); }
// the @id sits right after the typed name (names can repeat, ids can't)
function placeUid(){ var inp=$("nameInput"), tag=$("uidVal"); if(!inp||!tag) return;
  var cs=getComputedStyle(inp), c=placeUid.c||(placeUid.c=document.createElement("canvas").getContext("2d")); c.font=cs.fontSize+" "+cs.fontFamily;
  var pl=parseFloat(cs.paddingLeft)||0, w=inp.value?c.measureText(inp.value).width:0, max=inp.clientWidth-tag.offsetWidth-pl;
  tag.style.left=(inp.value ? inp.offsetLeft+pl+Math.min(w,Math.max(0,max))+1 : inp.offsetLeft+inp.clientWidth-tag.offsetWidth-12)+"px"; tag.classList.toggle("empty",!inp.value); }
function openSettings(){ showUid(); renderNet(); openModal($("settings")); requestAnimationFrame(placeUid); }
function closeSettings(){ closeModal($("settings")); }

// ---- wiring ----
// ---- game modes: Play swipes the menu away (greys it out on desktop) and shows the modes, Play there starts ----
var GMODES=[
  {k:"classic", name:"Classic", desc:"The vanilla, intended experience. Singles, albums, EPs."},
  {k:"albums", name:"Big Releases only", desc:"I never really cared for singles, just the albums and EPs"},
  {k:"singles", name:"Single Mingle", desc:"Only singles, because that\u2019s how we roll."},
  {k:"endless", name:"Endless", desc:"Test yourself and see how far you can get. No win condition."}
];
var modeArtist=null, modeSet=null;     // modeSet: artists picked in Choose artists (null = everyone)          // set when the panel was opened from an artist in the lineup
function isEndless(){ return gmode()==="endless" && includedArtists().length>=5; }
function setNames(){ return modeSet ? ARTISTS.filter(function(a){ return modeSet[a]; }) : null; }
// the songs a run can ask: one artist + Single Mingle = all their singles (difficulty doesn't apply)
function soloSingles(){ return gmode()==="singles"; }
function poolFor(a,solo){ var all=byArtist[a].tracks; if(solo && soloSingles()) return all.filter(isSingle);
  var p=windowed(all); return gmode()==="singles" ? p.filter(isSingle) : gmode()==="albums" ? p.filter(function(t){ return !isSingle(t); }) : p; }
function goalOf(){ if(isEndless()) return 0; var g=DIFFS[curDiff()].goal||0;
  if(mode==="artist" && pickArtist && byArtist[pickArtist]) g=Math.min(g, poolFor(pickArtist,true).length);      // fewer songs than the goal: the goal shrinks to fit
  return g; }
function gmode(){ return GMODES.some(function(m){ return m.k===prefs.gmode; }) ? prefs.gmode : "classic"; }
function isSingle(t){ return /\s-\ssingle$/i.test(t.album||""); }       // Apple names single releases "Title - Single"
// Hard / Extreme need the picked artists to have at least 75% of that difficulty's song goal in their catalog
function panelNames(){ return modeArtist ? [modeArtist] : setNames(); }
function diffSongs(names,dk){ var n=0, done=true;
  names.forEach(function(a){ if(byArtist[a]){ var p=windowed(byArtist[a].tracks,dk); if(gmode()==="singles") p=p.filter(isSingle); else if(gmode()==="albums") p=p.filter(function(t){ return !isSingle(t); }); n+=p.length; } else if(!isUnavail(a)) done=false; });
  return {n:n, done:done}; }
function lockDiffs(){ var names=panelNames(), bad=false;
  ["hard","extreme"].forEach(function(dk){ var b=document.querySelector("#diffRow .seg[data-d='"+dk+"']"); if(!b) return;
    var c=names ? diffSongs(names,dk) : {n:1e9,done:true}, off=c.done && c.n < DIFFS[dk].goal*0.75;
    b.classList.toggle("blocked",off); b.disabled=off; b.title=off?"Not enough songs for "+DIFFS[dk].label+" ("+c.n+" of "+Math.ceil(DIFFS[dk].goal*0.75)+" needed)":"";
    if(off && curDiff()===dk) bad=true; });
  if(bad){ prefs.diff="normal"; savePrefs(); renderDiff(); } }
// singles count colour: 20 green -> 50 orange -> 75 red -> 90 extreme purple, blended in between
function countColor(n){ var S=[[20,[57,224,139]],[50,[255,154,60]],[75,[255,70,107]],[90,[197,99,243]]];
  if(n<=S[0][0]) return "rgb("+S[0][1]+")"; if(n>=S[3][0]) return "rgb("+S[3][1]+")";
  for(var i=0;i<3;i++) if(n<=S[i+1][0]){ var k=(n-S[i][0])/(S[i+1][0]-S[i][0]), a=S[i][1], b=S[i+1][1];
    return "rgb("+a.map(function(x,j){ return Math.round(x+(b[j]-x)*k); }).join(",")+")"; } }
function goalNote(){ var el=$("diffGoal"); if(!el) return; lockDiffs();
  var lock=!!modeArtist && soloSingles(); $("diffRow").classList.toggle("locked",lock); $("diffNote").style.visibility=lock?"hidden":"";
  if(gmode()==="endless" && !modeArtist){ el.innerHTML="<b>\u221E</b> Endless \u2014 no song limit"+bonusLine(); return; }
  if(modeArtist){               // one artist: the round is capped by how many songs they actually have
    var a=modeArtist;
    if(!byArtist[a]){ el.innerHTML="counting songs\u2026"; ensureArtist(a).then(function(ok){ if(modeArtist!==a) return; if(ok && byArtist[a]) goalNote(); else el.innerHTML="couldn\u2019t count songs right now"; }); return; }
    var n=poolFor(a,true).length, g=lock?n:Math.min(DIFFS[curDiff()].goal,n);
    $("modeGo").disabled=!g; $("modeGo").classList.toggle("dead",!g);
    el.innerHTML="<b"+(lock?" style='background:none;-webkit-text-fill-color:"+countColor(g)+";color:"+countColor(g)+"'":"")+">"+g+"</b> "+(soloSingles()?(g===1?"single":"singles"):(g===1?"song":"songs"))+" this round"; return; }
  el.innerHTML="<b>"+DIFFS[curDiff()].goal+"</b> songs this round"+bonusLine(); }
function bonusLine(){ var n=(setNames()||ARTISTS).length, b=artistBonusFor(n);
  return b>1 ? "<span class='abonus'>"+n+" artists "+bonusTxt(b)+"</span>" : ""; }
var singlesAsked="";
function singlesCount(names){ var n=0, done=true;
  names.forEach(function(a){ if(byArtist[a]) n+=byArtist[a].tracks.filter(isSingle).length; else if(!isUnavail(a)) done=false; });
  return {n:n, done:done}; }
function renderModes(){ setTimeout(goalNote,0); renderStartBtn();
  var names=modeArtist ? [modeArtist] : setNames(), canEndless=!names || names.length>=5, E=escapeHtml;
  // whole groups in the mix show as their group name ("1C34 + Summrs and 7 more")
  var items=names||[], grouped=false;
  if(names && !modeArtist){ var left=names.slice(), gs=[];
    GROUPS.slice().sort(function(x,y){ return groupArtists(y).length-groupArtists(x).length; }).forEach(function(g){ var m=groupArtists(g);
      if(m.length && m.every(function(a){ return left.indexOf(a)!==-1; })){ gs.push({g:g.n}); left=left.filter(function(a){ return m.indexOf(a)===-1; }); } });
    if(gs.length && names.length<=20){ grouped=true; items=gs.concat(left); } }
  var head = names && !names.length ? "No one?..." : modeArtist || (names && (filBuilt||grouped)) ? null : (names ? names.length+" artists" : "All Artists");
  if(!canEndless && gmode()==="endless"){ prefs.gmode="classic"; }
  // header: "A + B + C", or "A + B + C and 32 more"
  var tiers=mastery(); function nm(a){ return "<span class='lu mnm"+(tiers[a]?" "+tiers[a]:"")+"'>"+E(a)+"</span>"; }     // diamond / gold / ... effects like the lineup
  $("modeArtist").innerHTML = "<em>Featuring:</em>" + (head ? E(head) : items.slice(0,3).map(function(x){ return typeof x==="string" ? nm(x) : "<span class='mgrp'>"+E(x.g)+"</span>"; }).join("<i>+</i>") + (items.length>3 ? " <small>and "+(items.length-3)+" more</small>" : ""));
  var gd=-(performance.now()%5000)+"ms", gs=$("modeArtist").querySelectorAll(".mgrp"); for(var gi=0;gi<gs.length;gi++) gs[gi].style.animationDelay=gd;      // re-renders keep the glare in phase
  $("modeArtist").style.display="";
  $("filterBtn").style.display=modeArtist?"none":"";
  var none=!!(names && !names.length); $("modeGo").disabled=none; $("modeGo").classList.toggle("dead",none);
  $("filterBtn").lastChild.textContent = modeSet ? "Change artists" : "Choose artists";
  // Single Mingle needs 20+ singles across the picked artists (everyone easily clears that)
  var sc=names ? singlesCount(names) : {n:99,done:true}, canSingles = sc.n>=8 || !sc.done;
  var key=names?names.join("|"):""; if(names && !sc.done && sc.n<8 && singlesAsked!==key){ singlesAsked=key;
    Promise.all(names.map(function(a){ return ensureArtist(a).catch(function(){}); })).then(function(){ if($("modePanel").getAttribute("aria-hidden")==="false") renderModes(); }); }
  if(!canSingles && gmode()==="singles") prefs.gmode="classic";
  $("modeList").innerHTML=GMODES.map(function(m,i){ var off=(m.k==="endless"&&!canEndless) || (m.k==="singles"&&!canSingles);
    return "<button class='modeopt"+(m.k===gmode()?" on":"")+(off?" off":"")+"' data-k='"+m.k+"' style='--i:"+i+"'"+(off?" disabled":"")+"><b>"+m.name+"</b><span>"+m.desc+"</span></button>"; }).join("");
  var bs=$("modeList").querySelectorAll(".modeopt");      // switch the highlight in place so it eases instead of re-rendering
  [].forEach.call(bs,function(b){ b.onclick=function(){ prefs.gmode=b.getAttribute("data-k"); savePrefs(); goalNote(); [].forEach.call(bs,function(x){ x.classList.toggle("on",x===b); }); }; });
}
// desktop: the panel lives on <body> so the menu's launch zoom can't drag it into the middle; phones keep it in the menu to slide with it
function placeModes(){ var pn=$("modePanel"), desk=matchMedia("(min-width:900px)").matches;
  if(desk && pn.parentNode!==document.body) document.body.appendChild(pn);
  else if(!desk && pn.parentNode!==$("startScreen")) $("startScreen").appendChild(pn); }
function openModes(a){ modeArtist=(typeof a==="string")?a:null; if(modeArtist) modeSet=null; placeModes(); renderModes(); void $("modePanel").offsetWidth; $("startScreen").classList.add("modes-open"); document.body.classList.add("modes-open"); $("modePanel").setAttribute("aria-hidden","false"); }
function closeModes(){ [].forEach.call(document.querySelectorAll(".lu.picked"),function(x){ x.classList.remove("picked"); x.classList.add("unpick"); setTimeout(function(){ x.classList.remove("unpick"); },380); }); $("startScreen").classList.remove("modes-open"); document.body.classList.remove("modes-open"); $("modePanel").setAttribute("aria-hidden","true"); }
// click anywhere outside the panel (the greyed menu, the background) to close it; clicks inside open menus don't count
document.addEventListener("click",function(e){ if(!document.body.classList.contains("modes-open") || document.body.classList.contains("playing")) return;
  // use the path from when the click happened: buttons that re-render themselves are detached by now and would look "outside"
  var path=e.composedPath?e.composedPath():[e.target], pn=$("modePanel");
  if(!document.contains(e.target) || path.some(function(n){ return n===pn || n.id==="startBtn" || (n.classList && n.classList.contains("modal")); })) return;
  closeModes(); });
$("startBtn").onclick=function(){ var b=this; b.classList.add("held"); setTimeout(function(){ b.classList.remove("held"); }, 900); openModes(); };
$("modeBack").onclick=closeModes;
$("startBtn").addEventListener("pointerleave",function(){ this.classList.remove("held"); this.blur(); });     // swipe back the moment you move off
$("modeGo").onclick=function(){ if(modeArtist) startGame(modeArtist); else if(modeSet) startMulti(modeSet); else startGame(null); setTimeout(closeModes, 760); };
document.addEventListener("keydown",function(e){ if(e.key==="Escape" && $("startScreen").classList.contains("modes-open") && !document.querySelector(".modal.open")) closeModes(); });
$("modBtn").onclick=function(){ renderMods(); openModal($("mods")); };
$("modsClose").onclick=function(){ closeModal($("mods")); };
$("mods").onclick=function(e){ if(e.target===$("mods")) closeModal($("mods")); };
$("filterBtn").onclick=openFilter;
$("filterClose").onclick=closeFilter; $("filter").onclick=function(e){ if(e.target===$("filter")) closeFilter(); };
$("filAll").onclick=function(){ filterSetAll(true); };
$("filNone").onclick=function(){ filterSetAll(false); };

$("playBtn").onclick=play;
document.addEventListener("keydown",function(e){
  if(!R || !$("gameScreen").classList.contains("active") || /INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||"") || document.querySelector(".modal.open")) return;
  var k=e.key.toLowerCase(), i="1234".indexOf(k); if(i<0) i="abcd".indexOf(k);
  if(i>=0 && k.length===1){ var bs=$("opts").querySelectorAll(".opt"); if(bs[i] && !bs[i].disabled){ bs[i].click(); e.preventDefault(); } }
  else if(k===" " && !R.over){ play(); e.preventDefault(); }
});
$("moreBtn").onclick=hearMore; $("skipBtn").onclick=skipSong;
$("nextBtn").onclick=function(){ if(wonAll) showWin(); else if(R&&R.over&&R.picked!==R.answer.id) showFail(); else nextSong(); };
$("failRetry").onclick=function(){ closeModal($("failModal")); if(lastStart) lastStart(); };
$("failMenu").onclick=function(){ closeModal($("failModal")); goHomeFade(); };
