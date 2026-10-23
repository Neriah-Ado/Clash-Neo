import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ToastHost } from "./components/toast";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="liquid-wallpaper" />
    <App />
    <ToastHost />
  </StrictMode>,
);
