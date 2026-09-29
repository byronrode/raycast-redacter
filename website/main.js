/* Storyboard: 0ms launcher, 1300ms canvas, 2300ms redact,
   3900ms frame, 5200ms copy, 7600ms restart. */
const TIMING = {
  openCanvas: 1300,
  redact: 2300,
  frame: 3900,
  copy: 5200,
  restart: 7600,
};
const stage = document.querySelector(".demo-stage");
const steps = [...document.querySelectorAll(".step")];
const pause = document.querySelector("#pause");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let timers = [];
let paused = reducedMotion.matches;
function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}
function setStage(value) {
  stage.dataset.stage = String(value);
  steps.forEach((step, index) =>
    step.classList.toggle("active", index === Math.max(0, value - 1)),
  );
}
function replay() {
  clearTimers();
  if (paused) {
    setStage(4);
    return;
  }
  setStage(0);
  [TIMING.openCanvas, TIMING.redact, TIMING.frame, TIMING.copy].forEach(
    (delay, i) => {
      timers.push(setTimeout(() => setStage(i + 1), delay));
    },
  );
  timers.push(setTimeout(replay, TIMING.restart));
}
function updatePause() {
  pause.textContent = paused ? "▶" : "Ⅱ";
  pause.setAttribute(
    "aria-label",
    paused ? "Play demonstration" : "Pause demonstration",
  );
}
pause.addEventListener("click", () => {
  paused = !paused;
  updatePause();
  paused ? clearTimers() : replay();
});
document.querySelector("#replay").addEventListener("click", () => {
  document
    .querySelector(".demo")
    .scrollIntoView({
      block: "center",
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  if (reducedMotion.matches) {
    setStage(4);
    return;
  }
  paused = false;
  updatePause();
  replay();
});
document.addEventListener("visibilitychange", () => {
  document.hidden ? clearTimers() : replay();
});
reducedMotion.addEventListener("change", () => {
  paused = reducedMotion.matches;
  updatePause();
  replay();
});
updatePause();
replay();
