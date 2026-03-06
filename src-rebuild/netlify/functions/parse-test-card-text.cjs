"use strict";

// Sadece metin alır, PDF yok. Frontend tarayıcıda PDF'ten metin çıkarıp buraya gönderir.

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

function normalizeText(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uff0d\u00ad]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
}

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

function extractTestNo(text) {
  const m = text.match(/Test\s*No\s*[:\-]?\s*([A-Z0-9][\w\-]*)/i);
  return m ? m[1].trim() : null;
}

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

const headers = { "Content-Type": "application/json" };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  }

  try {
    const body = event.body;
    const raw = body == null ? "" : (event.isBase64Encoded ? Buffer.from(body, "base64").toString("utf8") : body);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON. Send { text: \"...\" }." }),
      };
    }

    const text = typeof payload.text === "string" ? payload.text : "";
    const fullText = normalizeText(text);

    const allItems = parseFromText(fullText);

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

    const testNo = extractTestNo(fullText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        testPointCount: allItems.length,
        uniqueManeuvers,
        maneuversByPoint,
        testNo,
      }),
    };
  } catch (err) {
    console.error("parse-test-card-text", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: String(err.message || err) }),
    };
  }
};
