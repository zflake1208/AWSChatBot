const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fetch = require('node-fetch');

const secretManagerClient = new SecretManagerServiceClient();

exports.loadChatFromHistory = async (req, res) => {
    // Set CORS headers for the preflight request
    res.set('Access-Control-Allow-Origin', 'https://whatworks-collab-staging.webflow.io'); // Replace with your actual domain
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    console.log("Received request:", req.query); // Log incoming request parameters

    const { chatID, chatName } = req.query;

    if (!chatID || !chatName) {
        console.error("Missing required query parameters: chatID or chatName");
        return res.status(400).send('chatID and chatName query parameters are required.');
    }

    try {
        // Access Airtable Personal Access Token from Secret Manager
        const [accessResponse] = await secretManagerClient.accessSecretVersion({
            name: "projects/whatworks-chatbot/secrets/airtable-access-token/versions/latest",
        });

        const airtableAccessToken = accessResponse.payload.data.toString('utf8');

        // Fetch data from Airtable with a filter formula
        const airtableURL = `https://api.airtable.com/v0/appXGlGFPc9Fdz6fT/tblkT39lxUuwFADHx?filterByFormula=AND({chatID}='${chatID}', {chatName}='${chatName}')`;
        
        const response = await fetch(airtableURL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${airtableAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const responseText = await response.text(); // Read response body for error message
            console.error(`Airtable API request failed: ${response.statusText}`, responseText);
            return res.status(response.status).send(`Airtable API request failed: ${responseText}`);
        }

        const data = await response.json();

        // Check if the record was found
        if (data.records && data.records.length > 0) {
            const chatRecord = data.records[0]; // Get the first matching record
            res.status(200).json({ chatMessage: chatRecord.fields.chatMessage, chatRecord: chatRecord.id });
        } else {
            res.status(404).send('Chat not found');
        }
    } catch (error) {
        console.error('Error loading chat:', error.message);
        res.status(500).send('Error loading chat');
    }
};
