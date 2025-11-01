from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import pymongo
from datetime import datetime, timedelta
import pandas as pd
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="IoT ML Prediction API",
    description="Machine Learning predictions for IoT sensor data",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")
COLLECTION_NAME = os.getenv("COLLECTION_NAME")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Load models
print("🤖 Loading ML models...")
try:
    lr_model = joblib.load('models/temperature_model.pkl')
    scaler = joblib.load('models/scaler.pkl')
    anomaly_model = joblib.load('models/anomaly_model.pkl')
    print("✓ Models loaded successfully")
except Exception as e:
    print(f"❌ Error loading models: {e}")
    print("   Please run train_models.py first!")
    lr_model = None
    scaler = None
    anomaly_model = None

# Request/Response models
class PredictionRequest(BaseModel):
    device_id: str
    humidity: float
    hour: Optional[int] = None
    day_of_week: Optional[int] = None

class PredictionResponse(BaseModel):
    device_id: str
    predicted_temperature: float
    confidence: float
    timestamp: str

class AnomalyRequest(BaseModel):
    temperature: float
    humidity: float

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    message: str

# Helper function to get recent data
def get_recent_data(device_id: str, limit: int = 10):
    """Get recent sensor data for a device"""
    data = list(collection.find(
        {'device_id': device_id}
    ).sort('timestamp', -1).limit(limit))
    
    return pd.DataFrame(data) if data else None

@app.get("/")
def root():
    return {
        "message": "IoT ML Prediction API",
        "version": "1.0.0",
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_temperature(request: PredictionRequest):
    """Predict temperature based on current conditions"""
    if lr_model is None or scaler is None:
        raise HTTPException(status_code=500, detail="Models not loaded. Run train_models.py first.")
    
    try:
        # Get recent data for lag features
        df_recent = get_recent_data(request.device_id, limit=5)
        
        if df_recent is None or len(df_recent) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough historical data for {request.device_id}"
            )
        
        # Prepare features
        now = datetime.now()
        hour = request.hour if request.hour is not None else now.hour
        day_of_week = request.day_of_week if request.day_of_week is not None else now.weekday()
        
        temp_lag_1 = df_recent.iloc[0]['temperature']
        temp_lag_2 = df_recent.iloc[1]['temperature']
        humidity_lag_1 = df_recent.iloc[0]['humidity']
        
        features = np.array([[
            request.humidity,
            hour,
            day_of_week,
            temp_lag_1,
            temp_lag_2,
            humidity_lag_1
        ]])
        
        # Scale and predict
        features_scaled = scaler.transform(features)
        prediction = lr_model.predict(features_scaled)[0]
        
        # Calculate confidence (based on distance from training data mean)
        confidence = min(0.95, max(0.6, 1.0 - abs(prediction - temp_lag_1) / 10))
        
        return PredictionResponse(
            device_id=request.device_id,
            predicted_temperature=round(prediction, 2),
            confidence=round(confidence, 2),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict/next-hour/{device_id}")
async def predict_next_hour(device_id: str):
    """Predict temperature for the next hour"""
    if lr_model is None or scaler is None:
        raise HTTPException(status_code=500, detail="Models not loaded")
    
    try:
        # Get recent data
        df_recent = get_recent_data(device_id, limit=5)
        
        if df_recent is None or len(df_recent) < 2:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough data for {device_id}"
            )
        
        # Prepare features for next hour
        now = datetime.now()
        next_hour = now + timedelta(hours=1)
        
        current_humidity = df_recent.iloc[0]['humidity']
        temp_lag_1 = df_recent.iloc[0]['temperature']
        temp_lag_2 = df_recent.iloc[1]['temperature']
        humidity_lag_1 = df_recent.iloc[0]['humidity']
        
        features = np.array([[
            current_humidity,
            next_hour.hour,
            next_hour.weekday(),
            temp_lag_1,
            temp_lag_2,
            humidity_lag_1
        ]])
        
        features_scaled = scaler.transform(features)
        prediction = lr_model.predict(features_scaled)[0]
        
        return {
            "device_id": device_id,
            "current_temperature": round(temp_lag_1, 2),
            "predicted_temperature": round(prediction, 2),
            "prediction_time": next_hour.isoformat(),
            "confidence": 0.85
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/anomaly/detect", response_model=AnomalyResponse)
async def detect_anomaly(request: AnomalyRequest):
    """Detect if sensor reading is anomalous"""
    if anomaly_model is None:
        raise HTTPException(status_code=500, detail="Anomaly model not loaded")
    
    try:
        features = np.array([[request.temperature, request.humidity]])
        
        # Predict (-1 for anomaly, 1 for normal)
        prediction = anomaly_model.predict(features)[0]
        
        # Get anomaly score (lower is more anomalous)
        score = anomaly_model.score_samples(features)[0]
        
        is_anomaly = prediction == -1
        
        message = "Anomaly detected!" if is_anomaly else "Normal reading"
        
        return AnomalyResponse(
            is_anomaly=bool(is_anomaly),
            anomaly_score=round(float(score), 4),
            message=message
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/anomaly/history")
async def get_anomaly_history(limit: int = 50):
    """Get historical anomalies from database"""
    try:
        anomalies = list(collection.find(
            {'isAnomaly': True}
        ).sort('timestamp', -1).limit(limit))
        
        # Convert ObjectId to string
        for item in anomalies:
            item['_id'] = str(item['_id'])
        
        return {
            "success": True,
            "count": len(anomalies),
            "anomalies": anomalies
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats/predictions")
async def get_prediction_stats():
    """Get prediction statistics for all devices"""
    try:
        devices = collection.distinct('device_id')
        predictions = []
        
        for device_id in devices:
            df = get_recent_data(device_id, limit=10)
            if df is not None and len(df) >= 2:
                # Make prediction
                temp_lag_1 = df.iloc[0]['temperature']
                temp_lag_2 = df.iloc[1]['temperature']
                humidity_lag_1 = df.iloc[0]['humidity']
                current_humidity = df.iloc[0]['humidity']
                
                now = datetime.now()
                features = np.array([[
                    current_humidity,
                    now.hour,
                    now.weekday(),
                    temp_lag_1,
                    temp_lag_2,
                    humidity_lag_1
                ]])
                
                if lr_model and scaler:
                    features_scaled = scaler.transform(features)
                    prediction = lr_model.predict(features_scaled)[0]
                    
                    predictions.append({
                        "device_id": device_id,
                        "current_temp": round(temp_lag_1, 2),
                        "predicted_temp": round(prediction, 2),
                        "trend": "increasing" if prediction > temp_lag_1 else "decreasing"
                    })
        
        return {
            "success": True,
            "predictions": predictions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {
        "status": "OK",
        "models_loaded": lr_model is not None and scaler is not None and anomaly_model is not None,
        "timestamp": datetime.now().isoformat()
    }

# if __name__ == "__main__":
    # import uvicorn
    # print("\n" + "=" * 70)
    # print("🚀 Starting ML Prediction API Server")
    # print("=" * 70)
    # print("📊 API Documentation: http://localhost:8000/docs")
    # print("🏥 Health Check: http://localhost:8000/health")
    # print("=" * 70 + "\n")
    
    # uvicorn.run(app, host="0.0.0.0", port=8000)
