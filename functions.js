//Used
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Type of marked:", typeof marked); // Should print "function" or "object"

  if (typeof marked !== "function" && typeof marked.marked !== "function") {
    console.error("Marked library did not load properly.");
    return; // Exit if Marked is not loaded
  }

  resetChatVariables();
  displayInitialLoadMessage();

  // Reset the formatting of all chat history cards on page load
  document.querySelectorAll(".chat-history-card").forEach((card) => {
    card.style.color = "#4c5870";
    card.style.fontWeight = "normal";
  });

  await fetchChatHistory();

  document.getElementById("new-chat").addEventListener("click", async () => {
    clearChat();
    showUserInputContainer();
    await handleNewChat();
    await fetchChatHistory();
  });
});

//Used
let chatHistory = [];
let historicalChatContent = ""; // Global variable to store full chat history
let selectedChatCardID = null; // Global variable to store the currently selected chat card ID
let contextMemory = "";
let currentChatID = localStorage.getItem("currentChatID") || null;
let currentChatRecord = null; // Variable to store the DynamoDB record's item ID
let oldMessage = ""; // Initialize oldMessage here
let currentMessage = "";
let chatName = "New Chat"; // Initial chat name
let newChatName = "";
let openAIKey = null; // Declare openAIKey globally

let updateChatURL = "https://g42tg4abvt6nntxwdpz2px5guy0qruwv.lambda-url.us-east-2.on.aws/";
let generateChatHistoryURL = "https://ijisntb7mkez3mqyqxsmxgjxfi0kctqo.lambda-url.us-east-2.on.aws/";
let createChatURL = "https://gnafpvqyqyayakqy5n5i2tpq3q0plbbz.lambda-url.us-east-2.on.aws/";
let getOpenAIKeyURL = "https://b3fts76rqvydafmqz6vkhmwttq0xatii.lambda-url.us-east-2.on.aws/";
let loadChatFromHistoryURL = "https://cwgbszgsgyvsc5ewigmz7c5kmq0bewmz.lambda-url.us-east-2.on.aws/";
let uploadFileURL = "https://vq2wr3dimmfeh4tftqd4msyeae0horoc.lambda-url.us-east-2.on.aws/";

//Used
function resetChatVariables() {
  chatID = "";
  chatName = "";
  newChatName = "";
  chatMessage = "";
  currentMessage = "";
  chatRecordID = "";
  currentChatRecord = null;
  historicalChatContent = "";
  selectedChatCardID = null; // Global variable to store the currently selected chat card ID
  oldMessage = ""; // Reset oldMessage to empty when resetting variables
}

function compareMessagesAndUpdate() {
  console.log(
    "Comparing messages and updating if necessary... Current Message: ",
    currentMessage,
    " Old Message: ",
    oldMessage
  );

  // Always use historicalChatContent to ensure full content is compared
  if (historicalChatContent !== oldMessage) {
    if (currentChatRecord) {
      // Update DynamoDB with the complete historical content
      updateChatInDynamoDB(currentChatRecord, chatName, historicalChatContent)
        .then((success) => {
          if (success) {
            oldMessage = historicalChatContent; // Update oldMessage with the latest full content
            console.log(
              "DynamoDB successfully updated with new chat content."
            );
          } else {
            console.warn(
              "Failed to update DynamoDB; oldMessage remains unchanged."
            );
          }
        })
        .catch((error) => {
          console.error("Error updating DynamoDB:", error);
        });
    } else {
      console.warn("No current chat record ID available for updating.");
    }
  } else {
    console.log("No changes in messages; update not required.");
  }
}

