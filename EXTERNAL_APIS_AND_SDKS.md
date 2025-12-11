# Third-Party APIs and SDKs Used in NutriLens

## Overview
This document lists only third-party external APIs, SDKs, libraries, and services used in the NutriLens project, including their versions, endpoints, and purposes.

---

## 1. Azure Computer Vision API

### API Details
- **Service Name**: Azure Computer Vision - Read API
- **Version**: v3.2
- **Provider**: Microsoft Azure
- **Purpose**: Optical Character Recognition (OCR) to extract text from nutrition label images

### API Endpoints
- **Base URL**: `{AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2`
- **Submit Analysis**: `POST /read/analyze`
- **Get Results**: `GET /read/analyzeResults/{operationId}`

### Authentication
- **Method**: Subscription Key (Ocp-Apim-Subscription-Key header)
- **Environment Variable**: `AZURE_COMPUTER_VISION_KEY`
- **Endpoint Variable**: `AZURE_COMPUTER_VISION_ENDPOINT`

### Usage in Project
- **File**: `src/services/azureVisionService.js`
- **Function**: `extractText(imageUri)` - Extracts text from nutrition label images
- **Function**: `extractNutritionFacts(imageUri)` - Extracts structured nutrition data with spatial analysis

### Features Used
- Advanced OCR with spatial coordinates
- Layout analysis for table structures
- Multi-language support (English, Arabic, Urdu)
- Confidence scoring per word

### Example Endpoint Format
```
https://{region}.api.cognitive.microsoft.com/vision/v3.2/read/analyze
```

---

## 2. Azure Text Analytics API

### API Details
- **Service Name**: Azure Text Analytics - Named Entity Recognition (NER)
- **Version**: v3.1
- **Provider**: Microsoft Azure
- **Purpose**: Natural Language Processing (NLP) for intelligent ingredient extraction from OCR text

### API Endpoints
- **Base URL**: `{AZURE_TEXT_ANALYTICS_ENDPOINT}/text/analytics/v3.1`
- **Entity Recognition**: `POST /entities/recognition/general`

### Authentication
- **Method**: Subscription Key (Ocp-Apim-Subscription-Key header)
- **Environment Variable**: `AZURE_TEXT_ANALYTICS_KEY`
- **Endpoint Variable**: `AZURE_TEXT_ANALYTICS_ENDPOINT`

### Usage in Project
- **File**: `src/services/ingredientNLPService.js`
- **Function**: `extractEntitiesWithAzure(text)` - Extracts food-related entities from ingredient text

### Features Used
- Named Entity Recognition (NER)
- Food-related entity identification
- Confidence scoring
- Context understanding

### Example Endpoint Format
```
https://{region}.cognitiveservices.azure.com/text/analytics/v3.1/entities/recognition/general
```

---

## 3. MongoDB Atlas

### Database Details
- **Service Name**: MongoDB Atlas (Cloud Database)
- **Provider**: MongoDB Inc.
- **Purpose**: Cloud-hosted NoSQL database for user authentication, profiles, and scan history

### Connection
- **Method**: MongoDB Connection String (MongoDB URI)
- **Environment Variable**: `MONGODB_URI`
- **Driver**: Mongoose v8.0.3

### Usage in Project
- **File**: `server/server.js`
- **File**: `server/models/User.js`
- **Collections**: 
  - Users (authentication, profiles)
  - Scan History (nutrition data storage)

### Features Used
- User authentication storage
- Profile data management
- Scan history persistence
- JWT token management

### Connection Format
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

---

## Frontend SDKs and Libraries

### 4. Expo SDK

#### Details
- **SDK Version**: ~54.0.12
- **Framework**: React Native with Expo
- **Purpose**: Cross-platform mobile app development framework

#### Expo Modules Used
- **expo-camera** (~17.0.8): Camera access and photo capture
- **expo-image-picker** (~17.0.8): Image selection from gallery
- **expo-image-manipulator** (~14.0.7): Image compression and resizing
- **expo-file-system** (^19.0.16): File system operations
- **expo-secure-store** (~15.0.7): Secure storage for sensitive data
- **expo-media-library** (~18.2.0): Media library access
- **expo-asset** (^12.0.10): Asset management
- **expo-status-bar** (~3.0.8): Status bar control

### 5. React Native

#### Details
- **Version**: 0.81.4
- **React Version**: 19.1.0
- **Purpose**: Mobile app UI framework

### 6. Axios

#### Details
- **Version**: ^1.12.2 (frontend), ^1.6.2 (backend)
- **Purpose**: HTTP client for API requests
- **Usage**: 
  - Frontend: API calls to backend and Azure services
  - Backend: HTTP requests

### 7. AsyncStorage

#### Details
- **Package**: @react-native-async-storage/async-storage
- **Version**: 2.2.0
- **Purpose**: Local data persistence (scan history, daily nutrition totals)

### 8. React Native ML Kit (Text Recognition)

#### Details
- **Package**: @react-native-ml-kit/text-recognition
- **Version**: ^2.0.0
- **Purpose**: Alternative OCR option (not currently primary, but available)

---

## Backend SDKs and Libraries

### 9. Express.js

#### Details
- **Version**: ^4.18.2
- **Purpose**: Web server framework for Node.js backend

### 10. Mongoose

