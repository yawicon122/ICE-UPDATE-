/* Ice Update bear: flat cartoon polar bear with one clean outline, drawn on a <canvas>.
   IceBear.draw(ctx, t, {happy, wave, walk, face, ear}) draws it in a 720x720 space (feet at y=620). */
(function(){

let x;
const PI=Math.PI,TAU=2*PI,LOOP=16;
const OUT='#3b4a66', OW=7;                        // one clean, even outline round the whole body
const FUR='#ffffff', SHADE='#e4eef7', MUZ='#f4f7fb', PINK='#f6b9c4', NOSE='#2e3447';
function track(keys){const n=keys.length,xs=keys.map(k=>k[0]),ys=keys.map(k=>k[1]),d=[],m=new Array(n).fill(0);
  for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/(xs[i+1]-xs[i]));
  for(let i=1;i<n-1;i++){if(d[i-1]*d[i]<=0)m[i]=0;else{const w1=2*(xs[i+1]-xs[i])+(xs[i]-xs[i-1]),w2=(xs[i+1]-xs[i])+2*(xs[i]-xs[i-1]);m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]);}}
  return t=>{if(t<=xs[0])return ys[0];if(t>=xs[n-1])return ys[n-1];let i=0;while(t>xs[i+1])i++;const h=xs[i+1]-xs[i],s=(t-xs[i])/h,s2=s*s,s3=s2*s;
    return(2*s3-3*s2+1)*ys[i]+(s3-2*s2+s)*h*m[i]+(-2*s3+3*s2)*ys[i+1]+(s3-s2)*h*m[i+1];};}
function win(t,a,b,f){f=f||.35;const u=Math.min((t-a)/f,(b-t)/f);if(u<=0)return 0;if(u>=1)return 1;return u*u*(3-2*u);}
function pose(t,A){
  const P={x:0,y:0,rot:0,sq:0,head:0,hx:0,face:A.face||0,wave:A.wave||0,happy:A.happy||0,blink:0,mouth:0,
    lFoot:0,rFoot:0,lFootX:0,rFootX:0,armL:0,armR:0,ear:0};
  const b=Math.sin(t*TAU/1.6); P.y+=3*b; P.sq+=.012*b;
  const Eh=P.happy, hb=Math.abs(Math.sin(t*TAU*1.6));
  P.y-=Eh*10*hb; P.sq-=Eh*.04*(1-hb); P.head+=Eh*.06*Math.sin(t*TAU*.8); P.mouth=Math.max(P.mouth,Eh*.8);
  const Ew=P.wave; P.head+=Ew*.10; P.rot+=Ew*.025; P.mouth=Math.max(P.mouth,Ew*(.35+.45*Math.abs(Math.sin(t*TAU*2.2))));
  const Ek=A.walk||0, ph=t*TAU*1.7, s=Math.sin(ph), dir=P.face;
  P.lFoot=Ek*Math.max(0,s)*16; P.rFoot=Ek*Math.max(0,-s)*16;
  P.lFootX=Ek*dir*10*-Math.cos(ph); P.rFootX=Ek*dir*10*Math.cos(ph);
  P.rot+=Ek*.07*s; P.y-=Ek*5*Math.abs(Math.cos(ph)); P.armL=Ek*.35*s; P.armR=Ek*-.35*s;
  P.hx=dir*10*Math.min(1,Math.abs(P.face));
  P.ear=.18*Math.max(0,Math.sin(t*TAU*3))*(A.ear||0);
  const bt=(t+.4)%3.4; P.blink=bt>3.22?Math.sin((bt-3.22)/.18*PI):0;
  return P;
}
function armPose(P,t){ // angles: a1 from straight down (positive = out to the side), a2 = elbow bend
  let l1=.32+P.armL, l2=-.15, r1=.32+P.armR, r2=-.15;
  const h=P.happy, w=P.wave;
  // happy dance: both arms flung up and out, swinging
  l1+=h*(1.9+.35*Math.sin(t*TAU*1.6)-.32); l2+=h*(.55+.25*Math.sin(t*TAU*1.6+1));
  r1+=h*(1.9+.35*Math.sin(t*TAU*1.6+PI)-.32); r2+=h*(.55+.25*Math.sin(t*TAU*1.6+PI+1));
  // wave: right arm high, forearm waving side to side
  r1+=w*(2.55-.32); r2+=w*(-.25+.45*Math.sin(t*TAU*2.2)+.15);
  return {l1,l2,r1,r2};
}
// ---- shape helpers: everything is a flat filled shape with the same outline
function ell(cx,cy,rx,ry,r){x.beginPath();x.ellipse(cx,cy,rx,ry,r||0,0,TAU);}
function blob(pts){ // smooth closed shape through points
  x.beginPath();const n=pts.length;
  for(let i=0;i<n;i++){const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
    if(i===0)x.moveTo(p1[0],p1[1]);
    x.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1]);}
  x.closePath();}
