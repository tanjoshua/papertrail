export function formatCurrency(cents: number, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    currency,
    style: "currency",
  }).format(cents / 100);
}

export function formatMonthLabel(month: string) {
  const [year, numericMonth] = month.split("-").map(Number);

  if (!year || !numericMonth) {
    return month;
  }

  return new Intl.DateTimeFormat("en-SG", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, numericMonth - 1, 1)));
}

export function getCurrentMonthKey(reference = new Date()) {
  const year = reference.getFullYear();
  const month = `${reference.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function percentage(part: number, whole: number) {
  if (whole === 0) {
    return 0;
  }

  return Math.round((part / whole) * 100);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  if (normalized.length !== 3 && normalized.length !== 6) {
    return null;
  }

  const expanded = normalized.length === 3
    ? normalized
        .split("")
        .map((character) => `${character}${character}`)
        .join("")
    : normalized;

  const value = Number.parseInt(expanded, 16);

  if (Number.isNaN(value)) {
    return null;
  }

  return {
    blue: value & 255,
    green: (value >> 8) & 255,
    red: (value >> 16) & 255,
  };
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string) {
  const rgb = hexToRgb(color);

  if (!rgb) {
    return null;
  }

  const red = channelToLinear(rgb.red);
  const green = channelToLinear(rgb.green);
  const blue = channelToLinear(rgb.blue);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(a: number, b: number) {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(
  backgroundColor: string,
  darkColor = "#1f2722",
  lightColor = "#f6fbf8",
) {
  const backgroundLuminance = relativeLuminance(backgroundColor);
  const darkLuminance = relativeLuminance(darkColor);
  const lightLuminance = relativeLuminance(lightColor);

  if (backgroundLuminance === null || darkLuminance === null || lightLuminance === null) {
    return darkColor;
  }

  const darkContrast = contrastRatio(backgroundLuminance, darkLuminance);
  const lightContrast = contrastRatio(backgroundLuminance, lightLuminance);

  return lightContrast > darkContrast ? lightColor : darkColor;
}
