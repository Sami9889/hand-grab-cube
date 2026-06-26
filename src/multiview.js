export function fuseAverages(worldArrays){
  if (!worldArrays || worldArrays.length===0) return null;
  const L = worldArrays[0].length; const out = new Array(L);
  for (let i=0;i<L;i++){ let sx=0,sy=0,sz=0,c=0; for(const w of worldArrays){ const p=w[i]; if(!p) continue; sx+=p.x; sy+=p.y; sz+=p.z; c++; } out[i]= c? {x:sx/c,y:sy/c,z:sz/c} : null; }
  return out;
}
