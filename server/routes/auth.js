const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('Register request received:', {
      name: req.body.name,
      email: req.body.email,
      age: req.body.age,
      height: req.body.height,
      weight: req.body.weight,
      gender: req.body.gender,
      allergensCount: req.body.allergens?.length || 0
    });

    const { name, email, password, age, height, weight, gender, allergens } = req.body;

    // Validation
    if (!name || !email || !password || !age || !height || !weight || !gender) {
      console.error('Missing required fields:', { name: !!name, email: !!email, password: !!password, age: !!age, height: !!height, weight: !!weight, gender: !!gender });
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate data types and ranges
    const ageNum = parseInt(age);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
      return res.status(400).json({
        success: false,
        message: 'Invalid age. Must be between 1 and 150'
      });
    }

    if (isNaN(heightNum) || heightNum < 50 || heightNum > 300) {
      return res.status(400).json({
        success: false,
        message: 'Invalid height. Must be between 50 and 300 cm'
      });
    }

    if (isNaN(weightNum) || weightNum < 10 || weightNum > 500) {
      return res.status(400).json({
        success: false,
        message: 'Invalid weight. Must be between 10 and 500 kg'
      });
    }

    if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender. Must be male, female, or other'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Calculate BMI (will also be calculated in pre-save hook, but we need it for initial creation)
    const heightInMeters = heightNum / 100;
    const bmi = parseFloat((weightNum / (heightInMeters * heightInMeters)).toFixed(2));

    console.log('Creating user with data:', {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      age: ageNum,
      height: heightNum,
      weight: weightNum,
      bmi,
      gender: gender.toLowerCase(),
      allergensCount: (allergens || []).length
    });

    // Create user - don't pass BMI, let pre-save hook calculate it
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      age: ageNum,
      height: heightNum,
      weight: weightNum,
      // BMI will be calculated automatically in pre-save hook
      gender: gender.toLowerCase(),
      allergens: Array.isArray(allergens) ? allergens : []
    });

    await user.save();
    console.log('User created successfully:', user._id);
    console.log('User BMI (calculated):', user.bmi);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        gender: user.gender,
        allergens: user.allergens,
        hba1c: user.hba1c
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      // Duplicate key error (email already exists)
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        gender: user.gender,
        allergens: user.allergens,
        hba1c: user.hba1c
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// Get user profile (protected route)
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        gender: user.gender,
        allergens: user.allergens,
        hba1c: user.hba1c
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Update user profile (protected route)
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    const { name, age, height, weight, gender, allergens, hba1c } = req.body;

    if (name) user.name = name.trim();
    if (age) user.age = parseInt(age);
    if (height) user.height = parseFloat(height);
    if (weight) user.weight = parseFloat(weight);
    if (gender) user.gender = gender;
    if (allergens !== undefined) user.allergens = allergens;
    if (hba1c !== undefined) {
      // Allow null/empty string to clear the value
      user.hba1c = hba1c === '' || hba1c === null ? undefined : parseFloat(hba1c);
    }

    // BMI will be recalculated automatically in pre-save hook
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        height: user.height,
        weight: user.weight,
        bmi: user.bmi,
        gender: user.gender,
        allergens: user.allergens,
        hba1c: user.hba1c
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
      error: error.message
    });
  }
});

module.exports = router;

