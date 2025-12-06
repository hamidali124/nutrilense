# NutriScore Calculation - Detailed Explanation

## Example Calculation Breakdown

Based on your scan output, here's how the NutriScore was calculated:

---

## Input Data

**Item Nutrition (per 100g):**
- Energy: 470.59 kcal
- Saturated Fat: 5.88 g
- Sugars: 41.18 g
- Sodium: 382.35 mg
- Fiber: 0.0 g
- Protein: 2.94 g

**User Profile:**
- Age: 22
- BMI: 31.25 (obese)
- Gender: male
- HbA1c: Not provided

**Previous Days Nutrition:**
- Calories: 2000, Fat: 65g, Protein: 50g, Carbs: 250g, Sugar: 50g, Fiber: 25g, Sodium: 2300mg

---

## Step 1: EU NutriScore Calculation (70% Weight)

### How EU NutriScore Works:

The EU NutriScore algorithm assigns **negative points (N)** for unfavorable components and **positive points (P)** for favorable components.

### Negative Points (N) Calculation:

**1. Energy (470.59 kcal/100g):**
- 470.59 > 335 → **N = 1 point**

**2. Saturated Fat (5.88g/100g):**
- 5.88 > 5 and ≤ 6 → **N = 5 points**

**3. Sugars (41.18g/100g):**
- 41.18 > 40 and ≤ 45 → **N = 9 points**

**4. Sodium (382.35mg/100g):**
- Convert to salt: 382.35 / 1000 * 2.5 = 0.956g salt
- 0.956 > 0.9 and ≤ 1.2 → **N = 4 points**

**Total N = 1 + 5 + 9 + 4 = 19 points**

### Positive Points (P) Calculation:

**1. Fiber (0g/100g):**
- 0 < 0.9 → **P = 0 points**

**2. Protein (2.94g/100g):**
- 2.94 > 1.6 and ≤ 3.2 → **P = 2 points**

**Total P = 0 + 2 = 2 points**

### EU Score Calculation:

**EU Score (N-P) = 19 - 2 = 17**

**Convert to 1-10 scale:**
- EU score of 17 falls in range 15-20 → **EU NutriScore = 3/10**

**EU Contribution (70%):**
- 3 × 0.70 = **2.10 points**

---

## Step 2: Hypertension Model (30% Weight)

### Why 30%?

Since **hba1c is missing**, the system uses:
- **70% EU NutriScore** (from item nutrition)
- **30% Hypertension Model** (from user profile + previous days' nutrition)
- **0% Diabetes Model** (skipped because hba1c is required)

### Model Input Preparation:

**Raw Features:**
- Age: 22
- BMI: 31.25
- Gender: male → encoded as 1
- Previous days: Calories=2000, Fat=65g, Protein=50g, Carbs=250g, Sugar=50g

**Normalization:**
- Features that need normalization: `bmi`, `calories`, `carbs`, `fat`, `sugar`
- Features that DON'T normalize: `ridageyr` (age), `gender_encoded`, `protein`

**Normalized Values:**
- bmi: 31.25 → 0.1564 (normalized to 0-1 range)
- calories: 2000 → 0.1461 (normalized)
- fat: 65 → 0.1081 (normalized)
- carbs: 250 → 0.1377 (normalized)
- sugar: 50 → 0.0448 (normalized)
- protein: 50 (NOT normalized - stays as 50)
- ridageyr: 22 (NOT normalized - stays as 22)
- gender_encoded: 1 (NOT normalized - stays as 1)

### Model Prediction:

**Using `predict_proba()`:**
- Model returns probability of hypertension risk: **0.080 (8%)**
- This means: **8% probability of having hypertension risk**

### Score Conversion:

**Convert probability to score (1-10 scale):**
- Formula: `score = 10 - (probability × 9)`
- Calculation: `10 - (0.080 × 9) = 10 - 0.72 = 9.28 points`

**Why this conversion?**
- 0% risk (prob=0.0) → 10 points (best)
- 100% risk (prob=1.0) → 1 point (worst)
- 8% risk (prob=0.08) → 9.28 points (very good - low risk)

### Hypertension Contribution (30% Weight):

**Calculation:**
- Hypertension Score: 9.28 points
- Weight: 30% (0.30)
- Contribution: 9.28 × 0.30 = **2.784 points** (rounded to 2.78)

---

## Step 3: Final Combined NutriScore

### Calculation:

```
Final Score = EU Contribution + Hypertension Contribution + Diabetes Contribution
Final Score = 2.10 + 2.78 + 0.00
Final Score = 4.88
```

### Grade Assignment:

- Score: 4.88
- Rounded: 5
- Grade: **D** (scores 3-4 = D, but 4.88 rounds to 5 which is still D range)

---

## Why This Makes Sense

### 1. **EU Score is Low (3/10):**
- High sugars (41g/100g) → 9 negative points
- High saturated fat (5.88g) → 5 negative points
- High energy (470 kcal) → 1 negative point
- High sodium → 4 negative points
- Low fiber (0g) → 0 positive points
- Low protein (2.94g) → only 2 positive points
- **Result: Poor nutritional quality** → Low EU score

### 2. **Hypertension Model is Good (9.28/10):**
- Despite high BMI (31.25), the model predicts **low risk (8%)**
- This could be because:
  - Young age (22) reduces risk
  - Previous days' nutrition is relatively balanced
  - Model considers multiple factors, not just BMI
- **Result: Low hypertension risk** → High model score

### 3. **Final Score (4.88):**
- **70% from EU (2.10):** Item is nutritionally poor
- **30% from Model (2.78):** User has low hypertension risk
- **Combined:** Poor item quality dominates, but user's health profile helps slightly
- **Result: Grade D** (Poor)

---

## Key Insights

### 1. **70% EU Score Weight:**
- The **item's nutritional quality** is the primary factor (70%)
- This makes sense because what you eat directly impacts health
- Poor nutrition items get penalized heavily

### 2. **30% Model Weight:**
- The **user's health risk profile** is secondary (30%)
- When hba1c is missing, all 30% goes to hypertension model
- This personalizes the score based on individual risk

### 3. **Why Not 50/50?**
- 70/30 split prioritizes **what you're eating** over **who you are**
- A healthy person eating junk food should still get a low score
- A high-risk person eating healthy food should get a better score
- This balance ensures nutrition quality is the main factor

### 4. **Normalization Importance:**
- Features are normalized to 0-1 range for the model
- This ensures all features are on the same scale
- Age and gender don't normalize (they're already in good ranges)
- Protein doesn't normalize (might be a model design choice)

---

## Summary

**Your Coke Bottle Scan:**
- **EU Score:** 3/10 (Poor nutrition - high sugar, high calories)
- **EU Contribution:** 2.10 points (70% of 3)
- **Hypertension Risk:** 8% (Low risk despite high BMI)
- **Hypertension Score:** 9.28/10 (Low risk = high score)
- **Hypertension Contribution:** 2.78 points (30% of 9.28)
- **Final Score:** 4.88/10 → **Grade D**

**Interpretation:**
- The item is nutritionally poor (high sugar, high calories)
- But your health profile shows low hypertension risk
- The final score reflects both: poor item quality dominates, but your health profile helps slightly

