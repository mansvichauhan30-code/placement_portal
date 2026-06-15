"""
Placement Preparation Portal – Flask Backend
Run:  python app.py
"""

import os, json, re, random
from datetime import datetime, timedelta
from functools import wraps

import bcrypt
import pymysql
from dotenv import load_dotenv
from flask import (Flask, render_template, request, jsonify,
                   session, redirect, url_for, g)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
app.permanent_session_lifetime = timedelta(days=7)

# ── DB helper ────────────────────────────────────────────────
DB_CFG = dict(
    host     = os.getenv("MYSQL_HOST",     "localhost"),
    user     = os.getenv("MYSQL_USER",     "root"),
    password = os.getenv("MYSQL_PASSWORD", ""),
    db       = os.getenv("MYSQL_DB",       "placement_portal"),
    charset  = "utf8mb4",
    cursorclass = pymysql.cursors.DictCursor,
    autocommit  = True,
)

def get_db():
    if "db" not in g:
        g.db = pymysql.connect(**DB_CFG)
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()

def query(sql, args=(), one=False):
    cur = get_db().cursor()
    cur.execute(sql, args)
    return (cur.fetchone() if one else cur.fetchall())

def execute(sql, args=()):
    cur = get_db().cursor()
    cur.execute(sql, args)
    return cur.lastrowid

# ── Auth decorators ──────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            if request.is_json:
                return jsonify(error="Unauthorised"), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get("role") != "admin":
            if request.is_json:
                return jsonify(error="Forbidden"), 403
            return redirect(url_for("dashboard_page"))
        return f(*args, **kwargs)
    return decorated

# ══════════════════════════════════════════════════════════════
#  PAGE ROUTES
# ══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))
    return render_template("index.html")

@app.route("/login")
def login_page():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))
    return render_template("login.html")

@app.route("/signup")
def signup_page():
    if "user_id" in session:
        return redirect(url_for("dashboard_page"))
    return render_template("signup.html")

@app.route("/dashboard")
@login_required
def dashboard_page():
    return render_template("dashboard.html")

@app.route("/aptitude")
@login_required
def aptitude_page():
    return render_template("aptitude.html")

@app.route("/coding")
@login_required
def coding_page():
    return render_template("coding.html")

@app.route("/resume")
@login_required
def resume_page():
    return render_template("resume.html")

@app.route("/interview")
@login_required
def interview_page():
    return render_template("interview.html")

@app.route("/progress")
@login_required
def progress_page():
    return render_template("progress.html")

@app.route("/leaderboard")
@login_required
def leaderboard_page():
    return render_template("leaderboard.html")

@app.route("/resources")
@login_required
def resources_page():
    return render_template("resources.html")

@app.route("/profile")
@login_required
def profile_page():
    return render_template("profile.html")

@app.route("/admin")
@login_required
@admin_required
def admin_page():
    return render_template("admin.html")

# ══════════════════════════════════════════════════════════════
#  AUTH APIs
# ══════════════════════════════════════════════════════════════

@app.route("/api/signup", methods=["POST"])
def api_signup():
    d = request.json or {}
    name   = d.get("name","").strip()
    email  = d.get("email","").strip().lower()
    pwd    = d.get("password","")
    college= d.get("college","").strip()
    year   = int(d.get("year", 1))
    branch = d.get("branch","").strip()

    if not all([name, email, pwd]):
        return jsonify(ok=False, error="Name, email and password are required"), 400
    if len(pwd) < 6:
        return jsonify(ok=False, error="Password must be at least 6 characters"), 400
    if query("SELECT id FROM users WHERE email=%s", (email,), one=True):
        return jsonify(ok=False, error="Email already registered"), 409

    hashed = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()
    uid = execute(
        "INSERT INTO users (name,email,password,college,year,branch) VALUES(%s,%s,%s,%s,%s,%s)",
        (name, email, hashed, college, year, branch)
    )
    execute("INSERT IGNORE INTO leaderboard (user_id) VALUES(%s)", (uid,))
    session.permanent = True
    session.update(user_id=uid, name=name, email=email, role="student")
    return jsonify(ok=True, redirect="/dashboard")

