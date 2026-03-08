# NutriScore API - Quick Start

## Prerequisites
- Python 3.7 or higher
- pip package manager

## Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify model files exist:**
  - `models/rf_hypertension_compressed.pkl`
  - `models/rf_diabetes_compressed.pkl`
  - `models/model_features_hypertension.json`
  - `models/model_features_diabetes.json`
  - `models/model_metadata.json`

## Running the Service

### Windows:
```bash
start_service.bat
```

### Linux/Mac:
```bash
python nutriscore_api.py
```

### Low-memory hosting (recommended for free tiers):
```bash
export PRELOAD_MODELS=false
export ENABLE_VECTOR_KB=false
python nutriscore_api.py
```

### Manual:
```bash
python nutriscore_api.py
```

The service will start on **port 5000** by default.

## Testing

### Health Check:
```bash
curl http://localhost:5000/health
```

### Test Prediction:
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "energy_kcal_100g": 250.0,
    "sugars_100g": 15.0,
    "saturated_fat_100g": 5.0,
    "sodium_mg_100g": 500.0,
    "fiber_100g": 3.0,
    "proteins_100g": 10.0
  }'
```

Expected response:
```json
{
  "success": true,
  "nutriscore": 6.5,
  "nutriscore_rounded": 7,
  "grade": "C"
}
```

## Integration with Node.js Backend

The Node.js backend will automatically call this service when:
- A nutrition label is scanned
- Manual nutrition data is entered

Make sure this Python service is running **before** starting the Node.js server.

## Troubleshooting

**Port already in use:**
- Change port: `set PYTHON_SERVICE_PORT=5001` (Windows) or `export PYTHON_SERVICE_PORT=5001` (Linux/Mac)

**Model not loading:**
- Check that all `.pkl` and `.json` files are in the `models/` directory
- Verify file permissions

**Import errors:**
- Run `pip install -r requirements.txt` again
- Check Python version: `python --version` (should be 3.7+)

