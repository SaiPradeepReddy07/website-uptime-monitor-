Website Uptime Monitor
Monitor website availability, response times, and uptime from a simple dashboard.

**Live Demo
🌐 https://saipradeepreddy07.github.io/website-uptime-monitor-/

**Features**

User registration and login with Supabase Authentication
Add and manage websites to monitor
Automatic uptime checks every 5 minutes
Real-time status tracking
Website response time monitoring
Uptime statistics
Responsive user interface
GitHub Actions powered monitoring
Tech Stack
Frontend
HTML5
CSS3
JavaScript
Backend & Database
Supabase
Supabase Authentication
PostgreSQL
Monitoring Engine
GitHub Actions
Node.js

**How It Works**

Users create an account or sign in.
Users add websites they want to monitor.
GitHub Actions runs every 5 minutes.
The monitoring script checks each website.
Results are stored in Supabase.
The dashboard displays:
Online/Offline status
Response times
Uptime information
Project Structure
website-uptime-monitor-
│
├── index.html
├── sitemap.xml
├── check.yml
│
├── checker/
│   └── check.mjs
│
└── supabase/
 
Environment Variables
GitHub Secrets
Configure the following secrets in GitHub:
SUPABASE_URL
SUPABASE_SERVICE_KEY
Frontend Configuration
Replace the placeholders inside index.html:
var SUPABASE_URL = "YOUR_SUPABASE_URL";
var SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
With your Supabase project credentials.

**Setup**
1. **Clone Repository**
git clone https://github.com/SaiPradeepReddy07/website-uptime-monitor-.git
2. **Create Supabase Project**
Create a new Supabase project and configure:

**Authentication**
Database tables
Row Level Security policies
3. Configure GitHub Secrets
Add:
SUPABASE_URL
SUPABASE_SERVICE_KEY
Under:
Repository Settings → Secrets and Variables → Actions
4. Enable GitHub Actions
The monitoring workflow runs automatically every 5 minutes:
SEO

**The project includes:**
Google Search Console verification
Sitemap support
Search indexing support
Future Improvements
Email notifications
SMS alerts
Discord integration
Telegram alerts
Historical charts
Custom domains
SSL certificate monitoring
Multi-region checks

**Author**

Sai Pradeep Reddy
GitHub: https://github.com/SaiPradeepReddy07
