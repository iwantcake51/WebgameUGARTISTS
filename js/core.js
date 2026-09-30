var ARTISTS=["Playboi Carti","Ken Carson","Destroy Lonely","Yeat","SoFaygo","Homixide Gang","Cochise","Lucki","Summrs","Autumn!","Kankan","tana","Rich Amiri","BKTHERULA","Molly Santana","OsamaSon","Nettspend","Che","xaviersobased","Glokk40Spaz","LAZER DIM 700","Lucy Bedroque","prettifun","Jace! / iayze","ksuuvi","kuru","1oneam","fakemink","skaiwater","EsDeeKid","YT","2hollis","Hardrock","Edward Skeletrix","Dom Corleo","BabyChiefDoit","Duwap Kaine","pz'","rexv2","tezzus","diamond*","maxon","boolymon","ohsxnta","Protect","percaso","pradabagshawty","Lil Tony","devstacks","glo","2slimey","lelo","1300saint","swapa","1900rugrat","feng","jaydes","wifiskeleton","subiibabii","tdf","Lil Uzi Vert","Nine Vicious"];
var QMAP={"Jace! / iayze":["Jace!","iayze"]};
var STAGES=[0.5,1,3,6,10,15];
var PTS=[100,80,60,45,30,15];
var BAR_FULL=15, PER_ARTIST=120, NEED=4;
var THEMES=[
  {id:"plum",  name:"Plum",  vars:{"--bg":"#0a0711","--grad":"#241640","--surface":"#16101f","--surface2":"#1f1730","--line":"#2c2340","--accent":"#8c5cff","--spot":"#9b6bff"}},
  {id:"ember", name:"Ember", vars:{"--bg":"#120a06","--grad":"#3a2410","--surface":"#1c130b","--surface2":"#271a0f","--line":"#3a2817","--accent":"#ff9a4a","--spot":"#ff9a4a"}},
  {id:"dusk",  name:"Dusk",  vars:{"--bg":"#0f0712","--grad":"#40183a","--surface":"#1a1020","--surface2":"#251630","--line":"#38203f","--accent":"#e070c8","--spot":"#e070c8"}},
  {id:"forest",name:"Forest",vars:{"--bg":"#07110c","--grad":"#123a26","--surface":"#0f1a14","--surface2":"#16261d","--line":"#1e3a2b","--accent":"#3ccfb4","--spot":"#4fd08a"}},
  {id:"ocean", name:"Ocean", vars:{"--bg":"#060b16","--grad":"#12305a","--surface":"#0f1626","--surface2":"#152036","--line":"#1e3050","--accent":"#4a9bff","--spot":"#4a9bff"}},
  {id:"mist",  name:"Mist",  vars:{"--bg":"#0a0e14","--grad":"#1e3050","--surface":"#111722","--surface2":"#1a2130","--line":"#26313f","--accent":"#7fb0ff","--spot":"#7fb0ff"}},
  {id:"matcha",name:"Matcha",vars:{"--bg":"#0a1210","--grad":"#193d2f","--surface":"#101a16","--surface2":"#18251f","--line":"#22392e","--accent":"#84e0b4","--spot":"#84e0b4"}},
  {id:"frost", name:"Frost", vars:{"--bg":"#071014","--grad":"#123e48","--surface":"#0f1a1f","--surface2":"#16262d","--line":"#1f3a43","--accent":"#63d8e8","--spot":"#63d8e8"}},
  {id:"berry", name:"Berry", vars:{"--bg":"#100810","--grad":"#3a163c","--surface":"#19101a","--surface2":"#241626","--line":"#372039","--accent":"#e888cf","--spot":"#e888cf"}},
  {id:"cocoa", name:"Cocoa", vars:{"--bg":"#100b08","--grad":"#312414","--surface":"#181210","--surface2":"#231a15","--line":"#33271f","--accent":"#dda56b","--spot":"#e0a867"}},
  {id:"slate", name:"Slate", vars:{"--bg":"#0b0d10","--grad":"#232b35","--surface":"#14171c","--surface2":"#1c212a","--line":"#2a313c","--accent":"#9db4cc","--spot":"#9db4cc"}},
  {id:"opium", name:"Opium", vars:{"--bg":"#070606","--grad":"#2a0a0e","--surface":"#120c0d","--surface2":"#1b1113","--line":"#33191d","--accent":"#f1e9df","--spot":"#d61f36"}},
  {id:"lean", name:"Lean", vars:{"--bg":"#0c0714","--grad":"#3a1459","--surface":"#150d22","--surface2":"#1f1430","--line":"#33204d","--accent":"#b56bff","--spot":"#ff6bd6"}},
  {id:"y2k", name:"Y2K", vars:{"--bg":"#070b14","--grad":"#1b2d57","--surface":"#0e1526","--surface2":"#151f37","--line":"#22335a","--accent":"#8fd3ff","--spot":"#ff8fd8"}},
  {id:"chrome", name:"Chrome", vars:{"--bg":"#0b0c0e","--grad":"#2b3036","--surface":"#141619","--surface2":"#1c1f23","--line":"#2e3238","--accent":"#dfe6ee","--spot":"#aebdcc"}},
  {id:"toxic", name:"Toxic", vars:{"--bg":"#080c05","--grad":"#1f3a0c","--surface":"#10160b","--surface2":"#172010","--line":"#26371a","--accent":"#c6ff3d","--spot":"#9dff2e"}},
  {id:"gold", name:"Gold", vars:{"--bg":"#0c0905","--grad":"#3a2a0c","--surface":"#15110a","--surface2":"#1d170d","--line":"#3a2f17","--accent":"#f2c14e","--spot":"#f7d27a"}},
  {id:"blood", name:"Blood", vars:{"--bg":"#0d0405","--grad":"#4a0b12","--surface":"#170a0c","--surface2":"#221012","--line":"#3d161b","--accent":"#e0263c","--spot":"#ff4d5e"}},
  {id:"mint", name:"Mint", vars:{"--bg":"#06100c","--grad":"#12402f","--surface":"#0d1814","--surface2":"#14231d","--line":"#1f382e","--accent":"#5ef0b4","--spot":"#9dffd6"}},
  {id:"coral", name:"Coral", vars:{"--bg":"#120807","--grad":"#44201a","--surface":"#1b100e","--surface2":"#261713","--line":"#3d241e","--accent":"#ff7a66","--spot":"#ffa08f"}},
  {id:"lavender", name:"Lavender", vars:{"--bg":"#0c0a12","--grad":"#2f2848","--surface":"#15121d","--surface2":"#1e1a29","--line":"#312a44","--accent":"#c3b3ff","--spot":"#e0d6ff"}},
  {id:"sand", name:"Sand", vars:{"--bg":"#0f0d09","--grad":"#3a3222","--surface":"#181510","--surface2":"#221e17","--line":"#383124","--accent":"#e8d3a4","--spot":"#f3e4c0"}}
];

