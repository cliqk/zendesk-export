var fs = require('fs');
var mkdirp = require('mkdirp');

var config;
fs.readFile('config.json', 'utf8', function (err, data) {
	if (err) throw err;
	config = JSON.parse(data);
	start();
});

function start() {
	// Make sure all the files exist
	
	// Run get users
	getUsers();

	// Run get tickets
	getTickets();
}

function save(file, data) {
	// Remove the file name from the path
	var path = file.substring(0, file.lastIndexOf('/'));
	fs.stat(path, function(err, stats) {
		if (err && err.errno === -2) {
			// Create the directory (using mkdirp because we don't have to do any crazy error checking for directory structures)
			mkdirp(path, function (err) {
				if (err) {
					console.error(err);
				} else {
					console.log('Created directory: "'+path+'"');
				}
			});
		} else if(err) {
			// Just in case there was a different error
			console.log(err);
		} else {
			// Directory exists
		}
	});

	// Save the file
	fs.writeFile(file, data, function(err) {
		if(err) {
			console.error(err);
		} else {
			console.log(file+' saved.');
		}
	});
}

function getUsers() {
	var zendesk = require('node-zendesk');

	var client = zendesk.createClient({
		username:  config.username,
		token:     config.token,
		remoteUri: 'https://'+config.domain+'/api/v2'
	});

	client.users.list(function (err, req, result) {
		if (err) {
			console.log(err);
			return;
		}

		// Save the data to the users file
		save('data/users.json', JSON.stringify(result, null, 2));
	});
}

function getTickets() {
	var zendesk = require('node-zendesk');

	var client = zendesk.createClient({
		username:  config.username,
		token:     config.token,
		remoteUri: 'https://'+config.domain+'/api/v2'
	});

	client.tickets.list(function (err, req, result) {
		if (err) {
			console.log(err);
			return;
		}

		// Save the data to the users file
		save('data/tickets.json', JSON.stringify(result, null, 2));
	});
}
