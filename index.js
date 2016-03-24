var fs = require('fs');

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
	
	// Check data directory
	fs.stat('data', function(err, stats) {
		if (err && err.errno === -2) {
			// Create the directory
			fs.mkdir('data');
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
