/* Hero "video": looping candlestick animation, price climbs, buy entry, take-profit hit. Illustration only. */
(function(){
  var cv=document.getElementById("hvCanvas");if(!cv)return;var x=cv.getContext("2d"),W=cv.width,H=cv.height;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var UP="#16c784",DN="#ff4d63",GOLD="#ffd166",CY="#4de1ff";
  var N=38,LOOP=11,seed=7,data,entryI,tpP,slP,entryP;
  function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  function build(){
    var c=[],p=112;
    function leg(n,to,v){for(var i=0;i<n;i++){var f=p+(to-p)/(n-i)+(rnd()+rnd()-1)*v,o=p;c.push([o,Math.max(o,f)+rnd()*v*.6,Math.min(o,f)-rnd()*v*.6,f]);p=f}}
    leg(8,94,2.6);leg(2,98,1.6);          /* dip to support */
    entryI=c.length;entryP=p;leg(N-entryI,142,2.6);
    var mx=0;c.forEach(function(k){mx=Math.max(mx,k[1])});
    tpP=entryP+(entryP-(entryP-8))*2.4;slP=entryP-8;
    /* make price tag TP when a candle crosses */
    for(var i=entryI;i<c.length;i++){if(c[i][1]>=tpP){c.length=i+3;N=c.length;break}}
    data=c;
  }
  function frame(t){
    var n=data.length,lo=Infinity,hi=-Infinity;data.forEach(function(k){lo=Math.min(lo,k[2]);hi=Math.max(hi,k[1])});
    hi=Math.max(hi,tpP)+4;lo=Math.min(lo,slP)-3;
    var L=24,R=W-130,T=70,B=H-90;
    function X(i){return L+(i+.5)*(R-L)/(n+2)}function Y(p){return B-(p-lo)/(hi-lo)*(B-T)}
    x.clearRect(0,0,W,H);var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0a1230");g.addColorStop(1,"#070b18");x.fillStyle=g;x.fillRect(0,0,W,H);
    x.strokeStyle="rgba(255,255,255,.06)";x.lineWidth=1;for(var i=1;i<6;i++){var yy=T+(B-T)*i/6;x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke()}
    var reveal=Math.min(n,t/ (LOOP-3.2) * n * 1.0);
    var drawn=Math.floor(reveal),w=Math.max(6,(R-L)/(n+2)*.62);
    for(var i=0;i<=Math.min(drawn,n-1);i++){var k=data[i].slice(),f=i===drawn?reveal-drawn:1;if(f<1){var e=f*f*(3-2*f);k[3]=k[0]+(k[3]-k[0])*e;k[1]=Math.max(k[0],k[3])+(data[i][1]-Math.max(data[i][0],data[i][3]))*e;k[2]=Math.min(k[0],k[3])-(Math.min(data[i][0],data[i][3])-data[i][2])*e}
      var up=k[3]>=k[0],col=up?UP:DN,cx=X(i);x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2;x.beginPath();x.moveTo(cx,Y(k[1]));x.lineTo(cx,Y(k[2]));x.stroke();var top=Y(Math.max(k[0],k[3])),hh=Math.max(2,Math.abs(Y(k[0])-Y(k[3])));x.fillRect(cx-w/2,top,w,hh)}
    var cur=Math.min(drawn,n-1),curP=data[cur][3];
    function tag(txt,y,col,tc){x.font="800 22px Sora,Inter,sans-serif";var tw=x.measureText(txt).width+22;x.fillStyle=col;x.beginPath();x.roundRect?x.roundRect(W-tw-10,y-17,tw,34,17):x.rect(W-tw-10,y-17,tw,34);x.fill();x.fillStyle=tc||"#06122e";x.textAlign="center";x.textBaseline="middle";x.fillText(txt,W-tw/2-10,y+1)}
    function hl(p,col,dash){x.save();x.strokeStyle=col;x.lineWidth=2.5;x.setLineDash(dash||[]);x.beginPath();x.moveTo(X(entryI)-10,Y(p));x.lineTo(W-150,Y(p));x.stroke();x.restore()}
    if(drawn>=entryI){var a=Math.min(1,(reveal-entryI)/1.5);x.save();x.globalAlpha=a;
      x.fillStyle="rgba(22,199,132,.12)";x.fillRect(X(entryI)-10,Y(tpP),W-150-X(entryI)+10,Y(entryP)-Y(tpP));x.fillStyle="rgba(255,77,99,.13)";x.fillRect(X(entryI)-10,Y(entryP),W-150-X(entryI)+10,Y(slP)-Y(entryP));
      hl(entryP,CY);hl(tpP,UP,[10,7]);hl(slP,DN,[10,7]);tag("TP",Y(tpP),UP,"#05151a");tag("BUY",Y(entryP),CY,"#05151a");tag("SL",Y(slP),DN,"#fff");
      var by=Y(data[entryI][2])+30,bx=X(entryI);x.fillStyle=CY;x.beginPath();x.moveTo(bx,by-18);x.lineTo(bx-11,by+4);x.lineTo(bx+11,by+4);x.closePath();x.fill();x.restore()}
    /* current price line */
    x.strokeStyle="rgba(255,255,255,.35)";x.setLineDash([3,6]);x.beginPath();x.moveTo(X(cur),Y(curP));x.lineTo(W-150,Y(curP));x.stroke();x.setLineDash([]);
    /* take profit burst */
    var hit=reveal>=n-1.2;if(hit){var q=Math.min(1,(t-(LOOP-3.2)*(n-1.2)/n)/.9);var bx2=X(n-2),by2=Y(tpP);
      x.save();x.globalAlpha=Math.max(0,1-q);x.strokeStyle=GOLD;x.lineWidth=5;x.beginPath();x.arc(bx2,by2,10+q*70,0,7);x.stroke();x.restore();
      var s=Math.min(1,q*2.2),pw=330;x.save();x.translate(W*.36,H*.36);x.scale(.7+.3*s,.7+.3*s);x.globalAlpha=Math.min(1,s);x.fillStyle=GOLD;x.beginPath();x.roundRect?x.roundRect(-pw/2,-30,pw,60,30):x.rect(-pw/2,-30,pw,60);x.fill();x.fillStyle="#241a00";x.font="900 28px Sora,Inter,sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText("TAKE PROFIT  +2R  ✓",0,2);x.restore()}
  }
  var t0=null,vis=true;build();
  function loop(ts){if(t0==null)t0=ts;var t=((ts-t0)/1000)%LOOP;if(vis)frame(t);requestAnimationFrame(loop)}
  if("IntersectionObserver"in window)new IntersectionObserver(function(e){vis=e[0].isIntersecting}).observe(cv);
  if(reduce){frame(LOOP-1)}else requestAnimationFrame(loop);
})();
