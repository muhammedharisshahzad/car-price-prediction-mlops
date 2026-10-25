import os
from pathlib import Path
import warnings

import joblib
import pandas as pd
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

# Suppress sklearn unpickling version warnings
warnings.filterwarnings("ignore", category=UserWarning)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "model.pkl"
COLUMNS_PATH = MODEL_DIR / "columns.pkl"

app = Flask(__name__)
CORS(app)
app.config["JSON_SORT_KEYS"] = False

# Global model and column artifacts
MODEL = None
MODEL_COLUMNS = []

# Condition mapping from human-readable levels to ordinal training scales
CONDITION_MAPPING = {
    "salvage": 1,
    "fair": 2,
    "good": 3,
    "excellent": 4,
    "like new": 5,
    "new": 6,
}

REQUIRED_FIELDS = [
    "year",
    "odometer",
    "condition",
    "manufacturer",
    "fuel",
    "transmission",
    "drive",
    "type",
]


def load_artifacts():
    """Load model.pkl and columns.pkl from the model directory."""
    global MODEL, MODEL_COLUMNS

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")
    if not COLUMNS_PATH.exists():
        raise FileNotFoundError(f"Columns file not found at: {COLUMNS_PATH}")

    MODEL = joblib.load(MODEL_PATH)
    loaded_cols = joblib.load(COLUMNS_PATH)

    if hasattr(loaded_cols, "tolist"):
        MODEL_COLUMNS = loaded_cols.tolist()
    else:
        MODEL_COLUMNS = list(loaded_cols)


# Initialize model artifacts
try:
    load_artifacts()
    ARTIFACTS_LOADED = True
    ARTIFACTS_ERROR = None
    print(f"Successfully loaded model and {len(MODEL_COLUMNS)} feature columns.")
except Exception as exc:
    ARTIFACTS_LOADED = False
    ARTIFACTS_ERROR = str(exc)
    print(f"Warning: Failed to load model artifacts: {exc}")


@app.route("/")
def index():
    """Serve the single-page application frontend."""
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint to verify backend and model status."""
    return jsonify({
        "status": "healthy" if ARTIFACTS_LOADED else "degraded",
        "artifacts_loaded": ARTIFACTS_LOADED,
        "features_count": len(MODEL_COLUMNS) if ARTIFACTS_LOADED else 0,
        "error": ARTIFACTS_ERROR,
    }), (200 if ARTIFACTS_LOADED else 503)


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts vehicle specification JSON:
    {
      "year": int,
      "odometer": int,
      "condition": str,
      "manufacturer": str,
      "fuel": str,
      "transmission": str,
      "drive": str,
      "type": str
    }
    Performs one-hot encoding, aligns with columns.pkl, and returns predicted_price.
    """
    if not ARTIFACTS_LOADED or MODEL is None:
        return jsonify({
            "error": f"Model artifacts not available on server: {ARTIFACTS_ERROR}"
        }), 500

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({
            "error": "Invalid request payload. Expected a JSON object."
        }), 400

    # Validate required fields
    missing_fields = [
        f for f in REQUIRED_FIELDS
        if f not in payload or payload[f] is None or str(payload[f]).strip() == ""
    ]
    if missing_fields:
        return jsonify({
            "error": f"Missing required field(s): {', '.join(missing_fields)}"
        }), 400

    # Parse numerical fields
    try:
        year = int(payload["year"])
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'year' must be a valid integer."}), 400

    if year < 1900 or year > 2050:
        return jsonify({"error": "Field 'year' must be between 1900 and 2050."}), 400

    try:
        odometer = float(payload["odometer"])
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'odometer' must be a valid number."}), 400

    if odometer < 0:
        return jsonify({"error": "Field 'odometer' cannot be negative."}), 400

    # Parse and encode condition
    raw_condition = payload["condition"]
    if isinstance(raw_condition, (int, float)):
        condition_val = float(raw_condition)
    else:
        norm_condition = str(raw_condition).strip().lower()
        if norm_condition.isdigit():
            condition_val = float(norm_condition)
        else:
            condition_val = float(CONDITION_MAPPING.get(norm_condition, 3))

    # Normalize categorical string fields
    manufacturer = str(payload["manufacturer"]).strip().lower()
    fuel = str(payload["fuel"]).strip().lower()
    transmission = str(payload["transmission"]).strip().lower()
    drive = str(payload["drive"]).strip().lower()

    # In columns.pkl, 'type_SUV' is capitalized while other types are lowercase
    raw_type = str(payload["type"]).strip()
    if raw_type.lower() == "suv":
        vehicle_type = "SUV"
    else:
        vehicle_type = raw_type.lower()

    # Build input dictionary
    row_dict = {
        "year": year,
        "odometer": odometer,
        "condition": condition_val,
        "manufacturer": manufacturer,
        "fuel": fuel,
        "transmission": transmission,
        "drive": drive,
        "type": vehicle_type,
    }

    # Optional fields (if provided by client, include them)
    for opt in ["cylinders", "lat", "long", "state", "title_status"]:
        if opt in payload and payload[opt] is not None and str(payload[opt]).strip() != "":
            row_dict[opt] = payload[opt]

    try:
        # Create DataFrame and apply one-hot encoding matching training setup
        df = pd.DataFrame([row_dict])
        df = pd.get_dummies(df)

        # Align with exact feature columns list from columns.pkl, filling missing with 0
        df = df.reindex(columns=MODEL_COLUMNS, fill_value=0)

        # Predict price using the Random Forest model
        raw_prediction = MODEL.predict(df)[0]
        predicted_price = round(max(0.0, float(raw_prediction)), 2)

        return jsonify({
            "predicted_price": predicted_price
        }), 200

    except Exception as exc:
        return jsonify({
            "error": f"Error calculating prediction: {str(exc)}"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=port)
