// Test script to verify registration endpoint
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testRegistration() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test data
    const testUser = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'test123',
      age: 25,
      height: 175,
      weight: 70,
      gender: 'male',
      allergens: ['milk', 'eggs']
    };

    console.log('Creating test user:', testUser);
    
    const user = new User(testUser);
    await user.save();
    
    console.log('✅ User created successfully!');
    console.log('User ID:', user._id);
    console.log('User BMI:', user.bmi);
    console.log('User allergens:', user.allergens);
    
    // Clean up - delete test user
    await User.findByIdAndDelete(user._id);
    console.log('\n✅ Test user deleted');
    
    await mongoose.connection.close();
    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

testRegistration();