//Used
async function fetchChatHistory() {
  try {
    const response = await fetch(generateChatHistoryURL);

    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.statusText}`);
    }

    const chats = await response.json();

    // Log the chats to verify the content
    console.log("Fetched chat history:", chats);

    renderChatHistory(chats);
  } catch (error) {
    console.error("Error fetching chat history:", error);
  }
}

//Used
function renderChatHistory(chats) {
  const chatHistoryOutput = document.getElementById("chat-history-output");
  chatHistoryOutput.innerHTML = "";

  // Sort chats from most recent to least recent based on chatID
  chats.sort((a, b) => b.chatID.localeCompare(a.chatID));

  chats.forEach((chat) => {
    const chatCard = document.createElement("div");
    chatCard.className = "chat-history-card";
    chatCard.style.color = "#4c5870";
    chatCard.style.fontWeight = "normal";
    chatCard.innerHTML = `<strong>${chat.chatName}</strong><br>${chat.chatID}`;

    // **Check if the card ID matches the selectedChatCardID to reapply styling**
    if (chat.chatID === selectedChatCardID) {
      chatCard.style.color = "#07274b";
      chatCard.style.fontWeight = "600";
    }

    chatCard.addEventListener("click", () => {
      handleChatCardClick(chat.chatID, chat.chatName, chatCard);
    });
    chatHistoryOutput.appendChild(chatCard);
  });
}

console.log("Marked function:", window.marked || window.marked.default);

//used
async function handleChatCardClick(historyChatID, historyChatName, chatCard) {
  clearChat();

  try {
    const encodedChatID = encodeURIComponent(historyChatID);
    const encodedChatName = encodeURIComponent(historyChatName);

    const response = await fetch(loadChatFromHistoryURL + `?chatID=${encodedChatID}&chatName=${encodedChatName}`);

    if (!response.ok) {
      throw new Error(`Error loading chat: ${response.statusText}`);
    }

    const data = await response.json();

    // Store the full chat history in the global variable
    historicalChatContent = data.chatMessage;
    chatRecordID = data.chatRecord;

    currentChatID = historyChatID;
    currentChatRecord = chatRecordID;
    currentMessage = historicalChatContent; // Use the full chat history as the current message
    oldMessage = historicalChatContent;
    contextMemory = historicalChatContent;
    message = historicalChatContent;
    chatName = data.chatName;
    newChatName = chatName;

    localStorage.setItem("currentChatID", currentChatID);

    const markedFn = typeof marked === "function" ? marked : marked.marked;
    if (typeof markedFn === "function") {
      displayChat(markedFn(historicalChatContent));
    } else {
      console.error("Marked is not loaded properly.");
    }

    showUserInputContainer();

    // **Update the card formatting directly**
    updateChatCardStyles(chatCard); // Make sure the selected card is visually updated

    // **Set the global variable to the clicked card's ID**
    selectedChatCardID = historyChatID; // Update global variable with current selected card ID

    // **Re-fetch and re-render chat history to update the container**
    await fetchChatHistory(); // Re-fetch and re-render the chat history
  } catch (error) {
    console.error("Error loading chat:", error);
  }
}

//used
function displayChat(formattedMessage) {
  const chatOutput = document.getElementById("chat-output");
  chatOutput.innerHTML = formattedMessage;
}

//Used
function displayInitialLoadMessage() {
  const chatOutput = document.getElementById("chat-output");
  chatOutput.innerHTML =
    "<p>Please create a new chat, or select one of your previous chats from the Chat History panel to get started.</p>";

  // Hide the entire chat-input-container
  const chatInputContainer = document.getElementById("chat-input-container");
  if (chatInputContainer) {
    chatInputContainer.style.display = "none";
  }
}

//used
function showUserInputContainer() {
  const chatInputContainer = document.getElementById("chat-input-container");
  if (chatInputContainer) {
    chatInputContainer.style.display = "flex";
  }
}

//used
async function handleNewChat() {
  clearChat();

  chatName = "New Chat";
  const chatMessage = "";

  currentChatRecord = await createNewChatInDynamoDB(chatName, chatMessage);

  if (currentChatRecord) {
    currentChatID = chatName;
    localStorage.setItem("currentChatID", currentChatID);
    console.log("New chat created with ID:", currentChatID);
  }
}

//used
function clearChat() {
  chatHistory = [];
  contextMemory = "";
  historicalChatContent = ""; // Reset historicalChatContent when "new-chat" is clicked
  localStorage.removeItem("chatHistory");
  localStorage.removeItem("contextMemory");

  const chatOutput = document.getElementById("chat-output");
  if (chatOutput) chatOutput.innerHTML = "";

  const userInput = document.getElementById("user-input");
  if (userInput) {
    userInput.value = "";
    userInput.style.height = "40px";
    userInput.style.overflowY = "hidden";
  }

  const fileInput = document.getElementById("file-upload");
  if (fileInput) fileInput.value = "";

  const fileStatusText = document.getElementById("file-status-text");
  if (fileStatusText) fileStatusText.textContent = "No Files Added";

  const removeFileLink = document.getElementById("remove-file-link");
  if (removeFileLink) removeFileLink.style.display = "none";

  // Reset the formatting of all chat history cards
  document.querySelectorAll(".chat-history-card").forEach((card) => {
    card.style.color = "#4c5870";
    card.style.fontWeight = "normal";
  });

  console.log("Chat has been cleared and reset.");
}

//used
function updateChatCardStyles(selectedCard) {
  document.querySelectorAll(".chat-history-card").forEach((card) => {
    card.style.color = "#4c5870";
    card.style.fontWeight = "normal";
  });
  selectedCard.style.color = "#07274b";
  selectedCard.style.fontWeight = "600";
}

function addMessageToChat(
  sender,
  message,
  isMarkdown = false,
  saveToHistory = true
) {
  console.log("Adding message to chat:", sender, message);
  const chatOutput = document.getElementById("chat-output");
  const messageElement = document.createElement("div");
  messageElement.className = "chat-message";

  // Check if marked is available and use it for markdown
  const markedFn = typeof marked === "function" ? marked : marked.marked;
  if (isMarkdown && typeof markedFn === "function") {
    messageElement.innerHTML = `<strong>${sender}:</strong> ${markedFn.parse(
      message
    )}`;
  } else {
    const formattedMessage = message.replace(/\n/g, "<br>");
    messageElement.innerHTML = `<strong>${sender}:</strong> ${formattedMessage}`;
  }

  chatOutput.appendChild(messageElement);
  chatOutput.scrollTop = chatOutput.scrollHeight;
  console.log("Save To History Value: ", saveToHistory);

  if (saveToHistory) {
    // Append to the chat history
    chatHistory.push({ sender, message, isMarkdown });

    // Concatenate all chat history into a single message string
    currentMessage = chatHistory
      .map((item) => `**${item.sender}:** ${item.message}`)
      .join("\n\n"); // Ensuring proper formatting with line breaks

    saveChatHistory();
    compareMessagesAndUpdate(); // Ensures DynamoDB is updated with the new full history
  }

  if (chatName === "New Chat") {
    newChatName = message;
    updateChatInDynamoDB(currentChatRecord, newChatName, currentMessage);
    chatName = newChatName;
  }
}

//used
function loadChatHistory() {
  const storedChat = localStorage.getItem("chatHistory");
  const storedContext = localStorage.getItem("contextMemory");
  let chatOutputHTML = ""; // Variable to build the chat output HTML

  if (storedChat) {
    chatHistory = JSON.parse(storedChat);

    // Build HTML directly instead of calling addMessageToChat()
    chatHistory.forEach(({ sender, message, isMarkdown }) => {
      const formattedMessage = isMarkdown
        ? marked.parse(message)
        : message.replace(/\n/g, "<br>");
      chatOutputHTML += `<div class="chat-message"><strong>${sender}:</strong> ${formattedMessage}</div>`;
    });

    // Update chat output with the built HTML
    const chatOutput = document.getElementById("chat-output");
    chatOutput.innerHTML = chatOutputHTML;
    chatOutput.scrollTop = chatOutput.scrollHeight; // Scroll to the bottom to show latest messages
  }

  if (storedContext) {
    contextMemory = storedContext;
  }
}

function saveChatHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  localStorage.setItem("contextMemory", contextMemory);
}

async function fetchOpenAIKey() {
  try {
    const response = await fetch(getOpenAIKeyURL);
    const data = await response.json();
    openAIKey = data.key;
  } catch (error) {
    console.error("Error fetching OpenAI key:", error);
  }
}

async function fetchChatbotResponse(message) {
  console.log("fetchChatbotResponse called with message:", message); // Debug line

  if (!openAIKey) {
    console.error("OpenAI API key is not loaded.");
    return;
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: message }],
          max_tokens: 1500,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("OpenAI Response:", data); // Debug line to check the API response

    if (data && data.choices && data.choices.length > 0) {
      let botMessage = data.choices[0].message.content;

      // Check for unwanted prefixes and remove them
      if (botMessage.startsWith("Assistant:")) {
        botMessage = botMessage.replace(/^Assistant:\s*/, ""); // Remove "Assistant:"
      } else if (botMessage.startsWith("ChatGPT:")) {
        botMessage = botMessage.replace(/^ChatGPT:\s*/, ""); // Remove "ChatGPT:"
      }

      // Manually prepend "ChatGPT:" after cleanup
      historicalChatContent += `\n\n**ChatGPT:** ${botMessage}`;

      addMessageToChat("ChatGPT", botMessage, true);
      contextMemory = historicalChatContent;
      saveChatHistory();

      compareMessagesAndUpdate();
    } else {
      addMessageToChat(
        "ChatGPT",
        "Sorry, I didn't get a valid response from the server."
      );
    }
  } catch (error) {
    console.error("Error fetching chatbot response:", error);
  }
}

async function createNewChatInDynamoDB(chatName, chatMessage) {
  console.log("Creating a new chat in DynamoDB...");
  const chatID = "chat-" + new Date().toISOString().replace(/[:.]/g, "-");

  try {
    const response = await fetch(
      createChatURL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatID, chatName, chatMessage }),
      }
    );

    console.log("DynamoDB API response status:", response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error(
        `Failed to create new chat in DynamoDB: ${response.statusText}`,
        responseText
      );
      throw new Error(
        `Failed to create new chat in DynamoDB: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      "New chat successfully created in DynamoDB. Chat Record ID:",
      data.id
    );
    return data.id;
  } catch (error) {
    console.error("Error creating new chat in DynamoDB:", error.message);
    return null;
  }
}

