import { createRoot } from "react-dom/client";
import App from "./App";
import { restoreSessionEnvelopeForUrl } from "./game/sessionEnvelope";
import "./styles.css";
import "./immersive.css";
import "./rebirth.css";
import "./rebirth-v2.css";
import "./research-ux.css";
import "./career-guidance.css";
import "./debate-glossary.css";
import "./career-responsive.css";
import "./career-score.css";
import "./platform-shell.css";
import "./settings-polish.css";
import "./stability.css";

// Full platform.css and platform-polish.css are loaded with the lazy platform modes.
try {
  restoreSessionEnvelopeForUrl(localStorage, window.location.search);
} catch {
  // Storage may be unavailable in strict privacy modes.
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(<App />);
