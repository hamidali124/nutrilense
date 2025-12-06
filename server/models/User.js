const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [1, 'Age must be at least 1'],
    max: [150, 'Age must be less than 150']
  },
  height: {
    type: Number,
    required: [true, 'Height is required'],
    min: [50, 'Height must be at least 50cm'],
    max: [300, 'Height must be less than 300cm']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [10, 'Weight must be at least 10kg'],
    max: [500, 'Weight must be less than 500kg']
  },
  bmi: {
    type: Number,
    required: false // Will be calculated automatically in pre-save hook
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  allergens: {
    type: [String],
    default: []
  },
  hba1c: {
    type: Number,
    required: false,
    min: [0, 'HbA1c must be a positive number'],
    max: [20, 'HbA1c must be less than 20%']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate BMI before saving
userSchema.pre('save', function(next) {
  // Always calculate BMI if height and weight are present
  if (this.height && this.weight) {
    // BMI = weight (kg) / (height (m))^2
    const heightInMeters = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(2));
  }
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

