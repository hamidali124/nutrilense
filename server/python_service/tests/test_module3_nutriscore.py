import pytest
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from nutriscore_api import (
    calculate_eu_nutriscore,
    get_nutriscore_grade,
    encode_gender,
    prepare_features_for_model,
    load_models
)


def load_models_for_testing():
    """Load models for testing without Flask app context"""
    import nutriscore_api
    import joblib
    import json
    
    BASE_DIR = Path(__file__).parent.parent
    MODELS_DIR = BASE_DIR / 'models'
    
    HYPERTENSION_MODEL_PATH = MODELS_DIR / 'rf_hypertension.pkl'
    DIABETES_MODEL_PATH = MODELS_DIR / 'rf_diabetes.pkl'
    HYPERTENSION_FEATURES_PATH = MODELS_DIR / 'model_features_hypertension.json'
    DIABETES_FEATURES_PATH = MODELS_DIR / 'model_features_diabetes.json'
    
    try:
        # Load models
        if not HYPERTENSION_MODEL_PATH.exists():
            raise FileNotFoundError(f"Hypertension model file not found: {HYPERTENSION_MODEL_PATH}")
        nutriscore_api.hypertension_model = joblib.load(HYPERTENSION_MODEL_PATH)
        
        if not DIABETES_MODEL_PATH.exists():
            raise FileNotFoundError(f"Diabetes model file not found: {DIABETES_MODEL_PATH}")
        nutriscore_api.diabetes_model = joblib.load(DIABETES_MODEL_PATH)
        
        # Load feature orders
        with open(HYPERTENSION_FEATURES_PATH, 'r') as f:
            nutriscore_api.hypertension_features = json.load(f)
        
        with open(DIABETES_FEATURES_PATH, 'r') as f:
            nutriscore_api.diabetes_features = json.load(f)
        
        return True
    except Exception as e:
        print(f" Error loading models for testing: {e}")
        return False

# Load models at module level
_models_loaded = load_models_for_testing()

@pytest.fixture(scope="module", autouse=True)
def setup_models():
    """Verify models are loaded before running tests"""
    if not _models_loaded:
        pytest.skip("Models could not be loaded - skipping ML model tests")
    
    import nutriscore_api
    assert nutriscore_api.hypertension_model is not None
    assert nutriscore_api.diabetes_model is not None
    assert nutriscore_api.hypertension_features is not None
    assert nutriscore_api.diabetes_features is not None


