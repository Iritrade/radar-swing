"use strict";
/* Cœur partagé (page + Web Worker) : indicateurs en séries, analyse, trade, backtest. */
const ADX_MIN=20,BT={start:250,hold:30,fee:.001,slip:.0005};
const HTF={"1h":["4h","4 h"],"4h":["1d","journalier"],"1d":["1w","hebdo"],"1w":null};
const ema=(a,p)=>{const k=2/(p+1),r=[a[0]];for(let i=1;i<a.length;i++)r.push(a[i]*k+r[i-1]*(1-k));return r};
const macdH=c=>{const a=ema(c,12),b=ema(c,26),m=a.map((x,i)=>x-b[i]),s=ema(m,9);return m.map((x,i)=>x-s[i])};
const trAt=(h,l,c,i)=>Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));
function rsiS(c,p=14){const r=c.map(()=>NaN);if(c.length<=p)return r;let g=0,l=0;
  for(let i=1;i<=p;i++){const d=c[i]-c[i-1];d>=0?g+=d:l-=d}g/=p;l/=p;r[p]=l===0?100:100-100/(1+g/l);
  for(let i=p+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p;r[i]=l===0?100:100-100/(1+g/l)}return r}
function atrS(h,l,c,p=14){const r=c.map(()=>NaN);if(c.length<=p)return r;let a=0;
  for(let i=1;i<=p;i++)a+=trAt(h,l,c,i);a/=p;r[p]=a;for(let i=p+1;i<c.length;i++){a=(a*(p-1)+trAt(h,l,c,i))/p;r[i]=a}return r}
function adxS(h,l,c,p=14){const n=c.length,X=Array(n).fill(NaN);if(n<2*p+1)return X;let tr=0,pd=0,md=0;
  const d=i=>{const u=h[i]-h[i-1],w=l[i-1]-l[i];return[trAt(h,l,c,i),u>w&&u>0?u:0,w>u&&w>0?w:0]};
  for(let i=1;i<=p;i++){const[t,a,b]=d(i);tr+=t;pd+=a;md+=b}
  const dx=()=>{const a=100*pd/tr,b=100*md/tr;return a+b?100*Math.abs(a-b)/(a+b):0};
  const D=[dx()];let A=NaN;
  for(let i=p+1;i<n;i++){const[t,a,b]=d(i);tr+=t-tr/p;pd+=a-pd/p;md+=b-md/p;D.push(dx());const m=D.length;
    if(m===p)A=D.reduce((x,y)=>x+y)/p;else if(m>p)A=(A*(p-1)+D[m-1])/p;if(m>=p)X[i]=A}
  return X}
// k = bougies CLÔTURÉES uniquement. Tous les indicateurs sont calculés une seule fois (O(n)).
function prep(k){const c=k.map(x=>+x[4]),h=k.map(x=>+x[2]),l=k.map(x=>+x[3]),v=k.map(x=>+x[5]);
  return{c,h,l,v,T:k.map(x=>+x[6]),e20:ema(c,20),e50:ema(c,50),e200:ema(c,200),hist:macdH(c),R:rsiS(c),A:atrS(h,l,c),X:adxS(h,l,c),n:c.length}}