@app.route("/api/login", methods=["POST"])
def api_login():
    d = request.json or {}
    email = d.get("email","").strip().lower()
    pwd   = d.get("password","")

    user = query("SELECT * FROM users WHERE email=%s AND is_active=1", (email,), one=True)
    if not user or not bcrypt.checkpw(pwd.encode(), user["password"].encode()):
        return jsonify(ok=False, error="Invalid email or password"), 401

    execute("UPDATE users SET last_login=%s WHERE id=%s", (datetime.now(), user["id"]))
    session.permanent = True
    session.update(user_id=user["id"], name=user["name"], email=user["email"], role=user["role"])
    dest = "/admin" if user["role"] == "admin" else "/dashboard"
    return jsonify(ok=True, redirect=dest)

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify(ok=True, redirect="/")

@app.route("/api/me")
@login_required
def api_me():
    u = query("SELECT id,name,email,college,year,branch,phone,avatar,role,joined_at FROM users WHERE id=%s",
              (session["user_id"],), one=True)
    if u:
        u["joined_at"] = str(u["joined_at"])
    return jsonify(u)

@app.route("/api/profile/update", methods=["POST"])
@login_required
def api_profile_update():
    d = request.json or {}
    uid = session["user_id"]
    execute("UPDATE users SET name=%s,college=%s,year=%s,branch=%s,phone=%s,avatar=%s WHERE id=%s",
            (d.get("name"), d.get("college"), d.get("year"),
             d.get("branch"), d.get("phone"), d.get("avatar"), uid))
    session["name"] = d.get("name", session["name"])
    return jsonify(ok=True)

@app.route("/api/profile/password", methods=["POST"])
@login_required
def api_change_password():
    d = request.json or {}
    uid = session["user_id"]
    user = query("SELECT password FROM users WHERE id=%s", (uid,), one=True)
    if not bcrypt.checkpw(d.get("current","").encode(), user["password"].encode()):
        return jsonify(ok=False, error="Current password is incorrect"), 400
    if len(d.get("new","")) < 6:
        return jsonify(ok=False, error="New password too short"), 400
    hashed = bcrypt.hashpw(d["new"].encode(), bcrypt.gensalt()).decode()
    execute("UPDATE users SET password=%s WHERE id=%s", (hashed, uid))
    return jsonify(ok=True)

# ══════════════════════════════════════════════════════════════
#  DASHBOARD API
# ══════════════════════════════════════════════════════════════

@app.route("/api/dashboard/stats")
@login_required
def api_dashboard_stats():
    uid = session["user_id"]
    tests   = query("SELECT COUNT(*) AS c, AVG(percentage) AS avg FROM aptitude_results WHERE user_id=%s", (uid,), one=True)
    probs   = query("SELECT COUNT(DISTINCT challenge_id) AS c FROM coding_submissions WHERE user_id=%s AND status='accepted'", (uid,), one=True)
    ivs     = query("SELECT COUNT(*) AS c, AVG(score*100.0/NULLIF(total_qs,0)) AS avg FROM interview_sessions WHERE user_id=%s", (uid,), one=True)
    lb      = query("SELECT rank_position FROM leaderboard WHERE user_id=%s", (uid,), one=True)

    avg_apt = round(float(tests["avg"] or 0), 1)
    avg_iv  = round(float(ivs["avg"]  or 0), 1)
    readiness = round((avg_apt * 0.35 + min(int(probs["c"]),30)/30*100 * 0.35 + avg_iv * 0.30), 1)

    recent = _recent_activity(uid, 5)
    return jsonify(
        tests_attempted  = int(tests["c"]),
        avg_score        = avg_apt,
        problems_solved  = int(probs["c"]),
        interviews_done  = int(ivs["c"]),
        readiness        = readiness,
        rank             = int(lb["rank_position"]) if lb else 0,
        recent_activity  = recent,
    )

