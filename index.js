const express = require('express');
const session = require('express-session');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = express();
const adminRouter = express.Router();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BUILD_MARKER = 'data2metrics-2026-05-23-admin-route-check';
const SITE_URL = (process.env.SITE_URL || 'https://data2metrics.com').replace(/\/$/, '');

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

const ADMIN_USERNAME = requireEnv('ADMIN_USERNAME');
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');
const ADMIN_SESSION_SECRET = requireEnv('ADMIN_SESSION_SECRET');

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttemptStore = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getLoginState(ip) {
  const now = Date.now();
  const state = loginAttemptStore.get(ip);

  if (!state) {
    return { count: 0, windowStartedAt: now, blockedUntil: 0 };
  }

  if (state.blockedUntil && state.blockedUntil > now) {
    return state;
  }

  if (now - state.windowStartedAt > LOGIN_WINDOW_MS) {
    return { count: 0, windowStartedAt: now, blockedUntil: 0 };
  }

  return state;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const state = getLoginState(ip);
  const nextCount = state.count + 1;

  const nextState = {
    count: nextCount,
    windowStartedAt: state.windowStartedAt || now,
    blockedUntil: 0
  };

  if (nextCount >= MAX_LOGIN_ATTEMPTS) {
    nextState.blockedUntil = now + LOGIN_BLOCK_MS;
    nextState.count = 0;
    nextState.windowStartedAt = now;
  }

  loginAttemptStore.set(ip, nextState);
  return nextState;
}

function clearLoginAttempts(ip) {
  loginAttemptStore.delete(ip);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(session({
  secret: ADMIN_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.set('view engine', 'ejs');
app.locals.NODE_ENV = process.env.NODE_ENV || 'development';
app.use((req, res, next) => {
  res.locals.NODE_ENV = process.env.NODE_ENV || 'development';
  next();
});
app.use(express.static('public', {
  maxAge: '30d',
  immutable: true,
  etag: true,
  lastModified: true
}));
app.use('/logo', express.static('public/logo', {
  maxAge: '30d',
  immutable: true,
  etag: true,
  lastModified: true
}));

const PLAN_PRICING = {
  Essential: { monthlyFee: 5000, setupFee: 3000 },
  'Compass Growth': { monthlyFee: 10000, setupFee: 7500 },
  'Compass Pro': { monthlyFee: 20000, setupFee: 15000 }
};

const PLAN_ALIASES = {
  Essential: 'Essential',
  'Compass Essential': 'Essential',
  'Compass Growth': 'Compass Growth',
  Growth: 'Compass Growth',
  'Compass Pro': 'Compass Pro',
  Pro: 'Compass Pro'
};

const DISCOUNT_LIMIT_PER_PLAN = 5;
const DATA_DIR = path.join(__dirname, 'data');
const SALES_STATE_FILE = path.join(DATA_DIR, 'sales-state.json');
const LEAD_STATUSES = ['new', 'contacted', 'converted', 'closed'];

function getFileLastModifiedIso(filePath) {
  try {
    return fs.statSync(filePath).mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function parseBlogDateToIso(dateString, fallbackIso) {
  if (!dateString || typeof dateString !== 'string') {
    return fallbackIso;
  }

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackIso;
  }

  return parsed.toISOString();
}

function getAssetHealth(relativePath) {
  const absolutePath = path.join(__dirname, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      path: relativePath,
      exists: false,
      sizeBytes: 0,
      modifiedAt: null
    };
  }

  const stats = fs.statSync(absolutePath);
  return {
    path: relativePath,
    exists: true,
    sizeBytes: stats.size,
    modifiedAt: stats.mtime.toISOString()
  };
}

function isValidAdminCredentials(username, password) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

function requireAdminSession(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  if (req.accepts('html')) {
    return res.redirect('/admin/login');
  }

  return res.status(401).json({ error: 'Authentication required.' });
}

adminRouter.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  return res.render('admin_login', { error: null });
});

adminRouter.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const loginState = getLoginState(ip);
  const now = Date.now();

  if (loginState.blockedUntil && loginState.blockedUntil > now) {
    const minutesLeft = Math.ceil((loginState.blockedUntil - now) / 60000);
    return res.status(429).render('admin_login', {
      error: `Too many attempts. Try again in about ${minutesLeft} minute(s).`
    });
  }

  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!isValidAdminCredentials(username, password)) {
    recordFailedLogin(ip);
    return res.status(401).render('admin_login', { error: 'Invalid username or password.' });
  }

  clearLoginAttempts(ip);
  return req.session.regenerate((error) => {
    if (error) {
      return res.status(500).render('admin_login', { error: 'Login failed. Please try again.' });
    }

    req.session.isAdmin = true;
    return res.redirect('/admin');
  });
});

