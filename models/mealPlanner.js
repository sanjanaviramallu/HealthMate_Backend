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
 * Determine age group from age
 * @param {number} age - Age in years
 * @returns {string} Age group
 */
export const getAgeGroup = (age) => {
  return `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
};

/**
 * Generate a personalized meal plan based on age, height, weight using Gemini AI
 * @param {number} age - Age in years
 * @param {number} height - Height in cm
 * @param {number} weight - Weight in kg
 * @returns {Object} Personalized meal plan
 */
export const generateMealPlan = async (age, height, weight) => {
  try {
    const bmi = calculateBMI(weight, height);
    const bmiCategory = classifyBMI(bmi);
    const ageGroup = getAgeGroup(age);
    
    // Use Google Generative AI to process the request
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `I am ${age} years old with a BMI of ${bmi} which is classified as "${bmiCategory}". 
    My weight is ${weight}kg and my height is ${height}cm.
    
    Please create a comprehensive and detailed 7-day meal plan that is:
    - Nutritionally balanced
    - Appropriate for my BMI category (${bmiCategory})
    - Suitable for my age group (${ageGroup})
    - Includes specific food suggestions
    - Includes approximate calorie counts
    
    Format your response as JSON with the following structure:
    {
      "overview": "Brief explanation of the meal plan's focus and goals",
      "nutritionalGuidelines": "Key nutritional guidelines I should follow",
      "weeklyPlan": [
        {
          "day": "Monday",
          "meals": {
            "breakfast": {"description": "...", "calories": "..."},
            "lunch": {"description": "...", "calories": "..."},
            "dinner": {"description": "...", "calories": "..."},
            "snacks": {"description": "...", "calories": "..."}
          }
        },
        // Additional days following the same structure
      ],
      "tips": ["tip1", "tip2", "tip3"]
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
          ageGroup,
          ...JSON.parse(jsonString)
        };
      }
      
      // If we can't extract JSON, return a structured response with the text
      return {
        bmi,
        bmiCategory,
        ageGroup,
        overview: "Personalized meal plan based on your metrics",
        nutritionalGuidelines: "Balanced diet appropriate for your BMI and age",
        weeklyPlan: [
          {
            day: "Sample Day",
            meals: {
              breakfast: { description: "Healthy breakfast options", calories: "~300-400 kcal" },
              lunch: { description: "Balanced lunch options", calories: "~500-600 kcal" },
              dinner: { description: "Nutritious dinner options", calories: "~500-600 kcal" },
              snacks: { description: "Healthy snack options", calories: "~200-300 kcal" }
            }
          }
        ],
        tips: [
          "Focus on whole foods",
          "Stay hydrated throughout the day",
          "Balance your macronutrients"
        ],
        rawResponse: response // Include the raw response for debugging
      };
    } catch (error) {
      console.error('Error parsing JSON from AI response:', error);
      // Return a fallback response
      return {
        bmi,
        bmiCategory,
        ageGroup,
        overview: "Personalized meal plan based on your metrics",
        nutritionalGuidelines: "Balanced diet appropriate for your BMI and age",
        weeklyPlan: [
          {
            day: "Sample Day",
            meals: {
              breakfast: { description: "Healthy breakfast options", calories: "~300-400 kcal" },
              lunch: { description: "Balanced lunch options", calories: "~500-600 kcal" },
              dinner: { description: "Nutritious dinner options", calories: "~500-600 kcal" },
              snacks: { description: "Healthy snack options", calories: "~200-300 kcal" }
            }
          }
        ],
        tips: [
          "Focus on whole foods",
          "Stay hydrated throughout the day",
          "Balance your macronutrients"
        ],
        rawResponse: response // Include the raw response for debugging
      };
    }
  } catch (error) {
    console.error('Error generating meal plan:', error);
    throw error;
  }
}; 