function norm(s){return (s||"").toLowerCase().replace(/[^a-z0-9]/g,"");}
function $(id){return document.getElementById(id);}
function stageLabel(i){return STAGES[i]+"s";}
var SEP=/\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|x|\u00d7|prod\.?)\s+|\s*[,&+\/]\s*/i;
function leadArtist(name){return String(name).split(SEP)[0];}
function artistMatch(res,target){var a=norm(leadArtist(res)),t=norm(target);return t.length<=3?a===t:a.indexOf(t)!==-1;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmtDate(iso){ if(!iso) return ""; var d=new Date(iso); if(isNaN(d.getTime())) return String(iso).slice(0,4);
  var m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return m[d.getMonth()]+" "+d.getFullYear(); }
// title without featured-artist credits, used everywhere titles are shown; keeps remix/version tags
function noFeat(name){
  var s=String(name);
  s=s.replace(/[\(\[\{][^)\]\}]*(?:\b(?:feat|ft|featuring|features?|with)\b|\bw\/)[^)\]\}]*[\)\]\}]/ig," ");
  s=s.replace(/\s+(feat\.?|ft\.?|featuring|features?|w\/)\s+.*$/i,"");
  s=s.replace(/\s*[-\u2013]\s*(feat\.?|ft\.?|featuring|with)\s.*$/i,"");
  s=s.replace(/\s+/g," ").trim();
  return s || String(name);
}
function baseTitle(name){
  var s=String(name);
  s=s.replace(/[\(\[]\s*(feat|ft|featuring|with|prod|produced|remaster|remastered|remix|version|sped|slowed|instrumental|mixed|clean|explicit|original|radio|live|edit|demo|vip|bonus)\b[^)\]]*[\)\]]/ig," ");
  s=s.replace(/\s+(feat\.?|ft\.?|featuring|w\/)\s+.*$/i,"");
  s=s.replace(/\s*[-\u2013]\s*(feat|ft|with|prod)\b.*$/i,"");
  s=s.replace(/\s+/g," ").trim();
  return s || String(name);
}
function setFavicon(c){
  var l=document.querySelector("link[rel='icon']");
  if(!l){l=document.createElement("link");l.rel="icon";document.head.appendChild(l);}
  l.href="data:image/svg+xml,"+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='9' fill='"+c+"'/></svg>");
}

