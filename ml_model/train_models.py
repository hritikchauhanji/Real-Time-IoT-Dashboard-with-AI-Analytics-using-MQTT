import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import os
from dotenv import load_dotenv
import pymongo
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("DB_NAME")
COLLECTION_NAME = os.getenv("COLLECTION_NAME")

print("=" * 70)
print("🤖 IoT Sensor Data - ML Model Training")
print("=" * 70)

# Connect to MongoDB and fetch data
print("\n📊 Fetching data from MongoDB...")
client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# Fetch all sensor data
data = list(collection.find({}).sort('timestamp', -1).limit(10000))

if len(data) < 100:
    print("❌ Not enough data to train models. Need at least 100 records.")
    print(f"   Current records: {len(data)}")
    print("   Please run the MQTT publisher for some time to collect more data.")
    exit()

print(f"✓ Fetched {len(data)} records from database")

# Convert to DataFrame
df = pd.DataFrame(data)
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp')

print(f"✓ Data range: {df['timestamp'].min()} to {df['timestamp'].max()}")
print(f"✓ Devices: {df['device_id'].unique()}")

# Feature Engineering
print("\n🔧 Feature Engineering...")
df['hour'] = df['timestamp'].dt.hour
df['day_of_week'] = df['timestamp'].dt.dayofweek
df['minute'] = df['timestamp'].dt.minute

# Create lag features (previous values)
df['temp_lag_1'] = df.groupby('device_id')['temperature'].shift(1)
df['temp_lag_2'] = df.groupby('device_id')['temperature'].shift(2)
df['humidity_lag_1'] = df.groupby('device_id')['humidity'].shift(1)

# Drop rows with NaN values from lag features
df = df.dropna()

print(f"✓ Created features: hour, day_of_week, lag features")
print(f"✓ Final dataset size: {len(df)} records")

# Prepare data for Linear Regression (Temperature Prediction)
print("\n🎯 Training Temperature Prediction Model (Linear Regression)...")

feature_cols = ['humidity', 'hour', 'day_of_week', 'temp_lag_1', 'temp_lag_2', 'humidity_lag_1']
X = df[feature_cols]
y_temp = df['temperature']

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y_temp, test_size=0.2, random_state=42
)

# Scale features
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Linear Regression Model
lr_model = LinearRegression()
lr_model.fit(X_train_scaled, y_train)

# Evaluate
y_pred = lr_model.predict(X_test_scaled)
mse = mean_squared_error(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mse)

print(f"✓ Model trained successfully")
print(f"  - RMSE: {rmse:.4f}°C")
print(f"  - MAE: {mae:.4f}°C")
print(f"  - R² Score: {lr_model.score(X_test_scaled, y_test):.4f}")

# Save Linear Regression Model
joblib.dump(lr_model, 'models/temperature_model.pkl')
joblib.dump(scaler, 'models/scaler.pkl')
print(f"✓ Saved models to 'models/' directory")

# Train Anomaly Detection Model (Isolation Forest)
print("\n🔍 Training Anomaly Detection Model (Isolation Forest)...")

anomaly_features = ['temperature', 'humidity']
X_anomaly = df[anomaly_features]

# Train Isolation Forest
iso_forest = IsolationForest(
    contamination=0.05,  # Expect 5% anomalies
    random_state=42,
    n_estimators=100
)

iso_forest.fit(X_anomaly)

# Predict anomalies
anomaly_predictions = iso_forest.predict(X_anomaly)
anomaly_count = (anomaly_predictions == -1).sum()

print(f"✓ Anomaly detection model trained")
print(f"  - Detected {anomaly_count} anomalies ({anomaly_count/len(df)*100:.2f}%)")

# Save Anomaly Detection Model
joblib.dump(iso_forest, 'models/anomaly_model.pkl')
print(f"✓ Saved anomaly detection model")

# Simple LSTM-based prediction (optional - requires more data)
print("\n🧠 Training Simple LSTM Model...")

try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    
    # Prepare sequences for LSTM
    def create_sequences(data, seq_length=10):
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:i+seq_length])
            y.append(data[i+seq_length])
        return np.array(X), np.array(y)
    
    # Use temperature data for LSTM
    temp_data = df.groupby('device_id')['temperature'].apply(list).values[0]
    temp_array = np.array(temp_data).reshape(-1, 1)
    
    # Scale data
    lstm_scaler = MinMaxScaler()
    temp_scaled = lstm_scaler.fit_transform(temp_array)
    
    # Create sequences
    seq_length = 10
    X_seq, y_seq = create_sequences(temp_scaled, seq_length)
    
    if len(X_seq) > 50:  # Only train if we have enough sequences
        # Reshape for LSTM [samples, timesteps, features]
        X_seq = X_seq.reshape((X_seq.shape[0], X_seq.shape[1], 1))
        
        # Split data
        split = int(0.8 * len(X_seq))
        X_train_lstm, X_test_lstm = X_seq[:split], X_seq[split:]
        y_train_lstm, y_test_lstm = y_seq[:split], y_seq[split:]
        
        # Build LSTM model
        lstm_model = Sequential([
            LSTM(50, activation='relu', return_sequences=True, input_shape=(seq_length, 1)),
            Dropout(0.2),
            LSTM(50, activation='relu'),
            Dropout(0.2),
            Dense(1)
        ])
        
        lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        # Train model
        print("  Training LSTM (this may take a minute)...")
        history = lstm_model.fit(
            X_train_lstm, y_train_lstm,
            epochs=20,
            batch_size=32,
            validation_split=0.1,
            verbose=0
        )
        
        # Evaluate
        lstm_loss, lstm_mae = lstm_model.evaluate(X_test_lstm, y_test_lstm, verbose=0)
        print(f"✓ LSTM model trained")
        print(f"  - Loss: {lstm_loss:.4f}")
        print(f"  - MAE: {lstm_mae:.4f}")
        
        # Save LSTM model
        lstm_model.save('models/lstm_temperature_model.h5')
        joblib.dump(lstm_scaler, 'models/lstm_scaler.pkl')
        print(f"✓ Saved LSTM model")
    else:
        print("⚠️  Not enough data for LSTM training (need more sequences)")
        
except Exception as e:
    print(f"⚠️  LSTM training skipped: {e}")

print("\n" + "=" * 70)
print("✅ Model Training Complete!")
print("=" * 70)
print("\nTrained models:")
print("  1. temperature_model.pkl - Linear Regression for temperature prediction")
print("  2. anomaly_model.pkl - Isolation Forest for anomaly detection")
print("  3. lstm_temperature_model.h5 - LSTM for time series prediction (optional)")
print("\nNext step: Run prediction_api.py to create ML prediction endpoints")
print("=" * 70)
