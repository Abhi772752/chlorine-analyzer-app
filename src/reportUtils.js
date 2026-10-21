
const STORAGE_KEY = "chlorine_analyzer_reports";

function generateReportId() {
  const year = new Date().getFullYear();

  const reports = getReports();

  const prefix = `CA-${year}-`;

  const numbers = reports
    .filter((report) =>
      String(report.id).startsWith(prefix)
    )
    .map((report) =>
      Number(String(report.id).slice(prefix.length))
    )
    .filter(Number.isInteger);

  const nextNumber =
    Math.max(0, ...numbers) + 1;

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export function getReports() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const reports = JSON.parse(saved);

    if (!Array.isArray(reports)) return [];

    return reports.sort(
      (a, b) =>
        new Date(b.createdAt || 0) -
        new Date(a.createdAt || 0)
    );
  } catch (error) {
    console.error("Unable to load reports:", error);
    return [];
  }
}

export function getReportById(reportId) {
  return (
    getReports().find(
      (report) => report.id === reportId
    ) || null
  );
}

export function saveReport(report) {
  if (!report?.sampleId?.trim()) {
    throw new Error("Sample ID is required.");
  }

  const reports = getReports();

  const newReport = {
    id: report.id || generateReportId(),

    sampleId: report.sampleId.trim(),

    method: report.method || "Unknown",

    createdAt:
      report.createdAt || new Date().toISOString(),

    deviceId: report.deviceId || null,

    ledIntensity:
      report.ledIntensity ?? null,

    operator: report.operator || "",

    sampleSource: report.sampleSource || "",

    location: report.location || null,

    parameters: Array.isArray(report.parameters)
      ? report.parameters
      : [],

    calibrationStatus:
      report.calibrationStatus ||
      "Calibration pending",

    remarks: report.remarks || "",
  };

  if (
    reports.some(
      (existing) => existing.id === newReport.id
    )
  ) {
    throw new Error(
      "A report with this ID already exists."
    );
  }

  reports.unshift(newReport);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(reports)
  );

  return newReport;
}

export function deleteReport(reportId) {
  const updatedReports = getReports().filter(
    (report) => report.id !== reportId
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedReports)
  );

  return updatedReports;
}

export function formatReportDate(date) {
  if (!date) return "Not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatReportShortDate(date) {
  if (!date) return "Not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getLocationText(location) {
  if (!location) {
    return "Location not recorded";
  }

  if (location.address) {
    return location.address;
  }

  if (
    location.latitude != null &&
    location.longitude != null
  ) {
    return (
      `${Number(location.latitude).toFixed(5)}° N, ` +
      `${Number(location.longitude).toFixed(5)}° E`
    );
  }

  return "Location not recorded";
}

export function getValidParameters(report) {
  if (!Array.isArray(report?.parameters)) {
    return [];
  }

  return report.parameters.filter((item) => {
    if (!item?.name) return false;

    if (
      item.value === null ||
      item.value === undefined ||
      item.value === ""
    ) {
      return false;
    }

    const name = String(item.name).toLowerCase();

    // Spectral readings remain in the test
    // interface, not the customer report.
    if (
      name.includes("absorbance") ||
      name.includes("spectral") ||
      name.includes("raw channel")
    ) {
      return false;
    }

    return true;
  });
}
