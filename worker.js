importScripts("core.js");
onmessage=e=>{const{data}=e.data,G={};
  const P=data.map(([s,k,hk])=>[s,prep(k.slice(0,-1)),hk?prep(hk.slice(0,-1)):null]);
  const b=P.find(p=>p[0]==="BTC"),B=b&&b[1].n>100?b[1]:null;
  P.forEach(([s,S,H],j)=>{if(S.n>BT.start+40)btCoin(s,S,H,B,G);postMessage({p:j+1,of:P.length})});
  postMessage({done:1,G,nbars:Math.max(...P.map(p=>p[1].n))})};
