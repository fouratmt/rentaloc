(function initializeInstallExperience() {
  const installButton = document.querySelector("#installButton");
  const installOverlay = document.querySelector("#installOverlay");
  const installCloseButton = document.querySelector("#installCloseButton");
  const installInstructions = document.querySelector("#installInstructions");
  let deferredInstallPrompt = null;

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./", updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => {
          // Both pages remain usable online if service workers are unavailable.
        });
    });
  }

  if (!installButton || !installOverlay || !installCloseButton || !installInstructions) return;

  function isInstalledApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function setInstallButtonVisibility() {
    const shouldShow = !isInstalledApp();
    installButton.hidden = !shouldShow;
    document.body.classList.toggle("install-available", shouldShow);
  }

  function updateInstallInstructions() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleMobile =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isSafari = userAgent.includes("safari") && !userAgent.includes("chrome") && !userAgent.includes("chromium");

    if (isAppleMobile) {
      installInstructions.textContent =
        "Touchez le bouton Partager de votre navigateur, puis choisissez « Sur l'écran d'accueil » et confirmez avec « Ajouter ».";
    } else if (isSafari) {
      installInstructions.textContent =
        "Dans Safari, ouvrez le menu Fichier puis choisissez « Ajouter au Dock ». Sur iPhone ou iPad, utilisez Partager puis « Sur l'écran d'accueil ».";
    } else {
      installInstructions.textContent =
        "Ouvrez le menu de votre navigateur, puis choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ». Chrome et Edge affichent aussi une icône d'installation dans la barre d'adresse.";
    }
  }

  function openInstallOverlay() {
    updateInstallInstructions();
    document.body.classList.add("modal-open");
    if (typeof installOverlay.showModal === "function") installOverlay.showModal();
    else installOverlay.setAttribute("open", "");
    installCloseButton.focus();
  }

  function closeInstallOverlay() {
    if (installOverlay.open && typeof installOverlay.close === "function") installOverlay.close();
    else installOverlay.removeAttribute("open");
  }

  async function requestInstall() {
    if (!deferredInstallPrompt) {
      openInstallOverlay();
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  }

  installButton.addEventListener("click", requestInstall);
  installCloseButton.addEventListener("click", closeInstallOverlay);
  installOverlay.addEventListener("click", (event) => {
    if (event.target === installOverlay) closeInstallOverlay();
  });
  installOverlay.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    if (!installButton.hidden) installButton.focus();
  });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallButtonVisibility();
  });
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installOverlay.open) closeInstallOverlay();
    setInstallButtonVisibility();
  });

  setInstallButtonVisibility();
})();
