
import { useMemo, useState } from "react";
import {
  getReports,
  deleteReport,
  formatReportDate,
  formatReportShortDate,
  getLocationText,
  getValidParameters,
} from "./reportUtils";
import "./Reports.css";

function DropLogo({ size = 38 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 58"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 2C19 14 5 27 5 39a19 19 0 0 0 38 0C43 27 29 14 24 2Z"
        fill="#2469EA"
      />
      <path
        d="M24 16C20 25 13 33 13 40a11 11 0 0 0 22 0C35 33 28 25 24 16Z"
        fill="#E8F4FF"
      />
      <path
        d="M18 34c-2 6-1 11 5 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReportBrand({ compact = false }) {
  return (
    <div className="report-brand">
      <DropLogo size={compact ? 30 : 44} />
      <div>
        <h2>Chlorine Analyzer</h2>
        <p>WATER QUALITY TEST REPORT</p>
      </div>
    </div>
  );
}

function MethodBadge({ method }) {
  const isDPD = /dpd/i.test(method || "");
  return (
    <span
      className={`report-method-badge ${
        isDPD ? "dpd" : "ot"
      }`}
    >
      {isDPD ? "DPD" : /ot/i.test(method || "") ? "OT" : "TEST"}
    </span>
  );
}

function ReportResults({ report }) {
  const parameters = getValidParameters(report);

  return (
    <section className="report-results-section">
      <h3>Test Results</h3>
      <table className="report-results-table">
        <thead>
          <tr>
            <th>S.No.</th>
            <th>Parameter</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {parameters.length === 0 ? (
            <tr>
              <td colSpan={3} className="report-no-results">
                No calibrated results available.
              </td>
            </tr>
          ) : (
            parameters.map((item, index) => (
              <tr key={`${item.name}-${index}`}>
                <td>{index + 1}</td>
                <td>{item.name}</td>
                <td className="report-result-value">
                  {item.value}
                  {item.unit ? ` ${item.unit}` : ""}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function InfoField({ label, value, children }) {
  return (
    <div className="report-info-field">
      <span>{label}</span>
      <strong>{children ?? value ?? "—"}</strong>
    </div>
  );
}

function ReportLocation({ location }) {
  const hasCoordinates =
    location?.latitude != null &&
    location?.longitude != null;

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        `${latitude},${longitude}`
      )}`
    : null;

  return (
    <section className="report-location-section">
      <h3>Sample Location</h3>
      <div className="report-location-content">
        <div className="report-location-pin">📍</div>
        <div className="report-location-details">
          <strong>{getLocationText(location)}</strong>
          {hasCoordinates && location?.address && (
            <small>
              {latitude.toFixed(5)}°, {longitude.toFixed(5)}°
            </small>
          )}
          {mapUrl && (
            <a
              className="report-map-link"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Map ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportDocument({ report, format }) {
  const detailed = format === "detailed";

  return (
    <article className="report-document">
      <header className="report-document-header">
        <ReportBrand />
        <span className="report-document-type">
          {detailed ? "LABORATORY REPORT" : "CUSTOMER REPORT"}
        </span>
      </header>

      <div className="report-document-body">
        <section className="report-sample-section">
          <h3>Sample Information</h3>
          <div className="report-information-grid">
            <InfoField label="Report ID" value={report.id} />
            <InfoField label="Sample ID" value={report.sampleId} />
            <InfoField
              label="Date & Time"
              value={formatReportDate(report.createdAt)}
            />
            <InfoField label="Test Method">
              <MethodBadge method={report.method} />
            </InfoField>

            {detailed && (
              <>
                <InfoField
                  label="Device ID"
                  value={report.deviceId}
                />
                <InfoField
                  label="LED Intensity"
                  value={
                    report.ledIntensity != null
                      ? `${report.ledIntensity}%`
                      : "—"
                  }
                />
              </>
            )}
          </div>
        </section>

        <ReportLocation location={report.location} />

        <ReportResults report={report} />

        {detailed && (
          <section className="report-additional-section">
            <h3>Additional Information</h3>
            <div className="report-additional-grid">
              <InfoField
                label="Operator Name"
                value={report.operator}
              />
              <InfoField
                label="Sample Source"
                value={report.sampleSource}
              />
              <InfoField
                label="Calibration Status"
                value={report.calibrationStatus}
              />
              <InfoField
                label="Remarks"
                value={report.remarks}
              />
            </div>

            {report.location?.accuracy != null && (
              <p className="report-gps-accuracy">
                GPS accuracy: ±
                {Math.round(report.location.accuracy)} m
              </p>
            )}
          </section>
        )}

        {getValidParameters(report).length === 0 && (
          <p className="report-calibration-notice">
            Measurement recorded. Chlorine concentration
            cannot be reported until valid experimental
            calibration is available.
          </p>
        )}

        <p className="report-disclaimer">
          Results apply only to the tested sample. Reported
          concentrations require valid device calibration.
        </p>
      </div>

      <footer className="report-document-footer">
        <div className="report-wave report-wave-one" />
        <div className="report-wave report-wave-two" />
        <div className="report-footer-content">
          <span>
            Generated by Chlorine Analyzer
            <small>Smart Water Quality Testing</small>
          </span>
          <span>{formatReportDate(report.createdAt)}</span>
        </div>
      </footer>
    </article>
  );
}

export default function Reports({
  initialReportId = null,
  onNewTest,
}) {
  const [reports, setReports] = useState(getReports);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState(initialReportId);
  const [format, setFormat] = useState("simple");

  const selected = reports.find(
    (report) => report.id === selectedId
  );

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch = [
        report.id,
        report.sampleId,
        report.method,
        report.location?.address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        );

      const matchesMethod =
        methodFilter === "all" ||
        (methodFilter === "dpd" &&
          /dpd/i.test(report.method || "")) ||
        (methodFilter === "ot" &&
          /ot/i.test(report.method || ""));

      return matchesSearch && matchesMethod;
    });
  }, [reports, search, methodFilter]);

  function openReport(reportId) {
    setSelectedId(reportId);
    setFormat("simple");
    window.scrollTo?.(0, 0);
  }

  function closeReport() {
    setSelectedId(null);
    setFormat("simple");
  }

  function removeReport(report) {
    if (
      !window.confirm(
        `Permanently delete report ${report.id}?`
      )
    ) {
      return;
    }

    try {
      const updated = deleteReport(report.id);
      setReports(updated);

      if (selectedId === report.id) {
        closeReport();
      }
    } catch (error) {
      alert(`Could not delete report: ${error.message}`);
    }
  }

  async function shareReport() {
    if (!selected) return;

    const parameters = getValidParameters(selected);
    const lines = [
      "CHLORINE ANALYZER",
      "WATER QUALITY TEST REPORT",
      "",
      `Report ID: ${selected.id}`,
      `Sample ID: ${selected.sampleId}`,
      `Date: ${formatReportDate(selected.createdAt)}`,
      `Method: ${selected.method || "Not available"}`,
      `Location: ${getLocationText(selected.location)}`,
      "",
      "TEST RESULTS",
      ...(parameters.length
        ? parameters.map(
            (item, index) =>
              `${index + 1}. ${item.name}: ${item.value} ${
                item.unit || ""
              }`
          )
        : ["No calibrated results available."]),
      "",
      "Results require valid calibration.",
    ];

    const text = lines.join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Chlorine Analyzer - ${selected.id}`,
          text,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert("Report summary copied to clipboard.");
      } else {
        alert("Sharing is not supported in this browser.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        alert(`Sharing failed: ${error.message}`);
      }
    }
  }

  function downloadPDF() {
    // Browser print dialog offers "Save as PDF".
    window.print();
  }

  if (selected) {
    return (
      <section className="reports-page report-preview-page">
        <div className="reports-preview-topbar">
          <button
            type="button"
            className="reports-back"
            onClick={closeReport}
          >
            ‹
          </button>
          <h2>Report Preview</h2>
        </div>

        <div className="reports-format">
          <button
            type="button"
            className={format === "simple" ? "active" : ""}
            onClick={() => setFormat("simple")}
          >
            Simple Report
          </button>
          <button
            type="button"
            className={format === "detailed" ? "active" : ""}
            onClick={() => setFormat("detailed")}
          >
            Detailed Report
          </button>
        </div>

        <ReportDocument report={selected} format={format} />

        <div className="report-actions">
          <button
            type="button"
            className="report-secondary-action"
            onClick={shareReport}
          >
            <span>↗</span> Share
          </button>
          <button
            type="button"
            className="report-primary-action"
            onClick={downloadPDF}
          >
            <span>↓</span> Download PDF
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="reports-page">
      <div className="reports-header">
        <div>
          <h2>Reports</h2>
          <p>View, download and share your water test reports.</p>
        </div>
        <span className="reports-count">
          {reports.length}
        </span>
      </div>

      <div className="reports-search-row">
        <div className="reports-search-wrap">
          <span className="reports-search-icon">⌕</span>
          <input
            className="reports-search"
            type="search"
            placeholder="Search reports..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button
          type="button"
          className={`reports-filter-button ${
            showFilters ? "active" : ""
          }`}
          aria-label="Filter reports"
          onClick={() => setShowFilters((value) => !value)}
        >
          ☷
        </button>
      </div>

      {showFilters && (
        <div className="reports-filter-options">
          {[
            ["all", "All"],
            ["dpd", "DPD"],
            ["ot", "OT"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={methodFilter === value ? "active" : ""}
              onClick={() => setMethodFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {filteredReports.length === 0 ? (
        <div className="reports-empty">
          <span>▤</span>
          <h3>
            {reports.length === 0
              ? "No Reports Yet"
              : "No Matching Reports"}
          </h3>
          <p>
            {reports.length === 0
              ? "Your completed water quality tests will appear here."
              : "Try another Sample ID or report filter."}
          </p>
        </div>
      ) : (
        <div className="reports-list">
          {filteredReports.map((report) => (
            <article className="reports-card" key={report.id}>
              <button
                type="button"
                className="reports-card-main"
                onClick={() => openReport(report.id)}
              >
                <span className="reports-file-icon">▤</span>

                <span className="reports-card-info">
                  <strong>{report.id}</strong>
                  <small>
                    Sample: {report.sampleId}
                  </small>
                  <small>
                    {formatReportShortDate(report.createdAt)}
                    {" · "}
                    {new Date(report.createdAt).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </small>
                </span>

                <span className="reports-card-right">
                  <MethodBadge method={report.method} />
                  <span className="reports-chevron">›</span>
                </span>
              </button>

              <button
                type="button"
                className="reports-delete"
                onClick={() => removeReport(report)}
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      )}

      {typeof onNewTest === "function" && (
        <button
          type="button"
          className="reports-new-test"
          onClick={onNewTest}
        >
          <span>＋</span> New Test
        </button>
      )}
    </section>
  );
}