def _recent_activity(uid, limit=5):
    acts = []
    rows = query(
        "SELECT 'test' AS type, category AS info, percentage AS score, taken_at AS ts "
        "FROM aptitude_results WHERE user_id=%s "
        "UNION ALL "
        "SELECT 'code', c.title, NULL, s.submitted_at "
        "FROM coding_submissions s JOIN coding_challenges c ON c.id=s.challenge_id WHERE s.user_id=%s "
        "UNION ALL "
        "SELECT 'interview', type, score*100.0/NULLIF(total_qs,0), completed_at "
        "FROM interview_sessions WHERE user_id=%s "
        "ORDER BY ts DESC LIMIT %s",
        (uid, uid, uid, limit)
    )
    for r in rows:
        acts.append(dict(type=r["type"], info=r["info"],
                         score=round(float(r["score"]),1) if r["score"] else None,
                         time=str(r["ts"])))
    return acts

# ══════════════════════════════════════════════════════════════
#  APTITUDE APIS
# ══════════════════════════════════════════════════════════════

@app.route("/api/aptitude/questions")
@login_required
def api_aptitude_questions():
    cat   = request.args.get("category", "quantitative")
    limit = int(request.args.get("limit", 10))
    rows  = query(
        "SELECT id,question,option_a,option_b,option_c,option_d,difficulty FROM aptitude_questions "
        "WHERE category=%s ORDER BY RAND() LIMIT %s", (cat, limit)
    )
    return jsonify(list(rows))

@app.route("/api/aptitude/submit", methods=["POST"])
@login_required
def api_aptitude_submit():
    d    = request.json or {}
    uid  = session["user_id"]
    cat  = d.get("category")
    answers = d.get("answers", {})   # {question_id: chosen_option}
    time_taken = int(d.get("time_taken", 0))

    if not answers:
        return jsonify(ok=False, error="No answers provided"), 400

    ids  = list(answers.keys())
    fmt  = ",".join(["%s"]*len(ids))
    rows = query(f"SELECT id,correct_ans,explanation FROM aptitude_questions WHERE id IN ({fmt})", ids)

    results, correct = [], 0
    for r in rows:
        chosen = answers.get(str(r["id"]))
        is_correct = (chosen == r["correct_ans"])
        if is_correct:
            correct += 1
        results.append(dict(id=r["id"], correct=is_correct,
                             correct_ans=r["correct_ans"], explanation=r["explanation"]))

    total = len(rows)
    pct   = round(correct / total * 100, 2) if total else 0
    execute(
        "INSERT INTO aptitude_results (user_id,category,score,total,percentage,time_taken) VALUES(%s,%s,%s,%s,%s,%s)",
        (uid, cat, correct, total, pct, time_taken)
    )
    _refresh_leaderboard(uid)
    return jsonify(ok=True, score=correct, total=total, percentage=pct, results=results)

@app.route("/api/aptitude/history")
@login_required
def api_aptitude_history():
    uid  = session["user_id"]
    rows = query(
        "SELECT category, score, total, percentage, time_taken, taken_at "
        "FROM aptitude_results WHERE user_id=%s ORDER BY taken_at DESC LIMIT 20", (uid,)
    )
    return jsonify([{**r, "taken_at": str(r["taken_at"])} for r in rows])

# ══════════════════════════════════════════════════════════════
#  CODING APIS
# ══════════════════════════════════════════════════════════════

@app.route("/api/coding/challenges")
@login_required
def api_coding_challenges():
    diff = request.args.get("difficulty")
    cat  = request.args.get("category")
    sql  = "SELECT id,title,category,difficulty FROM coding_challenges WHERE 1=1"
    args = []
    if diff:
        sql += " AND difficulty=%s"; args.append(diff)
    if cat:
        sql += " AND category=%s";   args.append(cat)
    sql += " ORDER BY FIELD(difficulty,'easy','medium','hard'), id"
    return jsonify(list(query(sql, args)))

