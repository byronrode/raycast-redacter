// A scripted fixture: no document loading, OCR, exports, or clipboard access.
document.querySelector("#filename").textContent = "Launch preview.png";
document.querySelector("#effect").value = "solid";
document.querySelector("#mosaicOptions").hidden = true;
document.querySelector("#solidOptions").hidden = false;
document.querySelector("#dimensions").textContent = "570 × 440 px";
document.querySelectorAll("button, select, input").forEach((control) => {
  control.tabIndex = -1;
});
window.addEventListener("message", ({ origin, source, data }) => {
  if (
    origin !== location.origin ||
    source !== parent ||
    data?.type !== "cloakshot-demo-stage" ||
    !Number.isInteger(data.stage) ||
    data.stage < 0 ||
    data.stage > 4
  )
    return;
  document.body.dataset.stage = String(data.stage);
  document.querySelector("#maskCount").textContent =
    data.stage >= 2 ? "2 redactions" : "0 redactions";
  document.querySelector("#framedOutput").checked = data.stage >= 3;
});
parent.postMessage({ type: "cloakshot-demo-ready" }, location.origin);
