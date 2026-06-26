export function createCalibration(){
  return {
    start: ()=>console.log('calibration start (stub)'),
    stop: ()=>console.log('calibration stop (stub)'),
    getTransforms: ()=>[]
  };
}
