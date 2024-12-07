const fs = require("fs");
const fsPromise = require("fs").promises;
const path = require("path");
const Groq = require("groq-sdk");
const axios = require("axios");

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
      // Skip directories in the skipFolders list
      if (skipFolders.includes(file)) continue;

      // Recurse into subdirectories
      textData += readFilesRecursively(filePath, skipFolders);
    } else if (supportedFormats.includes(path.extname(file))) {
      // Read text data if the file format is supported
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
          content: text, // Pass the aggregated text as the prompt
        },
      ],
      model: "llama3-8b-8192", // Adjust the model if needed
    });

    // console.log(
    //   "Response from Groq AI:",
    //   completion.choices[0]?.message?.content || "No response content received"
    // );
    return completion.choices[0]?.message?.content;
  } catch (error) {
    console.error("Error communicating with Groq AI:", error.message);
  }
};

// Function to send text data to Ollama local
const sendToOllama = async (text) => {
  console.log("Sending Ollama...");
  const ollamaUrl = `${process.env.OLLAMA_HOST}/api/generate`; // Adjust the URL if necessary
  try {
    const response = await axios.post(
      ollamaUrl,
      {
        prompt: text,
        model: "llama3.2",
      },
      {
        // This option will make the response a stream
        responseType: "stream",
      }
    );

    let fullResponse = "";
    response.data.on("data", (chunk) => {
      console.log("Receiving Stream Data...");
      fullResponse += chunk.toString().split(",")[2].split(":")[1]; // Concatenate the chunk to the full response
      fullResponse = fullResponse.replace('"', "");
      fullResponse = fullResponse.replace("undefined", "");
      fullResponse = fullResponse.replace("\n\n", "");
      fullResponse = fullResponse.replace('""', "");
      fullResponse = fullResponse.replace("\n", "");
    });

    response.data.on("end", async () => {
      console.log("Stream finished.");

      const htmlFormat = Buffer.from(
        await sendToGroq(fullResponse + " make the format to be html"),
        "utf-8"
      );

      // Write the full response to a file
      fs.writeFile(outDir, htmlFormat, (err) => {
        if (err) {
          console.error("Error writing file:", err);
        } else {
          console.log("File saved successfully.");
        }
      });
    });

    response.data.on("error", (err) => {
      console.error("Stream error:", err);
    });
  } catch (error) {
    console.error("Error communicating with Ollama:", error.message);
  }
};

async function readFileAsync(readDir) {
  try {
    const data = await fsPromise.readFile(readDir, "utf8"); // Properly passing the encoding
    console.log(data);
    return data;
  } catch (err) {
    console.error("Error reading file:", err);
    throw err;
  }
}

// Main function to aggregate text and choose target AI
async function main() {
  // Aggregate all text into one variable
  console.log("Reading code...");
  let allText = readFilesRecursively(baseDir);
  console.log("Reading input...");
  const input = await readFileAsync("input.txt");
  allText += `
    ${input}
    `;

  await sendToOllama(allText);
}

main();
