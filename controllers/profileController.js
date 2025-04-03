import Profile from '../models/profileModel.js';

// Get user profile or create empty one if not exists
export const getProfile = async (req, res) => {
  try {
    // Get first profile in DB (assuming single user for now)
    const profile = await Profile.findOne();
    
    if (!profile) {
      return res.status(200).json({ 
        success: true, 
        data: null,
        message: 'No profile found'
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile',
      error: error.message
    });
  }
};

// Create or update user profile
export const updateProfile = async (req, res) => {
  try {
    const { 
      name, 
      primaryPhone, 
      secondaryPhone, 
      medicalConditions, 
      medications, 
      bloodType,
      allergies,
      address
    } = req.body;

    // Validate required fields
    if (!name || !primaryPhone) {
      return res.status(400).json({
        success: false,
        message: 'Name and primary phone number are required'
      });
    }

    // Find existing profile or create new one
    let profile = await Profile.findOne();
    
    if (profile) {
      // Update existing profile
      profile.name = name;
      profile.primaryPhone = primaryPhone;
      profile.secondaryPhone = secondaryPhone || '';
      profile.medicalConditions = medicalConditions || '';
      profile.medications = medications || '';
      profile.bloodType = bloodType || '';
      profile.allergies = allergies || '';
      profile.address = address || '';
    } else {
      // Create new profile
      profile = new Profile({
        name,
        primaryPhone,
        secondaryPhone: secondaryPhone || '',
        medicalConditions: medicalConditions || '',
        medications: medications || '',
        bloodType: bloodType || '',
        allergies: allergies || '',
        address: address || ''
      });
    }

    await profile.save();

    res.status(200).json({
      success: true,
      data: profile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Delete profile
export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne();
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    await Profile.deleteOne({ _id: profile._id });

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile',
      error: error.message
    });
  }
}; 