import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the GoogleGenerativeAI instance with your API key
const genAI = new GoogleGenerativeAI('AIzaSyA2vsEVR7to4-1aUzEcMuTlTXG5-UaJRII');

/**
 * Calculate BMI from height and weight
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @returns {number} BMI value
 */
export const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return bmi.toFixed(1);
};

/**
 * Classify BMI into categories
 * @param {number} bmi - BMI value
 * @returns {string} BMI category
 */
export const classifyBMI = (bmi) => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi >= 18.5 && bmi < 25) return 'Normal';
  if (bmi >= 25 && bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Generate personalized health recommendations using Gemini AI
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @returns {Object} Personalized recommendations
 */
export const getHealthRecommendations = async (weight, height, age) => {
  try {
    const bmi = calculateBMI(weight, height);
    const bmiCategory = classifyBMI(bmi);
    
    // Use Google Generative AI to process the request
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `I am ${age} years old with a BMI of ${bmi} which is classified as "${bmiCategory}". 
    My weight is ${weight}kg and my height is ${height}cm.
    Please provide me with:
    1. A personalized diet plan with specific breakfast, lunch, and dinner recommendations
    2. An exercise routine appropriate for my BMI and age
    3. General health advice based on my metrics
    
    Format your response as JSON with the following structure:
    {
      "dietPlan": {
        "breakfast": "...",
        "lunch": "...",
        "dinner": "..."
      },
      "exercisePlan": "...",
      "healthAdvice": "..."
    }`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Try to parse the JSON response
    try {
      // Look for JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        return {
          bmi,
          bmiCategory,
          ...JSON.parse(jsonString)
        };
      }
      
      // If we can't extract JSON, return a structured response anyway
      return {
        bmi,
        bmiCategory,
        dietPlan: {
          breakfast: "Failed to generate specific recommendations",
          lunch: "Failed to generate specific recommendations",
          dinner: "Failed to generate specific recommendations"
        },
        exercisePlan: "Failed to generate exercise recommendations",
        healthAdvice: "Please consult with a healthcare professional for personalized advice."
      };
    } catch (error) {
      console.error('Error parsing JSON from AI response:', error);
      // Return a fallback response
      return {
        bmi,
        bmiCategory,
        dietPlan: {
          breakfast: "Failed to generate specific recommendations",
          lunch: "Failed to generate specific recommendations",
          dinner: "Failed to generate specific recommendations"
        },
        exercisePlan: "Failed to generate exercise recommendations",
        healthAdvice: "Please consult with a healthcare professional for personalized advice."
      };
    }
  } catch (error) {
    console.error('Error generating health recommendations:', error);
    throw error;
  }
}; 