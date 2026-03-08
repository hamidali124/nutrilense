from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import pandas as pd
import os
from pathlib import Path
import warnings
import chromadb

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native app

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / 'models'

# Model paths
HYPERTENSION_MODEL_PATH = MODELS_DIR / 'rf_hypertension_compressed.pkl'
DIABETES_MODEL_PATH = MODELS_DIR / 'rf_diabetes_compressed.pkl'
HYPERTENSION_FEATURES_PATH = MODELS_DIR / 'model_features_hypertension.json'
DIABETES_FEATURES_PATH = MODELS_DIR / 'model_features_diabetes.json'

# Global model variables
hypertension_model = None
diabetes_model = None
hypertension_features = None
diabetes_features = None

def load_models():
    """Load the trained models and feature orders"""
    global hypertension_model, diabetes_model, hypertension_features, diabetes_features
    
    try:
        # Load hypertension model
        if not HYPERTENSION_MODEL_PATH.exists():
            raise FileNotFoundError(f"Hypertension model file not found: {HYPERTENSION_MODEL_PATH}")
        hypertension_model = joblib.load(HYPERTENSION_MODEL_PATH)
        print(f"Loaded hypertension model from {HYPERTENSION_MODEL_PATH}")
        
        # Load diabetes model
        if not DIABETES_MODEL_PATH.exists():
            raise FileNotFoundError(f"Diabetes model file not found: {DIABETES_MODEL_PATH}")
        diabetes_model = joblib.load(DIABETES_MODEL_PATH)
        print(f"Loaded diabetes model from {DIABETES_MODEL_PATH}")
        
        # Load feature orders
        with open(HYPERTENSION_FEATURES_PATH, 'r') as f:
            hypertension_features = json.load(f)
        print(f"Loaded hypertension features: {hypertension_features}")
        
        with open(DIABETES_FEATURES_PATH, 'r') as f:
            diabetes_features = json.load(f)
        print(f"Loaded diabetes features: {diabetes_features}")
        
    except Exception as e:
        print(f"Error loading models: {e}")
        raise

# Load models on startup
with app.app_context():
    load_models()

# --- ChromaDB Vector Knowledge Base ---
KNOWLEDGE_BASE_PATH = BASE_DIR.parent / 'data' / 'knowledgeBase.json'
chroma_client = None
knowledge_collection = None

def init_knowledge_base():
    """Load knowledgeBase.json into ChromaDB with vector embeddings"""
    global chroma_client, knowledge_collection

    try:
        if not KNOWLEDGE_BASE_PATH.exists():
            print(f"Knowledge base not found at {KNOWLEDGE_BASE_PATH}, skipping vector store init")
            return

        with open(KNOWLEDGE_BASE_PATH, 'r', encoding='utf-8') as f:
            entries = json.load(f)

        chroma_client = chromadb.Client()
        # Delete if exists (idempotent reload)
        try:
            chroma_client.delete_collection("nutrition_knowledge")
        except Exception:
            pass

        # Create collection with default embedding function (all-MiniLM-L6-v2 via ONNX)
        knowledge_collection = chroma_client.create_collection(
            name="nutrition_knowledge",
            metadata={"hnsw:space": "cosine"}
        )

        documents = []
        metadatas = []
        ids = []

        for i, entry in enumerate(entries):
            content = entry.get("content", "")
            keywords = entry.get("keywords", [])
            # Combine keywords + content for richer embedding
            doc_text = ", ".join(keywords) + ". " + content
            documents.append(doc_text)
            metadatas.append({"keywords": ", ".join(keywords), "content": content})
            ids.append(f"kb_{i}")

        # Add in batches of 10 to avoid embedding timeouts
        batch_size = 10
        for start in range(0, len(documents), batch_size):
            end = start + batch_size
            knowledge_collection.add(
                documents=documents[start:end],
                metadatas=metadatas[start:end],
                ids=ids[start:end],
            )

        print(f"ChromaDB knowledge base initialized with {len(documents)} entries (vector embeddings)")

    except Exception as e:
        print(f"Error initializing ChromaDB knowledge base: {e}")
        knowledge_collection = None

# Initialize knowledge base on startup
init_knowledge_base()

