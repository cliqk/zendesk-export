var fs = require('fs'),
mkdirp = require('mkdirp'),
zendesk = require('node-zendesk'),
client,
httpService = require('https'),
url = require('url'),
request = require('request');

// Read configuration files
fs.readFile('config.json', 'utf8', function (err, data) {
	if (err) throw err;
	var config = JSON.parse(data);

	// Setup the Zendesk client
	client = zendesk.createClient({
		username:  config.username,
		token:     config.token,
		remoteUri: 'https://'+config.domain+'/api/v2'
	});
	
	// Run get users
	// getUsers();

	// Run get tickets
	getTickets();
});

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
					saveFile();
				}
			});
		} else if(err) {
			// Just in case there was a different error
			console.log(err);
		} else {
			// Directory exists
			saveFile();
		}
	});
	function saveFile() {	
		// Save the file
		fs.writeFile(file, data, function(err) {
			if(err) {
				console.error(err);
			} else {
				console.log(file+' saved.');
			}
		});
	}
}

function getUsers() {
	// client.users.list(function (err, req, result) {
	// 	if (err) {
	// 		console.log(err);
	// 		return;
	// 	}

	// 	// Save the data to the users file
	// 	save('data/users/all-users.json', JSON.stringify(result, null, 2));
	// 	for (var i = 0; i < result.length; i++) {
	// 		save('data/users/'+result[i].id+'.json', JSON.stringify(result[i], null, 2));
	// 	}
	// });
}

function getTickets() {
	client.tickets.list(function (err, req, result) {
		if (err) {
			console.log(err);
			return;
		}

		// Save the tickets to the tickets file
		save('data/tickets/all-tickets.json', JSON.stringify(result, null, 2));

		// Loop through all of the tickets and get their comments
		for (var i = 0; i < result.length; i++) {
			if(i > result.length - 5) {
				save('data/tickets/'+result[i].id+'.json', JSON.stringify(result[i], null, 2));
				getComments(result[i]);
			}
		}
	});
}

function getComments(ticket) {
	client.tickets.getComments(ticket.id, function (err, req, result) {
		if (err) {
			console.log(err);
			return;
		}
		
		// Save the comments to a file
		var comments = result[0].comments;
		save('data/tickets/'+ticket.id+'-comments.json', JSON.stringify(comments, null, 2));

		for (var i = 0; i < comments.length; i++) {
			if(typeof(comments[i].attachments) != 'undefined' && comments[i].attachments.length > 0) {
				console.log('Comment '+comments[i].id+' on ticket '+ticket.id+' has attachments.');
				getAttachments(comments[i].attachments, ticket.id, comments[i].id);
			}
		}
	});
}

function getAttachments(attachments, ticketID, commentID) {
	for (var i = 0; i < attachments.length; i++) {
		var fileName = attachments[i].file_name;
		var path = 'data/tickets/' + ticketID + '-' + commentID + '-' + attachments[i].id;
		var fileUrl = attachments[i].content_url;
		fs.stat(path, function(err, stats) {
			if (err && err.errno === -2) {
				// Create the directory (using mkdirp because we don't have to do any crazy error checking for directory structures)
				mkdirp(path, function (err) {
					if (err) {
						console.error(err);
					} else {
						console.log('Created directory: "'+path+'"');
						saveFile();
					}
				});
			} else if(err) {
				// Just in case there was a different error
				console.log(err);
			} else {
				// Directory exists
				saveFile();
			}
		});

		function saveFile() {	
			// Save the file
			var options = {
				host: url.parse(fileUrl).host,
				path: url.parse(fileUrl).pathname,
				rejectUnauthorized: false
			};

			var file = fs.createWriteStream(path + '/' +fileName);
			file.on('error', function(err) { console.log(err); });
			request(fileUrl).pipe(file);
		} 
	}
}
