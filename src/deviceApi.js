
/* =========================================
   CHLORINE ANALYZER — DEVICE API
   ESP32-C3 + AS7262
   ========================================= */

const DEVICE_URL =
  import.meta.env.VITE_DEVICE_URL || "http://192.168.4.1";

const TIMEOUTS = {
  status: 5000,
  pwm: 8000,
  baseline: 30000,
  measurement: 30000,
};

/* =========================================
   HTTP REQUEST HANDLER
   ========================================= */

async function deviceRequest(
  endpoint,
  { method = "GET", body, timeout = 10000 } = {}
) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(`${DEVICE_URL}${endpoint}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(body !== undefined
        ? { body: JSON.stringify(body) }
        : {}),
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        "The analyzer returned an invalid response format."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          `Device request failed (HTTP ${response.status}).`
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Device response timed out. Check the analyzer connection."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach ESP32-C3. Check the device Wi-Fi connection and browser permissions."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* =========================================
   DEVICE CONNECTION
   ========================================= */

export async function getDeviceStatus() {
  return deviceRequest("/api/status", {
    method: "GET",
    timeout: TIMEOUTS.status,
  });
}

/* =========================================
   LED INTENSITY CONFIGURATION
   ========================================= */

export async function setDevicePWM(pwm) {
  const value = Number(pwm);

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 255
  ) {
    throw new Error(
      "PWM must be an integer between 0 and 255."
    );
  }

  return deviceRequest("/api/pwm", {
    method: "POST",
    body: { pwm: value },
    timeout: TIMEOUTS.pwm,
  });
}

/* =========================================
   DISTILLED WATER BASELINE
   ========================================= */

export async function captureBaseline() {
  return deviceRequest("/api/baseline", {
    method: "POST",
    body: {},
    timeout: TIMEOUTS.baseline,
  });
}

/* =========================================
   SAMPLE MEASUREMENT
   ========================================= */

export async function measureSample() {
  return deviceRequest("/api/measure", {
    method: "POST",
    body: {},
    timeout: TIMEOUTS.measurement,
  });
}
