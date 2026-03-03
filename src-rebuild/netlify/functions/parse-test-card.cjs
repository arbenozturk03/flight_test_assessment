const Busboy = require("busboy");
const { PDFParse } = require("pdf-parse");

// ---- Data ----

const MANEUVER_LIST = [
  "1-G Stabilized Push Over", "360 Roll", "Bank Angle Capture",
  "Bank Angle Capture and Hold", "Barrel Roll", "Claw Mode Transition",
  "Coordinated Turn", "Inverted Flight", "Inverted Flight with Pull Up",
  "Lateral Acceleration", "Landing Gear Transition", "Level Acceleration",
  "Level Deceleration", "Offset Landing", "Pitch Angle Capture and Hold",
  "Pitch and Roll Tracking", "Pitch Doublet", "Pitch Tracking",
  "Pull Up", "Push Over", "Roll Doublet", "Speed Brake Operation",
  "Spiral", "Steady Heading Sideslip", "Trimmability", "Wind Up Turn",
  "Yaw Doublet",
];

const ABBR_TO_MANEUVER = {
  "1GSPO": "1-G Stabilized Push Over", "360R": "360 Roll",
  "BAC": "Bank Angle Capture", "BACH": "Bank Angle Capture and Hold",
  "BRL": "Barrel Roll", "CMT": "Claw Mode Transition",
  "CT": "Coordinated Turn", "IF": "Inverted Flight",
  "IFPU": "Inverted Flight with Pull Up", "LTAC": "Lateral Acceleration",
  "LGT": "Landing Gear Transition", "LACC": "Level Acceleration",
  "LDEC": "Level Deceleration", "OL": "Offset Landing",
  "PACH": "Pitch Angle Capture and Hold", "PRT": "Pitch and Roll Tracking",
  "PD": "Pitch Doublet", "PT": "Pitch Tracking",
  "PU": "Pull Up", "PO": "Push Over", "RD": "Roll Doublet",
  "SBO": "Speed Brake Operation", "SPR": "Spiral",
  "SHS": "Steady Heading Sideslip", "TRIM": "Trimmability",
  "WUT": "Wind Up Turn", "YD": "Yaw Doublet",
};

// ---- Normalization ----

function normalizeText(s) {
  return s
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uff0d\u00ad]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
}

// ---- Page scoring ----

const SCORE_TOKENS = [
  ["TEST", 1], ["CARD", 1], ["SUMMARY", 1], ["FTT", 2],
  ["AIRSPEED", 1], ["ALTITUDE", 1], ["TP", 1], ["#", 1],
  ["FLIGHT TEST CARD", 1],
];
const MIN_SCORE = 4;

function scoreText(text) {
  const upper = text.toUpperCase();
  let score = 0;
  for (const [token, pts] of SCORE_TOKENS) {
    if (upper.includes(token)) score += pts;
  }
  return score;
}

// ---- Maneuver matching ----

