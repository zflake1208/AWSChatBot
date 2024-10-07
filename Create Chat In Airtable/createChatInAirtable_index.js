const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const Airtable = require('airtable');

const secretManagerClient = new SecretManagerServiceClient();

exports.createChatInAirtable = async (req, res) => {
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', 'https://whatworks-collab-staging.webflow.io'); // Replace with your actual domain
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600'); // Cache preflight response for 1 hour

  // Handle preflight request (OPTIONS method)
  if (req.method === 'OPTIONS') {
    res.status(204).send(''); // Respond to OPTIONS preflight request
    return;
  }

  try {
    const { chatName, chatMessage } = req.body;

    // Generate the chatID based on the current date and time in the user's timezone
    const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
    const formattedDateTime = currentDateTime.replace(/[^0-9]/g, "-");
    const chatID = formattedDateTime;

    console.log("Generated chatID:", chatID); // Console log for debugging

    // Access Airtable Personal Access Token from Secret Manager
    const [accessResponse] = await secretManagerClient.accessSecretVersion({
      name: "projects/whatworks-chatbot/secrets/airtable-access-token/versions/latest",
    });

    const airtableAccessToken = accessResponse.payload.data.toString('utf8');

    // Initialize Airtable client
    const airtableBase = new Airtable({ apiKey: airtableAccessToken }).base('appXGlGFPc9Fdz6fT'); // Replace with your base ID

    // Create a new record in Airtable with chatID
    const newRecord = await airtableBase('Table 1').create({
      chatID: chatID, // Add the generated chatID to the record
      chatName: chatName,
      chatMessage: chatMessage,
    });

    res.status(200).send({ id: newRecord.id });
  } catch (error) {
    console.error('Error creating chat in Airtable:', error);
    res.status(500).send(`Error creating chat in Airtable: ${error.message}`);
  }
};
