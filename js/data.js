// ---- stats ----
var STATS={};
try{ STATS=JSON.parse(localStorage.getItem("drop_stats")||"{}")||{}; }catch(e){ STATS={}; }
function saveStats(){ try{ localStorage.setItem("drop_stats", JSON.stringify(STATS)); }catch(e){} }
var RECENT=[]; try{ RECENT=JSON.parse(localStorage.getItem("drop_recent")||"[]")||[]; }catch(e){ RECENT=[]; }
function logRecent(track,correct){ RECENT.unshift({id:track.id,t:track.title,a:track.artist,cr:track.credit,art:track.art,vu:track.viewUrl||"",w:correct?1:0,at:Date.now()}); RECENT=RECENT.slice(0,40);
  try{ localStorage.setItem("drop_recent", JSON.stringify(RECENT)); }catch(e){} }
// stats only count finished games: guesses wait in PENDING until the run ends (wrong guess or every song done),
// and are thrown away if you leave or restart mid-run
var PENDING=[];
function bump(track,correct){ PENDING.push([track,correct]); }
function commitRun(){
  PENDING.forEach(function(p){ saveGuess(p[0],p[1]); }); PENDING=[];
  var dk=curDiff(); if(score>(BEST[dk]||0)){ BEST[dk]=score; saveBest(); }
}
function saveGuess(track,correct){ logRecent(track,correct); var e=STATS[track.id]; if(!e){ e=STATS[track.id]={c:0,s:0}; } e.t=track.title; e.a=track.artist; e.cr=track.credit; e.al=track.album; e.art=track.art; if(track.viewUrl) e.vu=track.viewUrl; e.at=Date.now(); e.s=(e.s||0)+1; if(correct) e.c=(e.c||0)+1; saveStats(); }

// ================= NETWORK =================
var DIAG=[], RAW=0;
function withTimeout(p,ms){ return new Promise(function(res,rej){ var t=setTimeout(function(){ rej("timeout"); },ms);
  p.then(function(v){ clearTimeout(t); res(v); }, function(e){ clearTimeout(t); rej(e); }); }); }
