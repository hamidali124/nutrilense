# NutriLens Project Summary for Diagram Generation

##  Table of Contents
1. [System Overview](#system-overview)
2. [Actors and Use Cases](#actors-and-use-cases)
3. [System Architecture](#system-architecture)
4. [Component Structure](#component-structure)
5. [Data Flow](#data-flow)
6. [Sequence Diagrams](#sequence-diagrams)
7. [Database Schema](#database-schema)
8. [API Interactions](#api-interactions)
9. [User Flows](#user-flows)
10. [Module Relationships](#module-relationships)

---

## System Overview

### Project Name
**NutriLens** - AI-Powered Nutrition Label Scanner and Analyzer

### Purpose
A mobile application that uses Computer Vision, OCR, and Natural Language Processing to extract and analyze nutritional information and ingredient lists from food packaging images, providing personalized health insights.

### Technology Stack
- **Frontend**: React Native with Expo SDK v54
- **Backend API**: Node.js/Express.js v4.18.2
- **ML Service**: Python Flask v3.0.0+
- **Database**: MongoDB Atlas (Cloud)
- **OCR**: Azure Computer Vision API v3.2
- **NLP**: Azure Text Analytics API v3.1

### System Type
**3-Tier Architecture:**
1. **Presentation Layer**: React Native Mobile App
2. **Application Layer**: Node.js/Express Backend + Python Flask ML Service
3. **Data Layer**: MongoDB Atlas (Cloud Database)

---

## Actors and Use Cases

### Primary Actor
**User** (Mobile App User)

### Use Cases

#### Authentication Module
1. **UC-001: Register Account**
   - Actor: User
   - Precondition: App installed, no account exists
   - Main Flow:
     1. User opens app
     2. User navigates to Register screen
     3. User enters: name, email, password, age, height, weight, gender, allergens
     4. System validates input
     5. System calculates BMI automatically
     6. System sends registration request to backend
     7. Backend creates user in MongoDB
     8. Backend returns JWT token
     9. System stores token securely
     10. User is logged in and redirected to Home

2. **UC-002: Login**
   - Actor: User
   - Precondition: User has registered account
   - Main Flow:
     1. User enters email and password
     2. System sends login request to backend
     3. Backend validates credentials
     4. Backend returns JWT token (expires in 7 days)
     5. System stores token
     6. User is authenticated and redirected to Home

3. **UC-003: View Profile**
   - Actor: Authenticated User
   - Precondition: User is logged in
   - Main Flow:
     1. User navigates to Profile screen
     2. System fetches user profile from backend
     3. System displays: name, email, age, height, weight, BMI, gender, allergens, hba1c

4. **UC-004: Update Profile**
   - Actor: Authenticated User
   - Precondition: User is logged in
   - Main Flow:
     1. User edits profile information
     2. System recalculates BMI
     3. System sends update request to backend
     4. Backend updates MongoDB
     5. System updates local user data

5. **UC-005: Logout**
   - Actor: Authenticated User
   - Main Flow:
     1. User clicks logout
     2. System removes JWT token
     3. System clears user data
     4. User redirected to Login screen

#### Product Scanning Module
6. **UC-006: Scan Nutrition Facts**
   - Actor: Authenticated User
   - Precondition: User is logged in, camera permission granted
   - Main Flow:
     1. User selects "Nutrition Data" scan mode
     2. User chooses: Camera or Gallery
     3. If Camera: User takes photo
     4. If Gallery: User selects image
     5. System compresses image (< 4MB)
     6. System sends image to Azure Computer Vision API
     7. Azure returns OCR text with spatial data
     8. System parses nutrition data (AI → Spatial → Text parser fallback)
     9. System normalizes to per 100g
     10. System calculates EU NutriScore
     11. System calculates Personalized NutriScore (if user profile available)
     12. System displays nutrition data and NutriScore
     13. User can consume nutrition or rescan

7. **UC-007: Scan Ingredients**
   - Actor: Authenticated User
   - Precondition: User is logged in
   - Main Flow:
     1. User selects "Ingredients" scan mode
     2. User captures/selects image
     3. System extracts OCR text via Azure
     4. System finds ingredient section in text
     5. System uses Azure Text Analytics (NLP) for entity recognition
     6. System uses pattern matching as fallback
     7. System analyzes ingredients for allergens (user-specific)
     8. System analyzes ingredients for haram status
     9. System generates alerts for allergens/haram/additives
     10. System displays ingredient list with analysis

8. **UC-008: Manual Nutrition Input**
   - Actor: Authenticated User
   - Main Flow:
     1. User selects "Manual Input" option
     2. User enters nutrition values manually
     3. System validates input
     4. System calculates NutriScore
     5. System displays results

#### Analysis Module
9. **UC-009: Calculate Personalized NutriScore**
   - Actor: System (Automatic)
   - Precondition: Nutrition data extracted, user profile available
   - Main Flow:
     1. System extracts nutrition per 100g
     2. System gets user profile (age, BMI, gender, hba1c)
     3. System gets previous days nutrition (or defaults)
     4. System calls Node.js backend
     5. Backend calls Python Flask service
     6. Python calculates EU NutriScore (70%)
     7. Python calculates Hypertension risk (15%)
     8. Python calculates Diabetes risk (15% if hba1c available)
     9. Python combines scores (weighted average)
     10. System returns personalized score and grade (A-E)
     11. System displays NutriScore with breakdown

10. **UC-010: Analyze Allergens**
   - Actor: System (Automatic)
   - Precondition: Ingredients extracted, user allergens configured
   - Main Flow:
     1. System receives ingredient list
     2. System checks each ingredient against user's allergen list
     3. System matches against allergen database (allergens.json)
     4. System checks E-numbers for allergens
     5. System generates allergen alerts
     6. System displays warnings

11. **UC-011: Analyze Halal Compliance**
   - Actor: System (Automatic)
   - Precondition: Ingredients extracted
   - Main Flow:
     1. System checks ingredients against haram database
     2. System identifies haram ingredients (pork, alcohol, etc.)
     3. System identifies doubtful ingredients (gelatin, etc.)
     4. System checks E-numbers for haram status
     5. System generates haram alerts
     6. System displays compliance status

#### Dashboard Module
12. **UC-012: View Daily Nutrition Dashboard**
   - Actor: Authenticated User
   - Main Flow:
     1. User navigates to Dashboard/Home
     2. System loads daily nutrition totals from AsyncStorage
     3. System calculates percentages (fat, protein, carbs)
     4. System displays progress bars
     5. System shows remaining calories

13. **UC-013: Track Consumed Nutrition**
   - Actor: Authenticated User
   - Precondition: Nutrition data scanned/entered
   - Main Flow:
     1. User scans/enters nutrition
     2. System shows "Consume" confirmation
     3. User confirms consumption
     4. System adds nutrition to daily totals
     5. System updates AsyncStorage
     6. System updates dashboard display

14. **UC-014: View Scan History**
   - Actor: Authenticated User
   - Main Flow:
     1. User navigates to History
     2. System loads scan history from AsyncStorage
     3. System displays list of previous scans
     4. User can view details of any scan

---

## System Architecture

### High-Level Architecture (3-Tier)

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│              React Native Mobile App (Expo)              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   Screens  │  │ Components │  │  Services  │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST API
                          │
┌─────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                       │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │  Node.js/Express     │  │  Python Flask        │    │
│  │  Backend API         │  │  ML Service           │    │
│  │  (Port 3000)         │  │  (Port 5000)          │    │
│  │                      │  │                      │    │
│  │  - Auth Routes       │  │  - EU NutriScore     │    │
│  │  - Nutrition Routes  │  │  - Hypertension ML   │    │
│  │  - JWT Auth          │  │  - Diabetes ML       │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────────────────────────────────────┐
│                      DATA LAYER                          │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  MongoDB Atlas    │  │  Azure Computer Vision API │  │
│  │  (Cloud DB)       │  │  Azure Text Analytics API │  │
│  │                   │  │                            │  │
│  │  - Users          │  │  - OCR Text Extraction    │  │
│  │  - Scan History   │  │  - NLP Entity Recognition │  │
│  └──────────────────┘  └──────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Local Storage (AsyncStorage)                     │   │
│  │  - Daily Nutrition Totals                         │   │
│  │  - Scan History                                   │   │
│  │  - User Preferences                               │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Frontend Components
```
App.js (Root)
├── SafeAreaProvider
├── AuthProvider (Context)
│   └── AppContent
│       ├── LoginScreen (if not authenticated)
│       ├── RegisterScreen (if not authenticated)
│       └── HomeScreen (if authenticated)
│           ├── TopBar
│           ├── HomePage
│           │   ├── ScannerPage
│           │   │   ├── ScannerSection
│           │   │   ├── ResultsSection
│           │   │   │   ├── NutritionDisplay
│           │   │   │   ├── IngredientsDisplay
│           │   │   │   └── NutriScoreModal
│           │   │   └── ConsumeConfirmationModal
│           │   ├── NutritionDashboard
│           │   └── HistoryPage
│           └── BottomBar
└── ProfileScreen
```

#### Backend Services
```
Node.js Backend (server/)
├── server.js (Main Entry)
│   ├── Express App
│   ├── MongoDB Connection
│   ├── CORS Middleware
│   └── Routes
│       ├── /api/auth (auth.js)
│       │   ├── POST /register
│       │   ├── POST /login
│       │   ├── GET /profile
│       │   └── PUT /profile
│       └── /api/nutrition (nutrition.js)
│           ├── POST /calculate-eu-nutriscore
│           ├── POST /calculate-scan-nutriscore
│           └── GET /nutriscore-health
│
└── Python Flask Service (server/python_service/)
    ├── nutriscore_api.py
    │   ├── POST /calculate-eu-nutriscore
    │   ├── POST /calculate-scan-nutriscore
    │   └── GET /health
    └── models/
        ├── rf_hypertension.pkl
        ├── rf_diabetes.pkl
        └── model_features_*.json
```

---

## Component Structure

### Frontend Services Layer

#### 1. ImageService (`src/services/imageService.js`)
- **Purpose**: Image capture and compression
- **Methods**:
  - `requestPermissions()` - Camera/media library permissions
  - `takePhoto()` - Capture photo from camera
  - `pickImage()` - Select image from gallery
  - `compressImage()` - Compress to < 4MB for Azure API

#### 2. AzureVisionService (`src/services/azureVisionService.js`)
- **Purpose**: OCR text extraction
- **Methods**:
  - `extractText(imageUri)` - Extract text using Azure Read API
  - `extractNutritionFacts(imageUri)` - Extract structured nutrition data
- **API**: Azure Computer Vision v3.2
- **Endpoint**: `/vision/v3.2/read/analyze`

#### 3. IngredientNLPService (`src/services/ingredientNLPService.js`)
- **Purpose**: NLP-based ingredient extraction
- **Methods**:
  - `analyzeIngredients(text)` - Extract ingredients using NLP
  - `extractEntitiesWithAzure(text)` - Azure Text Analytics NER
  - `fallbackExtraction(text)` - Pattern-based fallback
- **API**: Azure Text Analytics v3.1
- **Endpoint**: `/text/analytics/v3.1/entities/recognition/general`

#### 4. NutritionParser (`src/services/nutritionParser.js`)
- **Purpose**: Parse nutrition data from text
- **Methods**:
  - `parseNutritionFacts(text)` - Extract structured nutrition
  - `extractCalories(text)` - Extract calories
  - `extractMacronutrients(text)` - Extract macros
  - `extractServingInfo(text)` - Extract serving information

#### 5. SpatialNutritionParser (`src/services/spatialNutritionParser.js`)
- **Purpose**: Parse nutrition using spatial analysis
- **Methods**:
  - `parseNutritionFacts(azureResults)` - Parse using bounding boxes
  - `identifyNutritionPanel(spatialData)` - Find nutrition table
  - `extractSpatialNutritionData(panel)` - Extract using coordinates

#### 6. IngredientExtractor (`src/services/ingredientExtractor.js`)
- **Purpose**: Orchestrate ingredient extraction pipeline
- **Methods**:
  - `extractIngredients(ocrText, userAllergens)` - Main extraction
  - `findIngredientSection(text)` - Locate ingredient list
  - `calculateStatistics(ingredients)` - Calculate stats

#### 7. IngredientAnalysisService (`src/services/ingredientAnalysisService.js`)
- **Purpose**: Analyze ingredients for allergens and haram status
- **Methods**:
  - `analyzeIngredient(name, userAllergens)` - Analyze single ingredient
  - `batchAnalyze(ingredients, userAllergens)` - Analyze multiple
  - `checkAllergens(name, userAllergens)` - Check allergen matches
  - `checkHaramStatus(name)` - Check haram status
  - `getSummary(analyzedIngredients)` - Get analysis summary
- **Data Sources**:
  - `src/data/allergens.json` - Allergen database
  - `src/data/haramIngredients.json` - Haram ingredients database

#### 8. NutriScoreService (`src/services/nutriscoreService.js`)
- **Purpose**: Calculate NutriScore
- **Methods**:
  - `calculateEUNutriScoreForItem(nutritionData)` - EU score only
  - `calculateCombinedNutriScoreForScan(nutritionData, previousDays)` - Personalized score
  - `extractNutritionForPrediction(nutritionData)` - Normalize data
  - `extractServingSizeInGrams(servingSizeStr)` - Parse serving size
- **Backend API**: Calls Node.js backend → Python Flask service

#### 9. AuthService (`src/services/authService.js`)
- **Purpose**: Authentication and user management
- **Methods**:
  - `register(userData)` - Register new user
  - `login(email, password)` - Login user
  - `logout()` - Logout user
  - `getProfile()` - Get user profile
  - `updateProfile(userData)` - Update profile
  - `getToken()` - Get stored JWT token
  - `setToken(token)` - Store JWT token
  - `getUser()` - Get stored user data
- **Storage**: SecureStore (preferred) + AsyncStorage (fallback)

#### 10. NutritionTrackerService (`src/services/nutritionTrackerService.js`)
- **Purpose**: Track daily nutrition consumption
- **Methods**:
  - `getDailyTotals()` - Get today's totals
  - `addNutrition(nutritionData)` - Add nutrition to daily totals
  - `resetDailyTotals()` - Reset daily totals
  - `getDailyLimits()` - Get daily limits
  - `setDailyLimits(limits)` - Set custom limits
- **Storage**: AsyncStorage

#### 11. HistoryService (`src/services/historyService.js`)
- **Purpose**: Manage scan history
- **Methods**:
  - `saveScan(scanData)` - Save scan to history
  - `getScanHistory()` - Get all scans
  - `deleteScan(scanId)` - Delete scan
- **Storage**: AsyncStorage

### Backend Services

#### Node.js Backend (`server/`)

**Models:**
- **User Model** (`server/models/User.js`)
  - Schema: name, email, password (hashed), age, height, weight, bmi (auto-calculated), gender, allergens[], hba1c, createdAt, updatedAt
  - Methods: `comparePassword()`, `toJSON()` (excludes password)
  - Hooks: Pre-save (password hashing, BMI calculation)

**Routes:**
- **Auth Routes** (`server/routes/auth.js`)
  - `POST /api/auth/register` - Create new user
  - `POST /api/auth/login` - Authenticate user, return JWT
  - `GET /api/auth/profile` - Get user profile (protected)
  - `PUT /api/auth/profile` - Update user profile (protected)

- **Nutrition Routes** (`server/routes/nutrition.js`)
  - `POST /api/nutrition/calculate-eu-nutriscore` - Calculate EU score
  - `POST /api/nutrition/calculate-scan-nutriscore` - Calculate combined score
  - `GET /api/nutrition/nutriscore-health` - Check Python service health

#### Python Flask Service (`server/python_service/`)

**Main Service:**
- **nutriscore_api.py**
  - `POST /calculate-eu-nutriscore` - EU NutriScore calculation
  - `POST /calculate-scan-nutriscore` - Combined NutriScore with ML models
  - `GET /health` - Health check

**ML Models:**
- **Hypertension Model**: Random Forest (rf_hypertension.pkl)
- **Diabetes Model**: Random Forest (rf_diabetes.pkl)
- **Feature Files**: model_features_hypertension.json, model_features_diabetes.json

**Functions:**
- `calculate_eu_nutriscore()` - EU algorithm implementation
- `get_nutriscore_grade(score)` - Convert score to grade (A-E)
- `encode_gender(gender)` - Encode gender for ML models
- `prepare_features_for_model()` - Prepare features for ML prediction
- `load_models()` - Load ML models on startup

---

## Data Flow

### Nutrition Scanning Flow

```
User Action (Take Photo)
    │
    ▼
ImageService.takePhoto()
    │
    ▼
ImageService.compressImage() [if > 4MB]
    │
    ▼
AzureVisionService.extractText()
    │
    ├─── POST to Azure Computer Vision API
    │    └─── Returns: { text, spatialData }
    │
    ▼
useScanner.processImage()
    │
    ├─── Mode: Nutrition
    │    │
    │    ▼
    │    AINutritionExtractor.extractNutritionFacts()
    │    │ (Primary - uses spatial data)
    │    │
    │    ├─── Fallback 1: SpatialNutritionParser
    │    │    (Uses bounding boxes)
    │    │
    │    └─── Fallback 2: NutritionParser
    │         (Text-based regex parsing)
    │
    └─── Mode: Ingredients
         │
         ▼
         IngredientExtractor.extractIngredients()
              │
              ├─── Find ingredient section
              │
              ├─── IngredientNLPService.analyzeIngredients()
              │    ├─── Azure Text Analytics (NER)
              │    └─── Pattern matching (fallback)
              │
              └─── IngredientAnalysisService.batchAnalyze()
                   ├─── Check allergens (user-specific)
                   └─── Check haram status
```

### NutriScore Calculation Flow

```
Nutrition Data Extracted
    │
    ▼
NutriScoreService.calculateCombinedNutriScoreForScan()
    │
    ├─── Extract & normalize to per 100g
    │
    ├─── Get user profile (AuthService.getUser())
    │    └─── age, bmi, gender, hba1c
    │
    ├─── Get previous days nutrition (or defaults)
    │
    ▼
POST to Node.js Backend
    │ /api/nutrition/calculate-scan-nutriscore
    │
    ▼
Node.js Backend (nutrition.js)
    │
    ├─── Validate input
    │
    ├─── Normalize to per 100g
    │
    ▼
POST to Python Flask Service
    │ http://localhost:5000/calculate-scan-nutriscore
    │
    ▼
Python Flask (nutriscore_api.py)
    │
    ├─── Calculate EU NutriScore (70% weight)
    │    └─── calculate_eu_nutriscore()
    │
    ├─── Calculate Hypertension Risk (15% weight)
    │    └─── hypertension_model.predict()
    │
    ├─── Calculate Diabetes Risk (15% weight, if hba1c available)
    │    └─── diabetes_model.predict()
    │
    ├─── Combine scores (weighted average)
    │
    └─── Convert to grade (A-E)
         └─── get_nutriscore_grade()
    │
    ▼
Return to Node.js Backend
    │ { success, nutriscore, grade, breakdown }
    │
    ▼
Return to Frontend
    │
    ▼
Display NutriScore Modal
```

### Authentication Flow

```
User Opens App
    │
    ▼
AuthContext.checkAuthStatus()
    │
    ├─── Check SecureStore/AsyncStorage for token
    │
    ├─── If token exists:
    │    │
    │    ▼
    │    AuthService.getProfile()
    │         │
    │         ├─── GET /api/auth/profile
    │         │    └─── Header: Authorization: Bearer {token}
    │         │
    │         ├─── Backend verifies JWT
    │         │
    │         ├─── If valid: Return user data
    │         │
    │         └─── If invalid (401): Auto-logout
    │
    └─── If no token:
         │
         ▼
         Show Login Screen
```

### Registration Flow

```
User Fills Registration Form
    │
    ▼
RegisterScreen submits form
    │
    ▼
AuthService.register(userData)
    │
    ├─── Validate input (frontend)
    │
    ├─── Calculate BMI
    │
    ▼
POST /api/auth/register
    │
    ▼
Backend (auth.js)
    │
    ├─── Validate input
    │
    ├─── Check if email exists
    │
    ├─── Hash password (bcrypt)
    │
    ├─── Calculate BMI
    │
    ├─── Create User in MongoDB
    │
    ├─── Generate JWT token (expires in 7 days)
    │
    └─── Return { success, token, user }
    │
    ▼
Frontend stores token & user data
    │
    ▼
User redirected to Home
```

---

## Sequence Diagrams

### Sequence 1: Nutrition Scanning with NutriScore

```
User          Frontend          Azure API      Backend API    Python Service
 │                │                 │              │               │
 │  Take Photo    │                 │              │               │
 │───────────────>│                 │              │               │
 │                │  Compress Image │              │               │
 │                │─────────────────│              │               │
 │                │  Extract Text   │              │               │
 │                │────────────────>│              │               │
 │                │<────────────────│              │               │
 │                │  Parse Nutrition│              │               │
 │                │─────────────────│              │               │
 │                │  Calculate Score│              │               │
 │                │────────────────────────────────>│               │
 │                │                 │              │  Call Python  │
 │                │                 │              │───────────────>│
 │                │                 │              │  EU + ML Calc │
 │                │                 │              │<───────────────│
 │                │<────────────────────────────────│               │
 │  Display Result│                 │              │               │
 │<───────────────│                 │              │               │
```

### Sequence 2: Ingredient Analysis

```
User          Frontend          Azure OCR      Azure NLP     Analysis Service
 │                │                 │              │               │
 │  Scan Image    │                 │              │               │
 │───────────────>│                 │              │               │
 │                │  Extract Text   │              │               │
 │                │────────────────>│              │               │
 │                │<────────────────│              │               │
 │                │  Find Ingredient│              │               │
 │                │  Section        │              │               │
 │                │─────────────────│              │               │
 │                │  NLP Analysis   │              │               │
 │                │────────────────────────────────>│               │
 │                │<────────────────────────────────│               │
 │                │  Analyze Allergens│            │               │
 │                │────────────────────────────────────────────────>│
 │                │  Analyze Haram   │              │               │
 │                │────────────────────────────────────────────────>│
 │                │<────────────────────────────────────────────────│
 │  Display Alerts│                 │              │               │
 │<───────────────│                 │              │               │
```

### Sequence 3: User Registration

```
User          Frontend          Backend API    MongoDB
 │                │                 │              │
 │  Fill Form     │                 │              │
 │───────────────>│                 │              │
 │                │  Validate       │              │
 │                │─────────────────│              │
 │                │  POST /register │              │
 │                │────────────────>│              │
 │                │                 │  Check Email │
 │                │                 │─────────────>│
 │                │                 │<─────────────│
 │                │                 │  Hash Password│
 │                │                 │  Create User │
 │                │                 │─────────────>│
 │                │                 │<─────────────│
 │                │<────────────────│              │
 │  Store Token   │                 │              │
 │<───────────────│                 │              │
 │  Redirect Home │                 │              │
 │<───────────────│                 │              │
```

---

## Database Schema

### MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique, lowercase, validated),
  password: String (required, min 6 chars, hashed with bcrypt),
  age: Number (required, 1-150),
  height: Number (required, 50-300 cm),
  weight: Number (required, 10-500 kg),
  bmi: Number (auto-calculated: weight/(height/100)^2),
  gender: String (required, enum: ['male', 'female', 'other']),
  allergens: [String] (default: []),
  hba1c: Number (optional, 0-20),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `email`: Unique index

**Pre-save Hooks:**
1. Calculate BMI if height/weight present
2. Hash password if modified
3. Update `updatedAt` timestamp

**Methods:**
- `comparePassword(candidatePassword)` - Compare password with hash
- `toJSON()` - Exclude password from JSON output

#### Scan History (Local Storage - AsyncStorage)
```javascript
{
  id: String (UUID),
  timestamp: Date,
  type: String ('nutrition' | 'ingredients'),
  imageUri: String,
  ocrText: String,
  nutritionData: Object (if type === 'nutrition'),
  ingredientData: Object (if type === 'ingredients'),
  nutriScore: Object (if available)
}
```

#### Daily Nutrition Totals (Local Storage - AsyncStorage)
```javascript
{
  date: String (date string),
  totals: {
    calories: Number,
    carbs: Number,
    fat: Number,
    protein: Number,
    sugar: Number
  }
}
```

---

## API Interactions

### External APIs

#### 1. Azure Computer Vision API
- **Base URL**: `{AZURE_COMPUTER_VISION_ENDPOINT}/vision/v3.2`
- **Endpoint**: `POST /read/analyze`
- **Request**: Binary image data (max 4MB)
- **Response**: Operation location URL
- **Polling**: `GET {operationLocation}` until status === 'succeeded'
- **Final Response**: 
  ```json
  {
    "status": "succeeded",
    "analyzeResult": {
      "readResults": [{
        "lines": [{
          "text": "Nutrition Facts",
          "boundingBox": [x1, y1, x2, y2, x3, y3, x4, y4]
        }]
      }]
    }
  }
  ```

#### 2. Azure Text Analytics API
- **Base URL**: `{AZURE_TEXT_ANALYTICS_ENDPOINT}/text/analytics/v3.1`
- **Endpoint**: `POST /entities/recognition/general`
- **Request**:
  ```json
  {
    "documents": [{
      "id": "1",
      "language": "en",
      "text": "Water, Sugar, Salt..."
    }]
  }
  ```
- **Response**:
  ```json
  {
    "documents": [{
      "id": "1",
      "entities": [{
        "text": "Water",
        "category": "Food",
        "confidenceScore": 0.95
      }]
    }]
  }
  ```

### Internal APIs

#### Node.js Backend API
- **Base URL**: `http://localhost:3000/api` (dev) or environment variable
- **Authentication**: JWT Bearer token in Authorization header

**Endpoints:**
1. `POST /api/auth/register`
   - Request: `{ name, email, password, age, height, weight, gender, allergens[] }`
   - Response: `{ success, token, user }`

2. `POST /api/auth/login`
   - Request: `{ email, password }`
   - Response: `{ success, token, user }`

3. `GET /api/auth/profile`
   - Headers: `Authorization: Bearer {token}`
   - Response: `{ success, user }`

4. `PUT /api/auth/profile`
   - Headers: `Authorization: Bearer {token}`
   - Request: `{ name?, age?, height?, weight?, gender?, allergens?, hba1c? }`
   - Response: `{ success, user }`

5. `POST /api/nutrition/calculate-eu-nutriscore`
   - Request: `{ calories, sugars, saturatedFat, sodium, fiber, protein, servingSize? }`
   - Response: `{ success, eu_nutriscore, grade }`

6. `POST /api/nutrition/calculate-scan-nutriscore`
   - Request: `{ item_nutrition, user_profile, previous_days_nutrition }`
   - Response: `{ success, nutriscore, nutriscore_rounded, grade, breakdown }`

#### Python Flask API
- **Base URL**: `http://localhost:5000`
- **CORS**: Enabled for React Native app

**Endpoints:**
1. `POST /calculate-eu-nutriscore`
   - Request: `{ energy_kcal_100g, saturated_fat_100g, sugars_100g, sodium_mg_100g, fiber_100g, proteins_100g, fruits_vegetables_percent? }`
   - Response: `{ success, eu_nutriscore, grade, raw_points }`

2. `POST /calculate-scan-nutriscore`
   - Request: `{ item_nutrition, user_profile, previous_days_nutrition }`
   - Response: `{ success, nutriscore, nutriscore_rounded, grade, breakdown }`

3. `GET /health`
   - Response: `{ success: true, status: "healthy" }`

---

## User Flows

### Flow 1: New User Registration and First Scan

```
1. User opens app
   └─── Not authenticated → Login Screen

2. User clicks "Register"
   └─── Register Screen

3. User fills form:
   - Name, Email, Password
   - Age, Height, Weight, Gender
   - Selects allergens
   └─── System calculates BMI automatically

4. User submits
   └─── POST /api/auth/register
        └─── Backend creates user in MongoDB
             └─── Returns JWT token
                  └─── Frontend stores token
                       └─── User logged in → Home Screen

5. User selects "Nutrition Data" scan
   └─── Scanner Page

6. User takes photo
   └─── Image compressed
        └─── Azure OCR extracts text
             └─── Nutrition data parsed
                  └─── NutriScore calculated
                       └─── Results displayed

7. User confirms consumption
   └─── Added to daily totals
        └─── Dashboard updated
```

### Flow 2: Returning User Scan with Ingredients

```
1. User opens app
   └─── Token exists → Check validity
        └─── Valid → Home Screen
             └─── Invalid → Login Screen

2. User selects "Ingredients" scan
   └─── Scanner Page

3. User picks image from gallery
   └─── Azure OCR extracts text
        └─── Ingredient section found
             └─── Azure NLP extracts entities
                  └─── Pattern matching (fallback)
                       └─── Allergen analysis (user-specific)
                            └─── Haram analysis
                                 └─── Alerts generated
                                      └─── Results displayed
```

### Flow 3: Profile Update and Re-scan

```
1. User navigates to Profile
   └─── Profile Screen

2. User updates height/weight
   └─── BMI recalculated automatically
        └─── PUT /api/auth/profile
             └─── MongoDB updated
                  └─── Local user data updated

3. User scans nutrition
   └─── New BMI used in NutriScore calculation
        └─── Personalized score reflects updated profile
```

---

## Module Relationships

### Frontend Module Dependencies

```
App.js
├─── AuthContext (provides auth state)
│    └─── AuthService (API calls)
│
HomeScreen
├─── HomePage
│    ├─── ScannerPage
│    │    ├─── useScanner (hook)
│    │    │    ├─── ImageService
│    │    │    ├─── AzureVisionService
│    │    │    ├─── NutritionParser
│    │    │    ├─── SpatialNutritionParser
│    │    │    ├─── AINutritionExtractor
│    │    │    ├─── IngredientExtractor
│    │    │    │    ├─── IngredientNLPService
│    │    │    │    └─── IngredientAnalysisService
│    │    │    ├─── NutriScoreService
│    │    │    │    └─── AuthService (for user profile)
│    │    │    └─── HistoryService
│    │    ├─── NutritionDisplay
│    │    ├─── IngredientsDisplay
│    │    └─── NutriScoreModal
│    ├─── NutritionDashboard
│    │    └─── NutritionTrackerService
│    └─── HistoryPage
│         └─── HistoryService
└─── ProfileScreen
     └─── AuthService
```

### Backend Module Dependencies

```
Node.js Backend
├─── server.js
│    ├─── mongoose (MongoDB connection)
│    ├─── auth.js (routes)
│    │    ├─── User model
│    │    └─── jwt (token generation)
│    └─── nutrition.js (routes)
│         └─── axios (calls Python service)
│
Python Flask Service
├─── nutriscore_api.py
│    ├─── flask
│    ├─── joblib (load ML models)
│    ├─── scikit-learn (ML predictions)
│    ├─── numpy (numerical operations)
│    └─── pandas (data manipulation)
└─── models/
     ├─── rf_hypertension.pkl
     ├─── rf_diabetes.pkl
     └─── model_features_*.json
```

### Data Flow Between Modules

```
User Input
    │
    ▼
UI Components
    │
    ▼
Custom Hooks (useScanner)
    │
    ├─── Image Services
    ├─── OCR Services
    ├─── Parsing Services
    ├─── Analysis Services
    └─── API Services
         │
         ├─── External APIs (Azure)
         └─── Backend APIs
              │
              ├─── Node.js Backend
              │    ├─── MongoDB
              │    └─── Python Service
              │         └─── ML Models
              │
              └─── Local Storage
                   ├─── AsyncStorage
                   └─── SecureStore
```

---

## Key Algorithms and Processes

### 1. EU NutriScore Calculation Algorithm
**Location**: `server/python_service/nutriscore_api.py`

**Process:**
1. Calculate negative points (A) for:
   - Energy (kJ): 0-10 points
   - Saturated Fat: 0-10 points
   - Sugars: 0-10 points
   - Sodium (as salt): 0-10 points
2. Calculate positive points (C) for:
   - Fiber: 0-5 points
   - Protein: 0-5 points (conditional on A)
   - Fruits/Vegetables: 0-5 points
3. Final Score: A - C
4. Convert to 1-10 scale (higher is better)
5. Map to grade: A (9-10), B (8-8.9), C (5.5-7.9), D (2-5.4), E (0-1.9)

### 2. Combined NutriScore Algorithm
**Location**: `server/python_service/nutriscore_api.py`

**Process:**
1. Calculate EU NutriScore (70% weight)
2. Calculate Hypertension Risk Score (15% weight)
   - Prepare features: age, BMI, gender, previous nutrition
   - Predict probability using Random Forest model
   - Convert to 1-10 score
3. Calculate Diabetes Risk Score (15% weight, if hba1c available)
   - Prepare features: age, BMI, gender, hba1c, previous nutrition
   - Predict probability using Random Forest model
   - Convert to 1-10 score
4. Weighted Average: (EU × 0.7) + (Hypertension × 0.15) + (Diabetes × 0.15)
5. Final grade assignment

### 3. Ingredient Extraction Pipeline
**Location**: `src/services/ingredientExtractor.js`

**Process:**
1. Find ingredient section in OCR text
   - Pattern 1: Look for "Ingredients:" label
   - Pattern 2: Comma-separated lists with food keywords
   - Pattern 3: Parentheses patterns
   - Pattern 4: Food keyword matching
2. NLP Analysis (Primary)
   - Azure Text Analytics NER
   - Filter food-related entities
3. Pattern Matching (Fallback)
   - Comma-separated splitting
   - E-number detection
   - Percentage extraction
4. Validation
   - Remove nutrition facts text
   - Remove Arabic/Urdu text
   - Confidence scoring

### 4. Allergen Detection Algorithm
**Location**: `src/services/ingredientAnalysisService.js`

**Process:**
1. Normalize ingredient name (lowercase, trim)
2. Check against user's allergen list (only user-selected allergens)
3. Match against allergen database:
   - Exact match
   - Contains match (ingredient contains allergen term)
   - E-number match
4. Return matches with severity and category

### 5. Haram Detection Algorithm
**Location**: `src/services/ingredientAnalysisService.js`

**Process:**
1. Check direct ingredient matches in haram database
2. Check E-number status in haram database
3. Identify doubtful ingredients (gelatin without source)
4. Return status: 'haram', 'doubtful', or 'halal'

---

## Design Patterns Used

### 1. Service Layer Pattern
- **Location**: `src/services/`
- **Purpose**: Separate business logic from UI
- **Benefits**: Reusability, testability, maintainability

### 2. Context Pattern (React Context API)
- **Location**: `src/contexts/AuthContext.js`
- **Purpose**: Global state management for authentication
- **Benefits**: Avoid prop drilling, centralized state

### 3. Custom Hook Pattern
- **Location**: `src/hooks/useScanner.js`
- **Purpose**: Encapsulate scanner logic
- **Benefits**: Reusable stateful logic

### 4. Factory Pattern
- **Location**: Multiple extractors (AI, Spatial, Text)
- **Purpose**: Different parsing strategies
- **Benefits**: Flexible fallback mechanisms

### 5. Repository Pattern
- **Location**: Services (AuthService, HistoryService)
- **Purpose**: Abstract data access
- **Benefits**: Easy to swap storage backends

---

## Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────┐
│         Development Machine              │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  React Native │  │  Node.js     │     │
│  │  (Expo)       │  │  Backend     │     │
│  │  Port: 19000  │  │  Port: 3000  │     │
│  └──────────────┘  └──────────────┘     │
│                          │               │
│  ┌──────────────┐        │               │
│  │  Python      │        │               │
│  │  Flask       │        │               │
│  │  Port: 5000  │        │               │
│  └──────────────┘        │               │
│                          │               │
└──────────────────────────┼───────────────┘
                           │
                           │ HTTP
                           │
┌──────────────────────────┼───────────────┐
│         Cloud Services                   │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  MongoDB     │  │  Azure APIs  │     │
│  │  Atlas      │  │  (OCR, NLP)  │     │
│  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────┘
```

### Production Environment (Recommended)
```
┌─────────────────────────────────────────┐
│      Mobile App (React Native)          │
│      (Published to App Stores)          │
└─────────────────────────────────────────┘
                    │
                    │ HTTPS
                    │
┌─────────────────────────────────────────┐
│      Cloud Hosting (e.g., AWS/Azure)     │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  Node.js API  │  │  Python API  │     │
│  │  (Express)    │  │  (Flask)     │     │
│  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────┘
                    │
                    │
┌─────────────────────────────────────────┐
│      External Services                   │
│                                          │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  MongoDB     │  │  Azure APIs  │     │
│  │  Atlas      │  │  (OCR, NLP)  │     │
│  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────┘
```

---

## Key Metrics and Statistics

### Test Coverage
- **Frontend Tests**: 55 test cases (Jest)
- **Backend Tests**: 16 test cases (Pytest)
- **Total**: 71 test cases
- **Pass Rate**: 100%

### Code Statistics
- **Frontend Services**: 13 services
- **Backend Routes**: 2 route files (auth, nutrition)
- **Python Functions**: 10+ functions
- **ML Models**: 2 (Hypertension, Diabetes)
- **Database Collections**: 1 (Users)
- **Local Storage Keys**: 3+ (token, user, history, daily totals)

### API Endpoints
- **External APIs**: 2 (Azure Computer Vision, Azure Text Analytics)
- **Internal APIs**: 2 (Node.js Backend, Python Flask)
- **Total Endpoints**: 10+ REST endpoints

---

## Diagram Generation References

### For Use Case Diagrams
- **Actors**: User
- **Use Cases**: UC-001 to UC-014 (listed above)
- **Relationships**: Include, Extend relationships between use cases

### For System Architecture Diagrams
- **3-Tier Structure**: Presentation → Application → Data
- **Components**: Frontend, Backend, Database, External APIs
- **Connections**: HTTP/REST, MongoDB connection, API calls

### For Component Diagrams
- **Frontend Components**: App → Screens → Components → Services
- **Backend Components**: Server → Routes → Models
- **Dependencies**: Show import relationships

### For Data Flow Diagrams
- **Data Sources**: User input, Azure APIs, MongoDB
- **Processes**: OCR, NLP, Parsing, Analysis, Calculation
- **Data Stores**: MongoDB, AsyncStorage, SecureStore
- **Data Flows**: Image → Text → Parsed Data → Analysis → Display

### For Sequence Diagrams
- **Actors**: User
- **Objects**: Frontend, Backend, Python Service, Azure APIs, MongoDB
- **Messages**: API calls, data transfers, responses
- **Lifelines**: Show object activation periods

### For Class Diagrams
- **Frontend Classes**: Services (ImageService, AzureVisionService, etc.)
- **Backend Models**: User model
- **Attributes**: Properties of each class
- **Methods**: Functions in each class
- **Relationships**: Dependencies, associations

### For Database ER Diagrams
- **Entities**: User
- **Attributes**: All User model fields
- **Relationships**: User has many scans (conceptual, stored locally)

### For Deployment Diagrams
- **Nodes**: Mobile Device, Development Server, Cloud Services
- **Artifacts**: React Native App, Node.js Server, Python Service
- **Connections**: Network connections, API endpoints

---

## Additional Notes for Diagram Generation

### Color Coding Suggestions
- **Frontend Components**: Blue
- **Backend Services**: Green
- **External APIs**: Orange
- **Database**: Purple
- **Data Flow**: Gray arrows
- **User Actions**: Red

### Diagram Tools Recommendations
- **Use Case Diagrams**: Draw.io, Lucidchart, PlantUML
- **Architecture Diagrams**: Draw.io, Miro, Figma
- **Sequence Diagrams**: PlantUML, Mermaid, Draw.io
- **Component Diagrams**: Draw.io, Visual Paradigm
- **Database Diagrams**: MongoDB Compass, Draw.io

### Key Relationships to Highlight
1. **Frontend ↔ Backend**: REST API communication
2. **Backend ↔ Python Service**: Internal API calls
3. **Frontend ↔ Azure APIs**: Direct API calls
4. **Backend ↔ MongoDB**: Database operations
5. **Services ↔ Local Storage**: AsyncStorage operations
6. **Components ↔ Services**: Service layer pattern

---

This document provides comprehensive information for generating all types of diagrams for your NutriLens project. Use the sections relevant to each diagram type you want to create.

