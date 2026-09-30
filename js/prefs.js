// ---- prefs ----
var prefs={theme:"plum", volume:0.5, plx:true, uivol:1, mmvol:1, autoplay:false, endmusic:true, menumusic:true, chroma:true, holo:true, bw:false, anim:true, dim:true, confetti:true, clicks:true, mods:{}, name:"", cb:"off", bgvid:true, gamevid:false, vblur:"", bgArtist:"", gmode:"classic", tv:true, font:"flyer", fsize:"m", ring:true, diff:"normal"}, VIZ_ACCENT="#8c5cff";
try{ var pp=JSON.parse(localStorage.getItem("drop_prefs")||"{}"); if(pp&&typeof pp==="object"){ if(pp.theme)prefs.theme=pp.theme; if(typeof pp.diff==="string")prefs.diff=pp.diff; if(typeof pp.volume==="number")prefs.volume=pp.volume; ["uivol","mmvol"].forEach(function(k){ if(typeof pp[k]==="number") prefs[k]=pp[k]; }); if(pp.mods&&typeof pp.mods==="object") prefs.mods=pp.mods; if(typeof pp.name==="string") prefs.name=pp.name.slice(0,20); if(typeof pp.cb==="string") prefs.cb=pp.cb; if(typeof pp.font==="string") prefs.font=pp.font; if(typeof pp.bgArtist==="string") prefs.bgArtist=pp.bgArtist; if(typeof pp.gmode==="string") prefs.gmode=pp.gmode; if(typeof pp.vblur==="string") prefs.vblur=pp.vblur; if(typeof pp.fsize==="string") prefs.fsize=pp.fsize; ["autoplay","plx","endmusic","menumusic","gamevid","chroma","holo","bw","anim","dim","confetti","clicks","bgvid","tv","ring"].forEach(function(k){ if(typeof pp[k]==="boolean") prefs[k]=pp[k]; }); } }catch(e){}
function savePrefs(){ try{ localStorage.setItem("drop_prefs", JSON.stringify(prefs)); }catch(e){} }
function applyTheme(id){
  var th=null; for(var i=0;i<THEMES.length;i++){ if(THEMES[i].id===id){th=THEMES[i];break;} } if(!th) th=THEMES[0];
  for(var k in th.vars){ document.documentElement.style.setProperty(k, th.vars[k]); }
  VIZ_ACCENT = th.vars["--accent"] || VIZ_ACCENT;
  prefs.theme=th.id; savePrefs(); document.documentElement.setAttribute("data-th",th.id);
  var sw=document.querySelectorAll(".swatch"); for(var j=0;j<sw.length;j++){ sw[j].classList.toggle("sel", sw[j].getAttribute("data-t")===th.id); }
}
function renderSwatches(){
  var h=""; THEMES.forEach(function(t){
    var v=t.vars;          // one smooth sweep through the palette: background -> glow -> accent
    h+="<button class='swatch' data-t='"+t.id+"' style='background:linear-gradient(135deg,"+v["--bg"]+" 0%,"+v["--grad"]+" 45%,"+v["--accent"]+" 100%)'><span>"+t.name+"</span></button>";
  });
  $("swatches").innerHTML=h;
  var sw=$("swatches").querySelectorAll(".swatch");
  for(var i=0;i<sw.length;i++){ (function(b){ b.onclick=function(){ applyTheme(b.getAttribute("data-t")); }; })(sw[i]); }
}
function setVolume(v){ prefs.volume=v; savePrefs(); try{audio.volume=v;}catch(e){} $("vol").value=v; $("vol2").value=v; $("volPct").textContent=$("volPct2").textContent=Math.round(v*100)+"%"; $("vol").style.setProperty("--v",v*100+"%"); $("vol2").style.setProperty("--v",v*100+"%"); }
var TOGGLES=[
  {cat:"sound", k:"autoplay",  label:"Autoplay snippet",   desc:"Play the clip automatically each round"},
  {cat:"sound", k:"menumusic", label:"Music in menu",      desc:"Plays music while you hover over artists and while the game mode panel is open"},
  {cat:"sound", k:"endmusic",  label:"Music on round end", desc:"Play the song when you win or lose a round"},
  {cat:"fx", k:"chroma",    label:"Chromatic reveal",   desc:"RGB-split flourish on the cover"},
  {cat:"fx", k:"holo",      lag:"lo", tag:"Resource Intensive", label:"3D cover",           desc:"Makes the album cover 3D!!"},
  {cat:"fx", k:"bw",        label:"Black & white",      desc:"Removes all color, album covers included"},
  {cat:"fx", k:"confetti",  label:"Confetti",           desc:"Confetti falls when you get a song right"},
  {cat:"sound", k:"clicks",    label:"UI interaction sounds", desc:"Clicks, blips and whooshes when you press buttons, flip switches and open menus"},
  {cat:"ui", k:"ring",      label:"Click ripple",       desc:"The circle that expands where you tap or click"},
  {cat:"fx", k:"tv",        lag:"mid", tag:"Resource Intensive", label:"CRT effects",        desc:"Curved screen, film grain, scanlines and the odd signal glitch over everything"},
  {cat:"fx", k:"bgvid",     lag:"mid", tag:"Resource Intensive", label:"Menu video background", desc:"Blurred music video clips play behind the main menu (uses more data)"},
  {cat:"fx", k:"gamevid",   label:"Videos in round", lag:"hi", tag:"Resource Intensive", desc:"Keep the music video clips playing behind the game during rounds"},
  {cat:"ui", k:"plx",       label:"Parallax",           desc:"The menu and game shift slightly as you move the mouse"},
  {cat:"ui", k:"anim",      label:"Menu animations",    desc:"Menus slide up with a little bounce"},
  {cat:"fx", k:"dim",       lag:"mid", tag:"Resource Intensive", label:"Dim & blur behind menus", desc:"Darkens and blurs the page behind menus and the results screen"}
];
function renderToggles(){
  var tgs=document.querySelectorAll("#settings .tg"); for(var ti=0;ti<tgs.length;ti++) tgs[ti].innerHTML="";
  TOGGLES.forEach(function(t){
    var val = prefs[t.k], h="";
    h+="<div class='toggle'><div><div class='tlabel'>"+t.label+(t.tag?"<span class='ttag "+(t.lag||"")+"'>"+t.tag+"</span>":"")+"</div><div class='tdesc'>"+t.desc+"</div></div><button class='sw"+(val?" on":"")+"' data-k='"+t.k+"' role='switch' aria-checked='"+(prefs[t.k]?"true":"false")+"'></button></div>";
    document.querySelector("#settings .tg[data-cat='"+t.cat+"']").insertAdjacentHTML("beforeend",h);
  });
  var bt=$("settings").querySelector(".sw[data-k='bgvid']").parentNode, pk=document.createElement("div");
  pk.id="bgPick"; pk.className="bgpick"; pk.innerHTML="<div class='tlabel'>Background artist</div><div class='tdesc'>Only play this artist's music videos behind the menu</div>"+
    "<div class='bgpwrap'><input id='bgPickIn' class='dsel' placeholder='All artists' autocomplete='off' spellcheck='false'><button id='bgPickX' class='bgpx' aria-label='Clear'>\u2715</button><div id='bgPickList' class='bgplist'></div></div>";
  bt.parentNode.insertBefore(pk, bt.nextSibling); initBgPick();
  var vb=document.createElement("div"); vb.id="vbRow"; vb.className="bgpick";
  vb.innerHTML="<div class='tlabel'>Video blur<span class='ttag hi'>Resource Intensive</span></div><div class='tdesc'>Basic blurs the videos. Quality blurs them more smoothly.</div>"+
    "<select id='vbSel' class='dsel'><option value='off'>Off</option><option value='basic'>Basic</option><option value='quality'>Quality</option></select>";
  pk.parentNode.insertBefore(vb, pk.nextSibling); $("vbSel").value=vblur();
  $("vbSel").onchange=function(){ prefs.vblur=this.value; savePrefs(); applyPrefs(); };
  ladderSelect($("vbSel")); syncFrost();
  var sw=$("settings").querySelectorAll(".tg .sw");
  for(var i=0;i<sw.length;i++){ (function(b){ b.onclick=function(){ var k=b.getAttribute("data-k"); prefs[k]=!prefs[k]; b.classList.toggle("on",prefs[k]); b.setAttribute("aria-checked",prefs[k]?"true":"false"); savePrefs(); applyPrefs(); CLICK.toggle(prefs[k]); if(k==="bgvid"){ syncBgPick(); syncFrost(); } if(k==="gamevid") try{ document.dispatchEvent(new Event("visibilitychange")); }catch(e){} }; })(sw[i]); }
}
// background artist picker: type to filter, pick one (or "All artists"); greyed out while the video background is off
function syncFrost(){ var row=$("vbRow"); if(row) row.classList.toggle("off", !prefs.bgvid); }
function syncBgPick(){ var el=$("bgPick"); if(!el) return; var off=!prefs.bgvid; el.classList.toggle("off",off); $("bgPickIn").disabled=$("bgPickX").disabled=off;
  $("bgPickIn").value=prefs.bgArtist||""; $("bgPickX").style.visibility=prefs.bgArtist?"visible":"hidden"; if(off) $("bgPickList").classList.remove("open"); $("bgPickList").parentNode.classList.remove("open"); }
