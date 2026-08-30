import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw-v320.js").catch(error => {
      console.warn(
        "Service worker do XBPNEUS Racing não foi registrado",
        error
      );
    });
  });
}