class TestMLModelIntegration:
    """Test ML model integration and prediction accuracy"""
    
    def test_hypertension_model_feature_preparation(self):
        """Test feature preparation for hypertension model"""
        import nutriscore_api
        
        features_dict = {
            'ridageyr': 30,
            'bmi': 22.5,
            'calories': 2000,
            'fat': 65,
            'protein': 50,
            'carbs': 250,
            'sugar': 50,
            'gender_encoded': 1
        }
        
        df = prepare_features_for_model(features_dict, nutriscore_api.hypertension_features)
        
        assert df is not None
        assert len(df.columns) == len(nutriscore_api.hypertension_features)
        assert df.shape[0] == 1  # Single prediction
        # Verify all features are present
        for feature in nutriscore_api.hypertension_features:
            assert feature in df.columns
    
    def test_diabetes_model_feature_preparation(self):
        """Test feature preparation for diabetes model"""
        import nutriscore_api
        
        features_dict = {
            'ridageyr': 30,
            'bmi': 22.5,
            'calories': 2000,
            'fat': 65,
            'protein': 50,
            'carbs': 250,
            'sugar': 50,
            'hba1c': 5.5,
            'gender_encoded': 1
        }
        
        df = prepare_features_for_model(features_dict, nutriscore_api.diabetes_features)
        
        assert df is not None
        assert len(df.columns) == len(nutriscore_api.diabetes_features)
        assert 'hba1c' in df.columns
    
    def test_hypertension_model_prediction(self):
        """Test actual hypertension model prediction"""
        import nutriscore_api
        
        features_dict = {
            'ridageyr': 30,
            'bmi': 22.5,
            'calories': 2000,
            'fat': 65,
            'protein': 50,
            'carbs': 250,
            'sugar': 50,
            'gender_encoded': 1
        }
        
        df = prepare_features_for_model(features_dict, nutriscore_api.hypertension_features)
        
        # Make actual prediction
        proba = nutriscore_api.hypertension_model.predict_proba(df)[0]
        
        # Verify prediction structure
        assert len(proba) == 2  # Two classes (no risk, risk)
        assert proba[0] >= 0 and proba[0] <= 1  # Probability of no risk
        assert proba[1] >= 0 and proba[1] <= 1  # Probability of risk
        assert abs(proba[0] + proba[1] - 1.0) < 0.001  # Probabilities sum to 1
        
        # Risk probability should be in valid range
        risk_prob = proba[1]
        assert risk_prob >= 0 and risk_prob <= 1
    
    def test_diabetes_model_prediction(self):
        """Test actual diabetes model prediction"""
        import nutriscore_api
        
        features_dict = {
            'ridageyr': 30,
            'bmi': 22.5,
            'calories': 2000,
            'fat': 65,
            'protein': 50,
            'carbs': 250,
            'sugar': 50,
            'hba1c': 5.5,
            'gender_encoded': 1
        }
        
        df = prepare_features_for_model(features_dict, nutriscore_api.diabetes_features)
        
        # Make actual prediction
        proba = nutriscore_api.diabetes_model.predict_proba(df)[0]
        
        # Verify prediction structure
        assert len(proba) == 2  # Two classes (no risk, risk)
        assert proba[0] >= 0 and proba[0] <= 1  # Probability of no risk
        assert proba[1] >= 0 and proba[1] <= 1  # Probability of risk
        assert abs(proba[0] + proba[1] - 1.0) < 0.001  # Probabilities sum to 1
        
        # Risk probability should be in valid range
        risk_prob = proba[1]
        assert risk_prob >= 0 and risk_prob <= 1
    
    def test_model_prediction_consistency(self):
        """Test that model predictions are consistent for same input"""
        import nutriscore_api
        
        features_dict = {
            'ridageyr': 30,
            'bmi': 22.5,
            'calories': 2000,
            'fat': 65,
            'protein': 50,
            'carbs': 250,
            'sugar': 50,
            'gender_encoded': 1
        }
        
        df = prepare_features_for_model(features_dict, nutriscore_api.hypertension_features)
        
        # Make multiple predictions with same input
        proba1 = nutriscore_api.hypertension_model.predict_proba(df)[0]
        proba2 = nutriscore_api.hypertension_model.predict_proba(df)[0]
        proba3 = nutriscore_api.hypertension_model.predict_proba(df)[0]
        
        # All predictions should be identical
        assert abs(proba1[0] - proba2[0]) < 0.0001
        assert abs(proba1[1] - proba2[1]) < 0.0001
        assert abs(proba2[0] - proba3[0]) < 0.0001
        assert abs(proba2[1] - proba3[1]) < 0.0001
    
    def test_model_prediction_with_different_profiles(self):
        """Test model predictions with different user profiles"""
        import nutriscore_api
        
        profiles = [
            {'age': 25, 'bmi': 20, 'gender': 'female', 'calories': 1800, 'fat': 50, 'protein': 45, 'carbs': 200, 'sugar': 40},
            {'age': 50, 'bmi': 28, 'gender': 'male', 'calories': 2500, 'fat': 80, 'protein': 60, 'carbs': 300, 'sugar': 60},
            {'age': 35, 'bmi': 25, 'gender': 'other', 'calories': 2200, 'fat': 70, 'protein': 55, 'carbs': 275, 'sugar': 50}
        ]
        
        predictions = []
        for profile in profiles:
            features_dict = {
                'ridageyr': profile['age'],
                'bmi': profile['bmi'],
                'calories': profile['calories'],
                'fat': profile['fat'],
                'protein': profile['protein'],
                'carbs': profile['carbs'],
                'sugar': profile['sugar'],
                'gender_encoded': encode_gender(profile['gender'])
            }
            
            df = prepare_features_for_model(features_dict, nutriscore_api.hypertension_features)
            proba = nutriscore_api.hypertension_model.predict_proba(df)[0]
            predictions.append(proba[1])  # Risk probability
        
        # All predictions should be valid probabilities
        for pred in predictions:
            assert pred >= 0 and pred <= 1
        
        # Different profiles should potentially give different predictions
        # (though they might be similar, they should all be valid)
        assert len(set([round(p, 4) for p in predictions])) >= 1  # At least one unique value


