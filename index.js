const {app, BrowserWindow} = require('electron');

let mainWindow;

// Quit when all windows are closed.
app.on('window-all-closed', () => {

	if (process.platform != 'darwin') {
		app.quit();
	}

});

app.on('ready', () => {

	mainWindow = new BrowserWindow({

		width: 1000,
		height: 800,
		minHeight: 800,
		minWidth: 1000,
		frame: true,

	});

	mainWindow.loadURL('file://' + __dirname + '/index.html');

	mainWindow.on('closed', () => {

		mainWindow = null;

	});

});