const trendAt=(S,i)=>i<60?null:S.c[i]>S.e50[i]&&S.hist[i]>0?"up":S.c[i]<S.e50[i]&&S.hist[i]<0?"down":"mixed";
function at(S,i){const{c,h,l,v}=S,px=c[i],e20=S.e20[i],e50=S.e50[i],e200=S.e200[i],R=S.R[i],A=S.A[i];
  let va=0;for(let j=i-20;j<i;j++)va+=v[j];const vr=v[i]/(va/20);
  const low10=Math.min(...l.slice(i-9,i+1)),high10=Math.max(...h.slice(i-9,i+1));
  const sup=Math.min(...l.slice(i-29,i+1)),res=Math.max(...h.slice(i-29,i+1));
  const ext=(px-e20)/A,hu=S.hist[i]>0,hr=S.hist[i]>S.hist[i-1];
  let s=(px>e200?1:-1)+(px>e50?1:-1)+(e50>e200?1:-1)+(e20>e50?1:-1)+(hu?1:-1)+(hr?.5:-.5);
  if(R<30)s++;else if(R>72)s--;else if(R>=45&&R<=60&&px>e50)s+=.5;
  if(vr>1.2)s+=hu?.5:-.5;
  s=Math.max(-7,Math.min(7,Math.round(s*2)/2));
  const lg=s>=0,side=lg?"long":"short";
  const C=lg?[["Tendance haussière : prix > EMA 50 > EMA 200",px>e50&&e50>e200],["Momentum positif : MACD > 0",hu],["RSI sain (40 à 68)",R>=40&&R<=68],["Prix pas étiré : < 1,5 ATR au-dessus de l’EMA 20",ext<1.5],["Volume ≥ 0,9× la moyenne",vr>=.9]]
    :[["Tendance baissière : prix < EMA 50 < EMA 200",px<e50&&e50<e200],["Momentum négatif : MACD < 0",!hu],["RSI entre 32 et 60",R>=32&&R<=60],["Prix pas étiré : < 1,5 ATR sous l’EMA 20",ext>-1.5],["Volume ≥ 0,9× la moyenne",vr>=.9]];
  const ok=C.filter(x=>x[1]).length;let sig,cls;
  if(s>=3&&ok>=4){sig="ACHAT";cls="buy"}else if(s>=2){sig="ACHAT À SURVEILLER";cls="buy"}
  else if(s<=-3&&ok>=4){sig="VENTE / ÉVITER";cls="sell"}else if(s<=-2){sig="BAISSIER, ÉVITER";cls="sell"}else{sig="ATTENTE";cls="wait"}
  const d=lg?1:-1,stop=lg?Math.min(low10,px-1.5*A):Math.max(high10,px+1.5*A),risk=Math.abs(px-stop);
  return{px,e20,e50,e200,R,A,adx:S.X[i],vr,s,sig,cls,side,C,ok,stop,tp1:px+d*2*risk,tp2:px+d*3*risk,risk,sup,res,low10,high10,actionable:sig==="ACHAT"||sig==="VENTE / ÉVITER"}}
// Sortie : stop prioritaire ; les trades non terminés sont valorisés au dernier cours (pas écartés).
function trade(S,i,stop,dir){const e=S.c[i],risk=Math.abs(e-stop);if(!(risk>0))return null;
  const tp=e+dir*2*risk,cost=2*(BT.fee+BT.slip)*e/risk,last=Math.min(i+BT.hold,S.n-1);
  for(let j=i+1;j<=last;j++){const hi=S.h[j],lo=S.l[j];
    if(dir===1?lo<=stop:hi>=stop)return{R:-1-cost,x:j,res:"stop"};
    if(dir===1?hi>=tp:lo<=tp)return{R:2-cost,x:j,res:"tp"}}
  return{R:dir*(S.c[last]-e)/risk-cost,x:last,res:"time"}}
function btCoin(sym,S,H,B,G){const blk={},sp=Math.floor(S.n*.7);let m=0,q=0;
  for(let i=BT.start;i<=S.n-2;i++){const r=at(S,i),T=S.T[i];let tr=null,bt=null;
    if(H){while(m<H.n&&H.T[m]<=T)m++;tr=trendAt(H,m-1)}
    if(B&&sym!=="BTC"){while(q<B.n&&B.T[q]<=T)q++;bt=trendAt(B,q-1)}
    const isB=r.sig==="ACHAT",isS=r.sig==="VENTE / ÉVITER";
    const ag=!!tr&&(isB&&tr==="down"||isS&&tr==="up"),ab=!!bt&&(isB&&bt==="down"||isS&&bt==="up"),ax=r.adx>=ADX_MIN;
    const L=Math.min(r.low10,r.px-1.5*r.A),Sh=Math.max(r.high10,r.px+1.5*r.A),tries=[["base",1,L],["baseS",-1,Sh]];
    if(r.sig==="ACHAT À SURVEILLER")tries.push(["watch",1,L]);
    if(isB||isS){const g=isB?"buy":"sell",d=isB?1:-1,st=isB?L:Sh;tries.push([g,d,st]);
      if(H&&!ag)tries.push([g+"F",d,st]);if(B&&!ab)tries.push([g+"B",d,st]);if(ax)tries.push([g+"A",d,st]);if(B&&!ab&&ax&&!ag)tries.push([g+"BA",d,st])}
    for(const[g,d,st]of tries){if(i<(blk[g]||0))continue;const t=trade(S,i,st,d);if(!t)continue;blk[g]=t.x;t.oos=i>=sp;(G[g]=G[g]||[]).push(t)}}}
