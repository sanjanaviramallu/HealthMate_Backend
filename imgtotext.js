// Importing the required modules
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

// Initialize the GoogleGenerativeAI instance with your API key (set API_KEY in .env file or directly)
const genAI = new GoogleGenerativeAI('AIzaSyA2vsEVR7to4-1aUzEcMuTlTXG5-UaJRII');

function fileToGenerativePart(path, mimeType) {
    return {
      inlineData: {
        data: Buffer.from(fs.readFileSync(path)).toString("base64"),
        mimeType
      },
    };
  }
  
const filePart1 = fileToGenerativePart("D:/prescription images/pic3.png", "image/jpeg")
// Define the async function to generate content
async function run() {
  try {
    // Choose a Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  
    // Define the prompt
    const prompt = "give me the text from the given doctor's prescription";
  
    // Define the image path (ensure the path is correct and accessible)
    const imageParts = [
        filePart1// Adjust to a valid path, ensure the image is accessible
    ];
  
    // Generate content based on the image and prompt
    const generatedContent = await model.generateContent([prompt, ...imageParts]);
    
    // Log the generated response text
    console.log(generatedContent.response.text());

  } catch (error) {
    console.error("Error generating content:", error);
  }
}

// Run the function
run();
