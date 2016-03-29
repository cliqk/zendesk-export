var fs = require('fs'),
	mkdirp = require('mkdirp'),
	zendesk = require('node-zendesk'),
	request = require('request'),
	config = require('./config.json'),
	prompt = require('prompt'),
	colors = require('colors/safe');


// Create the Zendesk client
var client = zendesk.createClient({
	username:  config.username.substring(0, config.username.lastIndexOf('/')),
	token:     config.token,
	remoteUri: 'https://'+config.domain+'/api/v2'
});

initPrompt(true); // Run the command prompt init

/**
 * Initializes the command prompt and handles which command to accept
 * @param BOOLEAN init if set, this is the initialization
 * @return NULL
 */
function initPrompt(init) {
	prompt.start();
	if (init) {
		prompt.message = colors.green('Zendesk Export\n©2016 Cliqk, Inc.\nMIT License\n(type help too see a list of commands)\n');
	} else {
		prompt.message = '';
	}
	prompt.delimiter = '';
	var command = {
		'name': 'command',
		'message': colors.white('Command:')
	}
	prompt.get([command], function (error, result) {
		if (error) throw error;
		var cmd = result.command.split(' ');
		console.log(colors.gray('> '+result.command));
		switch (cmd[0]) {
			case 'users':
				if (typeof(cmd[1]) != 'undefined' && parseInt(cmd[1]) > 0) {
					console.log('Downloading user '+cmd[1]+', this may take a few minutes. Feel free to issue other commands in the meantime, as this will continue in the background.');
					getUser(cmd[1]);
				} else if (typeof(cmd[1]) != 'undefined' && cmd[1] == 'all') {
					console.log('Downloading all users, this may take a few minutes. Feel free to issue other commands in the meantime, as this will continue in the background.');
					getUsers();
				} else {
					console.error('Error: must pass a valid User ID.\nExample: \'users 1\'');
				}
				break;
			case 'tickets':
				if (typeof(cmd[1]) != 'undefined' && parseInt(cmd[1]) > 0) {
					getTicket(cmd[1]);
					console.log('Downloading ticket '+cmd[1]+', this may take a few minutes. Feel free to issue other commands in the meantime, as this will continue in the background.');
				} else if (typeof(cmd[1]) != 'undefined' && cmd[1] == 'all') {
					console.log('Downloading all tickets, this may take a few minutes. Feel free to issue other commands in the meantime, as this will continue in the background.');
					getTickets();
				} else {
					console.error('Error: must pass a valid Ticket ID.\nExample: \'tickets 1\'');
				}
				break;
			case 'read':
				read(cmd[1], function(file) {
					console.log(file);
				});
				break;
			case 'search':
				// TODO: add search method
			default:
				if (result.command.toLowerCase().indexOf('help') != -1) { // Just check for non-case sensitive 'help' in the result string, as there is not command-specific help at the moment
					console.log('users {id} - saves a specific User from Zendesk. To save all users, pass the string "all" instead of the User ID.');
					console.log('tickets {id} - saves a specific Ticket from Zendesk, including comments, attachments, and recordings. To save all tickets, pass the string "all" as instead of the Ticket ID.');
				} else {
					console.log(cmd[0]+' is not a valid command. Type \'h\' to see a list of available commands.');
				}
				break;
		}
		resetPrompt();
	});
}

function resetPrompt() {
	initPrompt();
}

/**
 * Takes a file path and checks if it exists
 * @param  {string}   file     the path of the file to check
 * @param  {function} callback a callback function which will get passed true (already exists) or false (doesn't exist)
 * @return NULL
 */
function check(file, callback) {
	fs.stat(file, function(error, stat) {
		if(error == null) {
			callback(true);
		} else if(error.code == 'ENOENT') {
			callback(false);
			mkdir(file, function(path){ console.log('creating path...')});
		} else {
			console.log('Error checking file: ', error.code);
		}
	});
}

/**
 * Takes a file path and creates a directory structure for that path if it doesn't already exist
 * @param  {string}   file     the path of the file to be converted into a directory structure
 * @param  {function} callback a callback function which gets passed the created path
 * @return NULL
 */
function mkdir(file, callback) {
	var path = '';
	try {
		path = file.substring(0, file.lastIndexOf('/')); // Remove the filename from the end of the file path
	} catch(error) {
		console.log(error);
		return;
	}
	mkdirp(path, function (error) {
		if (error) {console.log(error); return;}
		if (callback) {callback(path)} // Run the callback if it was passed
	});
}

/**
 * Takes a file path for a JSON file and returns it as an object in memory.
 * @param  {string}   path     the path of the file to read
 * @param  {function} callback a callback function which gets passed the parsed file
 * @return NULL
 */
function read(path, callback) {
	fs.readFile(path, function (error, data) {
		if (error) {console.log(error); return;}
		try {
			var file = JSON.parse(data);
		} catch(error) {
			console.log(error);
			return;
		}
		callback(file);
	});
}

/**
 * Takes an URI and file name/path and downloads it to the specified path using your credentials
 * @param  {string}   uri      full URI for the content including protocol and path
 * @param  {string}   file     full or relative path where the downloaded content should be saved
 * @param  {function} callback a callback function which gets passed the path where the content was saved
 * @return NULL
 */
