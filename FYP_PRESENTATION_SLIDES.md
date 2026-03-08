# NutriLens FYP Presentation Slides

## Slide 1: Module 2 - Ingredient Analysis System (Halal/Haram & Allergens)

### Title: Intelligent Ingredient Analysis for Halal Compliance & Allergen Detection

**Key Features:**
- **Halal/Haram Compliance Checking**
  - Direct ingredient name matching against haram database
  - E-number status verification (E100-E999)
  - Doubtful ingredient identification (e.g., gelatin without source)
  - Category classification (pork, alcohol, non-halal meat, etc.)

- **User-Specific Allergen Detection**
  - Only checks user-selected allergens (personalized)
  - Major allergens (milk, eggs, fish, shellfish, etc.)
  - Common allergens (sesame, celery, mustard, etc.)
  - Rare allergens (lupin, molluscs, etc.)

**Technical Approach:**
1. **Ingredient Normalization**
   - Lowercase conversion and trimming
   - Input validation and sanitization
   - Empty/invalid input handling

2. **Matching Algorithms**
   - **Exact Match:** Direct name comparison
   - **Contains Match:** Substring matching (e.g., "milk protein" contains "milk")
   - **E-number Match:** Regex pattern matching (E\d{3,4}[a-z]?)

3. **Database Lookups**
   - **Haram Database:** Comprehensive haram ingredients with categories
   - **Allergen Database:** Major, common, and rare allergen lists
   - **E-number Database:** E-number haram/halal status lookup

4. **Analysis Processing**
   - Batch analysis for multiple ingredients
   - Severity classification (haram, doubtful, halal)
   - Match type identification (exact, contains, e-number)
   - Source attribution (database source tracking)

**Output:**
- **Halal/Haram Status:** Per-ingredient compliance status
- **Allergen Warnings:** User-specific allergen matches with severity
- **Analysis Summary:** Total counts (allergens, haram, doubtful)
- **Detailed Information:** Matched terms, categories, sources, notes

**Technologies:** JSON Database Lookups, Pattern Matching, String Algorithms

---

## Slide 2: Nutrition Score Calculation Algorithms

### Title: Personalized NutriScore Calculation System

**Three-Tier Scoring Algorithm:**

### 1. EU NutriScore (70% Weight)
**Negative Points (A):**
- Energy (kJ): 0-10 points (thresholds: 335-3350+ kJ)
- Saturated Fat: 0-10 points (thresholds: 1-10+ g/100g)
- Sugars: 0-10 points (thresholds: 4.5-45+ g/100g)
- Sodium: 0-10 points (thresholds: 90-900+ mg/100g)

**Positive Points (C):**
- Fiber: 0-5 points (thresholds: 0.9-4.7+ g/100g)
- Protein: 0-5 points (conditional on A < 11)
- Fruits/Vegetables: 0-15 points (thresholds: 40-80+%)

**Calculation:** Raw Points = A - C → Convert to 1-10 scale → Grade (A-E)

### 2. Risk-Adjusted Personalized Score (30% Weight)
**Nutrient Penalty Formula:**
```
Personalized Score = 10 × (1 - Nutrient Penalty)
Nutrient Penalty = (Salt Level × Salt Importance + Sugar Level × Sugar Importance) / Total Importance
```

**Risk-Based Importance Weights:**
- Salt Importance = 1.3 + 3.0 × Hypertension Probability
- Sugar Importance = 1.3 + 3.0 × Diabetes Probability (if hba1c available)

**Normalization:**
- Salt Level = Sodium (mg/100g) / 600 (cap at 1.0)
- Sugar Level = Sugars (g/100g) / 25 (cap at 1.0)

### 3. Final Combined Score
```
Final Score = (0.70 × EU Score) + (0.30 × Personalized Score)
Grade Assignment: A (9-10), B (8-8.9), C (5.5-7.9), D (2-5.4), E (1-1.9)
```

**Personalization Factors:**
- User's hypertension risk probability (from ML model)
- User's diabetes risk probability (from ML model, if hba1c provided)
- Item's sodium and sugar content

