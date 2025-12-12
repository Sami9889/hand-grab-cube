// tracking.js — encapsulates MediaPipe Hands / Pose / FaceMesh and emits unified events
export async function createTracking({ onEvent, perfMode = false } = {}) {
  // load libs available on the page (index.html includes mediapipe scripts)
  const HandsCls = window.Hands;
  const PoseCls = window.Pose;
  const FaceMeshCls = window.FaceMesh;
  const CameraCls = window.Camera;

  const hands = new HandsCls({ locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
  const pose = new PoseCls({ locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
  const faceMesh = new FaceMeshCls({ locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });

  let active = 'pose';
  let frameInterval = perfMode ? 66 : 33;
  let processFrame = true;
  // collections for multi-camera pose instances
  const poseCams = [];

  function emit(type, data) { if (onEvent) onEvent({ type, data }); window.dispatchEvent(new CustomEvent('tracking-event', { detail: { type, data } })); }

  function applyPerf(p) {
    perfMode = !!p;
    frameInterval = perfMode ? 66 : 33;
    hands.setOptions({ maxNumHands: 1, modelComplexity: perfMode?0:1, minDetectionConfidence: perfMode?0.45:0.6, minTrackingConfidence: perfMode?0.45:0.6 });
    pose.setOptions({ modelComplexity: perfMode?0:1, smoothLandmarks: true, minDetectionConfidence: perfMode?0.45:0.6 });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: perfMode?false:true, minDetectionConfidence: perfMode?0.45:0.6 });
    emit('perf', { perfMode });
  }

  hands.onResults((r)=>{
    if (active!=='hands') return;
    // emit hands plus a simple pinch gesture detection (thumb tip 4 vs index tip 8)
    const handsOut = [];
    const lm = r.multiHandLandmarks || [];
    const hh = r.multiHandedness || [];
    // maintain last pinch state per hand index
    if (!hands.__lastPinch) hands.__lastPinch = [];
    for (let i=0;i<lm.length;i++){
      const l = lm[i];
      const handedness = (hh[i] && hh[i].label) || null;
      const score = (hh[i] && hh[i].score) || null;
      let gesture = { pinch: false, pinchStrength: 0 };
      try {
        const t4 = l[4]; const t8 = l[8];
        if (t4 && t8) {
          // compute euclidean distance in normalized coords
          const dx = t4.x - t8.x; const dy = t4.y - t8.y; const dz = (t4.z||0) - (t8.z||0);
          const d = Math.sqrt(dx*dx+dy*dy+dz*dz);
          // estimate scale by distance between wrist(0) and middle-finger-mcp(9)
          const sBase = (l[0] && l[9]) ? Math.hypot(l[0].x-l[9].x, l[0].y-l[9].y) : 0.1;
          const strength = Math.max(0, Math.min(1, 1 - (d / (sBase * 1.6))));
          gesture.pinchStrength = strength;
          gesture.pinch = strength > 0.45;
        }
      } catch(e){}
      const prev = !!hands.__lastPinch[i];
      hands.__lastPinch[i] = gesture.pinch;
      // also emit high-level CustomEvent for quick listeners
      if (gesture.pinch && !prev) window.dispatchEvent(new CustomEvent('hand-gesture', { detail: { type: 'pinchstart', index: i, handedness, strength: gesture.pinchStrength } }));
      if (!gesture.pinch && prev) window.dispatchEvent(new CustomEvent('hand-gesture', { detail: { type: 'pinchend', index: i, handedness, strength: gesture.pinchStrength } }));
      handsOut.push({ landmarks: l, handedness, score, gesture });
    }
    emit('hands', handsOut);
  });

  pose.onResults((r)=>{
    if (active!=='pose') return;
    // poseLandmarks include .visibility for many points
    emit('pose', { landmarks: r.poseLandmarks || [], worldLandmarks: r.poseWorldLandmarks || null });
  });

  faceMesh.onResults((r)=>{
    if (active!=='face') return;
    const m = r.multiFaceLandmarks && r.multiFaceLandmarks[0];
    emit('face', { landmarks: m ? m : [], annotations: r.faceLandmarks || null });
  });

  // startCamera supports an explicit deviceId via getUserMedia or falls back to MediaPipe Camera util
  function startCamera(videoEl, { width=1280, height=720, deviceId=null } = {}) {
    if (!videoEl) { console.error('[etcGrab] startCamera: no videoEl'); return; }
    console.log('[etcGrab] startCamera START', { deviceId, width, height });
    // stop existing
    stopCamera();
    if (deviceId) {
      let raf = null;
      let stream = null;
      const sendFrame = async ()=>{
        if (!videoEl || videoEl.readyState < 2) { raf = requestAnimationFrame(sendFrame); return; }
        if (!processFrame) { raf = requestAnimationFrame(sendFrame); return; }
        processFrame = false;
        try {
          if (active === 'hands') await hands.send({ image: videoEl });
          else if (active === 'pose') await pose.send({ image: videoEl });
          else if (active === 'face') await faceMesh.send({ image: videoEl });
        } catch(e){}
        setTimeout(()=>{ processFrame = true; }, frameInterval);
        raf = requestAnimationFrame(sendFrame);
      };
      const camIdx = poseCams.length;
      const myPose = new PoseCls({ locateFile: (f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      myPose.setOptions({ modelComplexity: perfMode?0:1, smoothLandmarks: true, minDetectionConfidence: perfMode?0.45:0.6 });
      myPose.onResults((r)=>{ const data = { landmarks: r.poseLandmarks || [], worldLandmarks: r.poseWorldLandmarks || null }; emit('pose', { ...data, cameraIndex: camIdx }); });
      const camHandle = { stop: ()=>{ try{ console.log('[etcGrab] stopping cam',camIdx); if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t=>t.stop()); }catch(e){ console.error('stop err',e); } }, videoEl, pose: myPose };
      poseCams.push(camHandle);
      const start = async ()=>{
        try {
          console.log('[etcGrab] requesting camera', deviceId);
          stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId }, width, height } });
          console.log('[etcGrab] got stream, setting video');
          videoEl.srcObject = stream;
          await new Promise(r=>{ videoEl.onloadedmetadata = r; });
          await videoEl.play();
          console.log('[etcGrab] video playing, starting loop');
          emit('camera-ready', { index: camIdx, deviceId });
          async function sendFrameWithPose(){ if (!videoEl || videoEl.readyState<2) { raf = requestAnimationFrame(sendFrameWithPose); return; } if (!processFrame){ raf = requestAnimationFrame(sendFrameWithPose); return; } processFrame=false; try{ await myPose.send({ image: videoEl }); }catch(e){ console.error('[etcGrab] pose.send err',e); } setTimeout(()=>{ processFrame = true; }, frameInterval); raf = requestAnimationFrame(sendFrameWithPose); }
          raf = requestAnimationFrame(sendFrameWithPose);
        } catch (e) {
          console.error('[etcGrab] startCamera failed', e);
          emit('camera-error', { index: camIdx, error: e.message });
        }
      };
      start();
      return camHandle;
    }
    // fallback: use MediaPipe Camera helper
    console.log('[etcGrab] using MediaPipe Camera helper (no deviceId)');
    cam = new CameraCls(videoEl, { onFrame: async ()=>{
      if (!processFrame) return; processFrame = false;
      try {
        if (active === 'pose') await pose.send({ image: videoEl });
        else if (active === 'hands') await hands.send({ image: videoEl });
        else if (active === 'face') await faceMesh.send({ image: videoEl });
      } catch(e){ console.error('[etcGrab] MediaPipe send err',e); }
      setTimeout(()=>{ processFrame = true; }, frameInterval);
    }, width, height });
    try { emit('camera-ready', { mode: 'mediapipe' }); return cam.start(); } catch(e) { console.error('[etcGrab] cam.start() failed',e); throw e; }
  }

  function stopCamera(handle){ try{ if (!handle){ // stop all
      poseCams.forEach(c=>{ try{ c.stop(); if (c.pose && typeof c.pose.close === 'function') c.pose.close(); }catch(e){} }); poseCams.length=0; }
    else { try{ handle.stop(); const idx = poseCams.indexOf(handle); if (idx>=0) poseCams.splice(idx,1); if (handle.pose && typeof handle.pose.close === 'function') handle.pose.close(); }catch(e){} } }catch(e){} }

  function useTestVideo(videoEl, url) {
    stopCamera();
    videoEl.src = url; videoEl.loop = true; return videoEl.play();
  }

  function setActive(mode) { active = mode; emit('mode', { mode }); }

  applyPerf(perfMode);

  return { startCamera, stopCamera, useTestVideo, setActive, applyPerf };
}
