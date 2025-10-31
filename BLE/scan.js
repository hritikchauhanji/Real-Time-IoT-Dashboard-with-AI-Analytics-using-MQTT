import noble from "@abandonware/noble";

noble.on("stateChange", async (state) => {
  if (state === "poweredOn") {
    console.log("Bluetooth powered on — starting BLE scan...");
    noble.startScanning([], false);
  } else {
    console.log("Bluetooth not ready:", state);
    noble.stopScanning();
  }
});

noble.on("discover", (peripheral) => {
  const name = peripheral.advertisement.localName || "N/A";
  const mac = peripheral.address || "Unknown";
  const uuid = peripheral.uuid;
  const rssi = peripheral.rssi;
  const manufacturerData = peripheral.advertisement.manufacturerData
    ? peripheral.advertisement.manufacturerData.toString("hex")
    : "None";
  const serviceUuids =
    peripheral.advertisement.serviceUuids?.join(", ") || "None";

  console.log(`
Device Found:
  Name: ${name}
  UUID: ${uuid}
  MAC Address: ${mac}
  RSSI: ${rssi}
  Service UUIDs: ${serviceUuids}
  Manufacturer Data: ${manufacturerData}
  `);
});
