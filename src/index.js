const { app, BrowserWindow, autoUpdater } = require("electron");
const log = require("electron-log");
const ipcMain = require("electron").ipcMain;
const DOMAIN = "https://releases.poscon.net/files";
const suffix =
  process.platform === "darwin"
    ? `/RELEASES.json?method=JSON&version=${app.getVersion()}`
    : "";
const path = require('path');
const { dialog } = require("electron");
const isDev = require('electron-is-dev');
const gotTheLock = app.requestSingleInstanceLock();
const fs = require('fs');
const settings = require('electron-settings');
const { performance } = require('perf_hooks');
var shell = require('shelljs');

let buildChannel = "Beta";

//appdata/roaming/
//dialog.showErrorBox("Test", process.env.APPDATA);

//output current environment
log.info("Developer Env: " + isDev);

var demo = require("poscon-api-down");

//ideal directory structure is as follows:
// ../appdata/Roaming/POSCON
//../appdata/Roaming/POSCON/P3D Client
//../appdata/Roaming/POSCON/Radar Client

//settings.deleteAll();
settings.set('config.DefaultPOSCONDirectory', process.env.APPDATA + '\\POSCON\\');

var xpDir = settings.get('config.XPlaneDirectory');
var p3dDir = settings.get('config.P3DDirectory');
var pluginDir = settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\';
var modelDir = settings.get('config.XPlaneDirectory') + '\\Models\\';
var POSCONDir = settings.get('config.DefaultPOSCONDirectory'); 
var radarDirectory; //@TODO


log.info('CONFIG:::' + xpDir + " " + p3dDir + " " + pluginDir + " " + modelDir);

//monitor this..purpose is to prevent app from running while installing
//not sure if this will cause future issues or not.
if (require('electron-squirrel-startup')) return app.quit();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let loaderWindow;
let mainWindow;
let updaterWindow;

const createLoader = () => {
  // Create the browser window.
  loaderWindow = new BrowserWindow({
    width: 400,
    height: 400,
    webPreferences: { webSecurity: false, allowRunningInsecureContent: true },
    frame: false,
    resizable: false,
    icon: path.join(__dirname, 'assets/icons/ico/asset_4.ico')
  });

  log.info("loaderWindow created");

  //make app single instance
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if(loaderWindow) {
        if(loaderWindow.isMinimized()) loaderWindow.restore()
        loaderWindow.focus();
      }
    })
  }

  // and load the index.html of the app.
  loaderWindow.loadURL(`file:///${__dirname}/loader.html`);
  log.info("Loaded loaderWindow");

  // Open the DevTools.
  //loaderWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  loaderWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    loaderWindow = null;
  });
}

const createUpdater = () => {
  // Create the browser window.
  updaterWindow = new BrowserWindow({
    width: 600,
    height: 250,
    webPreferences: { webSecurity: false, allowRunningInsecureContent: true },
    frame: false,
    resizable: false,
    icon: path.join(__dirname, 'assets/icons/ico/asset_4.ico')
  });

  log.info("updaterWindow created");

  //make app single instance
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if(updaterWindow) {
        if(updaterWindow.isMinimized()) updaterWindow.restore()
        updaterWindow.focus();
      }
    })
  }

  // and load the index.html of the app.
  updaterWindow.loadURL(`file:///${__dirname}/clientUpdater.html`);
  log.info("Loaded updaterWindow");

  // Open the DevTools.
  //updaterWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  updaterWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    updaterWindow = null;
  });
}

