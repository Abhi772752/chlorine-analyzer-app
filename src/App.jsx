
import { useState } from "react";
import "./App.css";

import Reports from "./Reports";
import { saveReport } from "./reportUtils";

import {
  getDeviceStatus,
  setDevicePWM,
  captureBaseline,
  measureSample,
} from "./deviceApi";

const CHANNELS = [450, 500, 550, 570, 600, 650];

const METHODS = [
  {
    id: "ot",
    name: "OT Method",
    fullName: "Orthotolidine",
    wavelength: "440 nm",
    description: "Colorimetric chlorine analysis",
  },
  {
    id: "dpd",
    name: "DPD Method",
    fullName: "DPD Colorimetric",
    wavelength: "520 nm",
    description: "Colorimetric chlorine analysis",
  },
];

const PWM_MAX = 255;

function percentToPWM(value) {
  return Math.round((Number(value) / 100) * PWM_MAX);
}

function extractChannels(data, key) {
  const values = data?.[key];

  if (Array.isArray(values) && values.length === 6) {
    return values;
  }

  if (values && typeof values === "object") {
    return CHANNELS.map(
      (wavelength) =>
        values[String(wavelength)] ??
        values[`${wavelength} nm`]
    );
  }

  return null;
}

function validChannels(values) {
  return (
    Array.isArray(values) &&
    values.length === 6 &&
    values.every(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        Number.isFinite(Number(value))
    )
  );
}

function getCalibratedResult(response) {
  const raw = response?.concentrationMgL;

  if (
    response?.calibrated !== true ||
    raw === null ||
    raw === undefined ||
    raw === ""
  ) {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function getSampleLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function Icon({ name, size = 22 }) {
  const paths = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-8h6v8" />
      </>
    ),
    flask: (
      <>
        <path d="M9 3h6M10 3v7l-6 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-9V3" />
        <path d="M7 16h10" />
      </>
    ),
    report: (
      <>
        <path d="M6 2h9l5 5v14a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
      </>
    ),
    wifi: (
      <>
        <path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M9 17a5 5 0 0 1 6 0" />
        <circle cx="12" cy="21" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    arrow: <path d="m9 18 6-6-6-6" />,
    back: <path d="m15 18-6-6 6-6" />,
    check: <path d="m4 12 5 5L20 6" />,
    location: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.flask}
    </svg>
  );
}