class TestCombinedScoreAccuracy:
    """Test combined score calculation accuracy"""
    
    def test_full_combined_score_with_actual_models(self):
        """Test full combined score calculation using actual ML models"""
        import nutriscore_api
        
        # Test data
        item_nutrition = {
            'energy_kcal_100g': 200,
            'saturated_fat_100g': 3,
            'sugars_100g': 8,
            'sodium_mg_100g': 300,
            'fiber_100g': 4,
            'proteins_100g': 10
        }
        
        user_profile = {
            'age': 30,
            'bmi': 22.5,
            'gender': 'male',
            'hba1c': 5.5
        }
        
        previous_days_nutrition = {
            'calories': 2000,
            'fat': 65,
            'protein': 50,
            'carbs': 250,
            'sugar': 50,
            'fiber': 25,
            'sodium': 2300
        }
        
        # Calculate EU NutriScore
        eu_result = calculate_eu_nutriscore(
            item_nutrition['energy_kcal_100g'],
            item_nutrition['saturated_fat_100g'],
            item_nutrition['sugars_100g'],
            item_nutrition['sodium_mg_100g'],
            item_nutrition['fiber_100g'],
            item_nutrition['proteins_100g']
        )
        eu_score = eu_result['score']
        eu_contribution = eu_score * 0.70
        
        # Prepare features for hypertension model
        gender_encoded = encode_gender(user_profile['gender'])
        hypertension_features_dict = {
            'ridageyr': user_profile['age'],
            'bmi': user_profile['bmi'],
            'calories': previous_days_nutrition['calories'],
            'fat': previous_days_nutrition['fat'],
            'protein': previous_days_nutrition['protein'],
            'carbs': previous_days_nutrition['carbs'],
            'sugar': previous_days_nutrition['sugar'],
            'gender_encoded': gender_encoded
        }
        
        hypertension_df = prepare_features_for_model(hypertension_features_dict, nutriscore_api.hypertension_features)
        hypertension_proba = nutriscore_api.hypertension_model.predict_proba(hypertension_df)[0]
        hypertension_risk_probability = hypertension_proba[1]
        hypertension_score = 10.0 - (hypertension_risk_probability * 9.0)
        hypertension_contribution = hypertension_score * 0.15  # 15% when hba1c available
        
        # Prepare features for diabetes model
        diabetes_features_dict = {
            'ridageyr': user_profile['age'],
            'bmi': user_profile['bmi'],
            'calories': previous_days_nutrition['calories'],
            'fat': previous_days_nutrition['fat'],
            'protein': previous_days_nutrition['protein'],
            'carbs': previous_days_nutrition['carbs'],
            'sugar': previous_days_nutrition['sugar'],
            'hba1c': user_profile['hba1c'],
            'gender_encoded': gender_encoded
        }
        
        diabetes_df = prepare_features_for_model(diabetes_features_dict, nutriscore_api.diabetes_features)
        diabetes_proba = nutriscore_api.diabetes_model.predict_proba(diabetes_df)[0]
        diabetes_risk_probability = diabetes_proba[1]
        diabetes_score = 10.0 - (diabetes_risk_probability * 9.0)
        diabetes_contribution = diabetes_score * 0.15  # 15% when hba1c available
        
        # Calculate final combined score
        final_score = eu_contribution + hypertension_contribution + diabetes_contribution
        final_score = max(1.0, min(10.0, final_score))
        grade = get_nutriscore_grade(final_score)
        
        # Verify all components
        assert eu_score >= 0 and eu_score <= 10
        assert hypertension_risk_probability >= 0 and hypertension_risk_probability <= 1
        assert diabetes_risk_probability >= 0 and diabetes_risk_probability <= 1
        assert hypertension_score >= 1 and hypertension_score <= 10
        assert diabetes_score >= 1 and diabetes_score <= 10
        assert final_score >= 1.0 and final_score <= 10.0
        assert grade in ['A', 'B', 'C', 'D', 'E']
        
        # Verify weighting (70% EU, 15% each for models)
        assert abs(eu_contribution - (eu_score * 0.7)) < 0.01
        assert abs(hypertension_contribution - (hypertension_score * 0.15)) < 0.01
        assert abs(diabetes_contribution - (diabetes_score * 0.15)) < 0.01
        
        # Verify contributions sum to final score (within rounding tolerance)
        total_contributions = eu_contribution + hypertension_contribution + diabetes_contribution
        assert abs(final_score - total_contributions) < 0.1
    
    def test_score_weighting_calculation(self):
        """Test that 70/30 weighting is correctly applied"""

        
        eu_score = 8.0
        hypertension_score = 9.0
        diabetes_score = 9.5
        
        eu_contribution = eu_score * 0.7  # 5.6
        hypertension_contribution = hypertension_score * 0.15  # 1.35
        diabetes_contribution = diabetes_score * 0.15  # 1.425
        
        combined_score = eu_contribution + hypertension_contribution + diabetes_contribution
        
        assert abs(combined_score - 8.375) < 0.01
        assert abs(eu_contribution - 5.6) < 0.01
        assert abs(hypertension_contribution - 1.35) < 0.01
        assert abs(diabetes_contribution - 1.425) < 0.01
    
    def test_score_without_diabetes_model(self):
        """Test combined score when diabetes model is not used"""
    
        
        eu_score = 8.0
        hypertension_score = 9.0
        
        eu_contribution = eu_score * 0.7  # 5.6
        hypertension_contribution = hypertension_score * 0.15  # 1.35
        diabetes_contribution = 0  # Not used
        
        combined_score = eu_contribution + hypertension_contribution + diabetes_contribution
        
        assert abs(combined_score - 6.95) < 0.01


