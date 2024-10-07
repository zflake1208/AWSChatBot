const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fetch = require('node-fetch');

const secretManagerClient = new SecretManagerServiceClient();

exports.generateChatHistory = async (req, res) => {
    // Set CORS headers for the preflight request
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const [accessResponse] = await secretManagerClient.accessSecretVersion({
            name: "projects/whatworks-chatbot/secrets/airtable-access-token/versions/latest",
        });
        const airtableAccessToken = accessResponse.payload.data.toString('utf8');

        if (!airtableAccessToken) {
            console.error('Retrieved Airtable token is empty');
            return res.status(500).send('Error retrieving Airtable token');
        }

        const airtableURL = 'https://api.airtable.com/v0/appXGlGFPc9Fdz6fT/tblkT39lxUuwFADHx';
        const response = await fetch(airtableURL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${airtableAccessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error(`Airtable API request failed with status ${response.status}: ${response.statusText}`, responseText);
            return res.status(response.status).send(`Airtable API request failed: ${responseText}`);
        }

        const data = await response.json();

        if (!data.records || !Array.isArray(data.records)) {
            console.error('Invalid or empty response from Airtable:', data);
            return res.status(404).send('No valid records found');
        }

        const chats = data.records.map(record => ({
            chatID: record.fields.chatID || '',
            chatName: record.fields.chatName || '',
            chatMessage: record.fields.chatMessage || ''
        })).filter(chat => chat.chatID && chat.chatName && chat.chatMessage);

        res.status(200).json(chats);
    } catch (error) {
        console.error('Error in generateChatHistory:', error);
        res.status(500).send(`Internal server error: ${error.message}`);
    }
};