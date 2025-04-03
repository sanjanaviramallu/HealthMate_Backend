// const express = require("express");
// const mongoose = require("mongoose");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const http = require("http");
// const { Server } = require("socket.io");

// dotenv.config();

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//     cors: {
//         origin: "*",
//         methods: ["GET", "POST"]
//     }
// });

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// }).then(() => console.log("MongoDB connected"))
//   .catch((error) => console.error("MongoDB connection error:", error));

// // Health Data Schema
// const healthDataSchema = new mongoose.Schema({
//     user_id: String,
//     heart_rate: Number,
//     steps: Number,
//     timestamp: { type: Date, default: Date.now }
// });

// const HealthData = mongoose.model("HealthData", healthDataSchema);

// // API Route to receive health data from mobile app
// app.post("/api/health-data", async (req, res) => {
//     const { user_id, heart_rate, steps } = req.body;
//     const newData = new HealthData({ user_id, heart_rate, steps });
//     await newData.save();
//     io.emit("health-data", newData); // Emit real-time data
//     res.status(201).send(newData);
// });

// // Start the server
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));






// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors'); // Import cors
// const smsRoutes = require('./routes/smsRoutes');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Use CORS middleware
// app.use(cors());

// app.use(express.json());

// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// }).then(() => {
//   console.log('MongoDB connected');
// }).catch(err => console.log(err));

// // Use routes
// app.use('/api', smsRoutes);

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });






// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
// import axios from 'axios';
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // Rate limit retry settings
// const maxRetries = 5; // Maximum number of retries
// const retryDelay = 2000; // Delay in milliseconds between retries (2 seconds)

// const generateDietPlan = async (bmiCategory, ageGroup) => {
//   const baseDelay = 2000; // Base delay (2 seconds)
//   const maxRetries = 5; // Maximum retry attempts
//   let attempt = 1; // Track attempt number

//   // Retry loop
//   while (attempt <= maxRetries) {
//     try {
//       const response = await axios.post(
//         'https://api.openai.com/v1/chat/completions',
//         {
//           model: 'gpt-3.5-turbo',
//           messages: [
//             { role: 'system', content: 'You are a helpful assistant.' },
//             { role: 'user', content: `Provide a dietary plan for a person who is ${bmiCategory} and in the ${ageGroup} age group.` }
//           ],
//           max_tokens: 150,
//           temperature: 0.7,
//         },
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//           },
//         }
//       );

//       return response.data.choices[0].message.content; // Return the generated diet plan
//     } catch (error) {
//       if (error.response && error.response.status === 429) {
//         // If rate limit exceeded, retry after exponential backoff
//         console.log(`Rate limit exceeded, retrying in ${baseDelay * Math.pow(2, attempt - 1) / 1000} seconds...`);
//         if (attempt < maxRetries) {
//           await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1))); // Exponential backoff
//           attempt++;
//         } else {
//           throw new Error('Exceeded maximum retry attempts due to rate limit');
//         }
//       } else {
//         // Rethrow if error is not a rate limit
//         console.error('Error fetching diet plan:', error);
//         throw error;
//       }
//     }
//   }
// };

// // Start the server
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });



//prescrption backend
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mongoose from 'mongoose';
import { getHealthRecommendations } from './models/bmiModel.js';
import { generateMealPlan } from './models/mealPlanner.js';
import reminderRoutes from './routes/reminderRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import sosRoutes from './routes/sosRoutes.js';

// Get __dirname for ES module support
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Express app
const app = express();
const port = process.env.PORT || 5000;

// Initialize the GoogleGenerativeAI instance with your API key
const genAI = new GoogleGenerativeAI(process.env.G_API_KEY || 'AIzaSyA2vsEVR7to4-1aUzEcMuTlTXG5-UaJRII');

// Log environment variables for debugging (remove sensitive info in production)
console.log('Environment setup:');
console.log(`- MongoDB: ${process.env.MONGO_URI ? 'Configured' : 'Not configured'}`);
console.log(`- Twilio: ${process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not configured'}`);
console.log(`- Port: ${port}`);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthmate', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Set up CORS
app.use(cors());

// Set up body parsing for multipart form data (for file uploads)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
  console.log('Created uploads directory');
}

// Mount API routes
app.use('/api/reminders', reminderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api', sosRoutes);

// POST route to process image and extract text from the prescription
app.post('/generate-text', upload.single('image'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);

    // Convert file to base64 encoding
    const filePart = {
      inlineData: {
        data: fs.readFileSync(filePath).toString('base64'),
        mimeType: 'image/jpg', // Adjust MIME type based on your file
      },
    };

    // Use Google Generative AI to process the image
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const prompt = "Extract text from the given doctor's prescription";

    // Send image to the model and get the response
    const generatedContent = await model.generateContent([prompt, filePart]);

    // Send the extracted text back to the client
    res.json({ text: generatedContent.response.text() });

    // Clean up the uploaded file after processing
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({ error: 'Failed to process the image.' });
  }
});

