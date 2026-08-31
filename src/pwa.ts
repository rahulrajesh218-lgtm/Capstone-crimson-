import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function getStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function getIosSafari() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && isWebKit && !isOtherIosBrowser;
}

export function registerPwa() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloadingForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !reloadingForUpdate) {
        reloadingForUpdate = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update();
        window.setInterval(() => registration.update(), 60 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registration.update();
        });
      })
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => getStandaloneMode());
  const [isIosSafari] = useState(() => getIosSafari());

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const modeChanged = () => setIsStandalone(getStandaloneMode());

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    displayMode.addEventListener("change", modeChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
      displayMode.removeEventListener("change", modeChanged);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  return {
    canInstall: Boolean(installPrompt) && !isStandalone,
    install,
    isIosSafari: isIosSafari && !isStandalone,
    isStandalone,
  };
}