adminRouter.post('/logout', requireAdminSession, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

adminRouter.get('/', requireAdminSession, (req, res) => {
  const state = loadSalesState();
  const overview = buildAdminOverview(state);
  res.render('admin', { overview, leadStatuses: LEAD_STATUSES });
});

adminRouter.get('/health', (req, res) => {
  res.json({ ok: true, route: 'admin' });
});

app.use('/admin', adminRouter);

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(SALES_STATE_FILE)) {
    const initialState = {
      discountsUsed: {
        Essential: 0,
        'Compass Growth': 0,
        'Compass Pro': 0
      },
      leads: [],
      paymentClaims: []
    };
    fs.writeFileSync(SALES_STATE_FILE, JSON.stringify(initialState, null, 2));
  }
}

function loadSalesState() {
  ensureDataFiles();
  const raw = fs.readFileSync(SALES_STATE_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.discountsUsed = parsed.discountsUsed || {};
  parsed.leads = parsed.leads || [];
  parsed.paymentClaims = parsed.paymentClaims || [];

  const legacyPlanMap = {};

  let stateMutated = false;

  Object.entries(legacyPlanMap).forEach(([legacy, modern]) => {
    if (parsed.discountsUsed[legacy] !== undefined) {
      parsed.discountsUsed[modern] = Number(parsed.discountsUsed[modern] || 0) + Number(parsed.discountsUsed[legacy] || 0);
      delete parsed.discountsUsed[legacy];
      stateMutated = true;
    }
  });

  const normalizeStoredPlan = (value) => {
    if (!value || typeof value !== 'string') return value;
    return legacyPlanMap[value] || value;
  };

  parsed.leads.forEach((lead, index) => {
    if (!lead.id) {
      lead.id = `lead-${Date.now()}-${index}`;
      stateMutated = true;
    }
    if (!lead.status || !LEAD_STATUSES.includes(lead.status)) {
      lead.status = 'new';
      stateMutated = true;
    }
    if (typeof lead.notes !== 'string') {
      lead.notes = '';
      stateMutated = true;
    }

    const nextPlan = normalizeStoredPlan(lead.plan);
    const nextRecommendedPlan = normalizeStoredPlan(lead.recommendedPlan);
    const nextSelectedPlan = normalizeStoredPlan(lead.selectedPlan);
    if (nextPlan !== lead.plan) {
      lead.plan = nextPlan;
      stateMutated = true;
    }
    if (nextRecommendedPlan !== lead.recommendedPlan) {
      lead.recommendedPlan = nextRecommendedPlan;
      stateMutated = true;
    }
    if (nextSelectedPlan !== lead.selectedPlan) {
      lead.selectedPlan = nextSelectedPlan;
      stateMutated = true;
    }
  });

  parsed.paymentClaims.forEach((claim) => {
    const nextPlan = normalizeStoredPlan(claim.plan);
    if (nextPlan !== claim.plan) {
      claim.plan = nextPlan;
      stateMutated = true;
    }
  });

  if (stateMutated) {
    fs.writeFileSync(SALES_STATE_FILE, JSON.stringify(parsed, null, 2));
  }

  return parsed;
}

function saveSalesState(state) {
  ensureDataFiles();
  fs.writeFileSync(SALES_STATE_FILE, JSON.stringify(state, null, 2));
}

function normalizePlan(planName) {
  if (!planName || typeof planName !== 'string') return null;
  return PLAN_ALIASES[planName.trim()] || null;
}

function getPlanQuote(planName, discountsUsed) {
  const pricing = PLAN_PRICING[planName];
  if (!pricing) return null;

  const used = Number(discountsUsed[planName] || 0);
  const slotsRemaining = Math.max(0, DISCOUNT_LIMIT_PER_PLAN - used);
  const discountApplied = slotsRemaining > 0;
  const setupFeeNow = discountApplied ? Math.floor(pricing.setupFee / 2) : pricing.setupFee;

  return {
    plan: planName,
    monthlyFee: pricing.monthlyFee,
    setupFeeOriginal: pricing.setupFee,
    setupFeeNow,
    discountApplied,
    slotsRemaining,
    discountLimit: DISCOUNT_LIMIT_PER_PLAN
  };
}

function buildAdminOverview(state) {
  const planStats = Object.keys(PLAN_PRICING).reduce((acc, planName) => {
    const used = Number(state.discountsUsed[planName] || 0);
    const remaining = Math.max(0, DISCOUNT_LIMIT_PER_PLAN - used);
    const pricing = PLAN_PRICING[planName];

    acc[planName] = {
      plan: planName,
      usedDiscountSlots: used,
      remainingDiscountSlots: remaining,
      discountLimit: DISCOUNT_LIMIT_PER_PLAN,
      monthlyFee: pricing.monthlyFee,
      setupFeeOriginal: pricing.setupFee,
      setupFeeDiscounted: Math.floor(pricing.setupFee / 2)
    };
    return acc;
  }, {});

  const leadSummary = state.leads.reduce((acc, lead) => {
    const key = lead && lead.type ? lead.type : 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leadStatusSummary = state.leads.reduce((acc, lead) => {
    const key = lead && lead.status ? lead.status : 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    planStats,
    leadSummary,
    leadStatusSummary,
    recentLeads: state.leads.slice(-25).reverse(),
    recentPaymentClaims: state.paymentClaims.slice(-25).reverse()
  };
}

app.get('/api/pricing-status', (req, res) => {
  const state = loadSalesState();
  const plans = Object.keys(PLAN_PRICING).reduce((acc, planName) => {
    acc[planName] = getPlanQuote(planName, state.discountsUsed);
    return acc;
  }, {});

  res.json({ plans });
});

app.post('/api/leads/report', (req, res) => {
  const revenue = Number(req.body.revenue);
  const expenses = Number(req.body.expenses);
  const customers = Number(req.body.customers);
  const recommendedPlan = normalizePlan(req.body.recommendedPlan) || req.body.recommendedPlan || null;
  const selectedPlan = normalizePlan(req.body.selectedPlan) || req.body.selectedPlan || null;

  if (!Number.isFinite(revenue) || !Number.isFinite(expenses) || !Number.isFinite(customers)) {
    return res.status(400).json({ error: 'Invalid report payload.' });
  }

  const state = loadSalesState();
  state.leads.push({
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'report',
    status: 'new',
    notes: '',
    revenue,
    expenses,
    customers,
    recommendedPlan,
    selectedPlan,
    createdAt: new Date().toISOString()
  });
  saveSalesState(state);

  res.json({ ok: true });
});

app.post('/api/plan-selections', (req, res) => {
  const normalizedPlan = normalizePlan(req.body.plan);
  if (!normalizedPlan) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  const revenue = Number(req.body.revenue);
  const expenses = Number(req.body.expenses);
  const customers = Number(req.body.customers);
  const recommendedPlan = normalizePlan(req.body.recommendedPlan) || req.body.recommendedPlan || null;

  const state = loadSalesState();
  const quotePreview = getPlanQuote(normalizedPlan, state.discountsUsed);

  state.leads.push({
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'plan_selection',
    status: 'new',
    notes: '',
    plan: normalizedPlan,
    revenue: Number.isFinite(revenue) ? revenue : null,
    expenses: Number.isFinite(expenses) ? expenses : null,
    customers: Number.isFinite(customers) ? customers : null,
    recommendedPlan,
    discountPreviewApplied: quotePreview ? quotePreview.discountApplied : false,
    slotsRemainingPreview: quotePreview ? quotePreview.slotsRemaining : 0,
    createdAt: new Date().toISOString()
  });

  saveSalesState(state);

  res.json({
    plan: normalizedPlan,
    monthlyFee: PLAN_PRICING[normalizedPlan].monthlyFee,
    setupFeeOriginal: PLAN_PRICING[normalizedPlan].setupFee,
    setupFeeNow: quotePreview ? quotePreview.setupFeeNow : PLAN_PRICING[normalizedPlan].setupFee,
    discountApplied: quotePreview ? quotePreview.discountApplied : false,
    slotsRemaining: quotePreview ? quotePreview.slotsRemaining : 0,
    quoteType: 'preview',
    discountLimit: DISCOUNT_LIMIT_PER_PLAN
  });
});

app.post('/api/plan-selections/confirm-payment', requireAdminSession, (req, res) => {
  const normalizedPlan = normalizePlan(req.body.plan);
  const paymentRef = typeof req.body.paymentRef === 'string' ? req.body.paymentRef.trim() : '';

  if (!normalizedPlan) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  if (!paymentRef) {
    return res.status(400).json({ error: 'paymentRef is required to confirm payment.' });
  }

  const state = loadSalesState();
  const existingClaim = state.paymentClaims.find((claim) => claim.paymentRef === paymentRef);

  if (existingClaim) {
    return res.json({
      ...existingClaim,
      quoteType: 'final',
      idempotentReplay: true
    });
  }

  const pricing = PLAN_PRICING[normalizedPlan];
  const usage = Number(state.discountsUsed[normalizedPlan] || 0);
  const canApplyDiscount = usage < DISCOUNT_LIMIT_PER_PLAN;

  if (canApplyDiscount) {
    state.discountsUsed[normalizedPlan] = usage + 1;
  }

  const updatedUsage = Number(state.discountsUsed[normalizedPlan] || 0);
  const slotsRemaining = Math.max(0, DISCOUNT_LIMIT_PER_PLAN - updatedUsage);
  const setupFeeNow = canApplyDiscount ? Math.floor(pricing.setupFee / 2) : pricing.setupFee;

  const claimRecord = {
    paymentRef,
    plan: normalizedPlan,
    monthlyFee: pricing.monthlyFee,
    setupFeeOriginal: pricing.setupFee,
    setupFeeNow,
    discountApplied: canApplyDiscount,
    slotsRemaining,
    discountLimit: DISCOUNT_LIMIT_PER_PLAN,
    confirmedAt: new Date().toISOString()
  };

  state.paymentClaims.push(claimRecord);
  state.leads.push({
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'payment_confirmation',
    status: 'converted',
    notes: '',
    paymentRef,
    plan: normalizedPlan,
    discountApplied: canApplyDiscount,
    createdAt: claimRecord.confirmedAt
  });

  saveSalesState(state);

  res.json({
    ...claimRecord,
    quoteType: 'final',
    idempotentReplay: false
  });
});

app.get('/api/admin/overview', requireAdminSession, (req, res) => {
  const state = loadSalesState();
  res.json(buildAdminOverview(state));
});

app.patch('/api/admin/leads/:leadId', requireAdminSession, (req, res) => {
  const leadId = req.params.leadId;
  const state = loadSalesState();
  const lead = state.leads.find((entry) => entry.id === leadId);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  const nextStatus = typeof req.body.status === 'string' ? req.body.status.trim().toLowerCase() : '';
  const nextNotes = typeof req.body.notes === 'string' ? req.body.notes : null;

  if (nextStatus) {
    if (!LEAD_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid lead status.' });
    }
    lead.status = nextStatus;
  }

  if (nextNotes !== null) {
    lead.notes = nextNotes;
  }

  lead.updatedAt = new Date().toISOString();
  saveSalesState(state);

  return res.json({ ok: true, lead });
});


// --- Project Data ---
const projects = {
  'business_compass': {
    title: 'Business Compass (SME Analytics System)',
    tags: ['Google Sheets', 'Analytics', 'SME Growth'],
    icon: 'fas fa-compass',
    iconColor: '#B57EDC',
    gradient: 'from-purple-900/40 to-indigo-900/40',
    cardGradient: 'from-purple-500/20 to-pink-500/20',
    cardIconClass: 'text-lavender',
    cardDescription: 'A plug-and-play analytics system helping Kenyan SMEs track profit, control expenses, and grow smarter.',
    overview: 'Built an interactive sales forecasting dashboard for a mid-size retail company, enabling their leadership team to visualise revenue trends, seasonal patterns, and growth projections across multiple product lines.',
    challenge: 'The client relied on static Excel spreadsheets updated manually each month. Forecasts were inconsistent, time-consuming to produce, and often arrived too late for strategic planning. Management needed real-time visibility into sales performance and reliable forward-looking projections.',
    solution: 'We designed a Power BI dashboard connected to the company\'s SQL Server database. Python scripts automated the data extraction and cleaning pipeline, while a Prophet-based forecasting model generated 90-day rolling predictions refreshed daily. Interactive filters let stakeholders slice data by region, product category, and time period.',
    results: [
      { metric: '35%', label: 'Faster decision-making' },
      { metric: '92%', label: 'Forecast accuracy' },
      { metric: '10hrs', label: 'Saved per week on reporting' }
    ]
  },

  'impactrack-dashboard': {
      title: 'ImpacTrack: NGO Project Tracking Dashboard',
      tags: ['Power BI', 'Python', 'MongoDB'],
      icon: 'fas fa-chart-line',
      iconColor: '#B57EDC',
      gradient: 'from-purple-900/40 to-indigo-900/40',
      cardGradient: 'from-[#B57EDC]/20 to-[#F472B6]/10',
      cardIconClass: 'text-lavender',
      cardDescription: 'Developed a Power BI dashboard for a Nairobi-based NGO, improving project visibility and donor reporting across 20+ projects.',
      overview: 'Organizations were managing multiple donor-funded projects across scattered spreadsheets and reports, making it difficult to track progress, monitor budgets, and ensure accountability. Visibility into project performance and fund utilization was limited and often delayed.',
      challenge: 'The client relied on static Excel spreadsheets updated manually each month. Forecasts were inconsistent, time-consuming to produce, and often arrived too late for strategic planning. Management needed real-time visibility into sales performance and reliable forward-looking projections.',
      solution: 'We developed a dynamic Power BI dashboard that consolidates all project data into a single source of truth. The solution visualizes project status, budget vs actual costs, donor contributions, deliverables tracking, and consultant assignments, with real-time updates and interactive filtering. Python scripts automate data extraction and cleaning from the client\'s MongoDB database, ensuring that the dashboard always reflects the latest information. The dashboard also includes drill-down capabilities for detailed analysis and automated alerts for budget overruns or delayed milestones.',
      results: [
        { metric: '35%', label: 'Faster decision-making' },
        { metric: '92%', label: 'Forecast accuracy' },
        { metric: '10hrs', label: 'Saved per week on reporting' }
      ]
    },

  'sales-forecasting-dashboard': {
    title: 'Forecast360: Sales Forecasting Dashboard',
    tags: ['Power BI', 'Python', 'SQL'],
    icon: 'fas fa-chart-line',
    iconColor: '#B57EDC',
    gradient: 'from-purple-900/40 to-indigo-900/40',
    cardGradient: 'from-[#B57EDC]/20 to-[#F472B6]/10',
    cardIconClass: 'text-lavender',
    cardDescription: 'Built a Power BI dashboard that reduced forecast error by 30% for a retail client, enabling smarter inventory decisions.',
    overview: 'Built an interactive sales forecasting dashboard for a mid-size retail company, enabling their leadership team to visualise revenue trends, seasonal patterns, and growth projections across multiple product lines.',
    challenge: 'The client relied on static Excel spreadsheets updated manually each month. Forecasts were inconsistent, time-consuming to produce, and often arrived too late for strategic planning. Management needed real-time visibility into sales performance and reliable forward-looking projections.',
    solution: 'We designed a Power BI dashboard connected to the company\'s SQL Server database. Python scripts automated the data extraction and cleaning pipeline, while a Prophet-based forecasting model generated 90-day rolling predictions refreshed daily. Interactive filters let stakeholders slice data by region, product category, and time period.',
    results: [
      { metric: '35%', label: 'Faster decision-making' },
      { metric: '92%', label: 'Forecast accuracy' },
      { metric: '10hrs', label: 'Saved per week on reporting' }
    ]
  },
  'ngo-data-pipeline': {
    title: 'ETLFlow: NGO Data Pipeline',
    tags: ['Python', 'ETL', 'AWS'],
    icon: 'fas fa-database',
    iconColor: '#F472B6',
    gradient: 'from-pink-900/40 to-rose-900/40',
    cardGradient: 'from-[#F472B6]/20 to-[#B57EDC]/10',
    cardIconClass: 'text-pink',
    cardDescription: 'Automated data collection and reporting for a health NGO, cutting manual processing time by 80%.',
    overview: 'Designed and deployed an automated data pipeline for a Nairobi-based NGO, consolidating programme data from multiple field offices into a single, reliable data warehouse for donor reporting and impact measurement.',
    challenge: 'The NGO collected data across 12 field offices using a mix of Google Forms, Excel files, and a legacy Access database. Data inconsistencies were rampant — duplicate beneficiary records, missing fields, and conflicting date formats made donor reports unreliable and time-consuming to compile.',
    solution: 'We built a Python-based ETL pipeline hosted on AWS Lambda that ingested data from all sources on a nightly schedule. The pipeline validated, deduplicated, and standardised records before loading them into a PostgreSQL data warehouse on RDS. Automated alerts flagged data quality issues for field teams to resolve.',
    results: [
      { metric: '80%', label: 'Reduction in data errors' },
      { metric: '3 days', label: 'Donor reports now take hours' },
      { metric: '12', label: 'Field offices unified' }
    ]
  },
  'customer-data-cleanup': {
    title: 'Customer Data Cleanup',
    tags: ['Python', 'SQL', 'Excel'],
    icon: 'fas fa-broom',
    iconColor: '#60A5FA',
    gradient: 'from-blue-900/40 to-cyan-900/40',
    cardGradient: 'from-[#B57EDC]/20 to-[#F472B6]/10',
    cardIconClass: 'text-lavender',
    cardDescription: 'Cleaned and unified 50k+ records across 4 systems for a startup, improving marketing ROI by 25%.',
    overview: 'Performed a comprehensive customer data audit and cleanup for a financial services company, improving their CRM data quality from 58% to 96% accuracy and enabling targeted marketing campaigns for the first time.',
    challenge: 'Years of manual data entry across multiple branches left the client\'s CRM cluttered with duplicate records, incomplete profiles, and outdated contact information. Marketing campaigns had a 40% bounce rate, and the sales team wasted hours verifying customer details before outreach.',
    solution: 'We developed Python scripts using fuzzy matching algorithms to identify and merge duplicate records. SQL queries standardised address formats, phone numbers, and email fields. A validation framework was put in place to prevent future data quality degradation, with automated weekly health checks.',
    results: [
      { metric: '96%', label: 'Data accuracy achieved' },
      { metric: '60%', label: 'Lower email bounce rate' },
      { metric: '15K', label: 'Duplicate records merged' }
    ]
  },
  'cloud-data-migration': {
    title: 'Cloud Data Migration',
    tags: ['AWS', 'Snowflake', 'Python'],
    icon: 'fas fa-cloud-upload-alt',
    iconColor: '#34D399',
    gradient: 'from-emerald-900/40 to-teal-900/40',
    cardGradient: 'from-[#F472B6]/20 to-[#B57EDC]/10',
    cardIconClass: 'text-pink',
    cardDescription: 'Migrated on-prem databases to AWS for a fintech company, improving query performance by 60%.',
    overview: 'Migrated a growing e-commerce company\'s on-premise data infrastructure to a modern cloud stack, reducing operational costs and enabling real-time analytics for the first time in the company\'s history.',
    challenge: 'The client\'s on-premise SQL Server was reaching capacity, queries were slow, and the IT team spent significant time on maintenance. The business needed scalable infrastructure that could handle Black Friday traffic spikes and support real-time inventory and sales analytics.',
    solution: 'We architected a migration to Snowflake as the cloud data warehouse, with AWS S3 as the data lake layer. Python scripts automated the schema conversion and historical data transfer. We implemented incremental loading patterns to minimise downtime and validated data integrity at every stage with automated row-count and checksum comparisons.',
    results: [
      { metric: '45%', label: 'Lower infrastructure costs' },
      { metric: '10x', label: 'Faster query performance' },
      { metric: '0', label: 'Hours of downtime during migration' }
    ]
  }
};

// --- Blog Data ---
const blogPosts = {
  'why-your-dashboard-isnt-working': {
    title: 'Why Your Dashboard Isn\'t Working',
    category: 'Data Strategy',
    date: 'January 15, 2025',
    readTime: '5 min read',
    author: 'Brenda Awino',
    excerpt: 'Most dashboards fail not because of bad tools, but because they answer the wrong questions.',
    cardGradient: 'from-[#B57EDC]/10 to-[#0B0B0F]',
    cardDescription: 'Most dashboards fail because they answer the wrong questions. Here\'s how to fix that.',
    content: `
      <p>You invested in a fancy dashboard tool. Your team spent weeks building charts and filters. But three months later, nobody opens it. Sound familiar?</p>
      <h3>The Real Problem</h3>
      <p>Most dashboards fail not because of the technology, but because they were built without a clear understanding of what decisions they need to support. A dashboard stuffed with every metric imaginable is just noise — it overwhelms rather than informs.</p>
      <h3>Start With Questions, Not Data</h3>
      <p>Before building a single chart, sit down with the people who will actually use the dashboard. Ask them:</p>
      <ul>
        <li>What decisions do you make every week?</li>
        <li>What information do you need to make those decisions confidently?</li>
        <li>What does "good" vs "bad" look like for your key metrics?</li>
      </ul>
      <p>The answers to these questions should drive every design choice — from which KPIs appear front and centre to how filters and drill-downs are structured.</p>
      <h3>Less Is More</h3>
      <p>The best dashboards show 5-7 key metrics, not 50. They use clear visual hierarchy to guide the eye. They answer one primary question per view. If stakeholders need different perspectives, create separate views — don't cram everything onto one screen.</p>
      <h3>Make It Actionable</h3>
      <p>Every metric on your dashboard should prompt a clear action. If revenue dips below target, what happens next? If customer churn spikes, who gets alerted? Build these response pathways into your dashboard design — add threshold alerts, annotations, and links to deeper analysis.</p>
      <blockquote>A dashboard that doesn't change behaviour is just a screensaver.</blockquote>
      <p>If your dashboard isn't delivering value, don't blame the tool. Revisit the foundation: the questions it was meant to answer and the decisions it was built to support.</p>
    `
  },
  'forecasting-for-small-businesses': {
    title: 'Forecasting for Small Businesses',
    category: 'Forecasting',
    date: 'February 8, 2025',
    readTime: '6 min read',
    author: 'Brenda Awino',
    excerpt: 'You don\'t need a data science team to predict next month\'s revenue. Here\'s a practical approach for small businesses.',
    cardGradient: 'from-[#F472B6]/10 to-[#0B0B0F]',
    cardDescription: 'You don\'t need a data science team. Here\'s a practical approach to smarter planning.',
    content: `
      <p>Forecasting sounds intimidating — machine learning models, statistical algorithms, massive datasets. But for most small businesses, accurate forecasting starts with something much simpler: understanding your own patterns.</p>
      <h3>You Already Have Enough Data</h3>
      <p>If you've been in business for a year or more, you have enough historical data to start forecasting. Your sales records, invoice history, and even your bank statements contain patterns waiting to be uncovered.</p>
      <h3>Start With Moving Averages</h3>
      <p>The simplest forecasting technique is a 3-month moving average. Take your revenue for the last three months, average them, and you have a reasonable estimate for next month. It's not perfect, but it's far better than guessing.</p>
      <p>For seasonal businesses, look at the same month from previous years instead. A restaurant's December revenue is better predicted by last December than by last November.</p>
      <h3>Account for Growth Trends</h3>
      <p>If your business is growing (or shrinking), a simple average won't capture that trajectory. Add a growth factor: calculate your month-over-month growth rate over the last 6-12 months and apply it to your baseline forecast.</p>
      <h3>Know Your Limits</h3>
      <p>Simple forecasts work well for stable, repeatable business patterns. They struggle with:</p>
      <ul>
        <li>New product launches with no historical data</li>
        <li>Major market disruptions</li>
        <li>Businesses with highly irregular revenue patterns</li>
      </ul>
      <p>For these scenarios, combine your quantitative forecast with qualitative judgment — talk to your sales team, watch market signals, and adjust accordingly.</p>
      <blockquote>The goal isn't a perfect prediction. It's a better-informed decision.</blockquote>
      <p>Start simple, track how your forecasts compare to reality, and refine over time. You'll be amazed how quickly your accuracy improves.</p>
    `
  },
  'the-hidden-cost-of-dirty-data': {
    title: 'The Hidden Cost of Dirty Data',
    category: 'Data Quality',
    date: 'March 22, 2025',
    readTime: '5 min read',
    author: 'Brenda Awino',
    excerpt: 'Bad data doesn\'t just cause errors — it erodes trust, wastes time, and costs more than most businesses realise.',
    cardGradient: 'from-[#B57EDC]/10 to-[#0B0B0F]',
    cardDescription: 'Bad data is expensive. Learn how cleaning your data first saves time, money, and trust.',
    content: `
      <p>Every business has dirty data. Duplicate customer records, misspelt names, outdated email addresses, inconsistent product codes. Most companies treat it as a minor annoyance. In reality, it's one of the most expensive problems hiding in plain sight.</p>
      <h3>The 1-10-100 Rule</h3>
      <p>Data quality experts use the 1-10-100 rule: it costs $1 to verify a record at the point of entry, $10 to cleanse it later, and $100 to deal with the consequences of bad data — failed deliveries, lost customers, wrong decisions. Prevention is always cheaper than cure.</p>
      <h3>How Dirty Data Spreads</h3>
      <p>Bad data rarely stays contained. A misspelt customer name in your CRM flows into your invoicing system, then into your email marketing platform, then into your analytics dashboard. Each downstream system amplifies the error and makes it harder to fix.</p>
      <h3>The Trust Tax</h3>
      <p>Perhaps the most damaging cost is invisible: when leaders stop trusting the data, they stop using it. Decisions revert to gut feeling. That expensive BI tool gathers dust. The data team's credibility erodes. Rebuilding that trust takes far longer than fixing the data itself.</p>
      <h3>Quick Wins to Start Cleaning Up</h3>
      <ul>
        <li><strong>Audit first:</strong> Profile your data to understand the scale of the problem before jumping to solutions</li>
        <li><strong>Fix at the source:</strong> Add validation rules to data entry forms — dropdown menus instead of free text, required fields, format masks</li>
        <li><strong>Deduplicate regularly:</strong> Run monthly deduplication on your customer and contact databases</li>
        <li><strong>Assign ownership:</strong> Every critical dataset needs a named owner responsible for its quality</li>
      </ul>
      <blockquote>You can't make good decisions with bad data. And you're probably making worse decisions than you think.</blockquote>
      <p>Start with one dataset — your customer list is usually the best place to begin. Clean it, put guardrails in place, and build from there.</p>
    `
  },
  'automate-your-reports-free-your-time': {
    title: 'Automate Your Reports, Free Your Time',
    category: 'Automation',
    date: 'April 10, 2025',
    readTime: '4 min read',
    author: 'Brenda Awino',
    excerpt: 'If you\'re still building reports manually every week, you\'re wasting hours that could be spent on actual analysis.',
    cardGradient: 'from-[#F472B6]/10 to-[#0B0B0F]',
    cardDescription: 'Stop building the same report every Monday. Here\'s how to automate and reclaim your week.',
    content: `
      <p>Every Monday morning, thousands of analysts sit down and do the same thing: pull data from three different systems, paste it into a spreadsheet, format the tables, update the charts, and email the PDF to their manager. Every. Single. Week.</p>
      <h3>The Manual Reporting Trap</h3>
      <p>Manual reporting is comfortable because it's familiar. You know exactly where every number comes from. But that comfort comes at a steep cost: hours of repetitive work that adds zero analytical value. Your expertise should be spent interpreting data, not copying and pasting it.</p>
      <h3>What Can Be Automated</h3>
      <p>Almost every step of a typical reporting workflow can be automated:</p>
      <ul>
        <li><strong>Data extraction:</strong> Scheduled queries that pull fresh data automatically</li>
        <li><strong>Data transformation:</strong> Scripts that clean, merge, and format data consistently</li>
        <li><strong>Visualisation:</strong> Dashboards that refresh automatically when new data arrives</li>
        <li><strong>Distribution:</strong> Automated emails or Slack messages with the latest report attached</li>
      </ul>
      <h3>Start With Your Most Painful Report</h3>
      <p>Don't try to automate everything at once. Pick the report that takes the most time or causes the most frustration. Automate that one end-to-end, prove the value, then move to the next.</p>
      <h3>Tools You Can Use Today</h3>
      <p>You don't need expensive enterprise software to start automating. Python scripts can replace most manual data workflows. Power BI and Google Data Studio refresh dashboards automatically. Even Excel macros can eliminate hours of repetitive formatting.</p>
      <blockquote>The best report is one that builds itself. Your job is to read it and act on it.</blockquote>
      <p>Automation isn't about replacing people — it's about freeing them to do work that actually matters. Start small, automate one report, and watch the time (and sanity) you get back.</p>
    `
  }
};

// --- Routes ---
app.get('/', (req, res) => {
  res.render('index', {
    projects,
    blogPosts,
    canonicalUrl: SITE_URL,
    pageTitle: 'Data Analytics Consultant Kenya | Data2Metrics',
    pageDescription: 'Data2Metrics is a data analytics consultant in Kenya helping businesses build dashboards, automate reporting, and turn data into decisions.',
    siteUrl: SITE_URL
  });
});

app.get('/project/:slug', (req, res) => {
  const slug = req.params.slug;
  const project = projects[slug];
  if (!project) return res.status(404).send('Project not found');

  // Find related projects (sharing at least one tag, not self)
  const relatedProjects = Object.entries(projects)
    .filter(([slug, p]) => slug !== req.params.slug && p.tags && project.tags && p.tags.some(tag => project.tags.includes(tag)))
    .map(([slug, p]) => ({
      slug,
      title: p.title,
      category: p.tags[0] || '',
      icon: p.icon,
      excerpt: p.overview || '',
      date: '', // Add date if available
    }));

  res.render('project_detail', {
    project: { ...project, slug },
    relatedProjects,
    canonicalUrl: `${SITE_URL}/project/${slug}`,
    pageTitle: `${project.title} | Data2Metrics`,
    pageDescription: project.description || project.cardDescription || project.overview,
    siteUrl: SITE_URL
  });
});

app.get('/blog/:slug', (req, res) => {
  const slug = req.params.slug;
  const post = blogPosts[slug];
  if (!post) return res.status(404).send('Post not found');

  // Find related posts (same category, not self)
  const relatedPosts = Object.entries(blogPosts)
    .filter(([slug, p]) => slug !== req.params.slug && (p.category === post.category))
    .map(([slug, p]) => ({
      slug,
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      date: p.date,
      author: p.author
    }));

  res.render('blog_detail', {
    post: { ...post, slug },
    relatedPosts,
    canonicalUrl: `${SITE_URL}/blog/${slug}`,
    pageTitle: `${post.title} | Data2Metrics Blog`,
    pageDescription: post.excerpt,
    siteUrl: SITE_URL
  });
});

app.get('/business_compass', (req, res) => {
    res.render('business_compass', {
      canonicalUrl: `${SITE_URL}/business_compass`,
      pageTitle: 'Business Compass | Data2Metrics',
      pageDescription: 'Business Compass helps SMEs track profit, control expenses, and get clear weekly insights.',
      siteUrl: SITE_URL
    });
});

app.get('/data-analytics-consultant-kenya', (req, res) => {
  res.redirect(301, '/');
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const homeLastMod = getFileLastModifiedIso(path.join(__dirname, 'views', 'index.ejs'));
  const compassLastMod = getFileLastModifiedIso(path.join(__dirname, 'views', 'business_compass.ejs'));
  const projectLastMod = getFileLastModifiedIso(path.join(__dirname, 'views', 'project_detail.ejs'));
  const blogTemplateLastMod = getFileLastModifiedIso(path.join(__dirname, 'views', 'blog_detail.ejs'));

  const entries = [
    { url: '/', lastmod: homeLastMod, priority: '1.0' },
    { url: '/business_compass', lastmod: compassLastMod, priority: '0.8' },
    ...Object.keys(projects).map((slug) => ({
      url: `/project/${slug}`,
      lastmod: projectLastMod,
      priority: '0.7'
    })),
    ...Object.entries(blogPosts).map(([slug, post]) => ({
      url: `/blog/${slug}`,
      lastmod: parseBlogDateToIso(post.date, blogTemplateLastMod),
      priority: '0.7'
    }))
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map((entry) => `  <url><loc>${SITE_URL}${entry.url}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>weekly</changefreq><priority>${entry.priority}</priority></url>`).join('\n') +
    `\n</urlset>\n`;

  res.type('application/xml');
  res.send(xml);
});

app.get('/__build', (req, res) => {
  res.json({ ok: true, build: BUILD_MARKER, pid: process.pid, cwd: process.cwd() });
});

app.get('/__readiness', (req, res) => {
  const tailwindCss = getAssetHealth('public/css/tailwind.css');
  const optimizedLogo = getAssetHealth('public/logo/d2m_logo_256.png');

  const checks = {
    hasTailwindCss: tailwindCss.exists && tailwindCss.sizeBytes > 0,
    hasOptimizedLogo: optimizedLogo.exists && optimizedLogo.sizeBytes > 0,
    usesExpectedSiteUrl: SITE_URL.length > 0
  };

  res.json({
    ok: Object.values(checks).every(Boolean),
    build: BUILD_MARKER,
    siteUrl: SITE_URL,
    checks,
    assets: {
      tailwindCss,
      optimizedLogo
    }
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Data2Metrics boot ${BUILD_MARKER} at http://${HOST}:${PORT} (pid: ${process.pid}, cwd: ${process.cwd()})`);
});
