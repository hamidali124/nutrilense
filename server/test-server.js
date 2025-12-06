// Test script to verify server setup
require('dotenv').config();
const mongoose = require('mongoose');

console.log('\n🧪 Testing Server Configuration...\n');

// Test MongoDB connection
console.log('1. Testing MongoDB connection...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('   ✅ MongoDB connection successful!\n');
  mongoose.connection.close();
  
  // Test Express server
  console.log('2. Testing Express server...');
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  app.get('/test', (req, res) => {
    res.json({ success: true, message: 'Server is working!' });
  });
  
  const server = app.listen(PORT, () => {
    console.log(`   ✅ Server can start on port ${PORT}\n`);
    console.log('3. Testing health endpoint...');
    
    const http = require('http');
    http.get(`http://localhost:${PORT}/test`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('   ✅ Health endpoint responding\n');
        console.log('✅ All tests passed! Server is ready.\n');
        server.close();
        process.exit(0);
      });
    }).on('error', (err) => {
      console.error('   ❌ Error:', err.message);
      server.close();
      process.exit(1);
    });
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`   ❌ Port ${PORT} is already in use!`);
      console.error(`   💡 Try changing PORT in .env or stop the other process\n`);
    } else {
      console.error('   ❌ Server error:', err.message);
    }
    process.exit(1);
  });
})
.catch((error) => {
  console.error('   ❌ MongoDB connection failed!');
  console.error('   Error:', error.message);
  console.error('\n   💡 Common issues:');
  console.error('   - Check your MONGODB_URI in .env');
  console.error('   - Verify your IP is whitelisted in MongoDB Atlas');
  console.error('   - Check your username/password are correct');
  console.error('   - Ensure your cluster is running\n');
  process.exit(1);
});

