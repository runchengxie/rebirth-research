import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./immersive.css";
import "./rebirth.css";
import "./rebirth-v2.css";
import "./timeline.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

createRoot(root).render(<App />);
