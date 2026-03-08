import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Funktion zum Erstellen eines PDFs aus dem Canvas
export const exportToPDF = async (containerId: string, projectName: string, location: string) => {
  console.log('PDF-Export-Funktion wird aufgerufen für Container:', containerId);
  
  // Variablen außerhalb des try-Blocks deklarieren für finally-Zugriff
  let originalDisplayStates: Array<{element: HTMLElement, display: string}> = [];
  let originalControlStates: Array<{element: HTMLElement, display: string}> = [];
  let originalMiniMapStates: Array<{element: HTMLElement, display: string}> = [];
  
  
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Canvas-Container nicht gefunden:', containerId);
    return;
  }
  
  try {
    console.log('Starte Export für Projekt:', projectName);
    
    // Vor dem Screenshot müssen wir UI-Elemente ausblenden
    
    // 1. Zugangsdaten-Felder ausblenden
    const credentialFields = container.querySelectorAll('[data-credentials-field]');
    
    credentialFields.forEach(field => {
      const htmlField = field as HTMLElement;
      originalDisplayStates.push({
        element: htmlField,
        display: htmlField.style.display || 'block'
      });
      htmlField.style.display = 'none';
    });
    
    console.log(`Ausgeblendete ${credentialFields.length} Zugangsdaten-Felder`);
    
    // 2. React Flow Controls (Zoom-Buttons) ausblenden
    const controlElements = container.querySelectorAll('.react-flow__controls');
    
    controlElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      originalControlStates.push({
        element: htmlElement,
        display: htmlElement.style.display || 'block'
      });
      htmlElement.style.display = 'none';
    });
    
    console.log(`Ausgeblendete ${controlElements.length} Control-Elemente`);
    
    // 3. MiniMap ausblenden (falls vorhanden)
    const miniMapElements = container.querySelectorAll('.react-flow__minimap');
    
    miniMapElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      originalMiniMapStates.push({
        element: htmlElement,
        display: htmlElement.style.display || 'block'
      });
      htmlElement.style.display = 'none';
    });
    
    console.log(`Ausgeblendete ${miniMapElements.length} MiniMap-Elemente`);
    
    // 4. Logo wird nicht mehr invertiert (transparentes PNG)
    
    // Warte kurz, damit das DOM aktualisiert wird
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Suche nach dem tatsächlichen React Flow Canvas-Inhalt
    const reactFlowCanvas = container.querySelector('.react-flow__renderer') || container;
    
    if (!reactFlowCanvas) {
      throw new Error('React Flow Canvas nicht gefunden');
    }
    
    // Canvas als PNG-Bild erfassen mit html-to-image
    console.log('Erstelle Screenshot des Canvas...');
    const pngDataUrl = await toPng(reactFlowCanvas as HTMLElement, {
      backgroundColor: '#ffffff',
      pixelRatio: 2, // Höhere Auflösung für PDF
      cacheBust: true,
    });
    
    // PNG-Bild erstellen für die Abmessungen
    const pngImage = new Image();
    await new Promise((resolve, reject) => {
      pngImage.onload = resolve;
      pngImage.onerror = reject;
      pngImage.src = pngDataUrl;
    });
    
    console.log('Screenshot erfolgreich erstellt:', pngImage.width, 'x', pngImage.height);
    
    // PDF-Dokument erstellen
    console.log('Erstelle PDF-Dokument...');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
    });
    
    // Versuche, das Logo zu laden und hinzuzufügen
    try {
      // Logo zum PDF hinzufügen
      const logoImg = new Image();
      logoImg.src = import.meta.env.BASE_URL + 'divital_logo.png';
      logoImg.crossOrigin = 'Anonymous';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });
      
      const logoCanvas = document.createElement('canvas');
      const logoContext = logoCanvas.getContext('2d');
      
      if (logoContext) {
        // Logo-Größe festlegen
        const logoMaxWidth = 30; // mm
        const logoWidth = logoMaxWidth;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        
        logoCanvas.width = logoImg.width;
        logoCanvas.height = logoImg.height;
        logoContext.drawImage(logoImg, 0, 0, logoImg.width, logoImg.height);
        
        const logoDataUrl = logoCanvas.toDataURL('image/jpeg');
        pdf.addImage(logoDataUrl, 'JPEG', 14, 14, logoWidth, logoHeight);
        console.log('Logo erfolgreich zum PDF hinzugefügt');
        
        // Projektmetadaten hinzufügen
        pdf.setFontSize(16);
        pdf.text(`Projekt: ${projectName}`, 14, logoHeight + 20);
        
        if (location) {
          pdf.setFontSize(12);
          pdf.text(`Standort: ${location}`, 14, logoHeight + 28);
        }
        
        pdf.setFontSize(10);
        pdf.text(`Exportiert: ${new Date().toLocaleDateString('de-DE')}`, 14, logoHeight + 35);
      }
    } catch (logoError) {
      console.warn('Logo konnte nicht geladen werden, exportiere ohne Logo:', logoError);
      
      // Projektmetadaten ohne Logo hinzufügen
      pdf.setFontSize(16);
      pdf.text(`Projekt: ${projectName}`, 14, 14);
      
      if (location) {
        pdf.setFontSize(12);
        pdf.text(`Standort: ${location}`, 14, 22);
      }
      
      pdf.setFontSize(10);
      pdf.text(`Exportiert: ${new Date().toLocaleDateString('de-DE')}`, 14, 28);
    }
    
    // Bilddimensionen intelligent berechnen, um es im PDF vollständig unterzubringen
    const page = pdf.internal.pageSize;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    // Verfügbarer Platz auf der Seite (mit Rändern und Platz für Header)
    const availableWidth = pageWidth - 28; // 14mm Rand links/rechts
    const availableHeight = pageHeight - 54; // 14mm Rand oben, 40mm für Header-Inhalt
    const imageY = 40; // Y-Position für das Bild

    const imageAspectRatio = pngImage.width / pngImage.height;
    const pageAspectRatio = availableWidth / availableHeight;

    let finalImgWidth, finalImgHeight;

    if (imageAspectRatio > pageAspectRatio) {
      // Bild ist breiter als der verfügbare Platz -> an Breite anpassen
      finalImgWidth = availableWidth;
      finalImgHeight = finalImgWidth / imageAspectRatio;
    } else {
      // Bild ist höher als der verfügbare Platz -> an Höhe anpassen
      finalImgHeight = availableHeight;
      finalImgWidth = finalImgHeight * imageAspectRatio;
    }
    
    console.log('Füge Canvas-Bild zum PDF hinzu...');
    
    // Das PNG-Bild zum PDF hinzufügen
    pdf.addImage(pngDataUrl, 'PNG', 14, imageY, finalImgWidth, finalImgHeight);
    
    // PDF speichern
    const fileName = `${projectName.replace(/[^a-zA-Z0-9äöüßÄÖÜ_\- ]/g, '_')}_netplan.pdf`;
    pdf.save(fileName);
    console.log('PDF erfolgreich gespeichert:', fileName);
    
  } catch (error) {
    console.error('Fehler beim Exportieren nach PDF:', error);
    throw error;
  } finally {
    // Stellt sicher, dass alle ausgeblendeten Elemente immer wiederhergestellt werden
    
    // 1. Zugangsdaten-Felder wiederherstellen
    try {
      originalDisplayStates.forEach(({ element, display }) => {
        element.style.display = display;
      });
      console.log(`${originalDisplayStates.length} Zugangsdaten-Felder wieder sichtbar gemacht`);
    } catch (restoreError) {
      console.error('Fehler beim Wiederherstellen der Zugangsdaten-Felder:', restoreError);
    }
    
    // 2. React Flow Controls wiederherstellen
    try {
      originalControlStates.forEach(({ element, display }) => {
        element.style.display = display;
      });
      console.log(`${originalControlStates.length} Control-Elemente wieder sichtbar gemacht`);
    } catch (restoreError) {
      console.error('Fehler beim Wiederherstellen der Control-Elemente:', restoreError);
    }
    
    // 3. MiniMap wiederherstellen
    try {
      originalMiniMapStates.forEach(({ element, display }) => {
        element.style.display = display;
      });
      console.log(`${originalMiniMapStates.length} MiniMap-Elemente wieder sichtbar gemacht`);
    } catch (restoreError) {
      console.error('Fehler beim Wiederherstellen der MiniMap-Elemente:', restoreError);
    }
    
    // 4. Logo wurde nicht invertiert, daher keine Wiederherstellung nötig
  }
};