function download(uri, file, callback) {
	var options = { // Set request options
		'uri': uri,
		'auth': {
			'username': config.username,
			'password': config.token
		}
	}
	request
		.get(options) // Pass options
		.on('error', function(error) { console.log(error); return;}) //
		.pipe(fs.createWriteStream(file)) // Write the pipe to a file stream
		.on('finish', function() {
			if (callback) {callback(file)} // Run the callback if it was passed
		});
}

/**
 * Takes an object and file name/path and saves it as JSON to the specified path
 * @param  {string}   uri      full URI for the content including protocol and path
 * @param  {string}   file     full or relative path where the downloaded content should be saved
 * @param  {function} callback a callback function which gets passed the path where the content was saved
 * @return NULL
 */
function save(object, file, callback) {
	try {
		var data = JSON.stringify(object, null, 4); // Convert object to pretty-print JSON
	} catch(error) {
		console.log(error);
		return;
	}
	fs.writeFile(file, data, function(error) {
		if (error) {console.log(error); return;}
		if (callback) { callback(file) } // Run the callback if it was passed
	});
}

/**
 * Gets a specific user from Zendesk and passes the user to the saveUser function
 * @return NULL
 */
function getUser(userId) {
	client.users.show(userId, function (error, req, res) {
		if (error) {console.log(error); return;}
		saveUser(res);
	});
}

/**
 * Gets all users from Zendesk and passes each user to the saveUser function
 * @return NULL
 */
function getUsers() {
	client.users.list(function (error, req, res) {
		if (error) {console.log(error); return;}
		for (var i = 0; i < res.length; i++) {
			saveUser(res[i]);
		}
	});
}

/**
 * Takes a user object and saves it to a file with that user's ID
 * @return NULL
 */
function saveUser(user) {
	var file = 'data/users/'+user.id+'.json'; // Path for users JSON
	check(file, function(exists) { // Check to see if directory exists
		if(!exists) {
			save(user, file); // Save the data to the file
		}
	});
}

/**
 * Gets a specific ticket from Zendesk and passes the ticket to the saveTicket function
 * @return NULL
 */
function getTicket(ticketId) {
	client.tickets.show(ticketId, function (error, req, res) {
		if (error) {console.log(error); return;}
		saveTicket(res);
	});
}

/**
 * Gets all tickets from Zendesk and passes each ticket to the saveTicket function
 * @return NULL
 */
function getTickets() {
	client.tickets.list(function (error, req, res) {
		if (error) {console.log(error); return;}
		for (var i = 0; i < res.length; i++) {
			saveTicket(res[i]);
		}
	});
}

/**
 * Takes a ticket object and saves it to a file inside a directory with that ticket's ID, then further gets comments on that ticket
 * @param {Object} ticket a ticket object
 * @return NULL
 */
function saveTicket(ticket) {
	var file = 'data/tickets/'+ticket.id+'/ticket.json'; // Path for ticket JSON
	check(file, function(exists) { // Check to see if directory exists
		if(!exists) {
			save(ticket, file); // Save the data to the file
		}
		getComments(ticket.id); // Get the comments for this ticket
	});
}

/**
 * Takes a ticket ID and gets all that ticket's comments from Zendesk, then passes each comment to the saveComment function
 * @param {integer} ticketId the ID of the ticket to get comments from
 * @return NULL
 */
function getComments(ticketId) {
	client.tickets.getComments(ticketId, function (error, req, res) {
		if (error) {console.log(error); return;}
		var comments = res[0].comments;
		for (var i = 0; i < comments.length; i++) {
			saveComment(comments[i], ticketId);
		}
	});
}

/**
 * Takes a comment object and ticket ID and saves it to a file inside a directory with that comments's ID inside a directory with the current ticket's ID, then further checks for attachments on that comment
 * @param {Object}   comment  the comment object you want to save
 * @param {ticketId} ticketId the ID of the ticket you want to save this comment to
 * @return NULL
 */
function saveComment(comment, ticketId) {
	var file = 'data/tickets/'+ticketId+'/comments/'+comment.id+'/comment.json'; // Path for comment JSON
	check(file, function(exists) { // Check to see if directory exists
		if(!exists) {
			save(comment, file); // Save the data to the file
		}
		getCommentFiles(comment, ticketId);
	});
}

/**
 * Takes a comment object and ticket ID and searches for attachments or voice recordings
 * @param {Object}   comment  the comment object you want to search for attachments
 * @param {ticketId} ticketId the ID of the ticket you want to save these attachments comment to
 * @return NULL
 */
function getCommentFiles(comment, ticketId) {
	if (comment.attachments.length > 0) { // Check if this comment has attachments
		for (var i = 0; i < comment.attachments.length; i++) {
			var uri = comment.attachments[i].content_url;
			var file = 'data/tickets/'+ticketId+'/comments/'+comment.id+'/attachments/'+comment.attachments[i].id+'/'+comment.attachments[i].file_name;
			check(file, function(exists) { // Check to see if directory exists
				if(!exists) {
					download(uri, file);
				}
			});
		}
	}
	if (typeof(comment.data) != 'undefined' && typeof(comment.data.recording_url) != 'undefined' && comment.data.recording_url) { // Check if this comment has a recording URL
		var uri = comment.data.recording_url;
		var file = 'data/tickets/'+ticketId+'/comments/'+comment.id+'/recordings/'+comment.data.call_id+'.mp3';
		check(file, function(exists) { // Check to see if directory exists
			if(!exists) {
				download(uri, file);
			}
		});
	}
}