async function updateChatInDynamoDB(
  chatRecord,
  updateChatName,
  updateChatMessage
) {
  console.log("Calling updateChatInDynamoDB...");
  try {
    const response = await fetch(
      updateChatURL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatID: chatRecord,
          chatName: updateChatName,
          chatMessage: updateChatMessage, // Ensure the full message is sent here
        }),
      }
    );

    console.log("DynamoDB API response status:", response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error(
        `Failed to update DynamoDB: ${response.statusText}`,
        responseText
      );
      return false; // Indicate failure
    }

    console.log("Chat successfully updated in DynamoDB.");
    return true; // Indicate success
  } catch (error) {
    console.error("Error updating chat in DynamoDB:", error.message);
    return false; // Indicate failure
  }
}

async function handleFileUpload(file) {
  try {    
    // Define FileReader and upload behavior
    let reader = new FileReader();
    reader.onload = async (event) => {
      const response = await fetch(
        uploadFileURL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: file.name,
            content: event.target.result
          })
        }
      );
      console.log("S3 API response status:", response.status);
      if (!response.ok) {
        const responseText = await response.text();
        console.error(
          `Failed to update S3: ${response.statusText}`,
          responseText
        );
      }
      console.log("File successfully uploaded.");
    }

    // Execute upload
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error uploading file: ", error.message);
  }
}

