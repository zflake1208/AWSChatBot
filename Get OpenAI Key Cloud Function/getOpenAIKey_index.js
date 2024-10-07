const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const secretManagerClient = new SecretManagerServiceClient();

exports.getOpenAIKey = async (req, res) => {
  // Set CORS headers for the main request
  res.set('Access-Control-Allow-Origin', 'https://whatworks-collab-staging.webflow.io'); // Replace with your actual domain
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const [accessResponse] = await secretManagerClient.accessSecretVersion({
      name: "projects/whatworks-chatbot/secrets/openai-api-key/versions/latest",
    });

    const openAIKey = accessResponse.payload.data.toString('utf8');

    res.status(200).send({ key: openAIKey });
  } catch (error) {
    console.error('Error retrieving secret:', error.message);

    // Send detailed error response for debugging
    res.status(500).send(`Error retrieving secret: ${error.message}`);
  }
};