def calculate_eu_nutriscore(energy_kcal_100g, saturated_fat_100g, sugars_100g, sodium_mg_100g, fiber_100g, proteins_100g, fruits_vegetables_percent=0):

    A = 0  # Negative points (unfavorable)
    C = 0  # Positive points (favorable)
    
    # === 1. Energy (must be in kJ) ===
    energy_kj = energy_kcal_100g * 4.184
    if energy_kj > 3350:
        A += 10
    elif energy_kj > 3015:
        A += 9
    elif energy_kj > 2680:
        A += 8
    elif energy_kj > 2345:
        A += 7
    elif energy_kj > 2010:
        A += 6
    elif energy_kj > 1675:
        A += 5
    elif energy_kj > 1340:
        A += 4
    elif energy_kj > 1005:
        A += 3
    elif energy_kj > 670:
        A += 2
    elif energy_kj > 335:
        A += 1
    
    # === 2. Saturated fatty acids (g/100g) ===
    if saturated_fat_100g > 10:
        A += 10
    elif saturated_fat_100g > 9:
        A += 9
    elif saturated_fat_100g > 8:
        A += 8
    elif saturated_fat_100g > 7:
        A += 7
    elif saturated_fat_100g > 6:
        A += 6
    elif saturated_fat_100g > 5:
        A += 5
    elif saturated_fat_100g > 4:
        A += 4
    elif saturated_fat_100g > 3:
        A += 3
    elif saturated_fat_100g > 2:
        A += 2
    elif saturated_fat_100g > 1:
        A += 1
    
    # === 3. Sugars (g/100g) ===
    if sugars_100g > 45:
        A += 10
    elif sugars_100g > 40:
        A += 9
    elif sugars_100g > 36:
        A += 8
    elif sugars_100g > 31:
        A += 7
    elif sugars_100g > 27:
        A += 6
    elif sugars_100g > 22.5:
        A += 5
    elif sugars_100g > 18:
        A += 4
    elif sugars_100g > 13.5:
        A += 3
    elif sugars_100g > 9:
        A += 2
    elif sugars_100g > 4.5:
        A += 1
    
    # === 4. Sodium (mg/100g) – OFFICIAL thresholds (not salt) ===
    if sodium_mg_100g > 900:
        A += 10
    elif sodium_mg_100g > 810:
        A += 9
    elif sodium_mg_100g > 720:
        A += 8
    elif sodium_mg_100g > 630:
        A += 7
    elif sodium_mg_100g > 540:
        A += 6
    elif sodium_mg_100g > 450:
        A += 5
    elif sodium_mg_100g > 360:
        A += 4
    elif sodium_mg_100g > 270:
        A += 3
    elif sodium_mg_100g > 180:
        A += 2
    elif sodium_mg_100g > 90:
        A += 1
    
    # === POSITIVE POINTS (C) ===
    
    # Fruits, vegetables, nuts, legumes (%)
    if fruits_vegetables_percent >= 80:
        C += 15
    elif fruits_vegetables_percent >= 60:
        C += 10
    elif fruits_vegetables_percent >= 40:
        C += 5
    # < 40% → 0 points
    
    # Fiber (g/100g)
    if fiber_100g > 4.7:
        C += 5
    elif fiber_100g > 3.7:
        C += 4
    elif fiber_100g > 2.8:
        C += 3
    elif fiber_100g > 1.9:
        C += 2
    elif fiber_100g > 0.9:
        C += 1
    
    # Protein (g/100g) – only fully counted if A < 11
    protein_points = 0
    if proteins_100g > 8.0:
        protein_points = 5
    elif proteins_100g > 6.4:
        protein_points = 4
    elif proteins_100g > 4.8:
        protein_points = 3
    elif proteins_100g > 3.2:
        protein_points = 2
    elif proteins_100g > 1.6:
        protein_points = 1
    
    if A < 11:
        C += protein_points
    else:
        C += min(protein_points, 5)  # capped when A ≥ 11
    
    # === FINAL CALCULATION ===
    raw_points = A - C
    
    # Official letter
    if raw_points <= -1:
        letter = 'A'
    elif raw_points <= 3:
        letter = 'B'
    elif raw_points <= 10:
        letter = 'C'
    elif raw_points <= 18:
        letter = 'D'
    else:
        letter = 'E'
    
    # Convert to 0–10 scale (10 = best)
    if letter == 'A':
        score10 = 10.0
    elif letter == 'B':
        # B range: 0 to 3 points → 8.0 to 9.5
        score10 = 8.0 + (3 - max(raw_points, 0)) * 0.5
    elif letter == 'C':
        # C range: 4 to 10 points → ~5.5 to 7.5
        score10 = 7.5 - (raw_points - 3) * 0.36
    elif letter == 'D':
        score10 = 4.0 - (raw_points - 11) * 0.4
    else:  # E
        score10 = max(0, 1.5 - (raw_points - 19) * 0.15)
    
    score10 = round(score10 * 10) / 10  # one decimal
    

    return {
        'score': score10,  
        'grade': letter,
        'raw_points': raw_points
    }

