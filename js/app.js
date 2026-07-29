import { renderShell } from "./ui/shell.js";

function initializeApp() {
  const app = document.querySelector("#app");

  if (!app) {
    throw new Error("Application root was not found");
  }

  renderShell(app);
}

document.addEventListener("DOMContentLoaded", initializeApp);