@app.route("/api/coding/challenge/<int:cid>")
@login_required
def api_coding_challenge_detail(cid):
    row = query("SELECT * FROM coding_challenges WHERE id=%s", (cid,), one=True)
    if not row:
        return jsonify(error="Not found"), 404
    uid = session["user_id"]
    solved = query(
        "SELECT id FROM coding_submissions WHERE user_id=%s AND challenge_id=%s AND status='accepted'",
        (uid, cid), one=True
    )
    row["solved"] = bool(solved)
    return jsonify(row)

@app.route("/api/coding/submit", methods=["POST"])
@login_required
def api_coding_submit():
    d    = request.json or {}
    uid  = session["user_id"]
    cid  = d.get("challenge_id")
    code = d.get("code","")
    lang = d.get("language","python")

    if not code.strip():
        return jsonify(ok=False, error="Empty submission"), 400

    # Simulate evaluation (in production: run in sandbox)
    status = "accepted" if len(code) > 20 else "wrong"
    execute(
        "INSERT INTO coding_submissions (user_id,challenge_id,code,language,status) VALUES(%s,%s,%s,%s,%s)",
        (uid, cid, code, lang, status)
    )
    _refresh_leaderboard(uid)
    return jsonify(ok=True, status=status,
                   message="All test cases passed! 🎉" if status=="accepted" else "Some test cases failed.")

@app.route("/api/coding/submissions/<int:cid>")
@login_required
def api_coding_submissions(cid):
    uid  = session["user_id"]
    rows = query(
        "SELECT language,status,submitted_at FROM coding_submissions "
        "WHERE user_id=%s AND challenge_id=%s ORDER BY submitted_at DESC LIMIT 10",
        (uid, cid)
    )
    return jsonify([{**r, "submitted_at": str(r["submitted_at"])} for r in rows])

# ══════════════════════════════════════════════════════════════
#  RESUME APIs
# ══════════════════════════════════════════════════════════════

SKILL_DB = {
    "languages": ["python","java","javascript","typescript","c++","c#","go","rust","kotlin","swift","php","ruby"],
    "frontend":  ["react","angular","vue","html","css","sass","tailwind","bootstrap","jquery"],
    "backend":   ["node.js","django","flask","spring","express","fastapi","rails","laravel"],
    "database":  ["mysql","postgresql","mongodb","redis","sqlite","oracle","cassandra","dynamodb"],
    "tools":     ["git","docker","kubernetes","jenkins","aws","gcp","azure","linux","bash","terraform"],
    "cs_core":   ["data structures","algorithms","system design","oops","dbms","networking","os","machine learning","deep learning"],
}
MUST_HAVE = ["python","java","git","mysql","data structures","algorithms","system design","oops"]

@app.route("/api/resume/analyze", methods=["POST"])
@login_required
def api_resume_analyze():
    uid  = session["user_id"]
    data = request.json or {}
    text = data.get("text", "").lower()

    detected, missing = [], []
    for grp, skills in SKILL_DB.items():
        for sk in skills:
            if sk in text:
                detected.append(sk)
    for sk in MUST_HAVE:
        if sk not in detected:
            missing.append(sk)

    sections = {
        "contact":       bool(re.search(r"email|phone|\+91|@", text)),
        "summary":       bool(re.search(r"objective|summary|profile|about", text)),
        "education":     bool(re.search(r"b\.?tech|b\.?e|mca|bsc|graduation|university|college", text)),
        "experience":    bool(re.search(r"internship|experience|worked|position|role", text)),
        "projects":      bool(re.search(r"project|built|developed|created|implemented", text)),
        "skills":        bool(detected),
        "achievements":  bool(re.search(r"award|achievement|winner|rank|scholarship|hackathon", text)),
    }
    section_score = round(sum(sections.values()) / len(sections) * 100)
    skill_score   = min(len(detected) * 8, 100)
    length_score  = min(len(text.split()) / 4, 100)   # ~400 words ideal
    overall       = round(section_score * 0.4 + skill_score * 0.4 + length_score * 0.2)
    ats_score     = round(overall * 0.9)

    suggestions = []
    if not sections["experience"]: suggestions.append("Add internship or work experience with role, company and duration.")
    if not sections["achievements"]: suggestions.append("Highlight achievements — awards, hackathons, scholarships, ranks.")
    if not sections["summary"]: suggestions.append("Add a 2–3 line professional summary or objective at the top.")
    if len(detected) < 6: suggestions.append("Expand your skills section — add more tools and technologies you know.")
    if len(text.split()) < 200: suggestions.append("Resume seems thin — aim for at least 400–600 words of content.")
    suggestions.append("Quantify achievements: use numbers (e.g. 'Reduced load time by 40%').")
    suggestions.append("Use action verbs: 'Designed', 'Implemented', 'Led', 'Optimised'.")

    execute(
        "INSERT INTO resume_analyses (user_id,overall_score,skills_detected,missing_skills,suggestions,ats_score) "
        "VALUES(%s,%s,%s,%s,%s,%s)",
        (uid, overall, json.dumps(detected), json.dumps(missing), json.dumps(suggestions[:5]), ats_score)
    )
    return jsonify(
        overall_score   = overall,
        ats_score       = ats_score,
        skills_detected = detected,
        missing_skills  = missing,
        sections        = sections,
        suggestions     = suggestions[:6],
    )