def get_nutriscore_grade(score):

    if score >= 9.0:
        return 'A'
    elif score >= 8.0:
        return 'B'
    elif score >= 5.5:
        return 'C'
    elif score >= 1.5:
        return 'D'
    else:
        return 'E'

def encode_gender(gender):
    """Encode gender to numeric value for models"""
    gender_lower = gender.lower() if gender else 'other'
    if gender_lower == 'male':
        return 1
    elif gender_lower == 'female':
        return 0
    else:
        return 0.5  # Other/unknown

def prepare_features_for_model(features_dict, feature_order):

    # Create DataFrame with all features in correct order (for model)
    # Ensure all features in feature_order are present in features_dict
    model_features_dict = {}
    for feature in feature_order:
        if feature in features_dict:
            model_features_dict[feature] = float(features_dict[feature])
        else:
            # Use 0 for missing features (like hba1c if not provided)
            model_features_dict[feature] = 0.0
    
    features_df = pd.DataFrame([model_features_dict], columns=feature_order)
    
    return features_df

@app.route('/calculate-eu-nutriscore', methods=['POST'])
def calculate_eu_nutriscore_item():

    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Extract nutrition values per 100g
        energy_kcal_100g = float(data.get('energy_kcal_100g', 0))
        saturated_fat_100g = float(data.get('saturated_fat_100g', 0))
        sugars_100g = float(data.get('sugars_100g', 0))
        sodium_mg_100g = float(data.get('sodium_mg_100g', 0))
        fiber_100g = float(data.get('fiber_100g', 0))
        proteins_100g = float(data.get('proteins_100g', 0))
        
        # Calculate EU NutriScore
        eu_result = calculate_eu_nutriscore(
            energy_kcal_100g,
            saturated_fat_100g,
            sugars_100g,
            sodium_mg_100g,
            fiber_100g,
            proteins_100g
        )
        
        return jsonify({
            'success': True,
            'eu_nutriscore': round(eu_result['score'], 1),  # Round to 1 dp
            'grade': eu_result['grade']
        }), 200
        
    except Exception as e:
        print(f"Error calculating EU NutriScore: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/calculate-scan-nutriscore', methods=['POST'])
def calculate_scan_nutriscore():

    if hypertension_model is None or diabetes_model is None:
        return jsonify({
            'success': False,
            'error': 'Models not loaded. Please check server logs.'
        }), 500
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        item_nutrition = data.get('item_nutrition', {})
        user_profile = data.get('user_profile', {})
        previous_days_nutrition = data.get('previous_days_nutrition', {})
        
        # Extract item nutrition (per 100g)
        energy_kcal_100g = float(item_nutrition.get('energy_kcal_100g', 0))
        saturated_fat_100g = float(item_nutrition.get('saturated_fat_100g', 0))
        sugars_100g = float(item_nutrition.get('sugars_100g', 0))
        sodium_mg_100g = float(item_nutrition.get('sodium_mg_100g', 0))
        fiber_100g = float(item_nutrition.get('fiber_100g', 0))
        proteins_100g = float(item_nutrition.get('proteins_100g', 0))
        
        # Calculate EU NutriScore for this item (70% weight)
        eu_result = calculate_eu_nutriscore(
            energy_kcal_100g,
            saturated_fat_100g,
            sugars_100g,
            sodium_mg_100g,
            fiber_100g,
            proteins_100g
        )
        eu_score = eu_result['score']
        eu_grade = eu_result['grade']
        eu_contribution = eu_score * 0.70
        
        # Log EU NutriScore calculation details
        print(f"\n EU NutriScore Calculation:")
        print(f"  Input (per 100g): Energy={energy_kcal_100g}kcal, SatFat={saturated_fat_100g}g, Sugars={sugars_100g}g, Sodium={sodium_mg_100g}mg, Fiber={fiber_100g}g, Protein={proteins_100g}g")
        print(f"  EU Score: {eu_score}/10 (Grade: {eu_grade}, Raw Points: {eu_result['raw_points']})")
        print(f"  EU Contribution (70%): {eu_contribution:.2f} points")
        
        # Extract user profile data
        age = float(user_profile.get('age', 30))
        bmi = float(user_profile.get('bmi', 22.5))
        gender = user_profile.get('gender', 'other')
        hba1c = user_profile.get('hba1c')  # Optional
        
        # Determine if hba1c is available (needed for logging and model selection)
        has_hba1c = hba1c is not None and hba1c > 0
        
        # Extract previous days' nutrition 
        calories = float(previous_days_nutrition.get('calories', 2000))
        fat = float(previous_days_nutrition.get('fat', 65))
        protein = float(previous_days_nutrition.get('protein', 50))
        carbs = float(previous_days_nutrition.get('carbs', 250))
        sugar = float(previous_days_nutrition.get('sugar', 50))
        fiber = float(previous_days_nutrition.get('fiber', 25))
        sodium = float(previous_days_nutrition.get('sodium', 2300))
        
        # Prepare features for hypertension model
        gender_encoded = encode_gender(gender)
        hypertension_features_dict = {
            'ridageyr': age,
            'bmi': bmi,
            'calories': calories,
            'fat': fat,
            'protein': protein,
            'carbs': carbs,
            'sugar': sugar,
            'gender_encoded': gender_encoded
        }
        
        # Log item nutrition and user profile for verification
        print(f"\nNutriScore Calculation - Input Data:")
        print(f"  Item Nutrition (per 100g):")
        print(f"    Energy: {energy_kcal_100g} kcal")
        print(f"    Saturated Fat: {saturated_fat_100g} g")
        print(f"    Sugars: {sugars_100g} g")
        print(f"    Sodium: {sodium_mg_100g} mg")
        print(f"    Fiber: {fiber_100g} g")
        print(f"    Proteins: {proteins_100g} g")
        print(f"  User Profile:")
        print(f"    Age: {age}")
        print(f"    BMI: {bmi}")
        print(f"    Gender: {gender} (encoded: {encode_gender(gender)})")
        print(f"    HbA1c: {hba1c if has_hba1c else 'Not provided'}")
        print(f"  Previous Days Nutrition:")
        print(f"    Calories: {calories}, Fat: {fat}g, Protein: {protein}g")
        print(f"    Carbs: {carbs}g, Sugar: {sugar}g, Fiber: {fiber}g, Sodium: {sodium}mg")
        
        # Prepare features for hypertension model 
        hypertension_df = prepare_features_for_model(hypertension_features_dict, hypertension_features)
        
        # Log features for hypertension model
        print(f"\n Hypertension Model Input:")
        for feature in hypertension_features:
            value = hypertension_df[feature].iloc[0]
            print(f"    {feature}: {value:.1f}")
        
        # Use predict_proba() to get probability of risk (class 1)
        # Returns array: [prob_class_0, prob_class_1]
        hypertension_proba = hypertension_model.predict_proba(hypertension_df)[0]
        hypertension_risk_probability = hypertension_proba[1]  # Probability of risk (class 1)
        
        # --- Personalized penalty (30%) based on nutrient levels weighted by risks ---
        def clamp01(value):
            return max(0.0, min(1.0, value))

        # Normalize nutrient levels to 0-1 against upper bounds
        salt_level = clamp01(sodium_mg_100g / 600.0)    
        sugar_level = clamp01(sugars_100g / 25.0)        

        # Importance weights: base 1.3 plus 3x risk probability 
        salt_importance = 1.3 + 3.0 * clamp01(hypertension_risk_probability)

        # Diabetes probability only available when hba1c is provided; default to 0 otherwise
        diabetes_risk_probability = 0.0
        sugar_importance = 1.0

        # Prepare features for diabetes model (only if hba1c is available)
        if has_hba1c:
            diabetes_features_dict = {
                'ridageyr': age,
                'bmi': bmi,
                'calories': calories,
                'fat': fat,
                'protein': protein,
                'carbs': carbs,
                'sugar': sugar,
                'hba1c': float(hba1c),
                'gender_encoded': gender_encoded
            }
            
            diabetes_df = prepare_features_for_model(diabetes_features_dict, diabetes_features)
            
            print(f"\n🔬 Diabetes Model Input:")
            for feature in diabetes_features:
                value = diabetes_df[feature].iloc[0]
                print(f"    {feature}: {value:.1f}")
            
            diabetes_proba = diabetes_model.predict_proba(diabetes_df)[0]
            diabetes_risk_probability = clamp01(diabetes_proba[1])
            sugar_importance = 1.3 + 3.0 * diabetes_risk_probability
        else:
            print(f"\n🔬 Diabetes Model Input: skipped (hba1c missing)")
            diabetes_risk_probability = 0.0
            sugar_importance = 1.0 + 3.0 * diabetes_risk_probability
        
        # Total importance (only salt + sugar for now, can extend later)
        total_importance = salt_importance + sugar_importance
        if total_importance == 0:
            total_importance = 1.0  # safety fallback

        nutrient_penalty = ((salt_level * salt_importance) + (sugar_level * sugar_importance)) / total_importance
        personalized_score = 10.0 * (1.0 - nutrient_penalty)
        personalized_score = max(1.0, min(10.0, personalized_score))

        # Final combined score: 70% EU + 30% personalized penalty score
        final_score = (0.70 * eu_score) + (0.30 * personalized_score)
        final_score = max(1.0, min(10.0, final_score))
        final_score_rounded = round(final_score)
        grade = get_nutriscore_grade(final_score)

        print(f"\nScan NutriScore Calculation:")
        print(f"  Item EU Score: {eu_score} (contribution: {eu_contribution:.2f})")
        print(f"  Previous Days Nutrition: {previous_days_nutrition}")
        print(f"  Hypertension: prob={hypertension_risk_probability:.3f} -> salt_importance={salt_importance:.2f}, salt_level={salt_level:.2f}")
        if has_hba1c:
            print(f"  Diabetes: prob={diabetes_risk_probability:.3f} -> sugar_importance={sugar_importance:.2f}, sugar_level={sugar_level:.2f}")
        else:
            print(f"  Diabetes: Not calculated (hba1c missing); sugar_importance={sugar_importance:.2f}, sugar_level={sugar_level:.2f}")
        print(f"  Personalized Score (30% block): {personalized_score:.2f} via nutrient_penalty={nutrient_penalty:.3f}")
        print(f"  Final Score: {final_score:.2f} (Grade: {grade})")

        # Build an adjustment note for frontend display
        adjustment_note = (
            f"We adjusted the score because your health profile indicates "
            f"higher importance for sodium (hypertension probability {round(hypertension_risk_probability * 100)}%) "
            f"and sugar (diabetes probability {round(diabetes_risk_probability * 100)}%)."
        )

        response = {
            'success': True,
            'nutriscore': round(final_score, 2),
            'nutriscore_rounded': final_score_rounded,
            'grade': grade,
            'breakdown': {
                'eu_score': round(eu_score, 1),
                'eu_contribution': round(eu_contribution, 2),
                'personalized_score': round(personalized_score, 2),
                'nutrient_penalty': round(nutrient_penalty, 3),
                'salt_level': round(salt_level, 3),
                'sugar_level': round(sugar_level, 3),
                'salt_importance': round(salt_importance, 3),
                'sugar_importance': round(sugar_importance, 3),
                'hypertension_risk_probability': round(hypertension_risk_probability, 3),
                'diabetes_risk_probability': round(diabetes_risk_probability, 3) if has_hba1c else None,
                'adjustment_note': adjustment_note,
                'hba1c_available': has_hba1c
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error during scan NutriScore calculation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/knowledge/search', methods=['POST'])
def knowledge_search():
    """Semantic vector search over the nutrition knowledge base using ChromaDB"""
    try:
        if knowledge_collection is None:
            return jsonify({
                'success': False,
                'message': 'Knowledge base not initialized'
            }), 503

        data = request.get_json()
        if not data or not isinstance(data.get('query'), str) or not data['query'].strip():
            return jsonify({
                'success': False,
                'message': 'Query string is required'
            }), 400

        query = data['query'].strip()[:500]
        try:
            n_results = max(1, min(int(data.get('n_results', 5)), 10))
        except (ValueError, TypeError):
            n_results = 5

        results = knowledge_collection.query(
            query_texts=[query],
            n_results=n_results,
        )

        snippets = []
        if results and results.get('metadatas') and len(results['metadatas']) > 0:
            for i, meta in enumerate(results['metadatas'][0]):
                distance = results['distances'][0][i] if results.get('distances') else None
                snippets.append({
                    'content': meta.get('content', ''),
                    'keywords': meta.get('keywords', ''),
                    'relevance_score': round(1.0 - distance, 4) if distance is not None else None,
                })

        return jsonify({
            'success': True,
            'query': query,
            'results': snippets,
        }), 200

    except Exception as e:
        print(f"Knowledge search error: {e}")
        return jsonify({
            'success': False,
            'message': 'Knowledge search failed'
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'models_loaded': hypertension_model is not None and diabetes_model is not None,
        'knowledge_base_ready': knowledge_collection is not None,
        'knowledge_base_count': knowledge_collection.count() if knowledge_collection else 0
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n Starting NutriScore API on port {port}")
    print(f"  Models loaded: Hypertension={hypertension_model is not None}, Diabetes={diabetes_model is not None}")
    app.run(host='0.0.0.0', port=port, debug=False)