function draw(shapeFn,fill,outlineFirst){ // outline pass then fill pass gives the clean merged silhouette
  shapeFn();x.lineWidth=OW*2;x.strokeStyle=OUT;x.lineJoin='round';x.stroke();
  if(!outlineFirst){shapeFn();x.fillStyle=fill;x.fill();}}
function fillOnly(shapeFn,fill){shapeFn();x.fillStyle=fill;x.fill();}
function line(pts,w,col){x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)x.lineTo(pts[i][0],pts[i][1]);x.lineWidth=w||OW;x.strokeStyle=col||OUT;x.lineCap='round';x.lineJoin='round';x.stroke();}
function curve(a,c,b,w,col){x.beginPath();x.moveTo(a[0],a[1]);x.quadraticCurveTo(c[0],c[1],b[0],b[1]);x.lineWidth=w||OW;x.strokeStyle=col||OUT;x.lineCap='round';x.stroke();}

function render(t,P){
  // soft ground shadow
  const lift=Math.max(0,-P.y-2)/20;
  x.fillStyle='rgba(120,95,60,.13)';ell(360,628,120*(1-lift*.4),14*(1-lift*.4));x.fill();
  x.save();
  x.translate(360,620);           // feet line
  // --- legs/feet (drawn first, they sit under the body)
  const feet=[[-48+P.lFootX,-P.lFoot],[48+P.rFootX,-P.rFoot]];
  const legShape=(f)=>()=>{blob([[f[0]-34,f[1]-70],[f[0]+34,f[1]-70],[f[0]+38,f[1]-6],[f[0],f[1]+4],[f[0]-38,f[1]-6]]);};
  const legShape2=(f)=>()=>{blob([[f[0]-38,f[1]-34],[f[0]+38,f[1]-34],[f[0]+44,f[1]-6],[f[0],f[1]+6],[f[0]-44,f[1]-6]]);};
  x.save();x.translate(0,P.y-18);x.rotate(P.rot);x.scale(1+P.sq,1-P.sq);
  // body silhouette (pear shape)
  const body=()=>blob([[0,-372],[78,-350],[118,-250],[136,-130],[128,-40],[70,-4],[0,4],[-70,-4],[-128,-40],[-136,-130],[-118,-250],[-78,-350]]);
  // arms (outline pass now so they merge into body silhouette)
  // long rubber-hose arms: one smooth thick tube from shoulder to rounded hand, bending at the elbow
  const arms=armPose(P,t);
  const hose=(s,a1,a2)=>{const S=[s*92,-292],U=98,D=100;
    const E=[S[0]+s*U*Math.sin(a1),S[1]+U*Math.cos(a1)], Hh=[E[0]+s*D*Math.sin(a1+a2),E[1]+D*Math.cos(a1+a2)];
    const Cc=[2*E[0]-(S[0]+Hh[0])/2,2*E[1]-(S[1]+Hh[1])/2];
    const path=()=>{x.beginPath();x.moveTo(S[0],S[1]);x.quadraticCurveTo(Cc[0],Cc[1],Hh[0],Hh[1]);};
    x.lineCap='round';x.lineJoin='round';
    path();x.lineWidth=46+OW*2;x.strokeStyle=OUT;x.stroke();
    path();x.lineWidth=46;x.strokeStyle=FUR;x.stroke();};
  const head=()=>{x.save();x.translate(P.hx,-372);x.rotate(P.head);blob([[0,-118],[78,-104],[112,-50],[106,20],[60,52],[0,60],[-60,52],[-106,20],[-112,-50],[-78,-104]]);x.restore();};
  const ear=(s)=>()=>{x.save();x.translate(P.hx,-372);x.rotate(P.head);x.translate(s*78,-102);x.rotate(s*(.2+P.ear));ell(0,0,30,28);x.restore();};
  [body,head,ear(-1),ear(1)].forEach(f=>draw(f,FUR,true));
  // fills
  fillOnly(body,FUR);
  // belly shade (flat, like cel animation)
  x.save();body();x.clip();x.fillStyle=SHADE;ell(-60,-110,110,180);x.globalCompositeOperation='source-atop';x.fill();x.restore();
  fillOnly(body,'rgba(0,0,0,0)');
  x.save();body();x.clip();x.fillStyle=FUR;ell(18,-150,104,150);x.fill();x.restore();
  // ears + inner pink
  [-1,1].forEach(s=>{fillOnly(ear(s),FUR);x.save();x.translate(P.hx,-372);x.rotate(P.head);x.translate(s*78,-102);x.rotate(s*(.2+P.ear));x.fillStyle=PINK;ell(0,3,15,14);x.fill();x.restore();});
  fillOnly(head,FUR);
  // arms with their own outline over the body (inner lines)
  hose(-1,arms.l1,arms.l2); hose(1,arms.r1,arms.r2);
  // face
  x.save();x.translate(P.hx,-372);x.rotate(P.head);
  x.fillStyle=MUZ;ell(0,8,46,34);x.fill();x.lineWidth=OW*.7;x.strokeStyle=OUT;x.stroke();
  x.fillStyle=NOSE;blob([[-16,-6],[16,-6],[10,8],[0,12],[-10,8]]);x.fill();
  x.fillStyle='rgba(255,255,255,.7)';ell(-5,-2,5,2.5);x.fill();
  // mouth: little 'w', opens when talking
  if(P.mouth>.08){x.fillStyle='#6b3b47';blob([[-12,18],[12,18],[9,18+16*P.mouth],[0,22+18*P.mouth],[-9,18+16*P.mouth]]);x.fill();
    x.fillStyle=PINK;ell(0,22+10*P.mouth,7,5*P.mouth);x.fill();x.lineWidth=4;x.strokeStyle=OUT;
    x.beginPath();x.moveTo(-12,18);x.quadraticCurveTo(0,26+22*P.mouth,12,18);x.stroke();}
  curve([0,12],[0,16],[0,20],4.5);curve([0,20],[-8,28],[-15,20],4.5);curve([0,20],[8,28],[15,20],4.5);
  // eyes: dots, or happy closed arcs, or blink
  [-1,1].forEach(s=>{const ex=s*48,ey=-26;
    if(P.happy>.5){curve([ex-14,ey+4],[ex,ey-12],[ex+14,ey+4],6);}
    else{const h=1-P.blink; if(h<.2) curve([ex-12,ey],[ex,ey+5],[ex+12,ey],6);
      else{x.fillStyle=NOSE;ell(ex,ey,9,11*h);x.fill();x.fillStyle='#fff';ell(ex+3,ey-4*h,3,3*h);x.fill();}}
    x.fillStyle='rgba(246,160,176,.55)';ell(s*76,6,17,10);x.fill();});
  x.restore();
  x.restore();
  // feet in front, each with its own outline and toe lines
  feet.forEach(f=>{legShape2(f)();x.fillStyle=FUR;x.fill();x.lineWidth=OW;x.strokeStyle=OUT;x.stroke();});
  feet.forEach(f=>{[-13,0,13].forEach(dx=>curve([f[0]+dx,f[1]+2],[f[0]+dx,f[1]-4],[f[0]+dx,f[1]-10],4));});
  x.restore();
};

window.IceBear={draw:function(ctx,t,A){x=ctx;render(t,pose(t,A||{}));}};
})();
