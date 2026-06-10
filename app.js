const passwordInput = document.querySelector("#password");
const toggleButton = document.querySelector("#toggle-password");
const strengthLabel = document.querySelector("#strength-label");
const strengthMeter = document.querySelector("#strength-meter");
const meterSegments = [...strengthMeter.children];
const crackTime = document.querySelector("#crack-time");
const scoreBadge = document.querySelector("#score-badge");
const feedbackBox = document.querySelector("#feedback-box");

const commonWords = [
  "password", "passw0rd", "qwerty", "admin", "welcome", "letmein",
  "monkey", "dragon", "football", "iloveyou", "abc123", "login",
  "princess", "sunshine", "master", "hello", "freedom", "whatever"
];

const commonSequences = [
  "012345", "123456", "234567", "345678", "456789",
  "abcdef", "qwerty", "asdfgh", "zxcvbn"
];

const levelConfig = [
  { max: 0, label: "Waiting...", color: "#dfe1dc", segments: 0 },
  { max: 24, label: "Very weak", color: "#c94b3a", segments: 1 },
  { max: 44, label: "Weak", color: "#ed6a2c", segments: 2 },
  { max: 64, label: "Fair", color: "#e6b83e", segments: 3 },
  { max: 84, label: "Strong", color: "#4c9a72", segments: 4 },
  { max: 100, label: "Excellent", color: "#1f785c", segments: 5 }
];

function hasWeakPattern(password) {
  const lower = password.toLowerCase();
  const repeatedCharacter = /(.)\1{2,}/.test(lower);
  const repeatedChunk = /(.{2,4})\1{1,}/.test(lower);
  const containsCommonWord = commonWords.some((word) => lower.includes(word));
  const containsSequence = commonSequences.some(
    (sequence) => lower.includes(sequence) || lower.includes([...sequence].reverse().join(""))
  );

  return repeatedCharacter || repeatedChunk || containsCommonWord || containsSequence;
}

function countUniqueCharacters(password) {
  return new Set(password).size;
}

function analyzePassword(password) {
  if (!password) {
    return {
      score: 0,
      checks: {
        length: false,
        case: false,
        number: false,
        symbol: false,
        pattern: null
      },
      feedback: "Enter a password to see personalized feedback."
    };
  }

  const checks = {
    length: password.length >= 12,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
    pattern: !hasWeakPattern(password)
  };

  let score = Math.min(password.length * 3, 45);
  if (password.length >= 16) score += 8;
  if (checks.case) score += 12;
  if (checks.number) score += 10;
  if (checks.symbol) score += 12;
  if (/\s/.test(password)) score += 4;
  if (countUniqueCharacters(password) >= Math.min(10, password.length * 0.7)) score += 8;
  if (!checks.pattern) score -= 24;
  if (/^[A-Za-z]+$/.test(password)) score -= 8;
  if (/^\d+$/.test(password)) score -= 20;
  if (password.length < 8) score = Math.min(score, 22);

  score = Math.max(1, Math.min(100, Math.round(score)));

  const missing = [];
  if (!checks.length) missing.push("make it at least 12 characters");
  if (!checks.case) missing.push("mix upper and lowercase letters");
  if (!checks.number) missing.push("add a number");
  if (!checks.symbol) missing.push("add a symbol");
  if (!checks.pattern) missing.push("remove common words, sequences, or repeats");

  let feedback = "Nice work. This password passes every check shown.";
  if (missing.length > 0) {
    const first = missing[0];
    const second = missing[1];
    feedback = second
      ? `First, ${first}. Then ${second}.`
      : `To improve it, ${first}.`;
  }

  return { score, checks, feedback };
}

function estimateCrackTime(password) {
  if (!password) return "Start typing to calculate";

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9\s]/.test(password)) poolSize += 33;
  if (/\s/.test(password)) poolSize += 1;

  const guessesPerSecond = 10_000_000_000;
  let seconds = Math.pow(Math.max(poolSize, 1), password.length) / 2 / guessesPerSecond;

  if (hasWeakPattern(password)) seconds /= 100_000;
  if (password.length < 8) seconds /= 1_000;

  const roundedUnit = (value, unit) => {
    const rounded = Math.max(1, Math.round(value));
    return `${rounded} ${unit}${rounded === 1 ? "" : "s"}`;
  };

  if (!Number.isFinite(seconds) || seconds >= 3.154e20) return "Trillions of years";
  if (seconds < 1) return "Less than a second";
  if (seconds < 60) return roundedUnit(seconds, "second");
  if (seconds < 3600) return roundedUnit(seconds / 60, "minute");
  if (seconds < 86400) return roundedUnit(seconds / 3600, "hour");
  if (seconds < 2.628e6) return roundedUnit(seconds / 86400, "day");
  if (seconds < 3.154e7) return roundedUnit(seconds / 2.628e6, "month");
  if (seconds < 3.154e9) return roundedUnit(seconds / 3.154e7, "year");
  if (seconds < 3.154e12) return roundedUnit(seconds / 3.154e9, "century");
  if (seconds < 3.154e15) return "Thousands of years";
  if (seconds < 3.154e18) return "Millions of years";
  return "Billions of years";
}

function getLevel(score) {
  return levelConfig.find((level) => score <= level.max);
}

function updateCheck(name, state) {
  const item = document.querySelector(`[data-check="${name}"]`);
  const stateLabel = item.querySelector(".check-state");
  item.classList.remove("met", "failed");

  if (state === null) {
    stateLabel.textContent = "Waiting";
    return;
  }

  item.classList.add(state ? "met" : "failed");
  stateLabel.textContent = state ? "Passed" : "Not met";
}

function updateInterface() {
  const password = passwordInput.value;
  const result = analyzePassword(password);
  const level = getLevel(result.score);

  strengthLabel.textContent = level.label;
  strengthLabel.style.color = password ? level.color : "";
  strengthMeter.style.setProperty("--meter-color", level.color);
  strengthMeter.setAttribute("aria-valuenow", result.score);

  meterSegments.forEach((segment, index) => {
    segment.classList.toggle("active", index < level.segments);
  });

  scoreBadge.innerHTML = `<strong>${result.score}</strong>/100`;
  scoreBadge.style.background = password ? `${level.color}18` : "";
  scoreBadge.style.color = password ? level.color : "";
  crackTime.textContent = estimateCrackTime(password);

  Object.entries(result.checks).forEach(([name, state]) => updateCheck(name, state));

  const positive = password && result.score >= 85 && result.checks.pattern;
  feedbackBox.classList.toggle("positive", positive);
  feedbackBox.querySelector(".feedback-mark").textContent = positive ? "✓" : "!";
  feedbackBox.querySelector("strong").textContent = positive
    ? "Strong foundation"
    : password
      ? "One step at a time"
      : "Ready when you are";
  feedbackBox.querySelector("p").textContent = result.feedback;
}

toggleButton.addEventListener("click", () => {
  const willShow = passwordInput.type === "password";
  passwordInput.type = willShow ? "text" : "password";
  toggleButton.classList.toggle("is-visible", willShow);
  toggleButton.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
  passwordInput.focus();
});

passwordInput.addEventListener("input", updateInterface);
updateInterface();
