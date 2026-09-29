export const DEMO_TIMING = {
  open: 1.3,
  redact: 3.2,
  frame: 5.6,
  copy: 8.3,
  duration: 10.8,
};
export function demoStepAt(time) {
  if (time >= DEMO_TIMING.copy) return 3;
  if (time >= DEMO_TIMING.frame) return 2;
  if (time >= DEMO_TIMING.redact) return 1;
  return 0;
}
