import Profile from '../models/profileModel.js';
import axios from 'axios';
import twilio from 'twilio';

// Initialize Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
let client;

// Initialize Twilio client if credentials are available
try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
} catch (error) {
  console.error('Error initializing Twilio client:', error);
}

// Helper function to format phone number to E.164 format
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming Indian numbers)
  if (cleaned.length === 10) {
    cleaned = '+91' + cleaned;
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

// Helper function to send SMS
const sendSMS = async (to, message) => {
  if (!client || !twilioPhone) {
    console.log('SMS would be sent to:', to, 'Message:', message);
    return { success: true, mock: true, message: 'SMS simulated (Twilio not configured)' };
  }
  
  try {
    const formattedPhone = formatPhoneNumber(to);
    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone
    });
    
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

// Function to get nearby hospitals based on coordinates
const getNearbyHospitals = async (latitude, longitude, radius = 5000) => {
  try {
    let hospitals = [];
    
    // 1. First try with Google Places API if configured
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey && apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=hospital&key=${apiKey}`;
        const response = await axios.get(url);
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
          hospitals = response.data.results.slice(0, 5).map(hospital => {
            const hospitalLat = hospital.geometry.location.lat;
            const hospitalLng = hospital.geometry.location.lng;
            const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLng);
            
            return {
              name: hospital.name,
              vicinity: hospital.vicinity,
              lat: hospitalLat,
              lng: hospitalLng,
              distance: distance.toFixed(1),
              open_now: hospital.opening_hours ? 
                (hospital.opening_hours.open_now ? 'Open now' : 'Closed') : 
                'Unknown status'
            };
          });
          
          // Sort hospitals by distance
          hospitals.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
          console.log("Found hospitals using Google Places API");
          return { success: true, hospitals };
        }
      } catch (error) {
        console.warn('Google Places API failed:', error.message);
      }
    }
    
    // 2. If Google Places failed or not configured, try Overpass API
    console.log("Falling back to Overpass API");
    
    try {
      // Calculate a bounding box around the location
      const earthRadius = 6371e3; // Earth's radius in meters
      const latOffset = (radius / earthRadius) * (180 / Math.PI);
      const lonOffset = latOffset / Math.cos((latitude * Math.PI) / 180);
      
      const bbox = {
        minLat: latitude - latOffset,
        maxLat: latitude + latOffset,
        minLon: longitude - lonOffset,
        maxLon: longitude + lonOffset,
      };
      
      // Use Overpass API to find hospitals (similar to MapComponent.js)
      const query = `
        [out:json];
        (
          node["amenity"="hospital"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
          way["amenity"="hospital"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
          relation["amenity"="hospital"](${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
        );
        out center;
      `;
      
      const overpassResponse = await axios.post(
        "https://overpass-api.de/api/interpreter", 
        query,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      if (overpassResponse.data && overpassResponse.data.elements.length > 0) {
        hospitals = overpassResponse.data.elements.map(element => {
          // Handle nodes directly
          let lat, lon;
          if (element.type === 'node') {
            lat = element.lat;
            lon = element.lon;
          } else {
            // For ways and relations, use center point
            lat = element.center.lat;
            lon = element.center.lon;
          }
          
          const distance = calculateDistance(latitude, longitude, lat, lon);
          
          return {
            name: element.tags.name || 'Hospital',
            vicinity: element.tags.address || element.tags['addr:street'] || 'Unknown location',
            lat: lat,
            lng: lon,
            distance: distance.toFixed(1),
            open_now: 'Unknown status'
          };
        });
        
        // Sort hospitals by distance
        hospitals.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        console.log(`Found ${hospitals.length} hospitals using Overpass API`);
        return { success: true, hospitals };
      }
    } catch (overpassError) {
      console.warn("Overpass API failed, falling back to Nominatim:", overpassError.message);
    }
    
    // 3. Finally, try Nominatim as a last resort
    console.log("Falling back to Nominatim API");
    
    try {
      // Calculate the same bounding box for Nominatim
      const earthRadius = 6371e3;
      const latOffset = (radius / earthRadius) * (180 / Math.PI);
      const lonOffset = latOffset / Math.cos((latitude * Math.PI) / 180);
      
      const bbox = {
        minLat: latitude - latOffset,
        maxLat: latitude + latOffset,
        minLon: longitude - lonOffset,
        maxLon: longitude + lonOffset,
      };
      
      const nominatimResponse = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&limit=30&q=hospital&category=healthcare&viewbox=${bbox.minLon},${bbox.maxLat},${bbox.maxLon},${bbox.minLat}&bounded=1`,
        { headers: { 'User-Agent': 'HealthMate-App/1.0' } }
      );
      
      if (nominatimResponse.data && nominatimResponse.data.length > 0) {
        hospitals = nominatimResponse.data
          .filter(item => 
            (item.type === 'hospital' || 
             item.class === 'amenity' || 
             (item.display_name && item.display_name.toLowerCase().includes('hospital'))) &&
            // Exclude COVID-19 related facilities
            (!(item.display_name && 
              (item.display_name.toLowerCase().includes('covid') ||
               item.display_name.toLowerCase().includes('vaccination') ||
               item.display_name.toLowerCase().includes('testing'))))
          )
          .map(hospital => {
            const lat = parseFloat(hospital.lat);
            const lng = parseFloat(hospital.lon);
            const distance = calculateDistance(latitude, longitude, lat, lng);
            const name = hospital.display_name.split(',')[0];
            
            return {
              name: name,
              vicinity: hospital.display_name,
              lat: lat,
              lng: lng,
              distance: distance.toFixed(1),
              open_now: 'Unknown status'
            };
          });
        
        // Filter out any duplicates based on name
        const uniqueHospitals = [];
        const seenNames = new Set();
        
        for (const hospital of hospitals) {
          if (!seenNames.has(hospital.name.toLowerCase())) {
            seenNames.add(hospital.name.toLowerCase());
            uniqueHospitals.push(hospital);
          }
        }
        
        // Sort by distance
        uniqueHospitals.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        console.log(`Found ${uniqueHospitals.length} hospitals using Nominatim API`);
        return { success: true, hospitals: uniqueHospitals };
      }
    } catch (nominatimError) {
      console.warn("Nominatim API failed:", nominatimError.message);
    }
    
    // If we got here, all APIs failed
    if (hospitals.length > 0) {
      return { success: true, hospitals };
    }
    
    return { 
      success: false, 
      message: 'Failed to fetch nearby hospitals using all available methods'
    };
  } catch (error) {
    console.error('Error getting nearby hospitals:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Send SOS message with user details and nearby hospitals
export const sendSOS = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required'
      });
    }
    
    // Get user profile
    const profile = await Profile.findOne();
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found. Please create a profile first.'
      });
    }
    
    // Get nearby hospitals
    const hospitalsResult = await getNearbyHospitals(latitude, longitude);
    
    // Prepare emergency SOS message
    const emergencyMessage = `URGENT: Emergency assistance needed for ${profile.name}.\n` +
                      `Location: https://www.google.com/maps?q=${latitude},${longitude}\n` +
                      `Medical Conditions: ${profile.medicalConditions || 'None specified'}\n` +
                      `Medications: ${profile.medications || 'None specified'}\n` +
                      `Blood Type: ${profile.bloodType || 'Unknown'}\n` +
                      `Allergies: ${profile.allergies || 'None specified'}`;
    
    // Prepare hospitals message if available
    let hospitalsMessage = '';
    if (hospitalsResult.success && hospitalsResult.hospitals.length > 0) {
      // Get top 3 hospitals (they're already sorted by distance)
      const topHospitals = hospitalsResult.hospitals.slice(0, 3);
      
      // Format them with name and Google Maps link
      hospitalsMessage = topHospitals.map((hospital, index) => 
        `${index + 1}. ${hospital.name} (${hospital.distance}km): https://www.google.com/maps?q=${hospital.lat},${hospital.lng}`
      ).join('\n\n');
    }
    
    // Track all SMS results
    const smsResults = {
      primaryEmergency: null,
      primaryHospitals: { success: true, skipped: true },
      secondaryEmergency: { success: true, skipped: true },
      secondaryHospitals: { success: true, skipped: true }
    };
    
    // PHASE 1: Send emergency messages to both contacts immediately
    console.log('PHASE 1: Sending emergency messages');
    
    // Send to primary contact
    smsResults.primaryEmergency = await sendSMS(profile.primaryPhone, emergencyMessage);
    
    // Send to secondary contact if available
    if (profile.secondaryPhone) {
      smsResults.secondaryEmergency = await sendSMS(profile.secondaryPhone, emergencyMessage);
    }
    
    // Return a response immediately to not block the user interface
    // We'll continue sending hospital info in the background
    res.status(200).json({
      success: true,
      message: 'SOS alert sent successfully. Hospital information will be sent shortly.',
      primaryEmergency: smsResults.primaryEmergency,
      secondaryEmergency: smsResults.secondaryEmergency
    });
    
    // PHASE 2: Send hospital information after a delay (10 seconds)
    if (hospitalsMessage) {
      console.log('Waiting 10 seconds before sending hospital information...');
      
      setTimeout(async () => {
        try {
          console.log('PHASE 2: Sending hospital information');
          
          // Send hospital info to primary contact
          smsResults.primaryHospitals = await sendSMS(profile.primaryPhone, hospitalsMessage);
          console.log('Hospital info sent to primary contact:', smsResults.primaryHospitals);
          
          // Send hospital info to secondary contact if available
          if (profile.secondaryPhone) {
            smsResults.secondaryHospitals = await sendSMS(profile.secondaryPhone, hospitalsMessage);
            console.log('Hospital info sent to secondary contact:', smsResults.secondaryHospitals);
          }
          
          console.log('All SOS messages sent successfully');
        } catch (delayedError) {
          console.error('Error sending delayed hospital information:', delayedError);
        }
      }, 10000); // 10 seconds delay
    }
    
  } catch (error) {
    console.error('Error sending SOS alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending SOS alert',
      error: error.message
    });
  }
}; 