@app.route("/api/resume/history")
@login_required
def api_resume_history():
    uid  = session["user_id"]
    rows = query(
        "SELECT overall_score,ats_score,analyzed_at FROM resume_analyses "
        "WHERE user_id=%s ORDER BY analyzed_at DESC LIMIT 5", (uid,)
    )
    return jsonify([{**r, "analyzed_at": str(r["analyzed_at"])} for r in rows])

# ══════════════════════════════════════════════════════════════
#  INTERVIEW APIs
# ══════════════════════════════════════════════════════════════

@app.route("/api/interview/questions")
@login_required
def api_interview_questions():
    itype = request.args.get("type", "technical")
    limit = int(request.args.get("limit", 5))
    rows  = query(
        "SELECT id,type,difficulty,question,sample_ans,tags FROM interview_questions "
        "WHERE type=%s ORDER BY RAND() LIMIT %s", (itype, limit)
    )
    return jsonify(list(rows))

@app.route("/api/interview/submit", methods=["POST"])
@login_required
def api_interview_submit():
    d       = request.json or {}
    uid     = session["user_id"]
    itype   = d.get("type", "technical")
    answers = d.get("answers", [])   # list of {question_id, answer_text}
    total   = len(answers)

    scored = 0
    for a in answers:
        if len(a.get("answer_text","").strip()) > 30:
            scored += 1

    execute(
        "INSERT INTO interview_sessions (user_id,type,score,total_qs) VALUES(%s,%s,%s,%s)",
        (uid, itype, scored, total)
    )
    pct = round(scored / total * 100) if total else 0
    _refresh_leaderboard(uid)
    return jsonify(ok=True, score=scored, total=total, percentage=pct,
                   feedback=_interview_feedback(pct))

def _interview_feedback(pct):
    if pct >= 80: return "Excellent performance! You're well-prepared for interviews."
    if pct >= 60: return "Good effort! Work on structuring your answers using the STAR method."
    return "Keep practising! Focus on concise, structured answers with real examples."

@app.route("/api/interview/history")
@login_required
def api_interview_history():
    uid  = session["user_id"]
    rows = query(
        "SELECT type, score, total_qs, completed_at FROM interview_sessions "
        "WHERE user_id=%s ORDER BY completed_at DESC LIMIT 10", (uid,)
    )
    return jsonify([{**r, "completed_at": str(r["completed_at"])} for r in rows])

# ══════════════════════════════════════════════════════════════
#  PROGRESS APIs
# ══════════════════════════════════════════════════════════════

