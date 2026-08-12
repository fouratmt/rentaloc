(function initializeInstallExperience() {
  const installButton = document.querySelector("#installButton");
  const installOverlay = document.querySelector("#installOverlay");
  const installCloseButton = document.querySelector("#installCloseButton");
  const installInstructions = document.querySelector("#installInstructions");
  const networkStatus = document.querySelector("#networkStatus");
  const updateButton = document.querySelector("#updateButton");
  const updateStatus = document.querySelector("#updateStatus");
  let deferredInstallPrompt = null;
  let serviceWorkerRegistration = null;
  let updateRequested = false;

  function updateConnectivityStatus() {
    const online = navigator.onLine !== false;
    if (networkStatus) {
      networkStatus.textContent = online ? "En ligne" : "Hors connexion — calculs et sauvegardes locales disponibles";
    }
    document.body.classList.toggle("is-offline", !online);
  }

  function exposeWaitingUpdate(registration) {
    if (!updateButton || !registration.waiting || !navigator.serviceWorker.controller) return;
    serviceWorkerRegistration = registration;
    updateButton.hidden = false;
    if (updateStatus) updateStatus.textContent = "Une nouvelle version de RentaLoc est prête.";
  }

  function watchForUpdates(registration) {
    serviceWorkerRegistration = registration;
    exposeWaitingUpdate(registration);
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") exposeWaitingUpdate(registration);
      });
    });
  }

  window.addEventListener("online", updateConnectivityStatus);
  window.addEventListener("offline", updateConnectivityStatus);
  updateConnectivityStatus();

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./", updateViaCache: "none" })
        .then((registration) => {
          watchForUpdates(registration);
          return registration.update();
        })
        .catch(() => {
          if (updateStatus) updateStatus.textContent = "La vérification des mises à jour est indisponible.";
        });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (updateRequested) window.location.reload();
    });
  }

  updateButton?.addEventListener("click", () => {
    const guard = new CustomEvent("rentaloc:before-update", { cancelable: true });
    if (!window.dispatchEvent(guard)) return;
    const waitingWorker = serviceWorkerRegistration?.waiting;
    if (!waitingWorker) {
      if (updateStatus) updateStatus.textContent = "La nouvelle version n'est plus disponible. Réessayez plus tard.";
      updateButton.hidden = true;
      return;
    }
    updateRequested = true;
    updateButton.disabled = true;
    updateButton.textContent = "Actualisation…";
    if (updateStatus) updateStatus.textContent = "Installation de la nouvelle version.";
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  });

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