fetchOpenAIKey().then(() => {
  if (!openAIKey) {
    console.error("Failed to load OpenAI API key.");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";

  const userInput = document.getElementById("user-input");

  function autoResizeTextarea() {
    this.style.height = "40px";
    this.style.height = Math.min(this.scrollHeight, 200) + "px";

    if (this.scrollHeight > 200) {
      this.style.overflowY = "auto";
    } else {
      this.style.overflowY = "hidden";
    }
  }

  userInput.addEventListener("input", autoResizeTextarea);

  userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.getElementById("send-btn").click();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      const cursorPosition = this.selectionStart;
      this.value =
        this.value.substring(0, cursorPosition) +
        "\n" +
        this.value.substring(cursorPosition);
      this.selectionStart = this.selectionEnd = cursorPosition + 1;
      autoResizeTextarea.call(this);
    }
  });

  const uploadIcon = document.getElementById("upload-icon");
  if (uploadIcon) {
    uploadIcon.addEventListener("click", function () {
      document.getElementById("file-upload").click();
    });
  }

  document
    .getElementById("file-upload")
    .addEventListener("change", async function (event) {
      const file = event.target.files[0];
      if (!file) return;

      const allowedExtensions =
        /(\.txt|\.pdf|\.docx|\.doc|\.xls|\.xlsx|\.csv|\.jpg|\.jpeg|\.png|\.gif|\.md|\.json|\.ppt|\.pptx)$/i;
      const fileStatusText = document.getElementById("file-status-text");
      const removeFileLink = document.getElementById("remove-file-link");

      if (!allowedExtensions.exec(file.name)) {
        alert(
          "Only text files, PDFs, PowerPoint Documents, Word documents, Excel files, images, Markdown, and JSON files are allowed."
        );
        this.value = "";
        fileStatusText.textContent = "No Files Added";
        removeFileLink.style.display = "none";
      } else {
        fileStatusText.textContent = "File Selected: " + file.name;
        removeFileLink.style.display = "inline";
      }
    });

  document
    .getElementById("remove-file-link")
    .addEventListener("click", function () {
      const fileInput = document.getElementById("file-upload");
      fileInput.value = "";
      document.getElementById("file-status-text").textContent =
        "No Files Added";
      this.style.display = "none";
    });

  document
    .getElementById("send-btn")
    .addEventListener("click", async function () {
      const userInput = document.getElementById("user-input");
      const fileInput = document.getElementById("file-upload");
      const message = userInput.value.trim();
      const file = fileInput.files[0];

      if (!message && !file) return; // If there's no message and no file, do nothing

      let combinedMessage = historicalChatContent
        ? historicalChatContent + "\n\n"
        : "";

      if (file) {
        const fileContent = await handleFileUpload(file);
        // const fileName = file.name;

        // addMessageToChat("User", `${message}\n\nFile: ${fileName}`, false);

        // combinedMessage += `**User:** ${message}`;
        // combinedMessage += `\n\n**Attached File Content:**\n${fileContent}`;

        // console.log(
        //   "Calling fetchChatbotResponse with combinedMessage:",
        //   combinedMessage
        // );

        // fetchChatbotResponse(combinedMessage); // Make sure this is called correctly
      } else if (message !== "") {
        addMessageToChat("User", message, false);
        combinedMessage += `**User:** ${message}`;

        console.log(
          "Calling fetchChatbotResponse with combinedMessage:",
          combinedMessage
        );
        fetchChatbotResponse(combinedMessage); // Add a console log here too
      }

      historicalChatContent = combinedMessage;
      currentMessage = historicalChatContent;

      compareMessagesAndUpdate();

      userInput.value = "";
      userInput.style.height = "20px";
      userInput.style.overflowY = "hidden";
      fileInput.value = "";
      document.getElementById("file-status-text").textContent =
        "No Files Added";
      document.getElementById("remove-file-link").style.display = "none";
    });
});
