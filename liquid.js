/* Liquid glass: real edge refraction (Chromium/Android Chrome) + a glass "lens" bubble that slides under the nav links.
   Safari/older browsers simply keep the frosted-glass look from liquid.css. */
(function(){
  "use strict";
  var H=document.documentElement,UA=navigator.userAgent;
  var chromium=false&&/Chrome\/|CriOS|EdgA|SamsungBrowser/.test(UA)&&!/Firefox/.test(UA)&&window.CSS&&CSS.supports&&CSS.supports("backdrop-filter","url(#x)");
  /* ---- displacement map: rounded-rect edge normal pushes the backdrop, centre stays flat ---- */
  function map(){
    var N=160,c=document.createElement("canvas");c.width=c.height=N;var x=c.getContext("2d"),im=x.createImageData(N,N),d=im.data;
    function sd(u,v){var r=.55,qx=Math.abs(u)-(1-r),qy=Math.abs(v)-(1-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r}
    for(var j=0;j<N;j++)for(var i=0;i<N;i++){
      var u=i/(N-1)*2-1,v=j/(N-1)*2-1,s=sd(u,v),e=1e-3;
      var gx=sd(u+e,v)-sd(u-e,v),gy=sd(u,v+e)-sd(u,v-e),gl=Math.hypot(gx,gy)||1;gx/=gl;gy/=gl;
      var dist=-s,t=Math.max(0,1-dist/.42);t=t*t*(3-2*t);       /* strongest right at the rim */
      var k=(j*N+i)*4;d[k]=128+gx*t*127;d[k+1]=128+gy*t*127;d[k+2]=128;d[k+3]=255}
    x.putImageData(im,0,0);return c.toDataURL()}
  if(chromium){
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+
      '<filter id="lgRefract" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">'+
      '<feImage href="'+map()+'" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="m"/>'+
      '<feDisplacementMap in="SourceGraphic" in2="m" scale="0.16" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>';
    var w=document.createElement("div");w.innerHTML=svg;document.body.appendChild(w.firstChild);H.classList.add("lg-refract")}
  /* ---- lens bubble under nav links (like the glass slider thumb) ---- */
  var nav=document.querySelector(".nav"),box=nav&&nav.querySelector("nav");if(!box)return;
  var lens=document.createElement("i");lens.className="lg-lens";nav.appendChild(lens);
  var hideT;
  function to(a){var n=nav.getBoundingClientRect(),r=a.getBoundingClientRect();clearTimeout(hideT);
    lens.style.cssText="opacity:1;width:"+(r.width+18)+"px;height:"+(r.height+10)+"px;transform:translate("+(r.left-n.left-9)+"px,"+(r.top-n.top-5)+"px)"}
  function off(){hideT=setTimeout(function(){lens.style.opacity="0";lens.style.transform+=" scale(.7)"},900)}
  box.querySelectorAll("a").forEach(function(a){
    a.addEventListener("pointerenter",function(){to(a)});a.addEventListener("pointerdown",function(){to(a);lens.classList.add("press")});
    a.addEventListener("pointerup",function(){lens.classList.remove("press");off()});a.addEventListener("pointerleave",off);a.addEventListener("click",function(){to(a);off()})});
  /* press feedback on gel buttons */
  document.addEventListener("pointerdown",function(e){var b=e.target.closest&&e.target.closest(".btn");if(b){b.classList.add("lg-press");setTimeout(function(){b.classList.remove("lg-press")},380)}},{passive:true});
})();
