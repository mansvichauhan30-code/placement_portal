# 🎓 Placement Preparation Portal

A full-stack web application for college students to prepare for campus placements.

**Stack:** HTML5 · CSS3 · Vanilla JavaScript · Python Flask · MySQL

---

## 📁 Project Structure

```
placement_portal/
├── app.py                    # Flask application – all routes & APIs
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template (copy to .env)
│
├── database/
│   └── schema.sql            # Full MySQL schema + seed data
│
├── static/
│   ├── css/
│   │   ├── main.css          # Design system, variables, global styles
│   │   ├── landing.css       # Landing page styles
│   │   └── dashboard.css     # Inner app page styles
│   └── js/
│       ├── core.js           # Shared utilities (API, Toast, Theme, Sidebar)
│       ├── auth.js           # Login / Signup logic
│       ├── dashboard.js      # Dashboard stats & charts
│       ├── aptitude.js       # Timed MCQ test engine
│       ├── coding.js         # Code editor & submission
│       ├── pages.js          # Resume, Interview, Progress, Leaderboard, Resources, Profile
│       └── admin.js          # Admin panel logic
│
└── templates/
    ├── base.html             # Layout with sidebar + topbar
    ├── index.html            # Landing page
    ├── login.html            # Login page
    ├── signup.html           # Signup page
    ├── dashboard.html        # Student dashboard
    ├── aptitude.html         # Aptitude test module
    ├── coding.html           # Coding practice module
    ├── resume.html           # Resume analyzer
    ├── interview.html        # Mock interview module
    ├── progress.html         # Progress analytics
    ├── leaderboard.html      # Leaderboard
    ├── resources.html        # Study resources
    ├── profile.html          # Student profile
    └── admin.html            # Admin panel
```

---

## ⚙️ Step-by-Step Setup Guide

### Step 1 — Prerequisites

Make sure you have installed:

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.9+ | `python --version` |
| pip | latest | `pip --version` |
| MySQL | 8.0+ | `mysql --version` |

---

### Step 2 — Clone / Download the Project

```bash
# If using git
git clone https://github.com/yourname/placement_portal.git
cd placement_portal

# Or just cd into the folder
cd placement_portal
```

---

### Step 3 — Create a Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate

# On macOS / Linux:
source venv/bin/activate
```

---

### Step 4 — Install Python Dependencies

```bash
pip install -r requirements.txt
```

Expected output: Flask, PyMySQL, bcrypt, python-dotenv all installed.

---

### Step 5 — Set Up MySQL Database

**5a. Log into MySQL:**

```bash
mysql -u root -p
```

**5b. Run the schema file:**

```sql
SOURCE /full/path/to/placement_portal/database/schema.sql;
```

Or from outside MySQL:

```bash
mysql -u root -p < database/schema.sql
```

This will:
- Create the `placement_portal` database
- Create all 10 tables
- Insert seed data (19 aptitude questions, 8 coding challenges, 10 interview questions, 8 resources)
- Create the admin account

---

### Step 6 — Configure Environment Variables

Copy the example env file and edit it with your real credentials:

```bash
# macOS / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Then edit `.env` in the project root:

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_actual_mysql_password
MYSQL_DB=placement_portal
SECRET_KEY=any-long-random-string-here
FLASK_ENV=development
FLASK_DEBUG=1
```

> **Important:** Replace `your_actual_mysql_password` with your real MySQL root password.
> The `.env` file is in `.gitignore` and will **not** be uploaded to GitHub — keep your real password local only.

---

### Step 7 — Run the Application

```bash
python app.py
```

You should see:

```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

Open your browser and visit: **http://localhost:5000**

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@placeprep.com | admin123 |
| Student | Register a new account | – |

> The admin password is bcrypt-hashed in the database. To reset it, run the schema again or update directly.

---

## 🗂️ All Pages & Routes

| URL | Page | Access |
|-----|------|--------|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/signup` | Sign Up | Public |
| `/dashboard` | Student Dashboard | Student |
| `/aptitude` | Aptitude Tests | Student |
| `/coding` | Coding Practice | Student |
| `/resume` | Resume Analyzer | Student |
| `/interview` | Mock Interviews | Student |
| `/progress` | Progress Analytics | Student |
| `/leaderboard` | Leaderboard | Student |
| `/resources` | Study Resources | Student |
| `/profile` | My Profile | Student |
| `/admin` | Admin Panel | Admin only |

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signup` | Register new student |
| POST | `/api/login` | Login |
| POST | `/api/logout` | Logout |
| GET | `/api/me` | Current user info |
| POST | `/api/profile/update` | Update profile |
| POST | `/api/profile/password` | Change password |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | All dashboard statistics |

### Aptitude
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/aptitude/questions?category=X&limit=N` | Get questions |
| POST | `/api/aptitude/submit` | Submit test answers |
| GET | `/api/aptitude/history` | Past test results |

### Coding
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/coding/challenges` | List all challenges |
| GET | `/api/coding/challenge/<id>` | Single challenge detail |
| POST | `/api/coding/submit` | Submit code |
| GET | `/api/coding/submissions/<id>` | Submission history |

### Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/analyze` | Analyze resume text |
| GET | `/api/resume/history` | Past analyses |

### Interview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interview/questions?type=X&limit=N` | Get questions |
| POST | `/api/interview/submit` | Submit session |
| GET | `/api/interview/history` | Past sessions |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress/overview` | Analytics data |

### Leaderboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Rankings + my rank |

### Resources
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resources?category=X` | Filtered resources |

### Admin (admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users?page=N` | Paginated user list |
| POST | `/api/admin/user/<id>/toggle` | Block/unblock user |
| GET | `/api/admin/questions` | All aptitude questions |
| POST | `/api/admin/questions/add` | Add question |
| DELETE | `/api/admin/questions/<id>` | Delete question |
| POST | `/api/admin/challenges/add` | Add coding challenge |
| POST | `/api/admin/announcements` | Send announcement |

---

## 🎨 Design Features

- **Dark / Light mode** toggle (persisted in localStorage)
- **Responsive design** — works on mobile, tablet, desktop
- **Syne font** for headings, **DM Sans** for body text
- **CSS variables** for full theme support
- **Smooth animations** — fadeIn, scaleIn, slideIn on page transitions
- **Toast notifications** for all API actions
- **Sticky sidebar** with active link highlighting
- **Mobile hamburger** menu with overlay

---

## 🧩 Feature Details

### Aptitude Test Engine
- Fetches random questions per category from MySQL
- 1-minute-per-question countdown timer
- Question navigation (prev/next) with answer persistence
- Colour-coded options on result (green=correct, red=wrong)
- Full explanation review after submission
- Results saved to DB; contributes to leaderboard score

### Coding Practice
- List view with difficulty filter (Easy / Medium / Hard)
- Split-panel problem view + code editor
- Language switcher (Python, Java, C++, JavaScript)
- Starter code templates per language
- Submission history per problem per user

### Resume Analyzer
- Paste text or drag-and-drop file upload
- Scans 60+ skills across 5 technology groups
- Section completeness checklist (7 sections)
- ATS score calculation
- Personalised improvement suggestions
- Analysis history

### Mock Interviews
- Technical & HR question banks (10 questions each)
- 5-question randomised sessions
- Sample answer reveal toggle
- Session scoring (completeness check)
- Performance feedback message
- Session history

### Leaderboard
- Composite score = aptitude % sum + problems×10 + sessions×5
- Auto-recalculated on every submission
- Podium display for top 3
- My rank callout with highlight row

### Admin Panel
- 5 tabs: Overview · Students · Questions · Challenges · Analytics
- Block/unblock students
- Add/delete aptitude questions
- Add coding challenges
- Score distribution and module usage charts
- Platform health indicators
- Announcement system

---

## 🔧 Troubleshooting

**"Access denied for user 'root'@'localhost'"**
→ Wrong MySQL password in `.env`. Double-check `MYSQL_PASSWORD`.

**"No module named 'flask'"**
→ Virtual environment not activated. Run `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows).

**"Table 'placement_portal.users' doesn't exist"**
→ Schema not imported. Run `mysql -u root -p < database/schema.sql`.

**Port 5000 already in use**
→ Change port: `app.run(port=5001)` in `app.py`, then visit `http://localhost:5001`.

**"ERROR 1366 (HY000): Incorrect integer value"**
→ MySQL strict mode. Add `SET GLOBAL sql_mode = '';` before running schema, or use MySQL 5.7 compatible mode.

**Admin password not working**
→ The seed SQL contains a bcrypt hash. If it doesn't match, register a new account and manually set `role='admin'` in MySQL:
```sql
USE placement_portal;
UPDATE users SET role='admin' WHERE email='admin@placeprep.com';
```

---

## 🚀 Production Deployment Checklist

- [ ] Set `FLASK_DEBUG=0` in `.env`
- [ ] Use a proper `SECRET_KEY` (32+ random characters)
- [ ] Use `gunicorn` instead of Flask dev server: `gunicorn -w 4 app:app`
- [ ] Set up Nginx as a reverse proxy
- [ ] Use MySQL connection pooling (replace PyMySQL with SQLAlchemy + pool)
- [ ] Store uploaded files in cloud storage (S3/GCS) not local disk
- [ ] Enable HTTPS (Let's Encrypt / Certbot)
- [ ] Set up automated MySQL backups
- [ ] Use environment variables from system, not `.env` file

---

## 📦 Dependencies

```
Flask==3.0.3           # Web framework
Flask-Session==0.8.0   # Server-side sessions
Flask-CORS==4.0.1      # Cross-origin requests
PyMySQL==1.1.1         # MySQL connector
bcrypt==4.1.3          # Password hashing
python-dotenv==1.0.1   # .env file support
Werkzeug==3.0.3        # WSGI utilities
```

---

*PlacePrep Portal v2.0 — Built with Flask + MySQL + Vanilla JS*
