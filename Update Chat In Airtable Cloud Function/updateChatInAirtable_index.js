const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fetch = require('node-fetch');

const secretManagerClient = new SecretManagerServiceClient();

exports.updateChatInAirtable = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', 'https://whatworks-collab-staging.webflow.io');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  res.set('Access-Control-Allow-Origin', 'https://whatworks-collab-staging.webflow.io');

  try {
    const { chatID, chatName, chatMessage } = req.body;

    console.log('Received data:', { chatID, chatName, chatMessage });

    const [accessResponse] = await secretManagerClient.accessSecretVersion({
      name: "projects/whatworks-chatbot/secrets/airtable-access-token/versions/latest",
    });

    const airtableAccessToken = accessResponse.payload.data.toString('utf8');

    const airtableURL = `https://api.airtable.com/v0/appXGlGFPc9Fdz6fT/tblkT39lxUuwFADHx/${chatID}`;
    console.log('Constructed Airtable URL:', airtableURL);

    const response = await fetch(airtableURL, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${airtableAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          chatName: chatName,
          chatMessage: chatMessage
        }
      })
    });

    const responseText = await response.text();
    console.log('Airtable response status:', response.status, 'Response body:', responseText);

    if (!response.ok) {
      console.error(`Failed to update Airtable: ${response.statusText}`, responseText);
      throw new Error(`Failed to update Airtable: ${response.statusText}`);
    }

    res.status(200).send('Chat updated successfully in Airtable.');
  } catch (error) {
    console.error('Error updating Airtable:', error.message);
    res.status(500).send(`Error updating Airtable: ${error.message}`);
  }
};
