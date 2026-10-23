const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

/**
 * Security-hardened shell:
 * - contextIsolation + sandbox on, nodeIntegration off, devTools off —
 *   the renderer only ever sees static assets, no Node surface
 * - webviewTag/experimentalFeatures/insecure-content explicitly off
 * - application menu removed; single-instance lock
 * - network kill-switch: the renderer may only load file:// resources —
 *   subscriptions belong to the core service, never the dashboard
 * - every Electron permission request (camera, mic, notifications, …)
 *   is denied by default
 * - all navigation and window.open denied; external URLs go to the
 *   system browser
 * - strict CSP (see index.html) as the second line of defense
 */

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: "#0b0e1a",
    title: "Clash-Neo",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: false,
      webviewTag: false,
      experimentalFeatures: false,
      allowRunningInsecureContent: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  return win;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    app.on("web-contents-created", (_event, contents) => {
      const session = contents.session;
      // network kill-switch: file:// only, everything else cancelled
      session.webRequest.onBeforeRequest((details, callback) => {
        callback({ cancel: !details.url.startsWith("file://") });
      });
      // deny every permission request (camera/mic/notifications/geolocation/…)
      session.setPermissionRequestHandler((_wc, _permission, callback) =>
        callback(false),
      );
      session.setPermissionCheckHandler(() => false);
    });

    mainWindow = createWindow();
  });

  app.on("window-all-closed", () => app.quit());
}
