# Chlorine Analyzer — Hotspot connection setup

1. Configure the phone hotspot: SSID `Chlorine_Analyzer`, password `Chlorine@123`, 2.4 GHz.
2. Power the ESP32-C3 and read its assigned IP in Serial Monitor (115200 baud).
3. Open `http://<assigned-ip>/api/status` in the phone browser to verify the firmware status endpoint.
4. In the app Test screen, enter `http://<assigned-ip>` and press Connect Device.

## Important limitations

The GitHub Pages PWA runs on HTTPS; browsers may prohibit HTTP requests to local ESP32 devices due to mixed-content / local-network access rules. Adding CORS headers does not by itself bypass this restriction. If blocked, use an appropriately secured HTTPS bridge or serve the app locally from the ESP32 (requires a separate firmware/web-build integration).

The uploaded ESP32 firmware currently implements only GET `/api/status`. POST `/api/pwm`, `/api/baseline`, and `/api/measure` are not yet implemented. The UI will not be able to run measurements until those endpoints are implemented and tested with the AS7262.

The hotspot IP can change. Always use the address printed by the ESP32 after it connects.
