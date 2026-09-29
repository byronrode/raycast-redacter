import React from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DEMO_TIMING } from "../../demo-timeline.js";
import "./style.css";

/* Storyboard: generic launcher → actual canvas → redact → frame → copy.
   UI frames are screenshots of the shipped editor, using fictional content. */
const SHOTS = [
  { name: "open", at: DEMO_TIMING.open },
  { name: "email-redacted", at: 2.65 },
  { name: "redacted", at: DEMO_TIMING.redact },
  { name: "framed", at: DEMO_TIMING.frame },
  { name: "copied", at: DEMO_TIMING.copy },
];
const ease = (frame, from, to, output = [0, 1]) =>
  interpolate(frame, [from, to], output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
function Demo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const launcherExit = ease(
    frame,
    DEMO_TIMING.open * fps - 8,
    DEMO_TIMING.open * fps + 8,
  );
  const typed = "redact".slice(0, Math.floor(ease(frame, 6, 20, [0, 6])));
  const cursorX = interpolate(
    time,
    [0, 1.2, 1.9, 2.55, 2.8, 3.15, 4.8, 5.5, 7.1, 8.2, 10.8],
    [745, 745, 447, 652, 495, 713, 726, 726, 810, 810, 810],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cursorY = interpolate(
    time,
    [0, 1.2, 1.9, 2.55, 2.8, 3.15, 4.8, 5.5, 7.1, 8.2, 10.8],
    [416, 416, 425, 451, 471, 498, 33, 33, 33, 33, 33],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const clickTimes = [1.18, 2.55, 3.15, 5.5, 8.2];
  const clickAge = Math.min(
    ...clickTimes.map((t) => time - t).filter((age) => age >= 0),
  );
  return (
    <AbsoluteFill style={{ background: "#0b0b0f" }}>
      {SHOTS.map((shot, i) => (
        <Img
          key={shot.name}
          src={staticFile(`shots/${shot.name}.png`)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            opacity:
              i === 0 ? 1 : ease(frame, shot.at * fps - 3, shot.at * fps + 3),
          }}
        />
      ))}
      <AbsoluteFill
        style={{
          opacity: 1 - launcherExit,
          background: "#e9ecde",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          className="launcher"
          style={{
            transform: `translateY(${-launcherExit * 20}px) scale(${1 - launcherExit * 0.04})`,
          }}
        >
          <div className="search">
            <span>⌕</span>
            {typed}
            <span className="caret" />
          </div>
          <div className="launcher-result">
            <Img src={staticFile("icon.svg")} />
            <div>
              Open Redaction Canvas<small>Cloakshot</small>
            </div>
            <span className="return">↵</span>
          </div>
        </div>
      </AbsoluteFill>
      {clickAge < 0.45 && (
        <div
          style={{
            position: "absolute",
            left: cursorX - 13,
            top: cursorY - 13,
            width: 26,
            height: 26,
            border: "3px solid #9b87ff",
            borderRadius: "50%",
            opacity: 1 - clickAge / 0.45,
            transform: `scale(${1 + clickAge * 3})`,
          }}
        />
      )}
      <svg
        viewBox="0 0 24 30"
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          width: 22,
          height: 28,
          filter: "drop-shadow(0 2px 3px #0008)",
        }}
      >
        <path
          d="M2 1 L2 25 L8 19 L13 29 L18 26 L13 17 L23 17 Z"
          fill="white"
          stroke="#141419"
          strokeWidth="1.5"
        />
      </svg>
    </AbsoluteFill>
  );
}
registerRoot(() => (
  <Composition
    id="Cloakshot"
    component={Demo}
    durationInFrames={Math.round(DEMO_TIMING.duration * 30)}
    fps={30}
    width={1000}
    height={760}
  />
));
