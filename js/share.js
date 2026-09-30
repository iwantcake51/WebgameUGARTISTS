// ---- share: the whole run is packed into the link (?r=...), no server needed ----
function b64u(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function unb64u(str){ str=str.replace(/-/g,"+").replace(/_/g,"/"); while(str.length%4) str+="="; return decodeURIComponent(escape(atob(str))); }
// cover art in share links: "<n><path>" for Apple thumbs (any size/format, rebuilt at 400x400), "@<url>" for other Apple image URLs
var ART_RE=/^https:\/\/is(\d)-ssl\.mzstatic\.com\/image\/thumb\/([^?#"'<>\s]+)\/\d+x\d+\w*\.(?:jpg|jpeg|png|webp)$/i;
function packArt(u){ u=String(u||""); var m=ART_RE.exec(u); if(m) return m[1]+m[2]; return /^https:\/\/[\w.-]+\.mzstatic\.com\/[^"'<>\s]+$/.test(u) ? "@"+u : ""; }
function unpackArt(a){ a=String(a||"");
  if(/^@https:\/\/[\w.-]+\.mzstatic\.com\/[^"'<>\s]+$/.test(a)) return a.slice(1);
  return /^\d[^"'<>\s]+$/.test(a) ? "https://is"+a[0]+"-ssl.mzstatic.com/image/thumb/"+a.slice(1)+"/400x400bb.jpg" : ""; }
function shareLink(){
  var m = mode==="artist" ? pickArtist : mode==="multi" ? $("modeLabel").textContent : "All artists";
  var tt = runTotal(), gm=gmode(), ab=artistBonus();
  var d={v:1, s:score, tt:tt||undefined, gm:gm!=="classic"?gm:undefined, lk:diffLocked()?1:undefined, ab:ab>1?+ab.toFixed(2):undefined, na:includedArtists().length, d:curDiff(), m:m, w:wonAll?1:0, at:Date.now(), tz:new Date().getTimezoneOffset(), mo:activeMods().map(function(m){return m.k;}), n:(prefs.name||"").trim(), sk:modActive("skip")?(skipUsed||0):undefined,
    r:runLog.map(function(x,i){ return [x.t.id, x.t.title, x.t.credit||x.t.artist, x.win?1:0, Math.round(x.secs*100), x.clip, x.pts, packArt(x.t.art)]; })};
  return location.origin+location.pathname+"?r="+b64u(JSON.stringify(d));
}
var shortLink=null;
function makeShortLink(){
  var long=shareLink(), r=long.split("?r=")[1]; shortLink={long:long, url:null};
  var mine=shortLink;
  fetch("/api/share",{method:"POST", body:r}).then(function(res){ return res.ok?res.json():null; })
    .then(function(j){ if(j&&j.id) mine.url=location.origin+"/s/"+j.id; }).catch(function(){});
}
$("failShare").onclick=function(){
  var b=this, url=(shortLink&&shortLink.url)||shareLink(), txt="I scored "+score+" on "+DIFFS[curDiff()].label+", can you beat it?";
  function done(){ b.textContent="Link copied"; setTimeout(function(){ b.textContent="Share"; },1600); }
  if(navigator.share && matchMedia("(pointer:coarse)").matches){ navigator.share({title:document.title, text:txt, url:url}).catch(function(){}); return; }
  if(navigator.clipboard) navigator.clipboard.writeText(url).then(done,function(){ prompt("Copy this link:",url); });
  else prompt("Copy this link:",url);
};
function trackArt(id){ for(var k in byArtist){ var tr=byArtist[k]&&byArtist[k].tracks; if(!tr) continue; for(var i=0;i<tr.length;i++) if(String(tr[i].id)===String(id)) return tr[i].art; } return ""; }
function showShared(){
  var sm=document.querySelector('meta[name="ugnp-share"]'), q=new URLSearchParams(location.search).get("r")||(sm&&sm.content); if(!q) return;
  var d; try{ d=JSON.parse(unb64u(q)); }catch(e){ return; }
  if(!d || !Array.isArray(d.r)) return;
  var dk=DIFFS[d.d]?d.d:"normal", E=escapeHtml;
  var runs=d.r.map(function(x){ return {id:x[0], t:noFeat(String(x[1]||"?")), a:String(x[2]||""), win:!!x[3], secs:(+x[4]||0)/100, clip:+x[5]||0, pts:+x[6]||0, art:unpackArt(x[7])||trackArt(x[0])}; });
  var wins=runs.filter(function(x){return x.win;}), n=runs.length, miss=runs.filter(function(x){return !x.win;}).pop();
  var times=wins.map(function(x){return x.secs;}), avg=times.length?times.reduce(function(a,b){return a+b;},0)/times.length:0;
  var clipAvg=wins.length?wins.reduce(function(a,x){return a+x.clip;},0)/wins.length:0;
  var st=0, best=0; runs.forEach(function(x){ st=x.win?st+1:0; if(st>best) best=st; });
  var instant=wins.filter(function(x){return x.clip<=1;}).length;
  var arts={}; runs.forEach(function(x){ var a=x.a||"?"; arts[a]=arts[a]||[0,0]; arts[a][1]++; if(x.win) arts[a][0]++; });
  $("shareView").classList.toggle("won",!!d.w);
  var GM={albums:"Big Releases only", singles:"Single Mingle", endless:"Endless"}, gmn=GM[d.gm]||"", unit=runUnit(d.gm,2);
  $("svTitle").textContent = d.w ? "Perfect run" : "Can you beat this?";
  $("svSub").innerHTML = "<b>"+E(String(d.m||"All artists"))+"</b> on "+(d.lk ? "<b>"+E(gmn)+"</b>" : "<b>"+DIFFS[dk].label+"</b>"+(gmn?" \u00b7 <b>"+E(gmn)+"</b>":""))+
    (+d.ab>1?"<div class='modtags'><span class='modtag'>\uD83D\uDC65 "+(+d.na||"")+" artists \u00d7"+(+d.ab)+"</span></div>":"")+(d.at?"<br>shared "+E(whenTxt(+d.at)):"")+
    (miss?"<br>went out on <b>"+E(miss.t)+"</b>":"")+(Array.isArray(d.mo)?modTags(d.mo.map(String)):"")+(d.sk?skipTxt(d.sk):d.sk===0?"<div class='skipnote'>\u23ED\uFE0F skip not used</div>":"");
  $("svKick").textContent = d.n ? String(d.n).slice(0,20)+" sent you a score" : "a friend sent you a score";
  $("svScore").innerHTML=(+d.s||0)+"<small>points</small>";
  $("svSolved").textContent = d.gm==="endless" ? String(wins.length) : wins.length+"/"+(+d.tt>0?+d.tt:n); $("svStreak").textContent=best; $("svAvg").textContent=times.length?avg.toFixed(1)+"s":"-";
  $("svAccBar").style.width=(n?wins.length/n*100:0)+"%";
  function row(x,i){ return "<div class='sres"+(x.win?"":" lost")+"'><span class='snum'>"+(i+1)+"</span>"+(x.art?"<img src='"+E(x.art)+"' alt=''>":"")+
      "<div class='st'><div class='stt'>"+(x.win?"✓ ":"✗ ")+E(x.t)+"</div><div class='sta'>"+E(x.a)+"</div></div>"+
      "<div class='fstat'><b>"+x.secs.toFixed(2)+"s</b><span>"+x.clip+"s snippet</span>"+(x.win?"<span>+"+x.pts+"</span>":"")+"</div></div>"; }
  var h="<div class='sslabel'>"+unit.charAt(0).toUpperCase()+unit.slice(1)+": "+wins.length+" right"+(n-wins.length?", "+(n-wins.length)+" missed":"")+"</div>"+runs.map(row).join("");
  h+="<div class='sslabel'>Advanced</div><div class='svgrid'>"+
    [[times.length?Math.min.apply(null,times).toFixed(2)+"s":"-","fastest"],[times.length?Math.max.apply(null,times).toFixed(2)+"s":"-","slowest"],[n?Math.round(wins.length/n*100)+"%":"0%","accuracy"],
     [clipAvg.toFixed(1)+"s","avg snippet"],[instant,"got in ≤1s"],[wins.length?Math.round((+d.s||0)/wins.length):0,"pts / song"]]
     .map(function(c){ return "<div><b>"+E(String(c[0]))+"</b><span>"+c[1]+"</span></div>"; }).join("")+"</div>";
  h+="<div class='sslabel'>Snippet needed</div>"+STAGES.map(function(sg){ var c=wins.filter(function(x){return x.clip===sg;}).length;
    return "<div class='svbar'><em>"+sg+"s</em><i><u style='width:"+(wins.length?c/wins.length*100:0)+"%'></u></i><s>"+c+"</s></div>"; }).join("");
  var ak=Object.keys(arts); if(ak.length>1){ h+="<div class='sslabel'>By artist</div>"+ak.sort(function(x,y){ return arts[y][1]-arts[x][1]; }).map(function(a){
    return "<div class='svbar'><em style='width:auto;flex:0 0 38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>"+E(a)+"</em><i><u style='width:"+(arts[a][0]/arts[a][1]*100)+"%'></u></i><s style='width:36px'>"+arts[a][0]+"/"+arts[a][1]+"</s></div>"; }).join(""); }
  $("svBody").innerHTML=h;
  $("svPlay").onclick=function(){ closeShared(); prefs.diff=dk; savePrefs(); renderDiff(); if(ARTISTS.indexOf(d.m)!==-1) startGame(d.m); else if(d.m==="All artists") startGame(); };
  openModal($("shareView"));
}
function whenTxt(ms){
  var t=new Date(ms), ago=(Date.now()-ms)/1000, rel;
  if(ago<60) rel="just now"; else if(ago<3600) rel=Math.floor(ago/60)+"m ago"; else if(ago<86400) rel=Math.floor(ago/3600)+"h ago"; else rel=Math.floor(ago/86400)+"d ago";
  return t.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})+", "+t.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})+" ("+rel+")";
}
function closeShared(){ closeModal($("shareView")); try{ history.replaceState(null,"",/^\/s\//.test(location.pathname)?"/":location.pathname); }catch(e){} }
$("svClose").onclick=closeShared;
$("homeBtn").onclick=goHomeFade; $("logoBtn").onclick=goHomeFade;

// ---- "Song catalog": pick an artist, then search only their in-game songs ----
(function(){
  var cur=null, seq=0;
  function diffTags(tr){ var m={}; ["easy","normal","hard","extreme"].forEach(function(k){ windowed(tr,k).forEach(function(t){ (m[t.id]=m[t.id]||[]).push(DIFFS[k].label); }); }); return m; }
  function row(t,tags){ return "<div class='sres'><img src='"+escapeHtml(t.art||"")+"' alt=''><div class='st'><div class='stt'>"+escapeHtml(t.title)+"</div><div class='sta'>"+escapeHtml(t.credit||t.artist)+" \u00b7 <span class='why'>"+escapeHtml(t.album)+"</span></div></div><span class='badge in'>"+escapeHtml(tags.join(", "))+"</span></div>"; }
  function showArtists(){
    var q=norm($("ssInput").value);
    var list=ARTISTS.filter(function(a){ return !q || termsOf(a).concat([a]).some(function(n){ return norm(n).indexOf(q)!==-1; }); });
    $("ssBody").innerHTML="<div class='sslabel'>Pick an artist</div>"+(list.length ? list.map(function(a){ return "<button class='pickrow' data-a='"+escapeHtml(a)+"'>"+escapeHtml(a)+"<span>"+(hasArtist(a)?byArtist[a].tracks.length+" songs":"")+"</span></button>"; }).join("") : "<div class='roundwait'>That artist isn't in the game.</div>");
    var rs=$("ssBody").querySelectorAll(".pickrow");
    for(var i=0;i<rs.length;i++){ (function(b){ b.onclick=function(){ openArtist(b.getAttribute("data-a")); }; })(rs[i]); }
  }
  function openArtist(a){
    cur=a; var my=++seq;
    $("ssInput").value=""; $("ssInput").placeholder="Search "+a+"'s songs\u2026"; $("ssTitle").textContent=a; $("ssBack").style.display="";
    $("ssBody").innerHTML="<div class='roundwait'>loading "+escapeHtml(a)+"'s songs\u2026</div>";
    ensureArtist(a).then(function(ok){ if(my!==seq||cur!==a) return;
      if(!ok){ $("ssBody").innerHTML="<div class='roundwait'>Couldn't load "+escapeHtml(a)+". Try again in a minute.</div>"; return; }
      showSongs(); });
    setTimeout(function(){ $("ssInput").focus(); },30);
  }
  function showSongs(){
    if(!hasArtist(cur)) return;
    var pool=byArtist[cur].tracks, tags=diffTags(pool), words=$("ssInput").value.toLowerCase().split(/\s+/).filter(Boolean);
    var hits=pool.filter(function(t){ var h=(t.title+" "+t.album+" "+t.credit).toLowerCase(); return words.every(function(w){ return h.indexOf(w)!==-1; }); });
    $("ssBody").innerHTML="<div class='sslabel'>"+(words.length?hits.length+" of "+pool.length+" in-game songs":pool.length+" songs in the game, most popular first")+"</div>"+
      (hits.length ? hits.map(function(t){ return row(t,tags[t.id]||[]); }).join("") : "<div class='roundwait'>Not in the game. Only "+escapeHtml(cur)+"'s top songs on Apple are used.</div>");
  }
  function back(){ cur=null; seq++; $("ssInput").value=""; $("ssInput").placeholder="Search an artist\u2026"; $("ssTitle").textContent="Song catalog"; $("ssBack").style.display="none"; showArtists(); }
  $("ssBtn").onclick=function(){ back(); openModal($("songsearch")); setTimeout(function(){ $("ssInput").focus(); },60); };
  $("ssBack").onclick=back;
  $("ssInput").oninput=function(){ if(cur) showSongs(); else showArtists(); };
  $("ssClose").onclick=function(){ closeModal($("songsearch")); };
  $("songsearch").onclick=function(e){ if(e.target===$("songsearch")) closeModal($("songsearch")); };
})();
$("catBtn").onclick=openCatalogFresh; $("catBtn2").onclick=openCatalogFresh; $("catalogClose").onclick=closeCatalog;
$("catSearch").oninput=function(){ openCatalog(); };
$("catSlider").oninput=function(){ var row=$("catFilterRow"); row.scrollLeft=(row.scrollWidth-row.clientWidth)*this.value/1000; };
$("catFilterRow").addEventListener("scroll",function(){ var max=this.scrollWidth-this.clientWidth; $("catSlider").value = max>0 ? Math.round(this.scrollLeft/max*1000) : 0; });
$("catalog").onclick=function(e){ if(e.target===$("catalog")) closeCatalog(); };
$("pickerClose").onclick=closePicker; $("picker").onclick=function(e){ if(e.target===$("picker")) closePicker(); };
$("setBtn").onclick=openSettings; $("setBtn2").onclick=openSettings; $("settingsClose").onclick=closeSettings;
$("settings").onclick=function(e){ if(e.target===$("settings")) closeSettings(); };
$("vol").oninput=function(){ setVolume(parseFloat(this.value)); };
$("nameInput").value=prefs.name||"";
$("nameInput").oninput=function(){ prefs.name=this.value.replace(/\s+/g," ").slice(0,20); savePrefs(); greet(); };
// top-left greeting: first visit / back without a name / "Hello, NAME" in a random language
var GREETS=["Hello","Hola","Bonjour","Ciao","Hallo","Ol\u00e1","Hej","Konnichiwa","Annyeong","Ni hao","Namaste","Merhaba","Salut","Aloha","Privet","Jambo","Shalom","Marhaba","Sawubona","Kamusta"];
var firstVisit=false; try{ firstVisit=!localStorage.getItem("drop_seen"); localStorage.setItem("drop_seen","1"); }catch(e){}
var greetWord=GREETS[Math.random()*GREETS.length|0];
function greet(){ var n=(prefs.name||"").trim();
  $("greet").textContent = n ? greetWord+", "+n : firstVisit ? "Welcome, Enjoy your stay" : "Back so soon?"; }
greet();
$("vol2").oninput=function(){ setVolume(parseFloat(this.value)); };
["uivol","mmvol"].forEach(function(k){ var el=$(k); function show(){ $(k+"Pct").textContent=Math.round(prefs[k]*100)+"%"; el.style.setProperty("--v",prefs[k]*100+"%"); }
  el.value=prefs[k]; show(); el.oninput=function(){ prefs[k]=parseFloat(this.value); savePrefs(); show(); if(k==="mmvol") MM.setVol(); else CLICK.toggle(true); }; });

