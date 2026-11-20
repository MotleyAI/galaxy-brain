import { useState } from "react";

const LEVELS = ["Number", "Split", "Mix", "Segments", "Analysis"];

export function App() {
  const [level, setLevel] = useState(0);
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "48px auto", padding: "0 16px" }}>
      <h1>slayer-zoom</h1>
      <p>One question, answered at the granularity you choose.</p>
      <label htmlFor="granularity">Granularity: {LEVELS[level]}</label>
      <input
        id="granularity"
        type="range"
        min={0}
        max={LEVELS.length - 1}
        value={level}
        onChange={(event) => setLevel(Number(event.target.value))}
        style={{ width: "100%" }}
      />
    </main>
  );
}
