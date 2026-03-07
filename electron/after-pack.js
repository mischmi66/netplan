const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  console.log('AfterPack-Hook ausgeführt für:', context.packager.platform.name);
  
  const appOutDir = context.appOutDir;
  const resourcesPath = path.join(appOutDir, 'resources');
  
  // Sicherstellen, dass der server-Ordner existiert
  const serverDestPath = path.join(resourcesPath, 'server');
  const serverSrcPath = path.join(__dirname, '..', 'server');
  
  if (!fs.existsSync(serverDestPath)) {
    console.log('Kopiere server-Verzeichnis nach:', serverDestPath);
    
    // Rekursiv kopieren
    const copyRecursive = (src, dest) => {
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursive(
            path.join(src, childItemName),
            path.join(dest, childItemName)
          );
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursive(serverSrcPath, serverDestPath);
    console.log('Server-Verzeichnis erfolgreich kopiert');
  }
  
  // Main.js anpassen für gepackte App
  const mainJsPath = path.join(appOutDir, context.packager.appInfo.productName + '.app', 'Contents', 'Resources', 'app', 'electron', 'main.js');
  
  if (fs.existsSync(mainJsPath)) {
    let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
    
    // Pfade anpassen für gepackte App
    mainJsContent = mainJsContent.replace(
      "const backendPath = path.join(__dirname, '../server/index.js');",
      "const backendPath = path.join(__dirname, '../../server/index.js');"
    );
    
    mainJsContent = mainJsContent.replace(
      "const indexPath = path.join(__dirname, '../dist/index.html');",
      "const indexPath = path.join(__dirname, '../../dist/index.html');"
    );
    
    fs.writeFileSync(mainJsPath, mainJsContent);
    console.log('Main.js für gepackte App angepasst');
  }
};