function norm(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function normCompact(s) {
  return norm(s).replace(/\s/g, "");
}

function matchManeuverName(ocrName, maneuverList) {
  const raw = ocrName.trim();
  if (!raw) return null;
  const lower = norm(raw);
  const compact = normCompact(raw);

  for (const m of maneuverList) {
    if (norm(m) === lower || normCompact(m) === compact) return m;
  }

  let bestContained = null;
  for (const m of maneuverList) {
    const mLower = norm(m);
    if (lower.includes(mLower) || compact.includes(normCompact(m))) {
      if (!bestContained || mLower.length > norm(bestContained).length) {
        bestContained = m;
      }
    }
  }
  if (bestContained) return bestContained;

  let bestContainer = null;
  for (const m of maneuverList) {
    const mLower = norm(m);
    if (mLower.includes(lower) || normCompact(m).includes(compact)) {
      if (!bestContainer || mLower.length < norm(bestContainer).length) {
        bestContainer = m;
      }
    }
  }
  return bestContainer;
}

// ---- ID regex ----

const ABBR_LIST = "PT|PACH|BACH|BRL|CT|LACC|LDEC|PRT|BAC|PD|PU|PO|RD|OL|IF|IFPU|LTAC|LGT|CMT|SBO|SPR|SHS|TRIM|WUT|YD|360R|1GSPO";
const ID_REGEX = new RegExp(
  `S[-\\s]*[A-Z0-9]{2,5}[-\\s]+(${ABBR_LIST})[-\\s]*\\d{2,3}`,
  "gi",
);

function canonicalizeId(raw) {
  return raw
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

// ---- FTT extraction ----

function extractFtt(windowText, idAbbr, maneuverList) {
  if (idAbbr) {
    const fromAbbr = ABBR_TO_MANEUVER[idAbbr.toUpperCase()];
    if (fromAbbr) return fromAbbr;
  }
  const airspeedIdx = windowText.search(/\d+\/[\d.]+/);
  const fttRaw = (airspeedIdx > 0
    ? windowText.slice(0, airspeedIdx)
    : windowText
  ).trim();
  if (!fttRaw) return idAbbr || "";
  const matched = matchManeuverName(fttRaw, maneuverList);
  if (matched) return matched;
  return fttRaw;
}

// ---- Parse rows from text ----

function parseFromText(text) {
  const items = [];
  const seenIds = new Set();
  const matches = [...text.matchAll(ID_REGEX)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const rawId = m[0];
    const idAbbr = m[1] || null;
    const id = canonicalizeId(rawId);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const afterIdStart = (m.index || 0) + rawId.length;
    const nextMatch = matches[i + 1];
    const windowEnd = nextMatch
      ? (nextMatch.index || text.length)
      : Math.min(text.length, afterIdStart + 200);

    const windowText = normalizeText(text.slice(afterIdStart, windowEnd));
    const ftt = extractFtt(windowText, idAbbr, MANEUVER_LIST);

    const cleaned = windowText.replace(/\d+\/[\d.]+/g, "");
    const tpMatches = [...cleaned.matchAll(/\b(\d{3})\b/g)];
    const tp = tpMatches.length > 0 ? tpMatches[tpMatches.length - 1][1] : undefined;
    items.push({ id, ftt, tp });
  }
  return items;
}

// ---- Busboy helper: extract first file buffer from multipart body ----

function extractFileFromMultipart(headers, bodyBuffer) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const bb = Busboy({ headers });
    bb.on("file", (_fieldname, stream) => {
      stream.on("data", (d) => chunks.push(d));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
    bb.on("error", reject);
    bb.on("finish", () => {
      if (chunks.length === 0) reject(new Error("No file found in request"));
    });
    bb.end(bodyBuffer);
  });
}

// ---- Main handler (Netlify Functions v1 — CommonJS) ----

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  }

  try {
    const bodyBuffer = Buffer.from(
      event.body || "",
      event.isBase64Encoded ? "base64" : "utf8",
    );

    const reqHeaders = {};
    for (const [k, v] of Object.entries(event.headers || {})) {
      reqHeaders[k.toLowerCase()] = v;
    }

    const pdfBuffer = await extractFileFromMultipart(reqHeaders, bodyBuffer);
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    await parser.load();
    const rawText = await parser.getText();
    const fullText = normalizeText(rawText);

    const pages = rawText.includes("\f")
      ? rawText.split("\f").map((t) => normalizeText(t))
      : [fullText];

    const matchedTexts = [];
    for (const page of pages) {
      if (scoreText(page) >= MIN_SCORE) matchedTexts.push(page);
    }

    if (matchedTexts.length === 0) {
      if (scoreText(fullText) >= MIN_SCORE) {
        matchedTexts.push(fullText);
      }
    }

    const allItems = [];
    const seenIds = new Set();
    for (const text of matchedTexts) {
      for (const item of parseFromText(text)) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      }
    }

    if (allItems.length === 0) {
      for (const item of parseFromText(fullText)) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      }
    }

    const maneuversByPoint = {};
    const uniqueManeuvers = [];
    const seen = new Set();

    for (let idx = 0; idx < allItems.length; idx++) {
      const item = allItems[idx];
      const pointNum = idx + 1;
      maneuversByPoint[pointNum] = item.ftt;
      if (!seen.has(item.ftt)) {
        seen.add(item.ftt);
        uniqueManeuvers.push(item.ftt);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        testPointCount: allItems.length,
        uniqueManeuvers,
        maneuversByPoint,
      }),
    };
  } catch (err) {
    console.error("FUNCTION_ERROR", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err), stack: err?.stack }),
    };
  }
};