function BrandLogo() {
  return (
    <div className="brand-logo" aria-hidden="true">
      <svg width="28" height="34" viewBox="0 0 28 34">
        <path
          d="M14 1C11 9 2 16 2 23a12 12 0 0 0 24 0C26 16 17 9 14 1Z"
          fill="currentColor"
        />
        <path
          d="M8 23a6 6 0 0 0 6 6"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

function SpectralTable({ title, values }) {
  if (!values) return null;

  return (
    <div className="modern-spectral">
      <div className="section-heading">
        <h3>{title}</h3>
        <span className="subtle-pill">AS7262</span>
      </div>

      <div className="spectral-grid">
        {CHANNELS.map((wavelength, index) => (
          <div className="spectral-item" key={wavelength}>
            <span>{wavelength} nm</span>
            <strong>{Number(values[index]).toFixed(3)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [selectedMethod, setSelectedMethod] = useState(null);

  const [sampleId, setSampleId] = useState("");
  const [testStep, setTestStep] = useState("baseline");

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [deviceMessage, setDeviceMessage] = useState(
    "Connect to your Chlorine Analyzer to begin."
  );

  const [intensity, setIntensity] = useState(50);
  const [appliedPWM, setAppliedPWM] = useState(null);

  const [baselineData, setBaselineData] = useState(null);
  const [measurementData, setMeasurementData] = useState(null);
  const [concentration, setConcentration] = useState(null);

  const [savedReportId, setSavedReportId] = useState(null);
  const [historyReportId, setHistoryReportId] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const calculatedPWM = percentToPWM(intensity);
  const intensityApplied = appliedPWM === calculatedPWM;
  const locked = busy || connecting;
  const baselineReady = baselineData !== null;

  function resetMeasurements() {
    setBaselineData(null);
    setMeasurementData(null);
    setConcentration(null);
    setSavedReportId(null);
    setTestStep("baseline");
  }

  function startNewTest() {
    if (locked) return;

    setSelectedMethod(null);
    setSampleId("");
    resetMeasurements();
    setPage("methods");
  }

  function openMethod(method) {
    if (locked) return;

    setSelectedMethod(method);
    setSampleId("");
    setIntensity(50);
    setAppliedPWM(null);
    resetMeasurements();
    setPage("test");
  }

  function goHome() {
    if (locked) return;

    setPage("home");
    setHistoryReportId(null);
  }

  function openHistory(reportId = null) {
    if (locked) return;

    setHistoryReportId(reportId);
    setHistoryKey((value) => value + 1);
    setPage("history");
  }

  function goBack() {
    if (locked) return;

    if (page === "test") {
      setPage("methods");
    } else {
      goHome();
    }
  }

  async function connectDevice() {
    if (locked) return;

    setConnecting(true);
    setDeviceMessage("Connecting to ESP32-C3...");

    try {
      const response = await getDeviceStatus();

      if (response?.connected === false) {
        throw new Error("Device reported disconnected.");
      }

      setConnected(true);
      setAppliedPWM(null);
      resetMeasurements();
      setDeviceMessage("Analyzer connected successfully.");
    } catch (error) {
      setConnected(false);
      setAppliedPWM(null);
      resetMeasurements();
      setDeviceMessage(`Connection failed: ${error.message}`);
    } finally {
      setConnecting(false);
    }
  }

  function changeIntensity(value) {
    if (locked) return;

    const nextValue = Number(value);
    setIntensity(nextValue);

    if (percentToPWM(nextValue) !== appliedPWM) {
      resetMeasurements();
    }
  }

  async function applyIntensity() {
    if (!connected || locked) return;

    setBusy(true);

    try {
      const response = await setDevicePWM(calculatedPWM);

      if (response?.success === false) {
        throw new Error(
          response.error || "PWM update rejected."
        );
      }

      const confirmedPWM = Number(
        response?.pwm ?? calculatedPWM
      );

      if (confirmedPWM !== calculatedPWM) {
        throw new Error("PWM confirmation mismatch.");
      }

      if (appliedPWM !== confirmedPWM) {
        resetMeasurements();
      }

      setAppliedPWM(confirmedPWM);

      setDeviceMessage(
        confirmedPWM === 0
          ? "Intensity is 0%. Select a value above 0%."
          : `LED intensity configured to ${intensity}%. ${
              appliedPWM !== confirmedPWM
                ? "Capture a new baseline."
                : "Configuration unchanged."
            }`
      );
    } catch (error) {
      setAppliedPWM(null);
      resetMeasurements();
      setDeviceMessage(`PWM error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function startTesting() {
    if (locked || testStep === "result") return;

    if (!sampleId.trim()) {
      setDeviceMessage("Enter a Sample ID first.");
      return;
    }

    if (!connected) {
      setDeviceMessage("Connect the analyzer first.");
      return;
    }

    if (!intensityApplied || calculatedPWM === 0) {
      setDeviceMessage("Apply an LED intensity above 0%.");
      return;
    }

    setBusy(true);

    try {
      if (testStep === "baseline") {
        setDeviceMessage("Capturing distilled-water baseline...");

        const response = await captureBaseline();

        if (response?.success === false) {
          throw new Error(
            response.error || "Baseline acquisition failed."
          );
        }

        const values = extractChannels(response, "baseline");

        if (
          !validChannels(values) ||
          values.some((value) => Number(value) <= 0)
        ) {
          throw new Error("Invalid baseline values received.");
        }

        setBaselineData(values.map(Number));
        setMeasurementData(null);
        setConcentration(null);
        setSavedReportId(null);
        setTestStep("sample");

        setDeviceMessage(
          "Baseline saved. Insert the prepared sample."
        );

        return;
      }

      if (testStep === "sample") {
        if (!baselineReady) {
          throw new Error("Capture the baseline first.");
        }

        setDeviceMessage("Measuring sample...");

        const response = await measureSample();

        if (response?.success === false) {
          throw new Error(
            response.error || "Measurement failed."
          );
        }

        const values = extractChannels(response, "absorbance");

        if (!validChannels(values)) {
          throw new Error("Invalid absorbance data received.");
        }

        const calibratedValue = getCalibratedResult(response);

        setMeasurementData(values.map(Number));
        setConcentration(calibratedValue);
        setSavedReportId(null);
        setTestStep("result");

        setDeviceMessage(
          "Measurement completed. Saving the report..."
        );

        const location = await getSampleLocation();

        const parameters =
          calibratedValue !== null
            ? [
                {
                  name: "Free Chlorine",
                  value: calibratedValue.toFixed(3),
                  unit: "mg/L",
                },
              ]
            : [];

        try {
          const report = saveReport({
            sampleId: sampleId.trim(),
            method: selectedMethod?.name || "Unknown",
            deviceId: response?.deviceId || null,
            ledIntensity: intensity,
            location,
            parameters,
            calibrationStatus:
              calibratedValue !== null
                ? "Calibrated"
                : "Calibration pending",
            createdAt: new Date().toISOString(),
          });

          setSavedReportId(report.id);

          setDeviceMessage(
            calibratedValue !== null
              ? "Measurement complete. Report saved."
              : "Measurement saved. Concentration calibration is pending."
          );
        } catch (error) {
          setDeviceMessage(
            `Measurement complete, but report saving failed: ${error.message}`
          );
        }
      }
    } catch (error) {
      setDeviceMessage(`Measurement error: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function measureAnotherSample() {
    if (locked) return;

    setMeasurementData(null);
    setConcentration(null);
    setSavedReportId(null);
    setSampleId("");
    setTestStep("sample");
  }

  function renderWorkflow() {
    const steps = [
      { id: "baseline", label: "Baseline" },
      { id: "sample", label: "Sample" },
      { id: "result", label: "Result" },
    ];

    const activeIndex = steps.findIndex(
      (step) => step.id === testStep
    );

    return (
      <div className="modern-workflow">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`modern-workflow-step ${
              index === activeIndex ? "active" : ""
            } ${index < activeIndex ? "completed" : ""}`}
          >
            <div className="modern-step-number">
              {index < activeIndex ? (
                <Icon name="check" size={16} />
              ) : (
                index + 1
              )}
            </div>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderTestContent() {
    if (testStep === "baseline") {
      return (
        <div className="measurement-panel">
          <div className="measurement-illustration">💧</div>
          <h3>Distilled Water Baseline</h3>
          <p>
            Insert the 24 mm vial containing distilled water.
            Capture the reference intensity (I₀).
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={startTesting}
            disabled={
              locked ||
              !connected ||
              !intensityApplied ||
              calculatedPWM === 0
            }
          >
            {busy ? "Capturing..." : "Capture Baseline"}
          </button>
        </div>
      );
    }

    if (testStep === "sample") {
      return (
        <div className="measurement-panel">
          <div className="measurement-illustration">🧪</div>
          <h3>Sample Measurement</h3>
          <p>
            Replace the distilled-water vial with your
            prepared sample in the same 24 mm vial position.
          </p>

          <SpectralTable
            title="Saved Baseline"
            values={baselineData}
          />

          <button
            type="button"
            className="primary-button"
            onClick={startTesting}
            disabled={
              locked ||
              !connected ||
              !intensityApplied ||
              !baselineReady
            }
          >
            {busy ? "Measuring..." : "Measure Sample"}
          </button>
        </div>
      );
    }

    return (
      <div className="modern-result">
        <div className="result-icon">
          <Icon name="check" size={30} />
        </div>

        <h3>Measurement Complete</h3>
        <p>
          Sample <strong>{sampleId}</strong> ·{" "}
          {selectedMethod?.name}
        </p>

        <div className="result-value-card">
          <span>Free Chlorine</span>

          {concentration !== null ? (
            <>
              <div className="result-value">
                {concentration.toFixed(3)}
                <small>mg/L</small>
              </div>
              <span className="result-status">
                Calibrated Measurement
              </span>
            </>
          ) : (
            <>
              <strong className="pending-value">
                Calibration Pending
              </strong>
              <p>
                Concentration will be available after
                experimental calibration.
              </p>
            </>
          )}
        </div>

        <SpectralTable
          title="Measured Absorbance"
          values={measurementData}
        />

        {savedReportId && (
          <button
            type="button"
            className="primary-button"
            onClick={() => openHistory(savedReportId)}
            disabled={locked}
          >
            <Icon name="report" size={18} />
            View Report
          </button>
        )}

        <button
          type="button"
          className="secondary-button"
          onClick={measureAnotherSample}
          disabled={
            locked || !connected || !intensityApplied
          }
        >
          Measure Another Sample
        </button>

        <button
          type="button"
          className="text-button"
          onClick={resetMeasurements}
          disabled={locked}
        >
          Capture New Baseline
        </button>
      </div>
    );
  }

  return (
    <div className="app modern-app">
      <header className="header modern-header">
        <button
          type="button"
          className="brand-home"
          onClick={goHome}
          disabled={locked}
          aria-label="Go to home"
        >
          <BrandLogo />
        </button>

        <div className="header-title">
          <h1>Chlorine Analyzer</h1>
          <p>Smart Water Quality Testing</p>
        </div>

        <span
          className={`header-status ${
            connected ? "online" : "offline"
          }`}
        >
          <span className="status-dot" />
          {connected ? "Connected" : "Offline"}
        </span>
      </header>

      <main className="modern-main">
        {page === "home" && (
          <>
            <section className="modern-hero">
              <span className="hero-eyebrow">
                WATER QUALITY MONITORING
              </span>
              <h2>Smart Water Testing, Simplified.</h2>
              <p>
                Measure chlorine, review your test results,
                and manage water quality reports.
              </p>

              <button
                type="button"
                className="hero-button"
                onClick={startNewTest}
                disabled={locked}
              >
                Start New Test
                <Icon name="arrow" size={19} />
              </button>

              <div className="hero-decoration">💧</div>
            </section>

            <div className="dashboard-section-heading">
              <div>
                <h3>Available Parameters</h3>
                <p>Select a parameter to begin testing</p>
              </div>
            </div>

            <button
              type="button"
              className="parameter-card"
              onClick={startNewTest}
              disabled={locked}
            >
              <span className="parameter-icon">
                <Icon name="flask" size={28} />
              </span>

              <span className="parameter-content">
                <strong>Chlorine</strong>
                <small>Free chlorine analysis</small>
                <span className="parameter-range">
                  OT 440 nm · DPD 520 nm
                </span>
              </span>

              <Icon name="arrow" size={21} />
            </button>

            <div className="dashboard-section-heading">
              <div>
                <h3>Quick Access</h3>
                <p>Your testing tools</p>
              </div>
            </div>

            <div className="quick-access-grid">
              <button
                type="button"
                className="quick-access-card"
                onClick={startNewTest}
                disabled={locked}
              >
                <span className="quick-icon blue">
                  <Icon name="flask" />
                </span>
                <strong>New Test</strong>
                <small>Analyze a sample</small>
              </button>

              <button
                type="button"
                className="quick-access-card"
                onClick={() => openHistory()}
                disabled={locked}
              >
                <span className="quick-icon violet">
                  <Icon name="report" />
                </span>
                <strong>Reports</strong>
                <small>View test history</small>
              </button>
            </div>

            <div className="dashboard-device-card">
              <div className="dashboard-device-icon">
                <Icon name="wifi" />
              </div>
              <div>
                <strong>Analyzer Status</strong>
                <small>
                  {connected
                    ? "ESP32-C3 is connected"
                    : "Connect during test setup"}
                </small>
              </div>
              <span
                className={`device-status-label ${
                  connected ? "connected" : ""
                }`}
              >
                {connected ? "Online" : "Offline"}
              </span>
            </div>
          </>
        )}

        {page === "methods" && (
          <>
            <button
              type="button"
              className="modern-back-button"
              onClick={goBack}
              disabled={locked}
            >
              <Icon name="back" size={18} />
              Back
            </button>

            <section className="modern-page-heading">
              <span className="page-eyebrow">NEW WATER TEST</span>
              <h2>Select Test Method</h2>
              <p>
                Choose the method you want to use for
                chlorine analysis.
              </p>
            </section>

            <div className="modern-method-list">
              {METHODS.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  className="modern-method-card"
                  onClick={() => openMethod(method)}
                  disabled={locked}
                >
                  <span
                    className={`modern-method-icon ${method.id}`}
                  >
                    {method.id.toUpperCase()}
                  </span>

                  <span className="modern-method-details">
                    <strong>{method.name}</strong>
                    <small>{method.fullName}</small>
                    <span className="wavelength-pill">
                      {method.wavelength}
                    </span>
                  </span>

                  <Icon name="arrow" size={20} />
                </button>
              ))}
            </div>
          </>
        )}

        {page === "test" && selectedMethod && (
          <>
            <button
              type="button"
              className="modern-back-button"
              onClick={goBack}
              disabled={locked}
            >
              <Icon name="back" size={18} />
              Back
            </button>

            <section className="modern-page-heading">
              <span className="page-eyebrow">
                CHLORINE ANALYSIS
              </span>
              <h2>{selectedMethod.name}</h2>
              <p>
                {selectedMethod.fullName} ·{" "}
                {selectedMethod.wavelength}
              </p>
            </section>

            <section className="modern-card">
              <div className="section-heading">
                <h3>Device Connection</h3>
                <span
                  className={`connection-badge ${
                    connected ? "connected" : ""
                  }`}
                >
                  <span className="status-dot" />
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <p className="modern-helper">
                Connect your phone or computer to the
                ChlorineAnalyzer Wi-Fi network.
              </p>

              <div className="device-notice" role="status">
                <Icon name="wifi" size={18} />
                <span>{deviceMessage}</span>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={connectDevice}
                disabled={locked}
              >
                {connecting
                  ? "Connecting..."
                  : connected
                    ? "Reconnect Device"
                    : "Connect Device"}
              </button>
            </section>

            <section className="modern-card">
              <div className="section-heading">
                <h3>LED Intensity</h3>
                <span className="intensity-display">
                  {intensity}%
                </span>
              </div>

              <p className="modern-helper">
                Set the LED intensity before capturing
                the baseline.
              </p>

              <input
                id="intensity"
                type="range"
                className="modern-intensity-slider"
                min="0"
                max="100"
                step="1"
                value={intensity}
                onChange={(event) =>
                  changeIntensity(event.target.value)
                }
                disabled={!connected || locked}
              />

              <div className="modern-slider-labels">
                <span>0%</span>
                <span>100%</span>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={applyIntensity}
                disabled={!connected || locked}
              >
                Apply LED Intensity
              </button>

              <p className="modern-note">
                The LED turns on only during baseline
                acquisition and sample measurement.
              </p>
            </section>

            <section className="modern-card">
              <div className="section-heading">
                <h3>Sample Details</h3>
                <span className="subtle-pill">24 mm vial</span>
              </div>

              <label className="modern-field-label" htmlFor="sampleId">
                Sample ID
              </label>

              <input
                id="sampleId"
                className="modern-input"
                type="text"
                placeholder="e.g. SAMPLE-001"
                value={sampleId}
                onChange={(event) =>
                  setSampleId(event.target.value)
                }
                disabled={locked || testStep === "result"}
              />
            </section>

            <section className="modern-card">
              <div className="section-heading">
                <h3>Testing Process</h3>
                <span className="subtle-pill">
                  {testStep === "baseline"
                    ? "Step 1 of 3"
                    : testStep === "sample"
                      ? "Step 2 of 3"
                      : "Step 3 of 3"}
                </span>
              </div>

              {renderWorkflow()}
              {renderTestContent()}
            </section>
          </>
        )}

        {page === "history" && (
          <Reports
            key={historyKey}
            initialReportId={historyReportId}
            onNewTest={startNewTest}
          />
        )}

        {page === "settings" && (
          <>
            <section className="modern-page-heading">
              <span className="page-eyebrow">
                APPLICATION
              </span>
              <h2>Settings</h2>
              <p>Analyzer and application information.</p>
            </section>

            <section className="modern-card">
              <h3>Device Information</h3>

              <div className="settings-row">
                <span>Controller</span>
                <strong>ESP32-C3</strong>
              </div>

              <div className="settings-row">
                <span>Spectral Sensor</span>
                <strong>AS7262</strong>
              </div>

              <div className="settings-row">
                <span>Connection</span>
                <strong>Wi-Fi</strong>
              </div>

              <div className="settings-row">
                <span>Report Storage</span>
                <strong>Local Storage</strong>
              </div>

              <div className="settings-row">
                <span>Device Status</span>
                <strong>
                  {connected ? "Connected" : "Disconnected"}
                </strong>
              </div>
            </section>

            <section className="modern-card">
              <h3>About</h3>
              <p className="modern-helper">
                Chlorine Analyzer is a water quality
                testing application supporting OT and
                DPD colorimetric methods.
              </p>
              <p className="modern-note">
                Reports are stored locally in this browser.
                Clearing browser data may remove them.
              </p>
            </section>
          </>
        )}
      </main>

      <nav className="bottom-nav modern-bottom-nav">
        {[
          {
            id: "home",
            label: "Home",
            icon: "home",
            action: goHome,
            active: page === "home",
          },
          {
            id: "test",
            label: "Test",
            icon: "flask",
            action: startNewTest,
            active: page === "test" || page === "methods",
          },
          {
            id: "history",
            label: "Reports",
            icon: "report",
            action: () => openHistory(),
            active: page === "history",
          },
          {
            id: "settings",
            label: "Settings",
            icon: "settings",
            action: () => setPage("settings"),
            active: page === "settings",
          },
        ].map((item) => (
          <button
            type="button"
            key={item.id}
            className={`nav-item ${
              item.active ? "active" : ""
            }`}
            onClick={item.action}
            disabled={locked}
            aria-current={item.active ? "page" : undefined}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
