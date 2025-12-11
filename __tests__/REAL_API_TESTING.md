# Real API Testing Setup

## Overview

Module 1 and Module 3 tests now use **REAL APIs** instead of mocks:
- **Module 1**: Uses real Azure Computer Vision API for OCR
- **Module 3**: Uses real backend NutriScore API

## Prerequisites

### For Module 1 (Azure Computer Vision API)

1. **Set up Azure credentials** in your `.env` file:
```env
AZURE_COMPUTER_VISION_KEY=your_azure_key_here
AZURE_COMPUTER_VISION_ENDPOINT=https://your-resource.cognitiveservices.azure.com
```

2. **Get Azure credentials**:
   - Go to Azure Portal
   - Create a Computer Vision resource
   - Copy the Key and Endpoint

### For Module 3 (Backend NutriScore API)

1. **Start the backend server**:
```bash
cd server
npm install
npm start
```

2. **Set backend API URL** in your `.env` file:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
# Or your actual backend URL:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000/api
```

3. **Ensure Python service is running**:
```bash
cd server/python_service
pip install -r requirements.txt
python nutriscore_api.py
```

## Running Tests

### Run Module 1 tests (Azure API):
```bash
npm test -- __tests__/Module1_ProductScanning.test.js
```

### Run Module 3 tests (Backend API):
```bash
# Make sure backend is running first!
npm test -- __tests__/Module3_NutriScore.test.js
```

### Run all tests:
```bash
npm test
```

## Test Behavior

### Without API Credentials/Server:
- Tests will **skip** with a warning message
- Tests won't fail, but won't validate real API behavior

### With API Credentials/Server:
- Tests will make **real API calls**
- Tests will validate actual API responses
- Tests may be slower (network latency)
- Tests may consume API quota/credits

## Notes

- **Module 1** tests require real nutrition label images for full testing
- **Module 3** tests require backend server to be running
- Tests have increased timeouts (30-60 seconds) for real API calls
- Make sure you have sufficient API quota/credits

## Troubleshooting

### "Backend server not available"
- Start the backend: `cd server && npm start`
- Check if Python service is running
- Verify `EXPO_PUBLIC_API_BASE_URL` is set correctly

### "Azure credentials not found"
- Set `AZURE_COMPUTER_VISION_KEY` and `AZURE_COMPUTER_VISION_ENDPOINT` in `.env`
- Restart your test runner

### Tests timing out
- Check network connection
- Verify API endpoints are accessible
- Increase timeout if needed (tests already have 30-60s timeouts)

