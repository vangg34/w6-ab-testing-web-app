const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;
const DATA_DIR = path.join(__dirname, 'data');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'user-assignments.json');
const METRICS_FILE = path.join(DATA_DIR, 'metrics.json');

function ensureDataFile(filePath, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

ensureDataFile(ASSIGNMENTS_FILE, {});
ensureDataFile(METRICS_FILE, []);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'w6-ab-testing-demo-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(express.static(__dirname));

function chooseVariant() {
  return Math.random() < 0.5 ? 'A' : 'B';
}

function summarizeMetrics(events) {
  return events.reduce(
    (summary, event) => {
      summary.totalClicks += 1;
      summary.byVersion[event.pageVersion] = (summary.byVersion[event.pageVersion] || 0) + 1;
      summary.byButton[event.buttonId] = (summary.byButton[event.buttonId] || 0) + 1;
      return summary;
    },
    {
      totalClicks: 0,
      byVersion: { A: 0, B: 0 },
      byButton: {},
    }
  );
}

app.get('/api/session', (req, res) => {
  res.json({
    authenticated: Boolean(req.session.user),
    user: req.session.user || null,
    variant: req.session.variant || null,
  });
});

app.post('/api/assign', (req, res) => {
  const { name, email, sub, picture } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'An email address is required for assignment.' });
  }

  const assignments = readJson(ASSIGNMENTS_FILE, {});
  const userKey = email.toLowerCase();

  let variant = req.session.variant;

  if (!variant) {
    variant = assignments[userKey]?.variant || chooseVariant();
  }

  assignments[userKey] = {
    variant,
    name: name || 'Unknown User',
    email: userKey,
    sub: sub || 'Not provided',
    lastAssignedAt: new Date().toISOString(),
  };

  writeJson(ASSIGNMENTS_FILE, assignments);

  req.session.user = {
    name: name || 'Unknown User',
    email: userKey,
    sub: sub || 'Not provided',
    picture: picture || '',
  };
  req.session.variant = variant;

  return res.json({
    authenticated: true,
    user: req.session.user,
    variant,
  });
});

app.post('/api/track', (req, res) => {
  const { buttonId, buttonLabel, pageVersion, userName, userEmail } = req.body || {};

  if (!req.session.user || !req.session.variant) {
    return res.status(401).json({ error: 'You must be signed in before metrics can be recorded.' });
  }

  const events = readJson(METRICS_FILE, []);
  const event = {
    id: `evt_${Date.now()}`,
    userName: userName || req.session.user.name,
    userEmail: (userEmail || req.session.user.email || '').toLowerCase(),
    pageVersion: pageVersion || req.session.variant,
    buttonId: buttonId || 'unknown-button',
    buttonLabel: buttonLabel || 'Unknown Button',
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP',
    timestamp: new Date().toISOString(),
  };

  events.unshift(event);
  writeJson(METRICS_FILE, events);

  return res.json({
    success: true,
    event,
    summary: summarizeMetrics(events),
  });
});

app.get('/api/metrics', (req, res) => {
  const events = readJson(METRICS_FILE, []);
  const summary = summarizeMetrics(events);
  res.json({
    summary,
    recentEvents: events.slice(0, 10),
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`W6 A/B testing demo running at http://localhost:${PORT}`);
});
