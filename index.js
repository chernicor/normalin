'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var path = require('path');
// jquery was here

var mainWindow = null;

app.on('ready', function() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		minHeight: 400,
  		minWidth: 400,
		frame: false,
		icon: path.join(__dirname, 'img/icon/64x64.png'),
		webPreferences: {
            nodeIntegration: true
        }
	});
	//mainWindow.$ = $;

	mainWindow.loadURL('file://' + __dirname + '/index.html');

	//mainWindow.openDevTools();

	mainWindow.on('closed', function() {
		mainWindow = null;
		app.quit();
	});
});

console.log(app.getPath('userData'));

