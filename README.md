# NutriLens

A React Native app for scanning and extracting nutrition information from food labels using Azure Computer Vision AI.

## Features

- 📸 Camera and photo library integration for nutrition label scanning
- 🤖 AI-powered nutrition data extraction with Azure Computer Vision
- 📊 Clean table-based nutrition information display
- 💾 Scan history with structured nutrition data storage
- 🎯 Multiple nutrition label format support (single-line, tabular, grid)

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Azure account with Computer Vision API access

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd NutriLens
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Azure Computer Vision API**:
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create a Computer Vision resource
   - Copy your API key and endpoint URL

4. **Configure environment variables**:
   - Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   - Edit `.env` and add your Azure credentials:
   ```
   AZURE_COMPUTER_VISION_KEY=your_actual_key_here
   AZURE_COMPUTER_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
   AZURE_TEXT_ANALYTICS_KEY=your_analytics_key_here
   AZURE_TEXT_ANALYTICS_ENDPOINT=https://your-analytics-endpoint.cognitiveservices.azure.com/
   ```
   
   ⚠️ **IMPORTANT**: Never commit your `.env` file to git! It's already in `.gitignore`.

5. **Start the app**:
   ```bash
   npm start
   ```

### Current Features Working Offline:
- ✅ Image capture and gallery selection
- ✅ OCR text extraction (simulated)
- ✅ Basic allergen detection
- ✅ Haram ingredient detection
- ✅ Nutrition warnings
- ✅ Text parsing and structuring

### API Pricing:
- Google Cloud Vision API offers 1,000 free requests per month
- After that, it's $1.50 per 1,000 requests

## Testing the App:

1. Take a photo of a food product label
2. The app will simulate OCR and show extracted text
3. It will detect allergens, haram ingredients, and nutrition warnings
4. All results are displayed in organized sections

## Next Steps:
- Implement real-time camera OCR
- Add more sophisticated NLP for ingredient parsing
- Create a database of common food ingredients
- Add machine learning models for health predictions