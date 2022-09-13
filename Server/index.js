/*
Lucas Bradley
6/21/2020
TecAce Interview Assignment

To run this project follow these steps:
1.  To get the node_modules folder run "npm install" if it comes up
    saying there are 4 vulnerabilities then you can run the "npm audit fix"
    command and everything will still work fine. That specific error comes
    from the googleapis which is part of this project.
2.  To run the program run "node index.js"
3.  To test Get /all you can use the web browser by typing
    http://localhost:3000/all or in place of the 3000 you can put
    whatever port the api is listening on
4.  To test Post with a key and value open the Postman program or
    some other method of writing custom POST's
5.  Go into your workspace
6.  Click "New" which is situated around the top left corner of the
    screen
7.  Click "HTTP Request"
8.  As the url put http://localhost:3000/data
9.  To the left of the URL change the method to POST
10. Under the url and in the middle of the options click "Body"
11. In the drop down menu click raw
12. To the right now appears the word "Text" in blue, click on it
    and select JSON
13. In the text box enter:

    {
        key: "someKey",
        value: "someValue"
    }

14. Click send, you can test multiple different key value pairs.
15. To test the Delete with a key follow the same steps 4 - 7
16. As the url put http://localhost:3000/data/someKey where someKey is a
    key which you want to delete from the table
17. Click send, you can test multiple different keys.

18. If you have any questions please email me at lucas@qbradley.com
*/

const express = require('express');
const {google} = require('googleapis');
const {GoogleAuth} = require('google-auth-library');
const Joi = require('Joi');
const cors = require('cors');

// State maintains all the information needed for this session
state = {
    auth: null,
    client: null,
    googleSheets: null,
    spreadsheetId: "[REDACTED]",
    // This dictionary matches the keys to the values and is relevant
    // for the GET /all api command
    values: {},
    // This dictionary matches the keys to where they are located
    // in the sheet. This is relevant for deletions
    indices: {},
    // End keeps track of the farthest down in the sheet entries
    // have been placed and where to append new ones
    end: 0,
    // Holes keeps track of anywhere in the sheet where deletion
    // has caused an entry to be erased. When new entries are
    // pushed to the sheet the holes are filled and removed
    // like a stack
    holes: []
};

// Initialize is used to gain access to the google sheet for
// this session
async function initalize () {
    state.auth = new GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    });
    
    state.client = await state.auth.getClient();
    
    state.googleSheets = google.sheets({
        version: "v4",
        auth: state.client
    });

    // Get all of the current data in the sheet and upload it
    const getRows = await state.googleSheets.spreadsheets.values.get({
        auth: state.auth,
        spreadsheetId: state.spreadsheetId,
        range: "Sheet1"
    });

    const values = getRows.data.values;

    for (let i = 1; i < values.length; i++) {
        // Perhaps check to see if values already exist in dictionary
        // because the sheet does not enforce uniqueness of keys.
        // Assuming that key value pairs were only inserted through
        // this api then that should not be a problem
        
        // if a value is returned undefined then that means it is 
        // a hole which needs to be filled. Push it to the stack.
        if (values[i][0] == undefined) {
            state.holes.push(i + 1);
        }
        else {
            state.values[values[i][0]] = values[i][1];
            state.indices[values[i][0]] = i + 1;
        }
    }

    // Even if there are holes in the inital input
    // this is still set to the very end, but it will
    // only be used once the holes are filled
    state.end = values.length + 1;
}

const app = express();
app.use(express.json());
app.use(cors());

app.get('/all', (req, res) => {
    res.status(200).send(JSON.stringify({
        result: 200,
        data: state.values
    }));
});

app.post('/data', async (req, res) => {
    const schema = Joi.object({
        key: Joi.string().min(1).required(),
        value: Joi.string().min(1).required()
    })

    const valid = schema.validate(req.body);
    if (valid.error) {
        res.status(500).send(JSON.stringify({
            result: 500,
            description: valid.error.details[0].message
        }))
    }
    else if (state.values.hasOwnProperty(req.body.key)) {
        res.status(200).send(JSON.stringify({
            result: 200,
            description: "Key must be unique"
        }))
    }
    else {
        // If there is a hole in the sheet then fill it
        if (state.holes.length > 0) {
            const row = state.holes.pop();

            await state.googleSheets.spreadsheets.values.append({
                auth: state.auth,
                spreadsheetId: state.spreadsheetId,
                // Choose the specific row (hole) to fill
                range: `Sheet1!A${row}:B${row}`,
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [
                        [req.body.key, req.body.value]
                    ]
                }
            });

            state.values[req.body.key] = req.body.value;
            state.indices[req.body.key] = row
        }
        // Otherwise append the entry to the end
        else {
            await state.googleSheets.spreadsheets.values.append({
                auth: state.auth,
                spreadsheetId: state.spreadsheetId,
                // Just stick it on the end
                range: "Sheet1!A:B",
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [
                        [req.body.key, req.body.value]
                    ]
                }
            });

            state.values[req.body.key] = req.body.value
            state.indices[req.body.key] = state.end++;
        }

        res.status(200).send(JSON.stringify({
            result: 200,
            description: "OK"
        }));
    }
});

app.delete('/data/:key', async (req, res) => {
    if (!state.values.hasOwnProperty(req.params.key)) {
        res.status(404).send(JSON.stringify({
            result: 404,
            description: "Key not found"
        }))
    }
    // If the key exists then erase it from the sheet
    // and local data structures
    else {
        const row = state.indices[req.params.key];

        await state.googleSheets.spreadsheets.values.clear({
            auth: state.auth,
            spreadsheetId: state.spreadsheetId,
            range: `Sheet1!A${row}:B${row}`
        });

        // A new hole has been created push it to the stack
        state.holes.push(row);
        delete state.values[req.params.key];
        delete state.indices[req.params.key];

        res.status(200).send(JSON.stringify({
            result: 200,
            description: "OK"
        }));
    }
});

// Initialize the system by gaining access
// to the google sheet and listening on a port
initalize();
const port = process.env.PORT || 3000;
app.listen(port, (err) => {
    if (err) console.log(err);
    console.log(`Listening on port ${port}...`)
});
