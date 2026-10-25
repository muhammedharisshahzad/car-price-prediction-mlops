# Used Car Price Prediction Web App

A production-ready Flask + Vanilla HTML/CSS/JS web application for predicting used vehicle market prices using machine learning (Scikit-Learn Random Forest).

## Project Structure

```text
dev-ops-lab/
├── model/
│   ├── model.pkl        # Trained Random Forest Regressor
│   └── columns.pkl      # Feature columns list (8,315 features)
├── static/
│   ├── style.css        # Modern dark-theme design system with glassmorphism
│   └── script.js        # Form validation, Fetch API, presets, and price counter
├── templates/
│   └── index.html       # Single-page application HTML template
├── app.py               # Flask backend with CORS & ML prediction pipeline
├── requirements.txt     # Python dependencies
└── README.md
```

## Features

- **Predictive Engine**: Loads `model.pkl` and aligns features to `columns.pkl` using `pd.get_dummies` and zero-filling.
- **Flask REST API**: CORS-enabled endpoints for prediction (`/predict`) and system health check (`/health`).
- **Modern UI**: Polished dark mode with ambient glows, glassmorphic cards, responsive grid, and smooth micro-animations.
- **Interactive Testing**: One-click quick test presets for common vehicle types (Toyota SUV, Ford Truck, Honda Sedan, BMW Coupe).
- **Graceful Error Handling**: Client-side validation, server error alerts, and loading spinners.

## Installation & Setup

1. **Clone and enter the directory**:
   ```bash
   cd dev-ops-lab
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify model files are present**:
   Ensure `model/model.pkl` and `model/columns.pkl` exist in the `model/` directory.

4. **Run the Flask application**:
   ```bash
   python app.py
   ```

5. **Access the application**:
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

## API Reference

### POST `/predict`

Predicts the price for a vehicle based on 8 core parameters.

#### Request Body
```json
{
  "year": 2018,
  "odometer": 89000,
  "condition": "good",
  "manufacturer": "ford",
  "fuel": "gas",
  "transmission": "automatic",
  "drive": "4wd",
  "type": "sedan"
}
```

#### Response (200 OK)
```json
{
  "predicted_price": 15875.12
}
```

### GET `/health`

Health check endpoint indicating model load status.

#### Response (200 OK)
```json
{
  "artifacts_loaded": true,
  "features_count": 8315,
  "status": "healthy",
  "error": null
}
```
