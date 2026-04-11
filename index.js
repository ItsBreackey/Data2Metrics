const express = require('express');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

// --- Project Data ---
const projects = {
  'sales-forecasting-dashboard': {
    title: 'Sales Forecasting Dashboard',
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
    title: 'NGO Data Pipeline',
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
  res.render('index', { projects, blogPosts });
});

app.get('/project/:slug', (req, res) => {
  const project = projects[req.params.slug];
  if (!project) return res.status(404).send('Project not found');
  res.render('project_detail', { project });
});

app.get('/blog/:slug', (req, res) => {
  const post = blogPosts[req.params.slug];
  if (!post) return res.status(404).send('Post not found');
  res.render('blog_detail', { post });
});

app.listen(PORT, () => {
  console.log(`Data2Metrics live at http://localhost:${PORT}`);
});