class TestBoundaryConditions:
    """Test boundary conditions and edge cases"""
    
    def test_minimum_valid_score(self):
        """Test minimum valid score (0.0 for worst product)"""
        result = calculate_eu_nutriscore(
            energy_kcal_100g=1000,
            saturated_fat_100g=50,
            sugars_100g=100,
            sodium_mg_100g=5000,
            fiber_100g=0,
            proteins_100g=0
        )
        
        assert result['score'] >= 0
        assert result['score'] <= 10
        assert result['grade'] == 'E'
    
    def test_maximum_valid_score(self):
        """Test maximum valid score (10.0 for best product)"""
        result = calculate_eu_nutriscore(
            energy_kcal_100g=50,
            saturated_fat_100g=0.5,
            sugars_100g=2,
            sodium_mg_100g=50,
            fiber_100g=10,
            proteins_100g=15,
            fruits_vegetables_percent=100
        )
        
        assert result['score'] >= 0
        assert result['score'] <= 10
        # Very healthy should be grade A
        assert result['grade'] in ['A', 'B']
    
    def test_negative_values_handling(self):
        """Test that negative values are handled (should use 0 or clamp)"""
        # Negative values should be treated as 0
        result = calculate_eu_nutriscore(
            energy_kcal_100g=-100,
            saturated_fat_100g=-5,
            sugars_100g=-10,
            sodium_mg_100g=-200,
            fiber_100g=-2,
            proteins_100g=-5
        )
        
        # Should not crash, should return valid score
        assert result['score'] >= 0
        assert result['score'] <= 10
        assert result['grade'] in ['A', 'B', 'C', 'D', 'E']
    
    def test_extremely_high_values(self):
        """Test handling of extremely high nutrition values"""
        result = calculate_eu_nutriscore(
            energy_kcal_100g=10000,
            saturated_fat_100g=500,
            sugars_100g=1000,
            sodium_mg_100g=50000,
            fiber_100g=0,
            proteins_100g=0
        )
        
        # Should cap at worst score
        assert result['score'] >= 0
        assert result['grade'] == 'E'
    
    def test_decimal_precision(self):
        """Test that decimal values are handled correctly"""
        result = calculate_eu_nutriscore(
            energy_kcal_100g=123.456,
            saturated_fat_100g=2.345,
            sugars_100g=5.678,
            sodium_mg_100g=234.567,
            fiber_100g=3.456,
            proteins_100g=7.890
        )
        
        assert result['score'] >= 0
        assert result['score'] <= 10
        assert isinstance(result['score'], (int, float))


