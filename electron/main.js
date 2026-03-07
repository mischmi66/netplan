const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

// Prüfen, ob wir uns im Entwicklungsmodus befinden
const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;

function createWindow() {
  // Umgebungsvariablen laden
  try {
    require('dotenv').config();
  } catch (err) {
    console.warn('Dotenv konnte nicht geladen werden, verwende Standardwerte:', err.message);
  }
  
  // Hauptfenster erstellen
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Netplan - Netzwerkplanung'
  });

  // Menü anpassen (Einfaches Menu für bessere UX)
  const template = [
    {
      label: 'Netplan',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Über Netplan',
          click: () => {
            require('electron').dialog.showMessageBox({
              type: 'info',
              title: 'Netplan',
              message: 'Netplan - Netzwerkplanungssoftware\nVersion 1.0.0',
              detail: 'Eine Desktop-Anwendung zur Erstellung von Netzwerkdiagrammen mit PDF-Export.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Backend-Server starten
  startBackendServer();
  
  // Je nach Umgebung unterschiedliche URL laden
  if (isDev) {
    // Entwicklungsmodus: Vite Dev-Server verwenden
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Produktionsmodus: Gebautes Frontend laden
    
    console.log('=== Production Mode ===');
    console.log('App-Pfad:', app.getAppPath());
    console.log('__dirname:', __dirname);
    
    // Versuche verschiedene mögliche Pfade zum dist-Ordner
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),        // Wenn electron/main.js und dist auf gleicher Ebene
      path.join(__dirname, '../../dist/index.html'),     // Wenn electron Unterordner ist
      path.join(app.getAppPath(), 'dist/index.html'),    // Basierend auf App-Pfad
      path.join(process.resourcesPath, 'app.asar/dist/index.html'), // In gepackter App
      path.join(process.resourcesPath, 'app/dist/index.html'),      // In unpacked App
      path.join(app.getAppPath(), 'index.html')          // Direkt im Root
    ];
    
    let indexPathFound = false;
    
    for (const indexPath of possiblePaths) {
      console.log('Versuche index.html zu laden von:', indexPath);
      
      if (fs.existsSync(indexPath)) {
        console.log('Gefunden! Lade index.html von:', indexPath);
        indexPathFound = true;
        
        mainWindow.loadFile(indexPath).then(() => {
          console.log('Frontend erfolgreich geladen!');
        }).catch(err => {
          console.error('Fehler beim Laden der index.html:', err.message);
          tryNextPath(indexPath);
        });
        
        break;
      }
    }
    
    if (!indexPathFound) {
      console.error('Keine index.html in bekannten Pfaden gefunden!');
      showErrorMessage('Frontend nicht gefunden', 'Die Anwendung konnte das Frontend nicht finden. Bitte kontaktieren Sie den Support.');
    }
    
    function tryNextPath(failedPath) {
      // Wenn loadFile fehlschlägt, versuchen wir es mit loadURL
      const fileUrl = `file://${failedPath}`;
      console.log('LoadFile fehlgeschlagen, versuche mit loadURL:', fileUrl);
      
      mainWindow.loadURL(fileUrl).catch(err2 => {
        console.error('Auch loadURL fehlgeschlagen:', err2.message);
        showErrorMessage('Frontend-Ladefehler', 'Die Anwendung konnte das Frontend nicht laden. Bitte kontaktieren Sie den Support.');
      });
    }
    
    function showErrorMessage(title, message) {
      require('electron').dialog.showErrorBox(title, message);
    }
  }

  // Event-Listener für Ladefehler in allen Modi
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Event-Handler für Fensterschließung
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackendServer() {
  try {
    let backendPath;
    
    if (isDev) {
      // Development-Modus: Server aus dem Projektverzeichnis
      backendPath = path.join(__dirname, '../server/index.js');
    } else {
      // Production-Modus: Server aus den App-Ressourcen
      // Bei ASAR: App-Ressourcen müssen aus dem extraResources-Verzeichnis geladen werden
      const serverPath = process.env.SERVER_PATH || 'server';
      backendPath = path.join(process.resourcesPath, serverPath, 'index.js');
    }
    
    console.log('Versuche Backend zu starten von:', backendPath);
    console.log('App-Pfade:', {
      __dirname: __dirname,
      resourcesPath: process.resourcesPath,
      cwd: process.cwd(),
      appPath: app.getAppPath(),
      isDev: isDev
    });
    
    // Prüfen, ob die Backend-Datei existiert
    if (!fs.existsSync(backendPath)) {
      console.error('Backend-Datei nicht gefunden:', backendPath);
      dialog.showMessageBox({
        type: 'error',
        title: 'Backend-Fehler',
        message: `Backend-Server-Datei nicht gefunden: ${backendPath}`,
        detail: 'Die Anwendung kann ohne Backend-Server nicht korrekt funktionieren.'
      });
      return;
    }

    // Backend-Server mit fork starten (funktioniert mit ASAR-Dateien)
    // fork ist eine spezielle Variante von spawn für Node.js-Prozesse
    console.log('Starte Backend-Server mit fork von:', backendPath);
    backendProcess = fork(backendPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: path.dirname(backendPath) // Im selben Verzeichnis wie die Datei starten
    });

    console.log('Backend-Process gestartet:', backendProcess.pid);

    // Event-Handler für Standard-Ausgabe und Fehler
    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
      });
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
      });
    }

    backendProcess.on('close', (code) => {
      console.log(`Backend-Prozess beendet mit Code ${code}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Fehler beim Starten des Backend-Servers:', err);
      dialog.showMessageBox({
        type: 'error',
        title: 'Backend-Server-Fehler',
        message: 'Der Backend-Server konnte nicht gestartet werden.',
        detail: `Fehler: ${err.message}`
      });
    });
  } catch (error) {
    // Fehler abfangen, damit die App nicht abstürzt
    console.error('Schwerwiegender Fehler beim Starten des Backend-Servers:', error);
    dialog.showMessageBox({
      type: 'error',
      title: 'Backend-Server-Fehler',
      message: 'Beim Starten des Backend-Servers ist ein Fehler aufgetreten.',
      detail: `Fehler: ${error.message || error}`
    });
  }
}

// Electron ist bereit
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Alle Fenster schließen (außer auf macOS)
app.on('window-all-closed', () => {
  // Backend-Prozess beenden
  if (backendProcess) {
    backendProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Vor dem Beenden Backend-Prozess beenden
app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Fehlerbehandlung
process.on('uncaughtException', (error) => {
  console.error('Unbehandelter Fehler:', error);
});