const createMain = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: { webSecurity: false, allowRunningInsecureContent: true, nodeIntegration: true },
    frame: false,
    resizable: false,
    icon: path.join(__dirname, 'assets/icons/ico/asset_4.ico')
  });

  log.info("mainWindow created");

  //make app single instance
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if(mainWindow) {
        if(mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus();
      }
    })
  }

  // and load the index.html of the app.
  mainWindow.loadURL(`file:///${__dirname}/index.html`);
  log.info("Loaded mainWindow");

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    app.quit();
  });

  app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", function() {
  log.info("App is ready...");
  var temp = settings.get("config.P3DDirectory");
  if(temp == null) {
    //p3ddir includes appdata dir
    shell.mkdir('-p', process.env.APPDATA + "\\POSCON\\P3D Pilot Client\\");
  }
  

  ipcMain.on('load-xp-dir', function(event, arg) {
    log.info('Rx load xp dir from config');

    updaterWindow.webContents.send('load-xp-dir-resp', settings.get('config.XPlaneDirectory'));
  });

  ipcMain.on('load-p3d-dir', function(event, arg) {
    log.info('Rx load p3d dir from config');

    updaterWindow.webContents.send('load-p3d-dir-resp', settings.get('config.P3DDirectory'));
  });

  ipcMain.on('show-client-updater', function() {
    log.info('Rx show client updater');
    createUpdater();
  });

  ipcMain.on('clear-settings', () => {
    log.info("Received clear settings request!");
    settings.deleteAll();
    log.warn("All settings deleted!");
  })

  ipcMain.on('show-ofd-xp', function() {
    log.info('Rx show ofd xp');
    let ofdXP;
    try {
      ofdXP = dialog.showOpenDialog({
        title: "Select your XPlane base Directory",
        defaultPath: "C:\\", 
        properties: ['openDirectory'] 
      });
      let filePathXP = ofdXP.toString();

      log.info("OFDXP: " + filePathXP);
      updaterWindow.webContents.send('ofd-result-xp', filePathXP);
  
      //@TODO: NEED TO WRITE THIS FILEPATH TO CONFIG.JSON NOW!!!
      writeConfigXP(filePathXP);
    } catch (err) {
      log.error("ERROR: " + err);
    }

  });

  ipcMain.on('show-ofd-p3d', function() {
    log.info('Rx show ofd p3d:::::::::::::::::::::::::::::::::::::::');
    var defaultDir = settings.get('config.P3DDirectory');

    if(settings.get('config.P3DDirectory') != null) {
      
    
      if(defaultDir.includes(process.env.APPDATA) || defaultDir == null) {
        defaultDir = process.env.APPDATA + "\\POSCON\\P3D Pilot Client\\";
      } else {
        defaultDir = settings.get('config.P3DDirectory');
      }
    } else {
      defaultDir = process.env.APPDATA + "\\POSCON\\P3D Pilot Client\\";
    }
    

    let ofdP3D;
    try {
      ofdP3D = dialog.showOpenDialog({ 
        title: "Select your P3D Pilot Client directory(Default is AppData/Roaming/POSCON/P3D Pilot Client/)",
        defaultPath: defaultDir,
        properties: ['openDirectory'] 
      });
      let filePathP3D = ofdP3D.toString() + "\\";

      if(!filePathP3D.includes("Pilot Client")) {
        filePathP3D = filePathP3D + "\\P3D Pilot Client\\"
      }

      log.info("OFDP3D: " + filePathP3D);
      updaterWindow.webContents.send('ofd-result-p3d', filePathP3D);
  
      writeConfigP3D(filePathP3D);
    } catch (err) {
      log.error("ERROR(OFD): " + err);
    }
  
  });

  //********CHECK XPLANE UPDATES */
  if(buildChannel == "Beta"){
    ipcMain.on('check-xp-updates', function() {
      log.info('Rx check xplane updates');
      
      demo.checkDownload('cdn.poscon.com', settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\', "MD5", async (result) => {
        if (result) {
          log.info("Client updates found!");
          log.info("Checking: " + settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\');
          //CDN, Download Dir, What client, download item async
          demo.getDownload('cdn.poscon.com', settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\', "MD5", 0, "clients/X-Plane/Beta/POSCON/", async(downResult) => {
            if(downResult == "done") {
              log.info("::::::::::::DONE:::::::::::::");
              updaterWindow.webContents.send('updater-finished-xp');
            }
          },
          
          async(downItemResultXP) => {
            var xFormatResult = downItemResultXP.substring(downItemResultXP.lastIndexOf("/") + 1);
            var xResult = xFormatResult.split(" ")[0];
            log.info("==============DOWN ITEM RESULT===============");
            log.info("xResult: " + xResult);
            updaterWindow.webContents.send('down-item-result-xp', xResult);
          }

          );
          log.info("Finished");
        } else {
          log.info("No client updates available");
          updaterWindow.webContents.send('no-xp-updates');
        }
      }, "clients/X-Plane/Beta/POSCON/");
    });
  }

  //********CHECK P3D UPDATES */
  if(buildChannel == "Beta") {
    ipcMain.on('check-p3d-updates', function() {
      log.info('Rx check p3d updates');

      if(fs.existsSync('config.P3DDirectory') + '\\')
  
      //p3dDir = p3dDir.replace("/", "\\");
      demo.checkDownload('cdn.poscon.com', settings.get('config.P3DDirectory'), "MD5", async (result) => {
        if (result) {
          log.info("P3D client updates found!");
          log.info("Checking: " + settings.get('config.P3DDirectory'));
          demo.getDownload('cdn.poscon.com', settings.get('config.P3DDirectory'), "MD5", 0, "clients/simconnect/beta/", async(downResult) => {
            if(downResult == "done") {
              log.info("::::::::::::DONE:::::::::::::");
              updaterWindow.webContents.send('updater-finished-p3d');
            }
          },
          
          async(downItemResultP3D) => {
            var pFormatResult = downItemResultP3D.substring(downItemResultP3D.lastIndexOf("/") + 1);
            var pResult = pFormatResult.split(" ")[0];
            log.info("==============DOWN ITEM RESULT===============");
            log.info("pResult: " + pResult);
            updaterWindow.webContents.send('down-item-result-p3d', pResult);
          }

          );
          log.info("Finished");
        } else {
          log.info("No p3d client updates available");
          updaterWindow.webContents.send('no-p3d-updates');
        }
      }, "clients/simconnect/beta/");
    });
  }
  

  //********CHECK MODEL UPDATES */
  ipcMain.on('check-model-updates', function() {
    log.info('Rx check model updates');
    var t0 = performance.now();

    pluginDir = pluginDir.replace("/", "\\");

    demo.checkDownload('cdn.poscon.com', settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\Models\\', "MD5", async (result) => {

      if (result) {
        log.info("Model updates found!");
        log.info("Checking: " + settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\Models\\');
        demo.getDownload('cdn.poscon.com', settings.get('config.XPlaneDirectory') + '\\Resources\\plugins\\POSCON\\Models\\', "MD5", 50, "clients/X-Plane/Beta/POSCON/Models/", async(downResult) => {
          if(downResult == "done") {
            var t1 = performance.now();
            var tResult = t1 - t0;
            log.info("::::::::::::DONE:::::::::::::");
            log.info("Total Time: " + tResult + " milliseconds");
            updaterWindow.webContents.send('updater-finished-model', "");
          }
        },
        
        async(downItemResultModel) => {
          var mFormatResult = downItemResultModel.substring(downItemResultModel.lastIndexOf("/") + 1);
          var mResult = mFormatResult.split(" ")[0];
          log.info("==============DOWN ITEM RESULT===============");

          log.info("mResult: " + mResult);

          updaterWindow.webContents.send('down-item-result-model', mResult);
        }

        );
        log.info("Finished");
      } else {
        log.info("No model updates available");
        updaterWindow.webContents.send('no-model-updates');
      }
    }, "clients/X-Plane/Beta/POSCON/Models/");
  });

  //if we are in dev mode we want to skip the updater logic
  if(isDev) {
    createMain();
  } else {
    createLoader();

    ipcMain.on('start-main', function() {
      loaderWindow.close();
      loaderWindow = null;

      createMain();
    });
  }

  if(isDev) {
    //@TODO
    //Add some events here??
  } else {
    loaderWindow.webContents.on("did-finish-load", () => {

      log.info("loaderWindow finished load...");

      //check for updates
      ipcMain.on('online', (event, result) => {
        autoUpdater.checkForUpdates();
      }); 

      ipcMain.on('offline', (event, result) => {
        //@TODO
        //Additional conditions?
        app.quit();
      });

      // *****START AUTO UPDATER LOGIC***** //
      autoUpdater.setFeedURL({
          url: `${DOMAIN}/poscon_launcher_lite/c2e0ea8f40a0680b42134306d5d07eb5/${
          process.platform
          }/${process.arch}${suffix}`,
          serverType: "json"
        }); 
    
        autoUpdater.on("checking-for-update", () => {
          log.info("checking for update in indexjs");
          loaderWindow.webContents.send('update-check');
          log.info("Checking for update in indexjs");
        });
    
        autoUpdater.on('update-available', () => {
          log.info("update available!");
          loaderWindow.webContents.send('update-available');
    
          autoUpdater.on('update-downloaded', function (event,releaseName) {
              // # restart app, then update will be applied
              log.info("update downloaded!");
              loaderWindow.webContents.send('update-dl');
              ipcMain.on('update-install', function(event, arg) {
                autoUpdater.quitAndInstall();
              });
          });
    
        });
    
        autoUpdater.on("update-not-available", info => {
          log.info("update not available");
          loaderWindow.webContents.send("update-not-available");
          updateNotAvail = true;
        });
    
        autoUpdater.on("error", error => {
          log.error("AutoUpdater Error: ");
          log.error(error.message);
          log.error(error.stack);
          log.error(dialog.showErrorBox("Error!", error.message));
        });
        // *****END AUTO UPDATER LOGIC***** //
    });
  }

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if(mainWindow === null) {
      createMain();
    }
  });
});

function writeConfigXP(arg) {
  var dir = arg.replace(/\\\\/g, "\\");
  settings.set('config', {
    XPlaneDirectory: dir,
    P3DDirectory: settings.get('config.P3DDirectory')
  });

  log.info("!!!!!!!!!!!!!CONFIG:" + settings.get('config.XPlaneDirectory'));
}

function writeConfigP3D(arg) {
  var dir = arg.replace(/\\\\/g, "\\");
  settings.set('config', {
    XPlaneDirectory: settings.get('config.XPlaneDirectory'),
    P3DDirectory: dir
  });

  log.info("!!!!!!!!!!!!!CONFIG:" + settings.get('config.P3DDirectory'));
}