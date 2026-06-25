import { createTracking } from './tracking.js';
export async function createMultiTracker(options={}){
  // convenience wrapper to manage multiple tracking instances
  return { start: ()=>console.log('multi tracker start stub'), stop: ()=>console.log('multi tracker stop stub') };
}