// POST route to process multiple images, extract text, and summarize medical reports
app.post('/summarize-reports', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Processing ${req.files.length} report images...`);
    
    // Step 1: Extract text from each image
    const extractedTexts = [];
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    for (const file of req.files) {
      const filePath = path.join(__dirname, file.path);
      
      // Convert file to base64 encoding
      const filePart = {
        inlineData: {
          data: fs.readFileSync(filePath).toString('base64'),
          mimeType: 'image/jpg',
        },
      };
      
      try {
        // Use Google Generative AI to extract text from the image
        const prompt = "Extract all text from this medical report image as accurately as possible.";
        const result = await model.generateContent([prompt, filePart]);
        const extractedText = result.response.text();
        
        extractedTexts.push(extractedText);
        console.log(`Successfully extracted text from ${file.originalname}`);
        
        // Clean up the file after processing
        fs.unlinkSync(filePath);
      } catch (extractError) {
        console.error(`Error extracting text from ${file.originalname}:`, extractError);
        // Continue with other images even if one fails
      }
    }
    
    if (extractedTexts.length === 0) {
      return res.status(500).json({ error: 'Failed to extract text from any of the uploaded images' });
    }
    
    // Step 2: Combine all extracted texts
    const combinedText = extractedTexts.join('\n\n==== NEXT PAGE ====\n\n');
    
    // Step 3: Summarize the combined text
    try {
      const summaryPrompt = `This is a medical report text extracted from multiple pages. Please provide a comprehensive summary of the key findings, diagnoses, and recommendations. Focus on the most important medical information:

${combinedText}`;
      
      const summaryResult = await model.generateContent(summaryPrompt);
      const summary = summaryResult.response.text();
      
      // Send both the full extracted text and summary to the client
      res.json({
        extractedTexts,
        combinedText,
        summary,
        pageCount: extractedTexts.length
      });
      
    } catch (summaryError) {
      console.error('Error generating summary:', summaryError);
      // If summarization fails, at least return the extracted text
      res.status(200).json({
        success: false,
        extractedTexts,
        combinedText,
        error: 'Failed to generate summary, but text extraction succeeded',
        pageCount: extractedTexts.length
      });
    }
  } catch (error) {
    console.error('Error processing report images:', error);
    res.status(500).json({ error: 'Failed to process the report images.' });
  }
});

// POST route to generate diet plan based on BMI and age
app.post('/generate-diet-plan', async (req, res) => {
  try {
    const { bmiCategory, ageGroup } = req.body;

    // Use Google Generative AI to generate a diet plan
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const prompt = `Create a healthy diet plan for someone who is ${bmiCategory} and in the ${ageGroup} age group.`;

    // Send prompt to the model and get the response
    const generatedContent = await model.generateContent(prompt);
    const dietPlan = generatedContent.response.text();

    // Send the generated diet plan back to the client
    res.json({ dietPlan });
  } catch (error) {
    console.error('Error generating diet plan:', error);
    res.status(500).json({ error: 'Failed to generate diet plan.' });
  }
});

// POST route for BMI calculation and personalized recommendations
app.post('/calculate-bmi', async (req, res) => {
  try {
    const { weight, height, age } = req.body;
    
    // Validate input parameters
    if (!weight || !height || !age) {
      return res.status(400).json({ error: 'Weight, height, and age are required.' });
    }
    
    // Convert string inputs to numbers if needed
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    const ageNum = parseInt(age);
    
    // Validate numeric values
    if (isNaN(weightNum) || isNaN(heightNum) || isNaN(ageNum)) {
      return res.status(400).json({ error: 'Weight, height, and age must be valid numbers.' });
    }
    
    // Generate health recommendations using the BMI model
    const recommendations = await getHealthRecommendations(weightNum, heightNum, ageNum);
    
    // Send the recommendations back to the client
    res.json(recommendations);
  } catch (error) {
    console.error('Error calculating BMI:', error);
    res.status(500).json({ error: 'Failed to calculate BMI and generate recommendations.' });
  }
});

// POST route for generating personalized meal plans
app.post('/generate-meal-plan', async (req, res) => {
  try {
    const { age, height, weight } = req.body;
    
    // Validate input parameters
    if (!age || !height || !weight) {
      return res.status(400).json({ error: 'Age, height, and weight are required.' });
    }
    
    // Convert string inputs to numbers if needed
    const ageNum = parseInt(age);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    // Validate numeric values
    if (isNaN(ageNum) || isNaN(heightNum) || isNaN(weightNum)) {
      return res.status(400).json({ error: 'Age, height, and weight must be valid numbers.' });
    }
    
    // Generate meal plan using the meal planner model
    const mealPlan = await generateMealPlan(ageNum, heightNum, weightNum);
    
    // Send the meal plan back to the client
    res.json(mealPlan);
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan.' });
  }
});

// Route to handle non-existing paths (optional for debugging)
app.get('*', (req, res) => {
  res.status(404).send('Not Found');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



//remainder backend
// // backend/server.js
// const express = require('express');
// const bodyParser = require('body-parser');
// const schedule = require('node-schedule');
// const cors = require('cors');
// const twilio = require('twilio');

// const app = express();

// // Middleware
// app.use(bodyParser.json());
// app.use(cors());

// // Twilio configuration (replace with your Twilio credentials)
// const accountSid = 'AC361e4f106f1f89afde9b2a9d21c96587';       // Replace with your Twilio Account SID
// const authToken = '16c71a3b110aac69ea01506f4d90b5fd';          // Replace with your Twilio Auth Token
// const twilioNumber = '+14438704519'; // Replace with your Twilio phone number

// // Create Twilio client
// const client = new twilio(accountSid, authToken);

// // Helper function to format phone numbers to E.164 format
// function formatPhoneNumber(phoneNumber) {
//     if (!phoneNumber.startsWith('+')) {
//         return +91${phoneNumber};  // Assuming Indian phone numbers
//     }
//     return phoneNumber;
// }

// // Helper function to send SMS
// async function sendSMS(formattedPhoneNumber, medicineName) {
//     try {
//         const message = await client.messages.create({
//             body: It's time to take your medicine: ${medicineName},
//             from: twilioNumber,
//             to: formattedPhoneNumber,
//         });
//         console.log(Message sent with SID: ${message.sid});
//     } catch (error) {
//         console.error('Error sending SMS:', error);
//     }
// }

// // Reminder API endpoint
// app.post('/api/reminders', (req, res) => {
//     const { phoneNumber, medicineName, reminderTime } = req.body;
//     const reminderDate = new Date(reminderTime);

//     // Validate phone number format
//     if (!phoneNumber || !medicineName || !reminderTime) {
//         return res.status(400).json({ message: 'All fields are required' });
//     }

//     // Format the phone number before sending the SMS
//     const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

//     // Schedule the SMS to be sent at the specified time
//     schedule.scheduleJob(reminderDate, function () {
//         sendSMS(formattedPhoneNumber, medicineName);
//     });

//     res.status(200).json({ message: 'Reminder scheduled successfully!' });
// });

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(Server running on port ${PORT}));



// backend/server.js
// server.js
// import express from 'express';
// import bodyParser from 'body-parser';
// import schedule from 'node-schedule';
// import cors from 'cors';
// import twilio from 'twilio';

// // Initialize the app
// const app = express();

// // Middleware
// app.use(bodyParser.json());
// app.use(cors());

// // Twilio configuration (replace with your Twilio credentials)
// const accountSid = 'AC361e4f106f1f89afde9b2a9d21c96587';  // Replace with your Twilio Account SID
// const authToken = '16c71a3b110aac69ea01506f4d90b5fd';     // Replace with your Twilio Auth Token
// const twilioNumber = '+14438704519';                      // Replace with your Twilio phone number

// // Create Twilio client
// const client = twilio(accountSid, authToken);

// // Helper function to format phone numbers to E.164 format
// function formatPhoneNumber(phoneNumber) {
//     if (!phoneNumber.startsWith('+')) {
//         return `+91${phoneNumber}`; // Assuming Indian phone numbers
//     }
//     return phoneNumber;
// }

// // Helper function to send SMS
// async function sendSMS(formattedPhoneNumber, medicineName) {
//     try {
//         const message = await client.messages.create({
//             body: `It's time to take your medicine: ${medicineName}`,
//             from: twilioNumber,
//             to: formattedPhoneNumber,
//         });
//         console.log(`Message sent with SID: ${message.sid}`);
//     } catch (error) {
//         console.error('Error sending SMS:', error);
//     }
// }

// // Reminder API endpoint
// app.post('/api/reminders', (req, res) => {
//     const { phoneNumber, medicines, reminderDays } = req.body;

//     if (!phoneNumber || !medicines || medicines.length === 0 || !reminderDays) {
//         return res.status(400).json({ message: 'All fields are required' });
//     }

//     // Format the phone number before sending the SMS
//     const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

//     // Loop over all the medicines and schedule reminders
//     medicines.forEach(medicine => {
//         const reminderTime = new Date(medicine.time);

//         // Schedule daily reminders for the specified number of days
//         for (let i = 0; i < reminderDays; i++) {
//             // Adjust the time by adding the number of days
//             const scheduledTime = new Date(reminderTime);
//             scheduledTime.setDate(scheduledTime.getDate() + i);

//             // Schedule the SMS for that day at the same time
//             schedule.scheduleJob(scheduledTime, function () {
//                 sendSMS(formattedPhoneNumber, medicine.name);
//             });
//         }
//     });

//     res.status(200).json({ message: 'Reminders scheduled successfully!' });
// });

// // Start the server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