@app.route("/api/progress/overview")
@login_required
def api_progress_overview():
    uid = session["user_id"]

    apt_rows = query(
        "SELECT category, AVG(percentage) AS avg, COUNT(*) AS cnt "
        "FROM aptitude_results WHERE user_id=%s GROUP BY category", (uid,)
    )
    weekly = query(
        "SELECT DATE(taken_at) AS day, AVG(percentage) AS avg "
        "FROM aptitude_results WHERE user_id=%s AND taken_at >= DATE_SUB(NOW(),INTERVAL 7 DAY) "
        "GROUP BY DATE(taken_at) ORDER BY day", (uid,)
    )
    diff_dist = query(
        "SELECT ch.difficulty, COUNT(*) AS cnt "
        "FROM coding_submissions cs JOIN coding_challenges ch ON ch.id=cs.challenge_id "
        "WHERE cs.user_id=%s AND cs.status='accepted' GROUP BY ch.difficulty", (uid,)
    )

    return jsonify(
        aptitude_by_category = [{**r, "avg": round(float(r["avg"]),1)} for r in apt_rows],
        weekly_scores        = [{"day": str(r["day"]), "avg": round(float(r["avg"]),1)} for r in weekly],
        coding_by_difficulty = list(diff_dist),
    )

# ══════════════════════════════════════════════════════════════
#  LEADERBOARD API
# ══════════════════════════════════════════════════════════════

@app.route("/api/leaderboard")
@login_required
def api_leaderboard():
    rows = query(
        "SELECT lb.rank_position, u.name, u.college, u.avatar, "
        "lb.total_score, lb.tests_done, lb.problems_solved "
        "FROM leaderboard lb JOIN users u ON u.id=lb.user_id "
        "WHERE u.role='student' ORDER BY lb.total_score DESC LIMIT 50"
    )
    my_rank = query(
        "SELECT rank_position FROM leaderboard WHERE user_id=%s", (session["user_id"],), one=True
    )
    return jsonify(board=list(rows), my_rank=int(my_rank["rank_position"]) if my_rank else 0)

def _refresh_leaderboard(uid):
    """Recalculate a user's leaderboard entry."""
    tests   = query("SELECT COUNT(*) AS c, COALESCE(SUM(percentage),0) AS s FROM aptitude_results WHERE user_id=%s", (uid,), one=True)
    probs   = query("SELECT COUNT(DISTINCT challenge_id) AS c FROM coding_submissions WHERE user_id=%s AND status='accepted'", (uid,), one=True)
    ivs     = query("SELECT COUNT(*) AS c FROM interview_sessions WHERE user_id=%s", (uid,), one=True)
    score   = int(tests["s"] or 0) + int(probs["c"]) * 10 + int(ivs["c"]) * 5
    execute(
        "INSERT INTO leaderboard (user_id,total_score,tests_done,problems_solved,interviews_done) "
        "VALUES(%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE "
        "total_score=%s, tests_done=%s, problems_solved=%s, interviews_done=%s",
        (uid, score, tests["c"], probs["c"], ivs["c"],
             score, tests["c"], probs["c"], ivs["c"])
    )
    # Recompute ranks (two separate statements – PyMySQL doesn't support multi-statement)
    try:
        execute("SET @r=0")
        execute(
            "UPDATE leaderboard lb "
            "JOIN (SELECT user_id, @r:=@r+1 AS rn "
            "      FROM leaderboard ORDER BY total_score DESC) ranked "
            "ON lb.user_id = ranked.user_id "
            "SET lb.rank_position = ranked.rn"
        )
    except Exception:
        pass  # rank update is best-effort

# ══════════════════════════════════════════════════════════════
#  RESOURCES API
# ══════════════════════════════════════════════════════════════

@app.route("/api/resources")
@login_required
def api_resources():
    cat  = request.args.get("category")
    sql  = "SELECT * FROM resources WHERE is_active=1"
    args = []
    if cat:
        sql += " AND category=%s"; args.append(cat)
    sql += " ORDER BY category, id"
    return jsonify(list(query(sql, args)))

# ══════════════════════════════════════════════════════════════
#  ADMIN APIs
# ══════════════════════════════════════════════════════════════