function setBgArtist(a){ prefs.bgArtist=a; savePrefs(); syncBgPick(); $("bgPickList").classList.remove("open"); $("bgPickList").parentNode.classList.remove("open"); if(window.BGV) BGV.setArtist(a); }
function initBgPick(){
  var inp=$("bgPickIn"), list=$("bgPickList"), wrap=inp.parentNode, hi=0, vis=[], picked=false;
  // artists Apple has confirmed have no music videos are left out
  function hasVids(a){ var c=window.BGV&&BGV.cache[a]; return !(c && c.list && !c.list.length); }
  function build(){        // all rungs rendered once per open; typing only shows/hides them (no rebuild, no flicker)
    var items=[""].concat(ARTISTS.filter(hasVids).sort(function(x,y){ return x.toLowerCase()<y.toLowerCase()?-1:1; }));
    list.innerHTML=items.map(function(a,i){ return "<button type='button' style='--i:"+i+"' class='bgpo"+(a===prefs.bgArtist?" sel":"")+"' data-a='"+escapeHtml(a)+"' data-n='"+norm(a)+"'>"+(a?escapeHtml(a):"All artists")+"</button>"; }).join("")+"<div class='bgpnone'>No artist found</div>";
    [].forEach.call(list.querySelectorAll(".bgpo"),function(o){ o.onpointerdown=function(e){ e.preventDefault(); picked=true; setBgArtist(o.getAttribute("data-a")); inp.blur(); }; });
  }
  function filter(){
    var q=norm(inp.value===(prefs.bgArtist||"")?"":inp.value); vis=[];
    [].forEach.call(list.querySelectorAll(".bgpo"),function(o){ var n=o.getAttribute("data-n"), ok=!q || (n && n.indexOf(q)!==-1); o.classList.toggle("gone",!ok); if(ok) vis.push(o); });
    list.classList.toggle("empty",!vis.length); hi=Math.min(hi,Math.max(0,vis.length-1)); mark();
  }
  function mark(){ vis.forEach(function(o,i){ o.classList.toggle("hi",i===hi); }); }
  function open(){ build(); hi=0; filter(); void list.offsetWidth; list.classList.add("open"); wrap.classList.add("open"); }
  function close(){ list.classList.remove("open"); wrap.classList.remove("open"); }
  inp.onfocus=function(){ picked=false; inp.select(); open(); };
  inp.oninput=function(){ hi=0; filter(); list.scrollTop=0; };
  // leaving the box with a typed name picks it: exact name match, else the highlighted / only match
  inp.onblur=function(){
    if(!picked && inp.value!==(prefs.bgArtist||"")){ var q=norm(inp.value);
      if(!q) setBgArtist("");
      else { var ex=vis.filter(function(o){ return o.getAttribute("data-n")===q; })[0] || (vis.length===1||vis[hi] ? vis[hi]||vis[0] : null); if(ex) setBgArtist(ex.getAttribute("data-a")); } }
    setTimeout(function(){ close(); inp.value=prefs.bgArtist||""; },120); };
  inp.onkeydown=function(e){
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){ e.preventDefault(); if(!vis.length) return; hi=(hi+(e.key==="ArrowDown"?1:-1)+vis.length)%vis.length; mark(); vis[hi].scrollIntoView({block:"nearest"}); }
    else if(e.key==="Enter"){ e.preventDefault(); if(vis[hi]){ picked=true; setBgArtist(vis[hi].getAttribute("data-a")); inp.blur(); } }
    else if(e.key==="Escape"){ picked=true; inp.blur(); } };
  $("bgPickX").onclick=function(){ setBgArtist(""); };
  syncBgPick();
}
// native <select> -> themed dropdown that drops open like a ladder (the select stays as the source of truth)
function ladderSelect(sel){
  var w=document.createElement("div"); w.className="ddwrap"; sel.parentNode.insertBefore(w,sel); w.appendChild(sel);
  var b=document.createElement("button"); b.type="button"; b.className="dsel ddbtn"; w.appendChild(b);
  var l=document.createElement("div"); l.className="bgplist"; w.appendChild(l);
  function label(){ var o=sel.options[sel.selectedIndex]; b.textContent=o?o.textContent:""; }
  function close(){ l.classList.remove("open"); w.classList.remove("open"); }
  function open(){ l.innerHTML=[].map.call(sel.options,function(o,i){ return "<button type='button' style='--i:"+i+"' class='bgpo"+(i===sel.selectedIndex?" sel":"")+"' data-i='"+i+"'>"+escapeHtml(o.textContent)+"</button>"; }).join("");
    [].forEach.call(l.querySelectorAll(".bgpo"),function(o){ o.onclick=function(e){ e.preventDefault(); sel.selectedIndex=+o.getAttribute("data-i"); label(); close(); sel.dispatchEvent(new Event("change")); }; });
    void l.offsetWidth; l.classList.add("open"); w.classList.add("open"); var s=l.querySelector(".sel"); if(s) l.scrollTop=s.offsetTop-l.clientHeight/2; }
  b.onclick=function(e){ e.preventDefault(); l.classList.contains("open")?close():open(); };
  document.addEventListener("click",function(e){ if(!w.contains(e.target)) close(); });
  sel.addEventListener("change",label); sel._ladderLabel=label; label();
}
// ---- fonts: free Google Fonts pairings (display / body / mono); cond = condensed display face ----
var FONTS=[
  {id:"flyer",     name:"Flyer (Anton + Archivo)",            d:"Anton",               b:"Archivo",            m:"IBM Plex Mono", cond:1, q:"family=Anton&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600"},
  {id:"broadcast", name:"Broadcast (Bebas Neue + Barlow)",    d:"Bebas Neue",          b:"Barlow",             m:"DM Mono",       cond:1, q:"family=Bebas+Neue&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500"},
  {id:"poster",    name:"Poster (Big Shoulders + Space Grotesk)", d:"Big Shoulders Display", b:"Space Grotesk", m:"JetBrains Mono", cond:1, q:"family=Big+Shoulders+Display:wght@800;900&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@500;700"},
  {id:"heavy",     name:"Heavy (Archivo Black + Archivo)",    d:"Archivo Black",       b:"Archivo",            m:"Space Mono",    cond:0, q:"family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=Space+Mono:wght@400;700"},
  {id:"zine",      name:"Zine (Bricolage Grotesque)",         d:"Bricolage Grotesque", b:"Bricolage Grotesque", m:"DM Mono",      cond:0, q:"family=Bricolage+Grotesque:wght@400;500;700;800&family=DM+Mono:wght@400;500"},
  {id:"editorial", name:"Editorial (Instrument Serif + Sans)",d:"Instrument Serif",    b:"Instrument Sans",    m:"IBM Plex Mono", cond:0, q:"family=Instrument+Serif&family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500"},
  {id:"terminal",  name:"Terminal (Chakra Petch)",            d:"Chakra Petch",        b:"Chakra Petch",       m:"Space Mono",    cond:0, q:"family=Chakra+Petch:wght@400;500;600;700&family=Space+Mono:wght@400;700"},
  {id:"club",      name:"Club (Unbounded + Familjen Grotesk)",d:"Unbounded",           b:"Familjen Grotesk",   m:"Space Mono",    cond:0, q:"family=Unbounded:wght@600;800&family=Familjen+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700"},
  {id:"system",    name:"System (no download)",               d:"",                    b:"",                   m:"",              cond:0, q:""}
];
var SIZES={s:0.9, m:1, l:1.12, xl:1.25};
function applyFont(){
  var f=FONTS.filter(function(x){ return x.id===prefs.font; })[0]||FONTS[0], r=document.documentElement.style;
  r.setProperty("--f-display", f.d ? '"'+f.d+'",'+(f.cond?'"Arial Narrow","Roboto Condensed",Impact,sans-serif-condensed,':'')+'system-ui,sans-serif' : 'system-ui,sans-serif');
  r.setProperty("--f-body", f.b ? '"'+f.b+'",system-ui,sans-serif' : 'system-ui,sans-serif');
  r.setProperty("--f-mono", f.m ? '"'+f.m+'",ui-monospace,monospace' : 'ui-monospace,monospace');
  document.documentElement.classList.toggle("bsd", !!f.cond);
  document.documentElement.setAttribute("data-font", f.id);
  if(f.q) $("fontLink").href="https://fonts.googleapis.com/css2?"+f.q+"&display=swap";
  r.setProperty("--ui-zoom", SIZES[prefs.fsize]||1);
  setTimeout(fitLogo,0); setTimeout(fitLogo,600);
}
// shrink the menu logo until it fits its row (fonts differ a lot in width, and may still be loading)
function fitLogo(){
  var mk=document.querySelector(".menu .mk"), br=mk&&mk.querySelector(".brand"); if(!br || !mk.offsetWidth) return;
  mk.style.fontSize=""; var w=mk.clientWidth, bw=br.getBoundingClientRect().width/((parseFloat(getComputedStyle(document.querySelector(".wrap")).zoom)||1));
  if(bw>w) mk.style.fontSize=(parseFloat(getComputedStyle(mk).fontSize)*w/bw*0.98)+"px";
}
window.addEventListener("resize", fitLogo);
try{ document.fonts.ready.then(fitLogo); document.fonts.addEventListener("loadingdone", fitLogo); }catch(e){}
function renderFontSel(){
  $("fontSel").innerHTML=FONTS.map(function(f){ return "<option value='"+f.id+"'"+(f.id===prefs.font?" selected":"")+">"+f.name+"</option>"; }).join("");
  $("sizeSel").value=prefs.fsize||"m"; ["fontSel","sizeSel"].forEach(function(id){ if($(id)._ladderLabel) $(id)._ladderLabel(); });
}
var CB_MODES=[["off","Off"],["protan","Protanopia"],["deutan","Deuteranopia"],["tritan","Tritanopia"],["mono","Monochrome"]];
function renderCB(){
  $("cbRow").innerHTML=CB_MODES.map(function(m){ return "<button class='cchip"+(prefs.cb===m[0]?" on":"")+"' data-cb='"+m[0]+"'>"+m[1]+"</button>"; }).join("");
  var bs=$("cbRow").querySelectorAll(".cchip");
  for(var i=0;i<bs.length;i++){ (function(b){ b.onclick=function(){ prefs.cb=b.getAttribute("data-cb"); savePrefs(); applyPrefs(); renderCB(); }; })(bs[i]); }
}
// menu video blur: off (sharp video), basic (blurred video), quality (blurred video + frosted glass behind menus)
function vblur(){ return ["off","basic","quality"].indexOf(prefs.vblur)!==-1 ? prefs.vblur : "basic"; }
function applyPrefs(){ var h=document.documentElement; h.classList.toggle("nofrost", vblur()!=="quality" || !prefs.bgvid); h.classList.toggle("vb-off", vblur()==="off"); document.body.classList.toggle("tv-on", !!prefs.tv); document.body.classList.toggle("gv-on", !!prefs.gamevid); if(window.TVFX) TVFX.toggle(); document.documentElement.setAttribute("data-cb", prefs.cb||"off"); if(window.BGV) BGV.toggle(); document.body.classList.toggle("noholo", !prefs.holo); document.documentElement.classList.toggle("bw", !!prefs.bw); document.body.classList.toggle("noanim", !prefs.anim); document.body.classList.toggle("nodim", !prefs.dim); }

