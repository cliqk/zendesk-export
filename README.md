# zendesk-export
## What is it?
A super simple Node application which downloads a complete copy of Zendesk data as JSON using their REST API.

## Why?
We needed to cancel Zendesk, but wanted to retain a copy of their database. CSV exports were determined insufficient as it would be difficult to process and doesn't handle attachements well; we wanted something we could potentially import again into another database and/or manipulate/search.


## Installation
1. Run `npm install`
2. Setup `config.json`

A `config.json` file must be created in the root directory of the app before running. An example file named `config-default.json` is included in the repository. This file contains an object with a Zendesk domain, username, and API token.

*Note: your API token can be found in `Settings > API` on the Zendesk dashboard.*

## Usage
Upon running `node index.js` or `nodemon`, the application will connect to Zendesk and download Users, Tickets, Comments, Attachments, and Voice Recordings to the `data` directory. Data is exported as JSON files in the following structure and formats:

```
data/
    users/
        all-users.json (contains all users)
        {user.id}.json (contains a single user)
    tickets/
        all-tickets.json (contains all tickets without comments)
        {ticket.id}.json (contains a single ticket without comments)
        {ticket.id}-comments (contains all comments for a given ticket)
        {ticket.id}-{comment-id}-{attachment.id}/ (contains an attachment for a given comment)
            {attachment.file_name} (the actual file)
```

*Note: some data is duplicated for convenience of later processing.*
