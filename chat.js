const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");
const readline = require("readline");
const axios = require("axios");
const Groq = require("groq-sdk");

require("dotenv").config();

// Define the base directory to search for files
const baseDir = process.env.BASE_DIR;
const outDir = process.env.OUTPUT_DIR;

// Initialize Groq API
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Supported file extensions
const supportedFormats = [".txt", ".md", ".json", ".js", ".ts"];

// Function to recursively read all files in a directory
const readFilesRecursively = (
  dir,
  skipFolders = ["node_modules", ".git", "dist"]
) => {
  let textData = "";
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (skipFolders.includes(file)) continue;
      textData += readFilesRecursively(filePath, skipFolders);
    } else if (supportedFormats.includes(path.extname(file))) {
      textData += fs.readFileSync(filePath, "utf-8") + "\n";
    }
  }

  return textData;
};

// Function to send text data to Groq AI
const sendToGroq = async (text) => {
  console.log("Sending to Groq AI...");
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: text, // Pass the text as the prompt
        },
      ],
      model: "llama3-8b-8192", // Adjust the model as needed
    });
    return completion.choices[0]?.message?.content || "No response content received";
  } catch (error) {
    console.error("Error communicating with Groq AI:", error.message);
    throw error;
  }
};

// Function to send text data to Ollama local
const sendToOllama = async (text) => {
  console.log("Sending to Ollama...");
  const ollamaUrl = `${process.env.OLLAMA_HOST}/api/generate`;

  try {
    const response = await axios.post(
      ollamaUrl,
      {
        prompt: text,
        model: "llama3.2",
      },
      { responseType: "stream" }
    );

    let fullResponse = "";
    let count = 0;

    response.data.on("data", (chunk) => {
      console.log(`Receiving Stream Data... ${count++}`);
      fullResponse += chunk.toString().split(",")[2].split(":")[1];
    });

    return new Promise((resolve, reject) => {
      response.data.on("end", async () => {
        console.log("Stream finished.");
        fullResponse = fullResponse
          .replace(/undefined|""|\n|\n\n|"/g, "")
          .trim();

        resolve(fullResponse);
      });

      response.data.on("error", (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error("Error communicating with Ollama:", error.message);
    throw error;
  }
};

// Function to save chat history to a file
const saveResponse = async (content, format = "text") => {
  try {
    const outputPath = outDir;
    await fsPromise.writeFile(outputPath, content);
    console.log(`Response saved to ${outputPath}.`);
  } catch (err) {
    console.error("Error saving response:", err.message);
  }
};

// Function to handle chat loop
const chatLoop = async (context = "") => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Your input (type 'exit' to quit): ", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close();
      console.log("Chat session ended.");
      return;
    }

    const prompt = context ? `${context}\n\n${input}` : input;
    try {
      const response = await sendToOllama(prompt);
      console.log("Ollama Response:\n", response);

      const htmlFormatted = await sendToGroq(response + " make the format to be html");
      await saveResponse(htmlFormatted, "html");

      rl.close();
      await chatLoop(`${prompt}\nOllama: ${response}`);
    } catch (err) {
      console.error("Error during chat loop:", err.message);
      rl.close();
    }
  });
};

// Main function to start the chat
async function main() {
  try {
    console.log("Reading code...");
    const allText = readFilesRecursively(baseDir);

    console.log("Reading initial input...");
    const initialInput = await fsPromise.readFile("input.txt", "utf8");

    const initialContext = `${allText}\n\n${initialInput}`;
    console.log("Starting first chat with initial context...");

    const initialResponse = await sendToOllama(initialContext);
    // console.log("Ollama Response:\n", initialResponse);

    const htmlFormatted = await sendToGroq(initialResponse + " make the format to be html");
    await saveResponse(htmlFormatted, "md");

    await chatLoop(`${initialContext}\nOllama: ${initialResponse}`);
  } catch (err) {
    console.error("Error in main function:", err.message);
  }
}

main();