function okData(d){ return !!(d && d.results && d.results.length!=null); }
var NET={ok:0, fail:0, limited:0, last:"", mode:"untested", cache:""};
var CORS=null;
function viaJsonp(url){
  return new Promise(function(res,rej){
    var cb="cb_"+Math.random().toString(36).slice(2), el=document.createElement("script"), t;
    function clean(){ clearTimeout(t); try{ delete window[cb]; }catch(e){ window[cb]=undefined; } el.remove(); }
    window[cb]=function(d){ clean(); okData(d)?res(d):rej("bad"); };
    el.onerror=function(){ clean(); rej("ratelimit"); };
    t=setTimeout(function(){ clean(); rej("timeout"); }, 12000);
    el.src=url+(url.indexOf("?")>=0?"&":"?")+"callback="+cb;
    document.body.appendChild(el);
  });
}
function transport(url){
  if(CORS===false) return viaJsonp(url);
  return withTimeout(fetch(url),12000).then(function(r){
    if(r.status===403||r.status===429) throw "ratelimit";
    if(!r.ok) throw "HTTP "+r.status;
    CORS=true; NET.mode="fetch"; return r.json();
  }, function(e){
    if(e==="timeout") throw e;
    return viaJsonp(url).then(function(d){ CORS=false; NET.mode="jsonp"; return d; });
  });
}
var AQ=[], AS={tokens:10, last:Date.now(), pausedUntil:0, running:0, blocks:0}, pumpT=null;
try{ var pz=JSON.parse(localStorage.getItem("drop_pause")||"null"); if(pz&&pz.u>Date.now()){ AS.pausedUntil=pz.u; AS.blocks=pz.b||0; AS.tokens=0; } }catch(e){}
function savePause(){ try{ localStorage.setItem("drop_pause", JSON.stringify({u:AS.pausedUntil,b:AS.blocks})); }catch(e){} }
function getJSON(url){ return new Promise(function(res,rej){ AQ.push({url:url,res:res,rej:rej,tries:0}); pump(); }); }
function pump(){
  clearTimeout(pumpT);
  var now=Date.now();
  if(now<AS.pausedUntil){ pumpT=setTimeout(pump, AS.pausedUntil-now+50); return; }
  AS.tokens=Math.min(10, AS.tokens+(now-AS.last)/3200); AS.last=now;
  while(AQ.length && AS.tokens>=1 && AS.running<3){ AS.tokens-=1; runJob(AQ.shift()); }
  if(AQ.length) pumpT=setTimeout(pump, AS.running>=3 ? 250 : Math.max(250,(1-AS.tokens)*3200));
}
function runJob(job){
  AS.running++;
  transport(job.url).then(function(d){
    AS.running--; if(!okData(d)){ return fail("bad data"); } NET.ok++; if(AS.blocks){ AS.blocks=0; savePause(); } job.res(d); pump();
  }, function(e){ AS.running--; fail(e); });
  function fail(e){
    job.tries++;
    if(e==="ratelimit"){ NET.limited++; NET.last="rate limited @ "+new Date().toLocaleTimeString();
      AS.blocks++; AS.pausedUntil=Math.max(AS.pausedUntil, Date.now()+Math.min(300000, 60000*Math.pow(2,AS.blocks-1))); AS.tokens=0; savePause();
      if(job.tries<=6){ AQ.unshift(job); } else { NET.fail++; job.rej(e); } }
    else { NET.last=String(e)+" @ "+new Date().toLocaleTimeString();
      if(job.tries<=2){ AQ.push(job); } else { NET.fail++; job.rej(e); } }
    pump();
  }
}
function applePausedFor(){ return Math.max(0, Math.ceil((AS.pausedUntil-Date.now())/1000)); }
var JUNK_TAG=/[\(\[\-\u2013\u2014].*\b(instrumentals?|inst\.?|dj mix|mixed|continuous mix|sped[ -]?up|slowed|reverb|nightcore|a ?cappella|acapella|karaoke|8d)\b/i;
var JUNK_ALBUM=/\b(dj mix|mixed by|continuous mix|instrumentals?|karaoke|sped[ -]?up|slowed)\b/i;
var ALT_TAG=/[\(\[\-\u2013\u2014].*\b(remix|version|live|remaster(ed)?|edit|vip|flip|demo)\b/i;
function isJunk(t){ return JUNK_TAG.test(t.trackName||"") || /^instrumental$/i.test(t.trackName||"") || JUNK_ALBUM.test(t.collectionName||""); }
var ARTIST_IDS={"Jace!":{id:1696363433,name:"Jace"}, "iayze":{id:1490328498,name:"iayze"},
  "kuru":{id:1548508786,name:"kuru"}, "Molly Santana":{id:1589625158,name:"Molly Santana"},
  "Summrs":{id:1317482045,name:"SUMMRS"},
  "Che":{id:1586243773,name:"Che"},
  "Lil Tony":{id:1540769205,name:"Lil Tony Official"},
  "YT":{id:1555092926,name:"YT"},
  "glo":{id:1788814664,name:"glo"},
  "tdf":{id:1503455317,name:"tdf"},
  "Lil Uzi Vert":{id:940710524,name:"Lil Uzi Vert"},
  "Nine Vicious":{id:1772456174,name:"Nine Vicious"},
  "pz'":{id:1816179885,name:"pz"},
  "feng":{id:1761933449,name:"feng"},
  "lelo":{id:1443736146,name:"lelo"},
  "Protect":{id:1784582565,name:"Protect"},
  "Hardrock":{id:1662005932,name:"Hardrock"},
  "swapa":{id:1728099130,name:"swapa"},
  "Kankan":{id:1621798887,name:"Kankan"},
  "Cochise":{id:1464498584,name:"Cochise"},
  "Lucki":{id:589757880,name:"LUCKI"},
  "Chief Keef":{id:516663045,name:"Chief Keef"},
  "Autumn!":{id:1451232200,name:"Autumn!"},
  "diamond*":{id:1705334117,name:"diamond"},
  "maxon":{id:1741486554,name:"maxon"},
  "jaydes":{id:1555857227,name:"jaydes"},
  "tana":{id:1477540355,name:"tana"},
  "tezzus":{id:1378027228,name:"tezzus"},
  "Lucy Bedroque":{id:1734729660,name:"Lucy Bedroque"},
  "Playboi Carti":{id:982372505,name:"Playboi Carti"},
  "Ken Carson":{id:1434801023,name:"Ken Carson"},
  "Destroy Lonely":{id:1344665482,name:"Destroy Lonely"},
  "Yeat":{id:1318094493,name:"Yeat"},
  "SoFaygo":{id:1456793166,name:"SoFaygo"},
  "Homixide Gang":{id:1565025798,name:"Homixide Gang"},
  "Rich Amiri":{id:1488752057,name:"Rich Amiri"},
  "BKTHERULA":{id:1493904309,name:"BKTHERULA"},
  "OsamaSon":{id:1580316111,name:"OsamaSon"},
  "Nettspend":{id:1662047435,name:"Nettspend"},
  "xaviersobased":{id:1540848340,name:"xaviersobased"},
  "Glokk40Spaz":{id:1545746156,name:"Glokk40Spaz"},
  "LAZER DIM 700":{id:1608411300,name:"LAZER DIM 700"},
  "prettifun":{id:1755650335,name:"prettifun"},
  "ksuuvi":{id:1609244736,name:"ksuuvi"},
  "1oneam":{id:1486228075,name:"1oneam"},
  "fakemink":{id:1744500063,name:"fakemink"},
  "skaiwater":{id:1434993301,name:"skaiwater"},
  "EsDeeKid":{id:1754179834,name:"EsDeeKid"},
  "2hollis":{id:1535847112,name:"2hollis"},
  "Edward Skeletrix":{id:1692437544,name:"Edward Skeletrix"},
  "Dom Corleo":{id:1535428533,name:"Dom Corleo"},
  "BabyChiefDoit":{id:1696609280,name:"BabyChiefDoit"},
  "Duwap Kaine":{id:1123823894,name:"Duwap Kaine"},
  "rexv2":{id:1651088429,name:"rexv2"},
  "boolymon":{id:1850497846,name:"boolymon"},
  "ohsxnta":{id:1695158893,name:"ohsxnta"},
  "pradabagshawty":{id:1561846053,name:"pradabagshawty"},
  "devstacks":{id:1748465937,name:"devstacks"},
  "2slimey":{id:1577410850,name:"2slimey"},
  "1300saint":{id:1582662959,name:"1300saint"},
  "1900rugrat":{id:1589691131,name:"1900rugrat"},
  "wifiskeleton":{id:1691664456,name:"wifiskeleton"}};
var ID_KEY="drop_ids_v2", IDS={};
try{ IDS=JSON.parse(localStorage.getItem(ID_KEY)||"{}")||{}; }catch(e){ IDS={}; }
function saveIds(){ try{ localStorage.setItem(ID_KEY, JSON.stringify(IDS)); }catch(e){} }
var LB={pending:[], t:null};
function lookupBatched(id){ return new Promise(function(res,rej){ LB.pending.push({id:id,res:res,rej:rej}); if(LB.pending.length>=6) flushLB(); else if(!LB.t) LB.t=setTimeout(flushLB,80); }); }
function flushLB(){
  clearTimeout(LB.t); LB.t=null;
  while(LB.pending.length){
    (function(batch){
      getJSON("https://itunes.apple.com/lookup?id="+batch.map(function(b){return b.id;}).join(",")+"&entity=song&limit=200").then(function(d){
        var by={}; d.results.forEach(function(t){ if(t.wrapperType==="track") (by[t.artistId]=by[t.artistId]||[]).push(t); });
        batch.forEach(function(b){ b.res(by[b.id]||[]); });
      }, function(e){ batch.forEach(function(b){ b.rej(e); }); });
    })(LB.pending.splice(0,6));
  }
}
function lookupSingle(id){
  return getJSON("https://itunes.apple.com/lookup?id="+id+"&entity=song&limit=200").then(function(d){
    return d.results.filter(function(t){ return t.wrapperType==="track"; });
  });
}
function searchSongs(term){
  var q=(ARTIST_IDS[term]&&ARTIST_IDS[term].name)||term;
  return getJSON("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&attribute=artistTerm&limit=200").then(function(d){
    var res=d.results, nt=norm(q), cnt={}, best=null;
    res.forEach(function(t){ if(norm(leadArtist(t.artistName||""))===nt) cnt[t.artistId]=(cnt[t.artistId]||0)+1; });
    for(var k in cnt){ if(best===null||cnt[k]>cnt[best]) best=k; }
    if(best!==null && !ARTIST_IDS[term]){ IDS[term]=+best; saveIds(); }
    return best!==null ? res.filter(function(t){ return String(t.artistId)===String(best); })
                       : res.filter(function(t){ return artistMatch(t.artistName||"",q); });
  });
}
function songsFor(term){
  var fixed=ARTIST_IDS[term], id=(fixed&&fixed.id)||IDS[term];
  if(!id) return searchSongs(term);
  return lookupBatched(id).then(function(list){
    if(list.length>=15) return list;
    return lookupSingle(id).then(function(l2){
      if(l2.length>=NEED || fixed) return l2.length>=list.length?l2:list;
      delete IDS[term]; saveIds(); return searchSongs(term);
    });
  });
}
function encodeTracks(tracks){ return tracks.map(function(t){ return [t.id,t.title,t.sub,t.credit===t.sub?0:t.credit,String(t.date||"").slice(0,10),t.preview,t.art,t.album,(typeof t.albumId==="number"?t.albumId:0)]; }); }
function decodeTracks(a, rows){
  var tracks=rows.map(function(r){ var sub=r[2], alb=r[8];
    return {id:r[0],title:noFeat(r[1]),artist:a,sub:sub,credit:r[3]||sub,date:r[4]||"",year:parseInt(String(r[4]||"").slice(0,4),10)||0,
      preview:r[5],art:r[6],album:r[7]||"Singles",albumId:alb||("s"+sub),viewUrl:alb?("https://music.apple.com/us/album/"+alb+"?i="+r[0]):""}; });
  var subs={}; tracks.forEach(function(t){ (subs[t.sub]=subs[t.sub]||[]).push(t); });
  for(var k in subs){ var m=subs[k]; m.forEach(function(t,ix){ t.rank=ix; t.pop=m.length>1?ix/(m.length-1):0; }); }
  return tracks;
}
var byArtist={};
function boot(){
  setFavicon("#8c5cff"); renderSwatches(); renderToggles(); renderCB(); renderFontSel(); applyFont();
  $("metaCount").textContent=ARTISTS.length+" artists";
  $("fontSel").onchange=function(){ prefs.font=this.value; savePrefs(); applyFont(); };
  $("sizeSel").onchange=function(){ prefs.fsize=this.value; savePrefs(); applyFont(); };
  ladderSelect($("fontSel")); ladderSelect($("sizeSel")); applyPrefs(); applyTheme(prefs.theme); setVolume(prefs.volume);
  audio.crossOrigin="anonymous";
  audio.addEventListener("playing", onPlaying);
  audio.addEventListener("error", onAudioError);
  audio.addEventListener("pause",function(){ $("stage").classList.remove("spinning"); });
  audio.addEventListener("ended",function(){ $("stage").classList.remove("spinning"); });
  initViz(); initTicks();
  window.addEventListener("resize", function(){ if(vctx) resizeViz(); });
  renderArtistList(); renderDiff(); renderModBtn();
  var dbs=document.querySelectorAll("#diffRow .seg");
  for(var di=0;di<dbs.length;di++){ (function(b){ b.onclick=function(){ if(b.classList.contains("blocked")) return; prefs.diff=b.getAttribute("data-d"); savePrefs(); renderDiff(); }; })(dbs[di]); }

  BGV.resume();
  showShared();
}
// ================= ON-DEMAND LOADING =================
var EMB=null; try{ var ce=document.getElementById("catalog-data"); EMB=JSON.parse((ce&&ce.textContent)||"null"); }catch(e){}
function termsOf(a){ var t=QMAP[a]||[a]; return typeof t==="string"?[t]:t; }
function buildArtist(a, terms, lists){
  var seen={}, tracks=[];
  lists.forEach(function(list,li){
    list=list||[]; RAW+=list.length;
    list=list.filter(function(t){ return !isJunk(t); });
    list=list.map(function(t,ix){ return {t:t,ix:ix,alt:ALT_TAG.test(t.trackName||"")?1:0}; })
             .sort(function(x,y){ return x.alt-y.alt || x.ix-y.ix; }).map(function(o){ return o.t; });
    var keys={}, n=0, sub=terms[li];
    for(var i=0;i<list.length && n<PER_ARTIST;i++){
      var t=list[i];
      if(t.wrapperType!=="track" || (t.kind && t.kind!=="song")) continue;
      if(!t.previewUrl||!t.artworkUrl100) continue;
      if(t.trackExplicitness==="cleaned") continue;
      if(seen[t.trackId]) continue;
      var k=norm(baseTitle(t.trackName)); if(keys[k]) continue;
      seen[t.trackId]=1; keys[k]=1; n++;
      tracks.push({id:t.trackId,title:noFeat(t.trackName),artist:a,sub:sub,credit:(t.artistName||sub),date:t.releaseDate||"",
        year:parseInt(String(t.releaseDate||"").slice(0,4),10)||0,
        preview:t.previewUrl,art:t.artworkUrl100.replace("100x100","400x400"),
        viewUrl:t.trackViewUrl||"",
        album:t.collectionName||"Singles",albumId:t.collectionId||("s"+sub)});
    }
    var mine=tracks.filter(function(x){return x.sub===sub;});
    mine.forEach(function(x,ix){ x.rank=ix; x.pop = mine.length>1 ? ix/(mine.length-1) : 0; });
  });
  return tracks;
}
var AKEY="drop_art_v8:", ATTL=3*24*3600*1000, UNAVAIL={}, LOADING={};
try{ if(!localStorage.getItem("drop_fix_nett")){ localStorage.removeItem(AKEY+"Nettspend"); localStorage.setItem("drop_fix_nett","1"); } }catch(e){}      // drop songs cached under his old, wrong Apple ID
function cacheGet(a){ try{ var c=JSON.parse(localStorage.getItem(AKEY+a)||"null"); if(c&&c.t&&c.r&&Date.now()-c.t<ATTL) return decodeTracks(a,c.r); }catch(e){} return null; }
function cachePut(a,tr){ try{ localStorage.setItem(AKEY+a, JSON.stringify({t:Date.now(),r:encodeTracks(tr)})); }catch(e){} }
function hasArtist(a){ return !!(byArtist[a]&&byArtist[a].tracks.length>=NEED); }
function isUnavail(a){ return UNAVAIL[a] && Date.now()-UNAVAIL[a]<120000; }
function ensureArtist(a){
  if(hasArtist(a)) return Promise.resolve(true);
  if(isUnavail(a)) return Promise.resolve(false);
  if(LOADING[a]) return LOADING[a];
  var rows=EMB&&EMB.artists&&EMB.artists[a];
  if(rows&&rows.length){ byArtist[a]={name:a,tracks:decodeTracks(a,rows)}; return Promise.resolve(hasArtist(a)); }
  var c=cacheGet(a); if(c&&c.length>=NEED){ byArtist[a]={name:a,tracks:c}; return Promise.resolve(true); }
  var terms=termsOf(a);
  LOADING[a]=Promise.all(terms.map(function(t){ return songsFor(t).catch(function(){ return null; }); })).then(function(lists){
    delete LOADING[a];
    var tr=buildArtist(a,terms,lists);
    if(tr.length<NEED){ UNAVAIL[a]=Date.now(); DIAG.push(a+" \u2192 failed"); return false; }
    byArtist[a]={name:a,tracks:tr}; cachePut(a,tr); return true;
  });
  return LOADING[a];
}
// mastery (5+ guesses on an artist): 50%+ right = bronze, 65%+ silver, 75%+ gold, 90%+ diamond
function mastery(){
  var acc={}, out={};
  for(var id in STATS){ var e=STATS[id]; if(!e||!e.s||!e.a) continue; var o=acc[e.a]=acc[e.a]||{c:0,s:0}; o.c+=(e.c||0); o.s+=e.s; }
  for(var a in acc){ var r=acc[a].c/acc[a].s; if(acc[a].s>=5) out[a] = r>=0.9 ? "diamond" : r>=0.75 ? "gold" : r>=0.65 ? "silver" : r>=0.5 ? "bronze" : ""; if(!out[a]) delete out[a]; }
  return out;
}
var LU_RANK=[      // Kworb total Spotify streams, biggest first; everyone else is shuffled in after
  "Lil Uzi Vert","Playboi Carti","Yeat","Chief Keef","Ken Carson","Lucki","Destroy Lonely","EsDeeKid","Cochise","Rich Amiri","wifiskeleton","fakemink","OsamaSon","SoFaygo","Autumn!","2hollis","jaydes","Summrs","BabyChiefDoit","Nettspend","Che","tana","Glokk40Spaz","Kankan","BKTHERULA","Nine Vicious","Lil Tony","Jace! / iayze","Homixide Gang","lelo","xaviersobased","1900rugrat","feng","Molly Santana","LAZER DIM 700","skaiwater","Dom Corleo","Duwap Kaine","YT","Protect","swapa","Hardrock"];
// diamond names shed a slow sparkle every so often (only while visible; skipped with reduced motion)
(function(){ if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  setInterval(function(){ if(document.hidden || document.body.classList.contains("playing")) return;
    var ds=document.querySelectorAll(".lu.diamond"); if(!ds.length) return;
    for(var k=0;k<Math.min(3,ds.length);k++){ var el=ds[Math.random()*ds.length|0], r=el.getBoundingClientRect();
      if(!r.width || r.bottom<0 || r.top>innerHeight || Math.random()<0.35) continue;
      var sp=document.createElement("i"); sp.className="dspark";
      sp.style.setProperty("--x",(Math.random()*92)+"%"); sp.style.setProperty("--y",(10+Math.random()*60)+"%");
      sp.style.setProperty("--dx",((Math.random()-.5)*16).toFixed(1)+"px"); sp.style.setProperty("--sz",(4+Math.random()*5).toFixed(1)+"px");
      sp.style.setProperty("--d",(1.8+Math.random()*1.4).toFixed(2)+"s");
      el.appendChild(sp); setTimeout(function(n){ return function(){ n.remove(); }; }(sp), 3400); } }, 420);
})();
var LU_REST=ARTISTS.filter(function(a){ return LU_RANK.indexOf(a)===-1; }).sort(function(){ return Math.random()-0.5; });      // shuffled once per visit
function renderArtistList(){            // festival-flyer lineup: biggest artists on top, shrinking tier by tier
  var tiers=mastery();
  function btn(a,cls){ if(tiers[a]) cls+=" "+tiers[a]; return "<button class='lu "+cls+"' data-a='"+escapeHtml(a)+"'>"+escapeHtml(a)+"</button>"; }
  var order=LU_RANK.filter(function(a){ return ARTISTS.indexOf(a)!==-1; }).concat(LU_REST);
  var sep="<span class='lsep' aria-hidden='true'>\u00b7</span>";
  function row(list,cls){ return "<div class='lurow "+cls+"'>"+list.map(function(a,i){ return "<span class='luw'>"+btn(a,cls)+(i<list.length-1?sep:"")+"</span>"; }).join(" ")+"</div>"; }
  var h="<span class='lhead'>Featured artists</span>"+row(order.slice(0,1),"hl hl1")+row(order.slice(1,3),"hl")+row(order.slice(3,5),"hl hl2")+
    "<div class='ludiv'></div>"+row(order.slice(5,11),"t1")+row(order.slice(11,23),"t2")+"<div class='ludiv'></div>"+row(order.slice(23),"t3");
  $("artistList").innerHTML=h;
  var cnt={diamond:0,gold:0,silver:0,bronze:0}; ARTISTS.forEach(function(a){ if(tiers[a]) cnt[tiers[a]]++; });
  var got=cnt.diamond+cnt.gold+cnt.silver+cnt.bronze;
  $("poolInfo").innerHTML = "Tap a name to play only that artist" + (got ? "<div class='tally'>"+
    [["diamond","\uD83D\uDC8E"],["gold","\uD83E\uDD47"],["silver","\uD83E\uDD48"],["bronze","\uD83E\uDD49"]].map(function(t){ return "<span>"+t[1]+" "+cnt[t[0]]+"</span>"; }).join("")+
    "<span class='tall'>"+cnt.diamond+"/"+ARTISTS.length+" diamond</span></div>" : "");
  var cs=$("artistList").querySelectorAll(".lu");
  for(var i=0;i<cs.length;i++){ (function(c){ c.onclick=function(e){ e.stopPropagation(); [].forEach.call(document.querySelectorAll(".lu.picked"),function(x){ x.classList.remove("picked"); }); c.classList.add("picked"); openModes(c.getAttribute("data-a")); }; })(cs[i]); }
}
(function(){                              // lineup: eased wheel scrolling at ~35% speed
  var el=$("artistList"), target=null, raf=0;
  el.addEventListener("wheel",function(e){
    if(e.ctrlKey) return;
    var dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1), max=el.scrollHeight-el.clientHeight;
    if(max<=0) return;
    if(target==null) target=el.scrollTop;
    var next=Math.max(0,Math.min(max,target+dy*0.35));
    if(next===target && (target===0||target===max)) return;   // at the end: let the page scroll
    e.preventDefault(); target=next;
    if(!raf) raf=requestAnimationFrame(step);
  },{passive:false});
  function step(){ var d=target-el.scrollTop; if(Math.abs(d)<0.5){ el.scrollTop=target; target=null; raf=0; return; } el.scrollTop+=(d>0?1:-1)*Math.max(1,Math.abs(d)*0.14); raf=requestAnimationFrame(step); }
})();
var audio=$("audio"), stopT=null, rafId=null, fadeI=null;
var lowpass=null;
// muffle the song (low-pass) while the fail screen is up, open it back up after
function muffle(on){ if(!AC||!lowpass) return; var t=AC.currentTime; try{ lowpass.frequency.cancelScheduledValues(t); lowpass.frequency.setValueAtTime(lowpass.frequency.value,t);
  lowpass.frequency.exponentialRampToValueAtTime(on?650:20000, t+(on?0.6:0.35)); }catch(e){} }
// fade the preview out over its last ~1.5s instead of cutting off
(function(){ var a=$("audio"), fi=null;
  a.addEventListener("timeupdate",function(){ var d=a.duration; if(!d||!isFinite(d)||fi||a.paused) return;
    if(d-a.currentTime<1.6){ var v0=a.volume; fi=setInterval(function(){ var r=Math.max(0,(a.duration-a.currentTime)/1.6); a.volume=Math.max(0,Math.min(v0,v0*r)); if(r<=0||a.paused){ clearInterval(fi); } },40); } });
  a.addEventListener("loadstart",function(){ if(fi){ clearInterval(fi); fi=null; } });
  a.addEventListener("seeking",function(){ if(fi && a.duration-a.currentTime>1.6){ clearInterval(fi); fi=null; a.volume=prefs.volume; } });
})();
var AC=null, analyser=null, srcNode=null, freqData=null, graphReady=false, corsFail=false;
function buildGraph(){
  try{
    var Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx) return;
    AC=new Ctx();
    srcNode=AC.createMediaElementSource(audio);
    analyser=AC.createAnalyser();
    analyser.fftSize=128; analyser.smoothingTimeConstant=0.82;
    lowpass=AC.createBiquadFilter(); lowpass.type="lowpass"; lowpass.frequency.value=20000; lowpass.Q.value=0.7;
    srcNode.connect(lowpass); lowpass.connect(analyser); analyser.connect(AC.destination);
    freqData=new Uint8Array(analyser.frequencyBinCount);
    graphReady=true; try{AC.resume();}catch(e){}
  }catch(e){ graphReady=false; }
}
function onPlaying(){
  if(!graphReady && !corsFail && audio.crossOrigin){ buildGraph(); }
  if(AC){ try{AC.resume();}catch(e){} }
  if(R && !R.over) $("stage").classList.add("spinning");
}
function onAudioError(){
  if(!graphReady && !corsFail){
    corsFail=true;
    try{ audio.removeAttribute("crossorigin"); audio.crossOrigin=null; }catch(e){}
    var s = (R && R.answer) ? R.answer.preview : audio.src;
    if(s){ audio.src=s; audio.load(); try{ var p=audio.play(); if(p&&p.catch) p.catch(function(){}); }catch(e){} }
  }
}

// phones / low-power devices: lighter effects (no live blurs, slower idle loops)
var LOWFX=matchMedia("(pointer:coarse), (max-width:700px)").matches || (navigator.hardwareConcurrency||8)<=4;
if(LOWFX) document.documentElement.classList.add("lowfx");
var viz=$("viz"), vctx=null, VBARS=56, vsmooth=[], vphase=0, vizW=0, vizH=0;
function initViz(){
  vctx=viz.getContext("2d");
  for(var i=0;i<VBARS;i++) vsmooth[i]=0;
  resizeViz();
  requestAnimationFrame(vizTick);
}
function resizeViz(){
  if(!vctx) return;
  var dpr=window.devicePixelRatio||1;
  vizW=viz.clientWidth||1; vizH=viz.clientHeight||1;
  viz.width=vizW*dpr; viz.height=vizH*dpr; vctx.setTransform(dpr,0,0,dpr,0,0);
}
function vizTick(){
  requestAnimationFrame(vizTick);
  if(R||fading) drawBar();
  if(!vctx) return;
  if(viz.clientWidth && viz.clientWidth!==vizW) resizeViz();
  var w=vizW, h=vizH; if(w<2){ return; }
  vctx.clearRect(0,0,w,h);
  var playing = !audio.paused && !audio.ended && audio.currentTime>0;
  var targets=new Array(VBARS), i;
  if(playing && graphReady && analyser){
    analyser.getByteFrequencyData(freqData);
    var use=Math.floor(freqData.length*0.72);
    for(i=0;i<VBARS;i++){ var idx=Math.floor(i/VBARS*use); targets[i]=freqData[idx]/255; }
  } else if(playing){
    vphase+=0.045;
    for(i=0;i<VBARS;i++){
      var t=vphase + i*0.33;
      var v=(Math.sin(t)*0.5+0.5)*0.6 + (Math.sin(t*0.7+1.3)*0.5+0.5)*0.4;
      targets[i]=v*(0.45+0.55*(0.5+0.5*Math.sin(t*2.3+i)));
    }
  } else {
    for(i=0;i<VBARS;i++) targets[i]=0;
  }
  var gap=2, bw=(w-(VBARS-1)*gap)/VBARS;
  for(i=0;i<VBARS;i++){
    var arch=0.55+0.45*Math.sin(Math.PI*i/(VBARS-1));
    var tv=targets[i]*arch;
    vsmooth[i]+=(tv - vsmooth[i])*0.28;
    var bh=Math.max(2, vsmooth[i]*h*0.95);
    var x=i*(bw+gap), y=h-bh;
    vctx.globalAlpha=0.32 + Math.min(0.55, vsmooth[i]*0.6);
    vctx.fillStyle=VIZ_ACCENT;
    vctx.fillRect(x, y, Math.max(1,bw), bh);
  }
  vctx.globalAlpha=1;
}
function initTicks(){
  var bar=document.querySelector(".bar"), bp=$("barPlay"); if(!bar||!bp) return;
  for(var i=0;i<STAGES.length-1;i++){
    var d=document.createElement("div"); d.className="tick"; bar.insertBefore(d, bp); TICKS.push(d);
  }
}
var barCt=0, barT=0;
function drawBar(){
  viewSpan += (targetSpan-viewSpan)*0.12;
  var up=Math.min(100, availSec/viewSpan*100);
  $("barAvail").style.background="linear-gradient(90deg, var(--accent) 0%, var(--accent) "+up.toFixed(2)+"%, color-mix(in srgb, var(--accent) 16%, transparent) "+up.toFixed(2)+"%, color-mix(in srgb, var(--accent) 3%, transparent) 100%)";
  for(var i=0;i<TICKS.length;i++){ var pct=STAGES[i]/viewSpan*100; TICKS[i].style.left="calc("+pct.toFixed(2)+"% - 1px)"; TICKS[i].style.opacity=pct>99?0:1; }
  // audio.currentTime only ticks every ~250ms in some browsers, so extrapolate between updates for a smooth bar
  var now=performance.now(), raw=audio.currentTime||0;
  if(raw!==barCt){ barCt=raw; barT=now; }
  var est=barCt+(audio.paused?0:Math.min(0.3,(now-barT)/1000));
  var ct = (R && !fading) ? Math.max(0,est-(R.over?0:(R.offset||0))) : 0;
  $("barPlay").style.width=Math.min(100, ct/viewSpan*100)+"%";
  $("barPlay").classList.toggle("live", !audio.paused && ct>0);
}

