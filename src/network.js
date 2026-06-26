// simple WebSocket forwarder for tracking events
export function createNetworkForwarder() {
  let ws = null;
  let url = null;
  function connect(u) {
    if (ws) { try { ws.close(); } catch(e){} }
    url = u;
    try {
      ws = new WebSocket(u);
      ws.onopen = ()=>console.log('WS connected', u);
      ws.onclose = ()=>console.log('WS closed');
      ws.onerror = (e)=>console.warn('WS error', e);
    } catch (e) { console.warn('WS connect failed', e); ws = null; }
    return ws;
  }
  function send(obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try { ws.send(JSON.stringify(obj)); return true; } catch(e){ console.warn('WS send failed', e); return false; }
  }
  function close() { if (ws) try{ ws.close(); }catch(e){} ws=null; }
  return { connect, send, close, get url(){return url;} };
}
