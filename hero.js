/* Hero banner: a live, never-repeating demo market. Random regimes (trend / range / spike) move the candles with a mind of their
   own; a demo trader keeps placing entries with stop-loss + take-profit, mostly wins (a few small losses), and the balance climbs. */
(function(){
  var cv=document.getElementById("hvCanvas");if(!cv)return;var x=cv.getContext("2d"),W=960,H=540,s=1;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var UP="#16c784",DN="#ff4d63",GOLD="#ffd166",CY="#4de1ff",V=44,TPC=14,CDUR=1.15;
  var R=Math.random;function gauss(){return(R()+R()+R()+R()-2)*1.2}
  var price=100,cs=[],base=0,cur=null,tk=0,acc=0,slide=0,reg=null,trade=null,fade=[],cool=3,bal=10000,balShow=10000,wins=0,losses=0,pops=[],coins=[],flash=0,lo=96,hi=106;
  function newReg(kind){var k=kind||(R()<.55?"trend":R()<.8?"range":"spike"),d=R()<.5?1:-1;
    if(k==="trend")return{k:k,d:d,mu:d*(.5+R()*.5),sig:.75+R()*.4,left:9+Math.floor(R()*10)};
    if(k==="spike")return{k:k,d:d,mu:d*(1.6+R()*1.2),sig:1.1,left:2+Math.floor(R()*2)};
    return{k:k,d:d,mu:0,sig:.55+R()*.4,left:5+Math.floor(R()*8)}}
  reg=newReg("range");
  function startCandle(){cur={o:price,h:price,l:price,c:price};tk=0}
  function endCandle(){cs.push(cur);base+=cur?1:0;if(cs.length>V+30){cs.shift()}slide=1;reg.left--;
    if(reg.left<=0)reg=newReg(trade?(trade.willWin?null:"trend"):null);
    if(cool>0)cool--;startCandle()}
  function id(i){return base-cs.length+i}
  function tick(){
    var m=reg.mu/TPC,sg=reg.sig/Math.sqrt(TPC);
    if(reg.k==="range")m=(100-price)*.0015*0;            /* ranges just chop */
    if(trade&&trade.willWin&&!trade.done)m+=trade.d*.45/TPC;
    price+=m+(100-price)*.004+gauss()*sg;if(R()<.012)price+=gauss()*1.6;
    cur.c=price;cur.h=Math.max(cur.h,price);cur.l=Math.min(cur.l,price);tk++;
    if(trade&&!trade.done){var hitTP=trade.d>0?price>=trade.tp:price<=trade.tp,hitSL=trade.d>0?price<=trade.sl:price>=trade.sl;
      if(hitTP)close(true);else if(hitSL){if(trade.willWin){price=trade.sl+trade.d*.35;cur.c=price;cur.l=Math.min(cur.l,trade.sl);cur.h=Math.max(cur.h,price)}else close(false)}}
    if(tk>=TPC)endCandle()}
  function close(win){var t=trade;t.done=true;t.win=win;t.endId=base;t.fadeT=0;var amt=win?t.risk*2:-t.risk;bal+=amt;if(win){wins++;flash=1;for(var i=0;i<7;i++)coins.push({x:W*.5+(R()-.5)*160,y:H*.5,vx:(R()-.5)*60,vy:-90-R()*90,a:1,r:(8+R()*5)*1.6})}else losses++;
    pops.push({t:0,txt:(win?"+$":"-$")+Math.abs(amt).toLocaleString(),col:win?UP:DN});fade.push(t);trade=null;cool=2+Math.floor(R()*3);
    if(win)reg=newReg("range");else reg=newReg("range")}
  function maybeEnter(){
    if(trade||cool>0||cs.length<12||tk!==Math.floor(TPC/2))return;
    if(reg.k==="trend"&&reg.left>=6){var d=reg.d,r=2.3,will=(wins+losses<1)||R()<.7;
      trade={d:d,e:price,sl:price-d*r,tp:price+d*r*2,id:base,risk:[100,150,200,250][Math.floor(R()*4)],willWin:will,t:0,age:0};
      if(will){reg.left=Math.max(reg.left,12);reg.mu=d*(.7+R()*.4)}else{reg.left=3;trade.flip=true}}}
  function Y(p){var T=132*s,B=H-98*s;return B-(p-lo)/(hi-lo)*(B-T)}
  var L=20,Rr=W-112;function fit(){var r=cv.getBoundingClientRect();if(!r.width)return;s=960/r.width;W=cv.width=960;H=cv.height=Math.round(960*r.height/r.width);Rr=W-62*s}
  function X(slot){return L+(slot+.5)*(Rr-L)/V}
  function slotOf(cid){var idx=cid-(base-cs.length);return V-1-(cs.length-idx)+slide*0+(1-0)}
  function frame(dt){
    /* simulate */
    acc+=dt;var step=CDUR/TPC;while(acc>=step){acc-=step;tick();maybeEnter();
      if(trade&&trade.flip&&tk===2&&reg.left<=3&&!trade.flipped){trade.flipped=true;reg=newReg("trend");reg.d=-trade.d;reg.mu=-trade.d*(1.4+R()*.8);reg.left=4;reg.sig=.9}}
    slide=Math.max(0,slide-dt*3.2);flash=Math.max(0,flash-dt*1.6);
    balShow+=(bal-balShow)*Math.min(1,dt*3.5);
    /* auto range */
    var vis=cs.slice(-(V-1)).concat([cur]),a=1e9,b=-1e9;vis.forEach(function(k){a=Math.min(a,k.l);b=Math.max(b,k.h)});
    if(trade){a=Math.min(a,trade.sl);b=Math.max(b,trade.tp)}a-=1.2;b+=1.2;lo+=(a-lo)*Math.min(1,dt*2.2);hi+=(b-hi)*Math.min(1,dt*2.2);
    draw(dt)}
  function candle(k,cx,w){var up=k.c>=k.o,col=up?UP:DN;x.strokeStyle=col;x.fillStyle=col;x.lineWidth=Math.max(1,1.2*s);x.beginPath();x.moveTo(cx,Y(k.h));x.lineTo(cx,Y(k.l));x.stroke();var t=Y(Math.max(k.o,k.c)),h=Math.max(2,Math.abs(Y(k.o)-Y(k.c)));x.fillRect(cx-w/2,t,w,h)}
  function tag(txt,y,col,tc){x.font="800 "+Math.round(11*s)+"px Sora,Inter,sans-serif";var tw=x.measureText(txt).width+12*s,hh=18*s;x.fillStyle=col;x.beginPath();if(x.roundRect)x.roundRect(W-tw-5*s,y-hh/2,tw,hh,hh/2);else x.rect(W-tw-5*s,y-hh/2,tw,hh);x.fill();x.fillStyle=tc||"#05151a";x.textAlign="center";x.textBaseline="middle";x.fillText(txt,W-tw/2-5*s,y+s)}
  function tradeDraw(t,alpha){var n=cs.length,sx=X(V-1-(base-t.id)+ (1-0))-0;var x0=X(V-1-(base-t.id)-1+1-slide)-10;x0=Math.max(L,x0);
    x.save();x.globalAlpha=alpha;x.fillStyle="rgba(22,199,132,.13)";var yE=Y(t.e),yT=Y(t.tp),yS=Y(t.sl);x.fillRect(x0,Math.min(yE,yT),Rr+20-x0,Math.abs(yE-yT));x.fillStyle="rgba(255,77,99,.14)";x.fillRect(x0,Math.min(yE,yS),Rr+20-x0,Math.abs(yE-yS));
    function hl(y,c,d){x.strokeStyle=c;x.lineWidth=1.6*s;x.setLineDash(d||[]);x.beginPath();x.moveTo(x0,y);x.lineTo(Rr+8*s,y);x.stroke();x.setLineDash([])}
    hl(yE,CY);hl(yT,UP,[9,6]);hl(yS,DN,[9,6]);
    var sg=1;x.globalAlpha=alpha;tag("TP",yT,UP);tag(t.d>0?"BUY":"SELL",yE,CY);tag("SL",yS,DN,"#fff");
    x.fillStyle=CY;x.beginPath();var mx=x0+10;x.moveTo(mx,yE+(t.d>0?20:-20));x.lineTo(mx-10,yE+(t.d>0?2:-2));x.lineTo(mx+10,yE+(t.d>0?2:-2));x.fill();x.restore()}
  function draw(dt){
    x.clearRect(0,0,W,H);var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"rgba(12,22,58,.30)");g.addColorStop(1,"rgba(6,10,26,.55)");x.fillStyle=g;x.fillRect(0,0,W,H);
    x.strokeStyle="rgba(255,255,255,.055)";x.lineWidth=1;for(var i=1;i<6;i++){var yy=132*s+(H-98*s-132*s)*i/6;x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke()}
    var w=Math.max(3,(Rr-L)/V*.62),n=cs.length;
    for(var f=0;f<fade.length;f++){var t=fade[f];t.fadeT+=dt;if(t.fadeT>1.6){fade.splice(f--,1);continue}tradeDraw(t,Math.max(0,1-t.fadeT/1.6)*.9)}
    for(var i=0;i<n;i++){var sl=V-1-(n-i)+slide;if(sl<-1)continue;candle(cs[i],X(sl),w)}
    if(cur)candle(cur,X(V-1),w);
    if(trade)tradeDraw(trade,1);
    if(cur){x.strokeStyle="rgba(255,255,255,.4)";x.lineWidth=1.5;x.setLineDash([3,6]);x.beginPath();x.moveTo(X(V-1),Y(price));x.lineTo(Rr+8*s,Y(price));x.stroke();x.setLineDash([]);
      if(trade){var pl=(price-trade.e)*trade.d/(trade.e-trade.sl)/trade.d*trade.d;var r=(price-trade.e)*trade.d/Math.abs(trade.e-trade.sl),usd=Math.round(r*trade.risk);tag((usd>=0?"+$":"-$")+Math.abs(usd),Y(price),usd>=0?UP:DN,usd>=0?"#05151a":"#fff")}else tag(price.toFixed(2),Y(price),"rgba(255,255,255,.85)")}
    /* balance */
    x.save();var sh=x.createLinearGradient(0,0,250*s,0);sh.addColorStop(0,"rgba(5,8,22,.7)");sh.addColorStop(1,"rgba(5,8,22,0)");
    x.textAlign="left";x.textBaseline="alphabetic";    x.fillStyle=flash>0?"#b8ffe3":UP;x.shadowColor=UP;x.shadowBlur=(flash>0?24:8)*s/2;x.font="900 "+Math.round(28*s)+"px Sora,Inter,sans-serif";x.fillText("$"+balShow.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}),16*s,106*s);x.shadowBlur=0;
    x.fillStyle="rgba(255,255,255,.8)";x.font="700 "+Math.round(11*s)+"px Sora,Inter,sans-serif";x.fillText((balShow>=10000?"\u25B2 +":"\u25BC ")+(((balShow-10000)/100).toFixed(1))+"%  \u00B7  "+wins+" wins  "+losses+" losses",16*s,124*s);x.restore();
    /* floating money */
    pops.forEach(function(p,i){p.t+=dt;var a=Math.max(0,1-p.t/1.8);if(a<=0){pops.splice(i,1);return}x.save();x.globalAlpha=a;x.fillStyle=p.col;x.font="900 "+Math.round(28*s)+"px Sora,Inter,sans-serif";x.textAlign="center";x.shadowColor=p.col;x.shadowBlur=14;x.fillText(p.txt,W*.55,H*.45-p.t*50*s);x.restore()});
    coins.forEach(function(c,i){c.vy+=160*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.a-=dt*.7;if(c.a<=0){coins.splice(i,1);return}x.save();x.globalAlpha=c.a;var gr=x.createRadialGradient(c.x-3,c.y-3,2,c.x,c.y,c.r);gr.addColorStop(0,"#fff6c8");gr.addColorStop(1,GOLD);x.fillStyle=gr;x.beginPath();x.arc(c.x,c.y,c.r,0,7);x.fill();x.fillStyle="#7a5a00";x.font="900 "+c.r+"px Sora,sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText("$",c.x,c.y+1);x.restore()});
    if(flash>0){x.save();x.globalAlpha=flash*.18;x.fillStyle=UP;x.fillRect(0,0,W,H);x.restore()}}
  fit();if("ResizeObserver"in window)new ResizeObserver(fit).observe(cv);
  /* warm-up so it never starts empty */
  startCandle();for(var i=0;i<TPC*(V-8);i++){tick();if(trade)trade=null}cool=2;
  if(reduce){draw(0);return}
  var last=null,vis=true;
  function loop(ts){if(last==null)last=ts;var dt=Math.min(.1,(ts-last)/1000);last=ts;if(vis)frame(dt);requestAnimationFrame(loop)}
  if("IntersectionObserver"in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(cv);
  requestAnimationFrame(loop);
})();