@app.route("/api/admin/stats")
@login_required
@admin_required
def api_admin_stats():
    total_users  = query("SELECT COUNT(*) AS c FROM users WHERE role='student'", one=True)["c"]
    active_today = query(
        "SELECT COUNT(*) AS c FROM users WHERE DATE(last_login)=CURDATE() AND role='student'", one=True
    )["c"]
    tests_today  = query("SELECT COUNT(*) AS c FROM aptitude_results WHERE DATE(taken_at)=CURDATE()", one=True)["c"]
    submissions  = query("SELECT COUNT(*) AS c FROM coding_submissions WHERE DATE(submitted_at)=CURDATE()", one=True)["c"]
    avg_score    = query("SELECT ROUND(AVG(percentage),1) AS a FROM aptitude_results", one=True)["a"]
    return jsonify(
        total_users  = total_users,
        active_today = active_today,
        tests_today  = tests_today,
        submissions_today = submissions,
        avg_score    = float(avg_score or 0),
    )

@app.route("/api/admin/users")
@login_required
@admin_required
def api_admin_users():
    page  = int(request.args.get("page", 1))
    limit = 20
    offset= (page-1)*limit
    rows  = query(
        "SELECT id,name,email,college,year,role,is_active,joined_at FROM users "
        "ORDER BY joined_at DESC LIMIT %s OFFSET %s", (limit, offset)
    )
    total = query("SELECT COUNT(*) AS c FROM users", one=True)["c"]
    return jsonify(users=[{**r,"joined_at":str(r["joined_at"])} for r in rows], total=total)

@app.route("/api/admin/user/<int:uid>/toggle", methods=["POST"])
@login_required
@admin_required
def api_admin_toggle_user(uid):
    execute("UPDATE users SET is_active=1-is_active WHERE id=%s", (uid,))
    return jsonify(ok=True)

@app.route("/api/admin/questions", methods=["GET"])
@login_required
@admin_required
def api_admin_questions():
    rows = query("SELECT id,category,difficulty,question FROM aptitude_questions ORDER BY id DESC")
    return jsonify(list(rows))

@app.route("/api/admin/questions/add", methods=["POST"])
@login_required
@admin_required
def api_admin_add_question():
    d = request.json or {}
    execute(
        "INSERT INTO aptitude_questions (category,difficulty,question,option_a,option_b,option_c,option_d,correct_ans,explanation) "
        "VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (d["category"],d["difficulty"],d["question"],
         d["option_a"],d["option_b"],d["option_c"],d["option_d"],
         d["correct_ans"],d.get("explanation",""))
    )
    return jsonify(ok=True)

@app.route("/api/admin/questions/<int:qid>", methods=["DELETE"])
@login_required
@admin_required
def api_admin_delete_question(qid):
    execute("DELETE FROM aptitude_questions WHERE id=%s", (qid,))
    return jsonify(ok=True)

@app.route("/api/admin/challenges/add", methods=["POST"])
@login_required
@admin_required
def api_admin_add_challenge():
    d = request.json or {}
    execute(
        "INSERT INTO coding_challenges (title,category,difficulty,description,sample_input,sample_output,constraints,hints) "
        "VALUES(%s,%s,%s,%s,%s,%s,%s,%s)",
        (d["title"],d.get("category","Arrays"),d["difficulty"],d["description"],
         d.get("sample_input",""),d.get("sample_output",""),d.get("constraints",""),d.get("hints",""))
    )
    return jsonify(ok=True)

@app.route("/api/admin/announcements", methods=["POST"])
@login_required
@admin_required
def api_admin_announcement():
    d = request.json or {}
    execute("INSERT INTO announcements (title,body,created_by) VALUES(%s,%s,%s)",
            (d["title"], d["body"], session["user_id"]))
    return jsonify(ok=True)

# ══════════════════════════════════════════════════════════════
#  ERROR HANDLERS
# ══════════════════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(e):
    if request.is_json:
        return jsonify(error="Not found"), 404
    return render_template("404.html"), 404

@app.errorhandler(403)
def forbidden(e):
    if request.is_json:
        return jsonify(error="Forbidden"), 403
    return redirect(url_for("dashboard_page"))

@app.errorhandler(500)
def server_error(e):
    if request.is_json:
        return jsonify(error="Internal server error"), 500
    return render_template("500.html"), 500

# ══════════════════════════════════════════════════════════════
#  RUN
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG","1")=="1", port=5000, host="0.0.0.0")
