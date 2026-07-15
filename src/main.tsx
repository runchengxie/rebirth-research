import { createRoot } from "react-dom/client";
import App from "./App";
import { restoreSessionEnvelopeForUrl } from "./game/sessionEnvelope";
import "./styles.css";
import "./immersive.css";
import "./rebirth.css";
import "./rebirth-v2.css";
import "./research-ux.css";
import "./platform-shell.css";

// Full platform.css is loaded with the lazy committee, daily and studio modes.
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