---

## Slide 3: Machine Learning Models

### Title: Chronic Disease Risk Prediction Models

### Hypertension Risk Model
**Algorithm:** Random Forest Classifier
**Performance Metrics:**
- Test Accuracy: 80.32%
- Precision: 70.80%
- Recall: 80.39%
- F1-Score: 75.29%
- ROC-AUC: 85.95%

**Features (8):**
- Age (ridageyr)
- BMI
- Daily Calories
- Fat, Protein, Carbs, Sugar
- Gender (encoded)

**Hyperparameters:**
- n_estimators: 100
- max_depth: 15
- min_samples_leaf: 7
- class_weight: balanced

**Training Data:** 20,912 samples | Test: 5,976 samples

### Diabetes Risk Model
**Algorithm:** Random Forest Classifier
**Performance Metrics:**
- Test Accuracy: 94.41%
- Precision: 82.02%
- Recall: 62.37%
- F1-Score: 70.86%
- ROC-AUC: 94.82%

**Features (9):**
- Age (ridageyr)
- BMI
- Daily Calories
- Fat, Protein, Carbs, Sugar
- **HbA1c** (key differentiator)
- Gender (encoded)

**Hyperparameters:**
- n_estimators: 100
- max_depth: 15
- min_samples_leaf: 3
- class_weight: balanced

**Training Data:** 20,912 samples | Test: 5,976 samples

### Model Integration:
- Real-time prediction using `predict_proba()` for risk probability
- Probability converted to 1-10 score: `Score = 10 - (Probability × 9)`
- Used in personalized NutriScore calculation (30% weight)

**Technology Stack:** Python scikit-learn, joblib for model serialization

---

## Slide 4: Technical Architecture & Implementation Details

### Title: System Architecture & Technical Stack

### Architecture: 3-Tier System
1. **Presentation Layer:** React Native Mobile App (Expo SDK v54)
2. **Application Layer:** Node.js/Express + Python Flask ML Service
3. **Data Layer:** MongoDB Atlas (Cloud Database)

### Frontend Technologies:
- **Framework:** React Native 0.81.4 with Expo SDK v54
- **State Management:** React Context API (AuthContext)
- **Custom Hooks:** useScanner hook for scan logic
- **Storage:** AsyncStorage + Expo SecureStore (JWT tokens)
- **UI Components:** React Native components, Expo Vector Icons

### Backend Technologies:
- **API Server:** Node.js/Express.js v4.18.2
- **Authentication:** JWT tokens (30-day expiration)
- **Database:** MongoDB Atlas (User profiles, scan history)
- **ML Service:** Python Flask (NutriScore calculation, ML predictions)

### External APIs:
- **OCR:** Azure Computer Vision API v3.2 (Text extraction with spatial data)
- **NLP:** Azure Text Analytics API v3.1 (Named Entity Recognition)

### ML Service Details:
- **Models:** Random Forest (scikit-learn)
- **Model Format:** joblib (.pkl files)
- **Feature Engineering:** Pandas DataFrames
- **API Endpoints:** 
  - `/calculate-eu-nutriscore` (EU algorithm)
  - `/calculate-scan-nutriscore` (Combined personalized score)

### Design Patterns:
- **Service Layer Pattern:** Business logic separation (`src/services/`)
- **Repository Pattern:** Data access abstraction
- **Factory Pattern:** Multiple parsing strategies (AI → Spatial → Text fallback)
- **Context Pattern:** Global authentication state

### Key Features:
- **Real-time Processing:** OCR → NLP → Analysis pipeline
- **Fallback Mechanisms:** Multiple extraction methods for robustness
- **Personalization:** User profile-based scoring adjustments
- **Security:** JWT authentication, secure token storage

### Deployment:
- **Mobile:** Cross-platform (iOS/Android) via Expo
- **Backend:** Node.js server + Python Flask service
- **Database:** MongoDB Atlas cloud hosting
- **APIs:** Azure cloud services

