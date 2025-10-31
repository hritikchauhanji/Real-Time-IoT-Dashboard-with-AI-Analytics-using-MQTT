import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
BROKER = os.getenv('MQTT_BROKER', 'localhost')
PORT = int(os.getenv('MQTT_PORT', 1883))
TOPIC = os.getenv('MQTT_TOPIC', 'iot/sensors/data')

# Sensor configuration
DEVICES = [
    "sensor_01",
    "sensor_02", 
    "sensor_03",
    "sensor_04",
    "sensor_05"
]

# Temperature and humidity ranges for realistic simulation
TEMP_MIN = 20.0
TEMP_MAX = 35.0
HUMIDITY_MIN = 40.0
HUMIDITY_MAX = 85.0

# Add some variation to make it more realistic
device_states = {}
for device in DEVICES:
    device_states[device] = {
        'temperature': random.uniform(TEMP_MIN, TEMP_MAX),
        'humidity': random.uniform(HUMIDITY_MIN, HUMIDITY_MAX)
    }

# MQTT Callbacks
def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print(f"Connected to MQTT Broker at {BROKER}:{PORT}")
        print(f"Publishing to topic: {TOPIC}")
        print("-" * 70)
    else:
        print(f"Connection failed with code {rc}")
        exit(1)

def on_publish(client, userdata, mid):
    """Callback when message is published"""
    pass

def on_disconnect(client, userdata, rc):
    """Callback when disconnected"""
    if rc != 0:
        print("Unexpected disconnection. Reconnecting...")

# Create MQTT Client
client = mqtt.Client(client_id="IoT_Simulator_Publisher")
client.on_connect = on_connect
client.on_publish = on_publish
client.on_disconnect = on_disconnect

# Connect to broker
try:
    client.connect(BROKER, PORT, 60)
    client.loop_start()
    time.sleep(1)  # Wait for connection
except Exception as e:
    print(f"✗ Failed to connect: {e}")
    exit(1)

def generate_sensor_data(device_id):
    """
    Generate realistic IoT sensor data with gradual changes
    to simulate real-world sensor behavior
    """
    # Get previous state
    prev_state = device_states[device_id]
    
    # Add small random variation to previous values (realistic sensor drift)
    temp_variation = random.uniform(-1.5, 1.5)
    humidity_variation = random.uniform(-3.0, 3.0)
    
    # Calculate new values with bounds
    new_temp = prev_state['temperature'] + temp_variation
    new_temp = max(TEMP_MIN, min(TEMP_MAX, new_temp))  # Keep within bounds
    
    new_humidity = prev_state['humidity'] + humidity_variation
    new_humidity = max(HUMIDITY_MIN, min(HUMIDITY_MAX, new_humidity))
    
    # Update state
    device_states[device_id]['temperature'] = new_temp
    device_states[device_id]['humidity'] = new_humidity
    
    # Create data payload
    data = {
        "device_id": device_id,
        "temperature": round(new_temp, 2),
        "humidity": round(new_humidity, 2),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    
    return data

def publish_sensor_data():
    """Publish sensor data for all devices"""
    messages_published = 0
    
    for device_id in DEVICES:
        try:
            # Generate sensor data
            sensor_data = generate_sensor_data(device_id)
            
            # Convert to JSON
            message = json.dumps(sensor_data)
            
            # Publish to MQTT broker
            result = client.publish(TOPIC, message, qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                messages_published += 1
                # Color-coded output for better visibility
                temp = sensor_data['temperature']
                humidity = sensor_data['humidity']
                
                # Add warning indicators for high values
                temp_indicator = "🔥" if temp > 32 else "🌡️"
                humidity_indicator = "💧" if humidity > 75 else "💨"
                
                print(f"📤 [{device_id}] {temp_indicator} Temp: {temp}°C | "
                      f"{humidity_indicator} Humidity: {humidity}% | "
                      f"Time: {sensor_data['timestamp']}")
            else:
                print(f"✗ Failed to publish for {device_id}")
                
        except Exception as e:
            print(f"✗ Error publishing data for {device_id}: {e}")
    
    return messages_published

# Main simulation loop
def main():
    print("\n" + "="*70)
    print("🚀 IoT SENSOR SIMULATOR - MQTT Publisher")
    print("="*70)
    print(f"📡 Broker: {BROKER}:{PORT}")
    print(f"📢 Topic: {TOPIC}")
    print(f"🔢 Devices: {len(DEVICES)}")
    print(f"⏱️  Interval: 5 seconds")
    print("="*70)
    print("Press Ctrl+C to stop\n")
    
    cycle_count = 0
    
    try:
        while True:
            cycle_count += 1
            print(f"\n📊 Cycle #{cycle_count} - {datetime.now().strftime('%H:%M:%S')}")
            print("-" * 70)
            
            messages_published = publish_sensor_data()
            
            print("-" * 70)
            print(f"✓ Published {messages_published}/{len(DEVICES)} messages")
            
            # Wait 5 seconds before next cycle
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n\n" + "="*70)
        print("🛑 STOPPING SIMULATOR")
        print("="*70)
        print(f"✓ Total cycles completed: {cycle_count}")
        print(f"✓ Total messages published: {cycle_count * len(DEVICES)}")
        client.loop_stop()
        client.disconnect()
        print("✓ Disconnected from broker")
        print("="*70 + "\n")

if __name__ == "__main__":
    main()
