import { getAvailability } from "./availability.js";
import { demoStepAt } from "./demo-timeline.js";
const availability = getAvailability({
  enabled: import.meta.env.VITE_RAYCAST_AVAILABLE,
  storeUrl: import.meta.env.VITE_RAYCAST_STORE_URL,
});
document.querySelectorAll("[data-availability]").forEach((link) => {
  link.textContent = availability.label;
  link.href = availability.href;
});
const video = document.querySelector("#demo-video");
const steps = [...document.querySelectorAll(".step")];
const pause = document.querySelector("#pause");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const videoSource = video.getAttribute("src");
let userPaused = false;
function updateStep(time) {
  steps.forEach((step, index) =>
    step.classList.toggle("active", index === demoStepAt(time)),
  );
}
function updatePause() {
  const paused = video.paused || reducedMotion.matches;
  pause.textContent = paused ? "▶" : "Ⅱ";
  pause.disabled = reducedMotion.matches;
  pause.setAttribute(
    "aria-label",
    reducedMotion.matches
      ? "Demonstration paused for reduced motion"
      : paused
        ? "Play demonstration"
        : "Pause demonstration",
  );
}
async function play() {
  if (reducedMotion.matches || document.hidden || userPaused) return;
  try {
    await video.play();
  } catch {
    /* Keep the poster and Play action if autoplay is blocked. */
  }
  updatePause();
}
function applyMotionPreference() {
  video.pause();
  if (reducedMotion.matches) {
    video.removeAttribute("src");
    video.load();
    updateStep(Infinity);
  } else {
    if (!video.getAttribute("src")) video.setAttribute("src", videoSource);
    updateStep(video.currentTime);
    play();
  }
  updatePause();
}
pause.addEventListener("click", () => {
  userPaused = !video.paused;
  if (userPaused) video.pause();
  else play();
  updatePause();
});
document.querySelector("#replay").addEventListener("click", () => {
  document
    .querySelector(".demo")
    .scrollIntoView({
      block: "center",
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  if (reducedMotion.matches) return;
  userPaused = false;
  video.currentTime = 0;
  updateStep(0);
  play();
});
video.addEventListener("timeupdate", () => updateStep(video.currentTime));
video.addEventListener("play", updatePause);
video.addEventListener("pause", updatePause);
video.addEventListener("canplay", play);
video.addEventListener("error", () => {
  video.removeAttribute("src");
  video.load();
  updateStep(Infinity);
  pause.disabled = true;
  pause.setAttribute("aria-label", "Demonstration unavailable");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) video.pause();
  else play();
});
reducedMotion.addEventListener("change", applyMotionPreference);
applyMotionPreference();