/* lesson video rail (inside Chart gallery): floating glass players, swipe left/right, pause when off-screen */
(function(){
  var S=window.SITE||{},list=S.lessonVideos||[],rail=document.getElementById("vrail");if(!rail)return;
  var esc=function(s){return String(s||"").replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
  rail.innerHTML=list.map(function(v,i){return '<article class="lcard glass'+(v.portrait?' portrait':'')+'" style="--d:'+(i*-1.7)+'s"><div class="vbox"><video controls playsinline preload="metadata" aria-label="'+esc(v.title)+'"><source src="'+esc(v.file)+'#t=1" type="video/mp4">'+(v.fallback?'<source src="'+esc(v.fallback)+'#t=1" type="video/mp4">':'')+'</video><button class="vplay" aria-label="Play">&#9654;</button></div><div class="vt">'+esc(v.title)+'<small>Lesson '+(i+1)+'</small></div></article>'}).join("")+
   '<article class="lcard glass more" style="--d:-3.4s"><div><b>More lessons coming</b><span>Join the channel to get them first</span></div></article>';
  rail.querySelectorAll("video").forEach(function(v){
    var fit=function(){if(v.videoWidth){v.style.aspectRatio=v.videoWidth+"/"+v.videoHeight;var c=v.closest(".lcard");if(c)c.classList.toggle("portrait",v.videoHeight>v.videoWidth)}};
    v.addEventListener("loadedmetadata",fit);fit();
    var box=v.closest(".vbox"),btn=box.querySelector(".vplay");
    btn.addEventListener("click",function(){v.play()});
    v.addEventListener("play",function(){box.classList.add("playing");rail.querySelectorAll("video").forEach(function(o){if(o!==v)o.pause()})});
    v.addEventListener("pause",function(){box.classList.remove("playing")});v.addEventListener("ended",function(){box.classList.remove("playing")})});
  /* pause the moment a video scrolls out of view (up/down the page or swiped sideways) */
  if("IntersectionObserver"in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting&&e.intersectionRatio<.4){var v=e.target.querySelector("video");if(v&&!v.paused)v.pause()}})},{threshold:[0,.4]});
    rail.querySelectorAll(".lcard").forEach(function(c){io.observe(c)})}
  document.addEventListener("visibilitychange",function(){if(document.hidden)rail.querySelectorAll("video").forEach(function(v){v.pause()})});
  /* arrows (desktop) */
  var wrap=rail.parentNode,pv=wrap.querySelector(".prev"),nx=wrap.querySelector(".next");
  function step(d){var c=rail.querySelector(".lcard");rail.scrollBy({left:d*(c?c.offsetWidth+16:300),behavior:"smooth"})}
  function arrows(){pv.hidden=rail.scrollLeft<20;nx.hidden=rail.scrollLeft>rail.scrollWidth-rail.clientWidth-20}
  pv.addEventListener("click",function(){step(-1)});nx.addEventListener("click",function(){step(1)});rail.addEventListener("scroll",arrows,{passive:true});arrows();
  /* classic video list empty? remove its empty block, point "Lessons" at the video row */
  if(!(S.videos||[]).length){var ls=document.getElementById("lessons");if(ls)ls.remove();document.querySelectorAll('a[href="#lessons"]').forEach(function(a){a.setAttribute("href","#lesson5")})}
  var n=document.getElementById("stVideos");if(n)n.textContent=((S.videos||[]).length)+list.length;
  /* hero 3D tilt follows the pointer on desktop */
  var hv=document.getElementById("heroVideo");if(hv&&matchMedia("(hover:hover)").matches){var box=hv.parentNode;
    box.addEventListener("pointermove",function(e){var r=box.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;hv.classList.add("is-tilt");hv.style.transform="rotateX("+(8-py*14)+"deg) rotateY("+(-8+px*20)+"deg)"});
    box.addEventListener("pointerleave",function(){hv.classList.remove("is-tilt");hv.style.transform=""})}
})();