#### Details
- **Version**: ^8.0.3
- **Purpose**: MongoDB object modeling for Node.js

### 11. CORS

#### Details
- **Version**: ^2.8.5
- **Purpose**: Cross-Origin Resource Sharing middleware

### 12. JSON Web Token (JWT)

#### Details
- **Package**: jsonwebtoken
- **Version**: ^9.0.2
- **Purpose**: User authentication tokens

### 13. Bcrypt

#### Details
- **Package**: bcryptjs
- **Version**: ^2.4.3
- **Purpose**: Password hashing for secure authentication

---

## Python Backend Libraries

### 14. Flask

#### Details
- **Version**: >=3.0.0
- **Purpose**: Web framework for Python API

### 15. Flask-CORS

#### Details
- **Version**: >=4.0.0
- **Purpose**: CORS support for Flask API

### 16. Scikit-learn

#### Details
- **Version**: >=1.5.0
- **Purpose**: Machine learning models (Random Forest for hypertension/diabetes prediction)

### 17. NumPy

#### Details
- **Version**: >=1.26.0
- **Purpose**: Numerical computing for ML model predictions

### 18. Pandas

#### Details
- **Version**: >=2.0.0
- **Purpose**: Data manipulation for feature preparation

### 19. Joblib

#### Details
- **Version**: >=1.3.0
- **Purpose**: Model serialization and loading (.pkl files)

---

## Testing Frameworks

### 20. Jest

#### Details
- **Version**: ^29.7.0
- **Purpose**: JavaScript testing framework for frontend tests
- **Package**: jest-expo (~51.0.3)

### 21. React Testing Library

#### Details
- **Package**: @testing-library/react-native
- **Version**: ^12.4.3
- **Purpose**: React Native component testing

### 22. Pytest

#### Details
- **Version**: >=7.4.0
- **Purpose**: Python testing framework for backend tests
- **Package**: pytest-cov (>=4.1.0) for coverage

---

## Summary Table

| # | Service/API | Version | Type | Purpose | Endpoint/Connection |
|---|-------------|---------|------|---------|---------------------|
| 1 | Azure Computer Vision | v3.2 | External API | OCR text extraction | `/vision/v3.2/read/analyze` |
| 2 | Azure Text Analytics | v3.1 | External API | NLP ingredient extraction | `/text/analytics/v3.1/entities/recognition/general` |
| 3 | MongoDB Atlas | - | Cloud Database | Data storage | MongoDB connection string |
| 4 | Expo SDK | ~54.0.12 | SDK | Mobile app framework | - |
| 5 | React Native | 0.81.4 | Framework | UI framework | - |
| 6 | Axios | ^1.12.2 | Library | HTTP client | - |
| 7 | AsyncStorage | 2.2.0 | Library | Local storage | - |
| 8 | ML Kit Text Recognition | ^2.0.0 | SDK | Alternative OCR | - |
| 9 | Express.js | ^4.18.2 | Framework | Backend server | - |
| 10 | Mongoose | ^8.0.3 | Library | MongoDB ODM | - |
| 11 | CORS | ^2.8.5 | Library | CORS middleware | - |
| 12 | JWT | ^9.0.2 | Library | Authentication | - |
| 13 | Bcrypt | ^2.4.3 | Library | Password hashing | - |
| 14 | Flask | >=3.0.0 | Framework | Python API | - |
| 15 | Flask-CORS | >=4.0.0 | Library | CORS for Flask | - |
| 16 | Scikit-learn | >=1.5.0 | Library | ML models | - |
| 17 | NumPy | >=1.26.0 | Library | Numerical computing | - |
| 18 | Pandas | >=2.0.0 | Library | Data manipulation | - |
| 19 | Joblib | >=1.3.0 | Library | Model serialization | - |
| 20 | Jest | ^29.7.0 | Framework | Testing | - |
| 21 | React Testing Library | ^12.4.3 | Library | Component testing | - |
| 22 | Pytest | >=7.4.0 | Framework | Python testing | - |

---

## Environment Variables Required

### Frontend (.env)
```bash
AZURE_COMPUTER_VISION_KEY=your_azure_vision_key
AZURE_COMPUTER_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_TEXT_ANALYTICS_KEY=your_analytics_key
AZURE_TEXT_ANALYTICS_ENDPOINT=https://your-region.cognitiveservices.azure.com/
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

### Backend (.env)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your_jwt_secret_key
PORT=3000
NODE_ENV=development
```

### Python Service
- No environment variables required (uses local model files)
- Default port: 5000

---

## API Pricing (Approximate)

### Azure Computer Vision
- **Free Tier**: 5,000 transactions/month
- **Standard Tier**: $1.50 per 1,000 transactions

### Azure Text Analytics
- **Free Tier**: 5,000 transactions/month
- **Standard Tier**: $2.00 per 1,000 transactions

### MongoDB Atlas
- **Free Tier**: 512 MB storage, shared cluster
- **Paid Tiers**: Starting at $9/month

---

## Notes

1. **Azure APIs** require active subscription keys and endpoints configured in environment variables
2. **MongoDB Atlas** requires a connection string with proper credentials
3. All external APIs have fallback mechanisms or error handling in the codebase
4. Third-party libraries are managed via npm (Node.js) and pip (Python) package managers

