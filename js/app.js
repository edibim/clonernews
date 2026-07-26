function initializeApp() {
  const app = document.querySelector("#app");

  if (!app) {
    throw new Error("Application root was not found");
  }

  console.log("ClonerNews initialized");
}

document.addEventListener("DOMContentLoaded", initializeApp);