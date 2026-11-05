const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;
let itineraryWindow;

// Create the main Movie Explorer window.
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 800,
        minWidth: 850,
        minHeight: 650,
        backgroundColor: '#10251D',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('renderer/index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create the Movie Plans window.
function createItineraryWindow() {
    // If the window is already open, bring it to the front.
    if (itineraryWindow && !itineraryWindow.isDestroyed()) {
        itineraryWindow.focus();
        return;
    }

    itineraryWindow = new BrowserWindow({
        width: 900,
        height: 750,
        minWidth: 700,
        minHeight: 600,
        backgroundColor: '#10251D',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    itineraryWindow.loadFile('renderer/itinerary.html');

    itineraryWindow.on('closed', () => {
        itineraryWindow = null;
    });
}

// Receive the request to open Movie Plans.
ipcMain.on('open-itinerary-window', () => {
    createItineraryWindow();
});

// Start the application.
app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Close the application when all windows are closed.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});