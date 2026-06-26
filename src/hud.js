export function createHUD(container=document.body){
  const el = document.createElement('div'); el.id='etcgrabhud'; el.style.position='absolute'; el.style.right='8px'; el.style.top='8px'; el.style.padding='8px'; el.style.background='rgba(0,0,0,0.5)'; el.style.color='#fff'; el.style.fontFamily='monospace'; el.style.fontSize='12px'; el.innerHTML='HUD: ready'; container.appendChild(el);
  return { el, set: (k,v)=>{ el.innerText = k+': '+v; } };
}
