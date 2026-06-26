export async function saveSnapshot(dataUrl){ const a=document.createElement('a'); a.href=dataUrl; a.download='snapshot-'+Date.now()+'.png'; a.click(); }
