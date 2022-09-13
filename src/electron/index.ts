import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Notification,
  // nativeImage
} from "electron";
import fs from "fs";
import path, { join } from "path";
import { parse } from "url";
import { autoUpdater } from "electron-updater";
import download from "download";
import AdmZip from "adm-zip";
import sudo from "sudo-prompt";

import logger from "./utils/logger";
import settings from "./utils/settings";

const isProd = process.env.NODE_ENV === "production" || app.isPackaged;

logger.info("App starting...");
settings.set("check", true);
logger.info("Checking if settings store works correctly.");
logger.info(settings.get("check") ? "Settings store works correctly." : "Settings store has a problem.");

let mainWindow: BrowserWindow | null;
let notification: Notification | null;

const handleFileOpen = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({});
  if (canceled) {
    return;
  } else {
    return filePaths[0];
  }
};
const handleInstallAddon = async (args: { name: string; url: string; version: string }) => {
  // console.log('installing addon', args);
  const dir: string = settings.get("wowDirectory");
  if (!dir) {
    await handleSetWoWDirectory();
  }
  const addonFolder = path.join(dir, "_retail_", "Interface", "AddOns");
  const veilStagingDir = path.join(dir, "_retail_", "Interface", "VeilApp", "Staging");
  // console.log(veilStagingDir);
  if (!fs.existsSync(veilStagingDir)) {
    fs.mkdirSync(veilStagingDir, { recursive: true });
  }
  const veilBackup = path.join(dir, "_retail_", "Interface", "VeilApp", "Backup");
  if (!fs.existsSync(veilBackup)) {
    fs.mkdirSync(veilBackup, { recursive: true });
  }
  // download file from url
  await download(args.url, veilStagingDir, { filename: `${args.name}.zip` });
  const zip = new AdmZip(path.join(veilStagingDir, `${args.name}.zip`));
  zip.extractAllTo(veilStagingDir, true);
  fs.unlinkSync(path.join(veilStagingDir, `${args.name}.zip`));
  // get all files in folder
  const files = fs.readdirSync(veilStagingDir);
  const promises: Promise<any>[] = [];
  files.forEach((folderName) => {
    const options = {
      name: "Electron",
      icns: "/Applications/Electron.app/Contents/Resources/Electron.icns", // (optional)
    };
    const addonFolderPath = path.join(addonFolder, folderName);
    const backupPath = path.join(veilBackup, folderName);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const promise = new Promise((resolve, _reject) => {
      if (fs.existsSync(backupPath)) {
        fs.rmdirSync(backupPath, { recursive: true });
      }
      if (fs.existsSync(addonFolderPath)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sudo.exec(`robocopy "${addonFolderPath}" "${backupPath}" /E /MOVE`, options, (_error, stdout, _stderr) => {
          resolve(stdout);
        });
      } else {
        resolve(true);
      }
    });
    promises.push(promise);
    return;
  });
  await Promise.all(promises);
  // copy staging to addon folder
  files.forEach((folderName) => {
    const addonFolderPath = path.join(addonFolder, folderName);
    if (fs.existsSync(addonFolderPath)) {
      // console.log("DIDNT BACK UP??");
      throw new Error("Didnt back up Addon. Something went wrong.");
    } else {
      fs.renameSync(path.join(veilStagingDir, folderName), path.join(addonFolder, folderName));
    }
  });
  // delete staging folder
  fs.rmSync(veilStagingDir, { recursive: true });
  let installed: { [name: string]: string } = settings.get("installedAddons");
  if (!installed) {
    installed = {};
  }
  installed[args.name] = args.version;
  settings.set("installedAddons", installed);
  // console.log(installed);
  return installed;
};