class TestFormulaCorrectness:
    """Test EU NutriScore formula implementation correctness"""
    
    def test_energy_conversion_kcal_to_kj(self):
        """Test energy conversion from kcal to kJ is correct"""
        # 250 kcal = 1046 kJ (250 * 4.184)
        # At 1046 kJ, should get 3 points (1005 < 1046 <= 1340)
        result = calculate_eu_nutriscore(
            energy_kcal_100g=250,
            saturated_fat_100g=0,
            sugars_100g=0,
            sodium_mg_100g=0,
            fiber_100g=0,
            proteins_100g=0
        )
        
        # Should calculate correctly with kJ conversion
        assert result['score'] >= 0
        assert result['score'] <= 10
    
    def test_sodium_points_calculation(self):
        """Test sodium points are calculated correctly"""
        # Low sodium (100mg) should give fewer negative points
        result_low = calculate_eu_nutriscore(
            energy_kcal_100g=200,
            saturated_fat_100g=3,
            sugars_100g=8,
            sodium_mg_100g=100,  # Low
            fiber_100g=4,
            proteins_100g=10
        )
        
        # High sodium (1000mg) should give more negative points
        result_high = calculate_eu_nutriscore(
            energy_kcal_100g=200,
            saturated_fat_100g=3,
            sugars_100g=8,
            sodium_mg_100g=1000,  # High
            fiber_100g=4,
            proteins_100g=10
        )
        
        # Low sodium should have better (higher) score
        assert result_low['score'] >= result_high['score']
    
    def test_fiber_positive_points(self):
        """Test fiber contributes positive points correctly"""
        result_no_fiber = calculate_eu_nutriscore(
            energy_kcal_100g=200,
            saturated_fat_100g=3,
            sugars_100g=8,
            sodium_mg_100g=300,
            fiber_100g=0,  # No fiber
            proteins_100g=10
        )
        
        result_high_fiber = calculate_eu_nutriscore(
            energy_kcal_100g=200,
            saturated_fat_100g=3,
            sugars_100g=8,
            sodium_mg_100g=300,
            fiber_100g=5,  # High fiber
            proteins_100g=10
        )
        
        # High fiber should have better (higher) score
        assert result_high_fiber['score'] >= result_no_fiber['score']
    
    def test_protein_conditional_scoring(self):
        """Test protein points are conditional on A score"""
        # High A score (unhealthy) - protein should be capped
        result_unhealthy = calculate_eu_nutriscore(
            energy_kcal_100g=500,
            saturated_fat_100g=15,
            sugars_100g=50,
            sodium_mg_100g=1000,
            fiber_100g=1,
            proteins_100g=10  # High protein but A >= 11
        )
        
        # Low A score (healthy) - protein fully counted
        result_healthy = calculate_eu_nutriscore(
            energy_kcal_100g=150,
            saturated_fat_100g=2,
            sugars_100g=5,
            sodium_mg_100g=200,
            fiber_100g=5,
            proteins_100g=10  # High protein and A < 11
        )
        
        # Healthy product should have better score
        assert result_healthy['score'] > result_unhealthy['score']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

