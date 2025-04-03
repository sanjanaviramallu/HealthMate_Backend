import express from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/profileController.js';

const router = express.Router();

// Get user profile
router.get('/', getProfile);

// Create or update profile
router.post('/', updateProfile);

// Delete profile
router.delete('/', deleteProfile);

export default router; 