const handleSetWoWDirectory = async (): Promise<string> => {
  const doesExist = fs.existsSync("C:\\Program Files (x86)\\World of Warcraft");
  if (doesExist) {
    const wowPath = "C:\\Program Files (x86)\\World of Warcraft";
    const files = fs.readdirSync(wowPath);
    if (files.includes("Data") && files.includes("_retail_")) {
      settings.set("wowDirectory", wowPath);
      return wowPath;
    }
  }
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  if (canceled) {
    return "";
  } else {
    const files = fs.readdirSync(filePaths[0]);
    if (files.includes("Data") && files.includes("_retail_")) {
      settings.set("wowDirectory", filePaths[0]);
      return filePaths[0];
    } else {
      return handleSetWoWDirectory();
    }
  }
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      devTools: isProd ? true : true,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  const url =
    // process.env.NODE_ENV === "production"
    isProd
      ? // in production, use the statically build version of our application
        `file://${join(__dirname, "public", "index.html")}`
      : // in dev, target the host and port of the local rollup web server
        "http://localhost:5000";

  mainWindow.loadURL(url).catch((err) => {
    logger.error(JSON.stringify(err));
    app.quit();
  });

  if (!isProd) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", () => {
  ipcMain.handle("dialog:openFile", handleFileOpen);
  ipcMain.handle("wow:directory", () => {
    const dir = settings.get("wowDirectory");
    if (dir === "" || dir === undefined) {
      return handleSetWoWDirectory();
    }
    return dir;
  });
  ipcMain.handle("wow:setDirectory", handleSetWoWDirectory);
  ipcMain.handle("addon:install", (_event, args: { name: string; url: string; version: string }) => {
    return handleInstallAddon(args);
  });
  ipcMain.handle("addon:installed", () => {
    const installed: { [name: string]: string } = settings.get("installedAddons");
    return installed || {};
  });
  createWindow();
});

// those two events are completely optional to subscrbe to, but that's a common way to get the
// user experience people expect to have on macOS: do not quit the application directly
// after the user close the last window, instead wait for Command + Q (or equivalent).
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

app.on("web-contents-created", (e, contents) => {
  logger.info(e);
  // Security of webviews
  contents.on("will-attach-webview", (event, webPreferences, params) => {
    logger.info(event, params);
    // Strip away preload scripts if unused or verify their location is legitimate
    delete webPreferences.preload;

    // Disable Node.js integration
    webPreferences.nodeIntegration = false;

    // Verify URL being loaded
    // if (!params.src.startsWith(`file://${join(__dirname)}`)) {
    //   event.preventDefault(); // We do not open anything now
    // }
  });

  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedURL = parse(navigationUrl);
    // In dev mode allow Hot Module Replacement
    if (parsedURL.host !== "localhost:5000" && !isProd) {
      logger.warn("Stopped attempt to open: " + navigationUrl);
      event.preventDefault();
    } else if (isProd) {
      logger.warn("Stopped attempt to open: " + navigationUrl);
      event.preventDefault();
    }
  });
});

if (isProd) {
  autoUpdater.checkForUpdates().catch((err) => {
    logger.error(JSON.stringify(err));
  });
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      logger.error(JSON.stringify(err));
    });
  }, 160000);
}

autoUpdater.logger = logger;

autoUpdater.on("update-available", () => {
  notification = new Notification({
    title: "Veil App",
    body: "Updates are available. Click to download.",
    silent: true,
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
  notification.on("click", () => {
    autoUpdater.downloadUpdate().catch((err) => {
      logger.error(JSON.stringify(err));
    });
  });
});

autoUpdater.on("update-not-available", () => {
  notification = new Notification({
    title: "Veil App",
    body: "Your software is up to date.",
    silent: true,
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
});

autoUpdater.on("update-downloaded", () => {
  notification = new Notification({
    title: "Veil App",
    body: "The updates are ready. Click to quit and install.",
    silent: true,
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
  notification.on("click", () => {
    autoUpdater.quitAndInstall();
  });
});

autoUpdater.on("error", (err) => {
  notification = new Notification({
    title: "Veil App",
    body: JSON.stringify(err),
    // icon: nativeImage.createFromPath(join(__dirname, "..", "assets", "icon.png"),
  });
  notification.show();
});
