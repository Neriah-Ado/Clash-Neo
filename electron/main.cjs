const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

/**
 * Security-hardened shell:
 * - contextIsolation + sandbox on, nodeIntegration off — the renderer only
 *   ever sees static assets, no Node surface
 * - all navigation and window.open denied: the app is a closed dashboard,
 *   not a browser
 * - strict CSP (see index.html) forbids remote code, eval and mixed content
 */
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
    },
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => app.quit());
app.on("web-contents-created", (_event, contents) => {
  // any link the UI might gain later must open in the OS browser, never
  // inside the shell
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
});
