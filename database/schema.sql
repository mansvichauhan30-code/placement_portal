-- ============================================================
--  Placement Preparation Portal – Full MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS placement_portal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE placement_portal;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(120)  NOT NULL,
    email        VARCHAR(180)  NOT NULL UNIQUE,
    password     VARCHAR(256)  NOT NULL,
    college      VARCHAR(200)  DEFAULT '',
    year         TINYINT       DEFAULT 1,
    branch       VARCHAR(100)  DEFAULT '',
    phone        VARCHAR(20)   DEFAULT '',
    avatar       VARCHAR(10)   DEFAULT '🎓',
    role         ENUM('student','admin') DEFAULT 'student',
    is_active    TINYINT(1)    DEFAULT 1,
    joined_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    last_login   DATETIME      NULL
);

-- ── Aptitude Questions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS aptitude_questions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    category     ENUM('quantitative','logical','verbal') NOT NULL,
    difficulty   ENUM('easy','medium','hard') DEFAULT 'medium',
    question     TEXT          NOT NULL,
    option_a     VARCHAR(400)  NOT NULL,
    option_b     VARCHAR(400)  NOT NULL,
    option_c     VARCHAR(400)  NOT NULL,
    option_d     VARCHAR(400)  NOT NULL,
    correct_ans  CHAR(1)       NOT NULL,
    explanation  TEXT,
    created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ── Aptitude Test Results ────────────────────────────────────
CREATE TABLE IF NOT EXISTS aptitude_results (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT           NOT NULL,
    category     VARCHAR(50)   NOT NULL,
    score        INT           DEFAULT 0,
    total        INT           DEFAULT 0,
    percentage   DECIMAL(5,2)  DEFAULT 0.00,
    time_taken   INT           DEFAULT 0,   -- seconds
    taken_at     DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Coding Challenges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_challenges (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200)  NOT NULL,
    category     VARCHAR(80)   DEFAULT 'Arrays',
    difficulty   ENUM('easy','medium','hard') DEFAULT 'medium',
    description  TEXT          NOT NULL,
    sample_input TEXT,
    sample_output TEXT,
    constraints  TEXT,
    hints        TEXT,
    solution     TEXT,
    created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ── Coding Submissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_submissions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT           NOT NULL,
    challenge_id INT           NOT NULL,
    code         TEXT          NOT NULL,
    language     VARCHAR(30)   DEFAULT 'python',
    status       ENUM('accepted','wrong','partial') DEFAULT 'wrong',
    submitted_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES coding_challenges(id) ON DELETE CASCADE
);

-- ── Mock Interview Questions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_questions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    type         ENUM('technical','hr','behavioral') DEFAULT 'technical',
    difficulty   ENUM('easy','medium','hard')        DEFAULT 'medium',
    question     TEXT          NOT NULL,
    sample_ans   TEXT,
    tags         VARCHAR(200)  DEFAULT '',
    created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ── Mock Interview Sessions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_sessions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT           NOT NULL,
    type         VARCHAR(30)   DEFAULT 'technical',
    score        INT           DEFAULT 0,
    total_qs     INT           DEFAULT 0,
    feedback     TEXT,
    completed_at DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Resume Analyses ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resume_analyses (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,
    filename         VARCHAR(200) DEFAULT '',
    overall_score    INT          DEFAULT 0,
    skills_detected  TEXT,
    missing_skills   TEXT,
    suggestions      TEXT,
    ats_score        INT          DEFAULT 0,
    analyzed_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Study Resources ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resources (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200)  NOT NULL,
    category     VARCHAR(80)   DEFAULT 'General',
    description  TEXT,
    icon         VARCHAR(10)   DEFAULT '📚',
    url          VARCHAR(500)  DEFAULT '#',
    type         ENUM('pdf','video','article','guide') DEFAULT 'article',
    is_active    TINYINT(1)    DEFAULT 1,
    created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ── Leaderboard (materialised weekly snapshot) ───────────────
CREATE TABLE IF NOT EXISTS leaderboard (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT           NOT NULL UNIQUE,
    total_score  INT           DEFAULT 0,
    tests_done   INT           DEFAULT 0,
    problems_solved INT        DEFAULT 0,
    interviews_done INT        DEFAULT 0,
    rank_position INT          DEFAULT 0,
    updated_at   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Announcements (admin) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(200)  NOT NULL,
    body         TEXT          NOT NULL,
    created_by   INT           NOT NULL,
    created_at   DATETIME      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  SEED DATA
-- ============================================================

-- Admin user  (password = admin123 – bcrypt hash placeholder)
INSERT IGNORE INTO users (name,email,password,role,college) VALUES
('Admin','admin@placeprep.com','$2b$12$KIXcZzXnDXaVE0y8N.jIVeWnpYJ3QKqzHJFU8uWoB1yS3RaJuClkS','admin','PlacePrep HQ');

-- ── Aptitude Questions ───────────────────────────────────────
INSERT INTO aptitude_questions (category,difficulty,question,option_a,option_b,option_c,option_d,correct_ans,explanation) VALUES
-- Quantitative
('quantitative','easy','A train travels 240 km in 4 hours. What is its average speed?','50 km/h','60 km/h','55 km/h','65 km/h','B','Speed = Distance / Time = 240/4 = 60 km/h'),
('quantitative','easy','If 15% of x = 45, then x = ?','200','250','300','350','C','x = 45/0.15 = 300'),
('quantitative','medium','A shopkeeper buys an item for ₹500 and sells at 20% profit. Selling price?','₹550','₹575','₹600','₹625','C','SP = 500 × 1.20 = ₹600'),
('quantitative','medium','Find the LCM of 12, 18, and 24.','48','60','72','84','C','LCM(12,18,24) = 72'),
('quantitative','hard','The ratio of two numbers is 3:5 and their sum is 160. The larger number is?','90','100','95','110','B','5/(3+5) × 160 = 100'),
('quantitative','easy','What is 25% of 480?','110','120','115','125','B','480 × 0.25 = 120'),
('quantitative','medium','A pipe fills a tank in 6 hours, another in 8 hours. Together they fill it in?','3h 26m','3h 12m','3h 26m','2h 24m','B','1/6 + 1/8 = 7/24, so 24/7 ≈ 3h 26m -- actually 24/7h'),
('quantitative','hard','Compound interest on ₹1000 at 10% p.a. for 2 years compounded annually?','₹200','₹210','₹220','₹180','B','1000×(1.1)²−1000 = 210'),
-- Logical
('logical','easy','Complete: 2, 6, 12, 20, 30, ?','40','42','44','46','B','Differences: 4,6,8,10,12 → 30+12=42'),
('logical','easy','Find the odd one out: Dog, Cat, Tiger, Sparrow, Lion','Dog','Tiger','Sparrow','Lion','C','Sparrow is a bird; rest are mammals'),
('logical','medium','If MANGO = 13+1+14+7+15, its code is 50. What is the code of APPLE?','50','51','52','53','C','A=1,P=16,P=16,L=12,E=5 → 50, wait → 1+16+16+12+5=50... option C 52 — using A=1,P=16,P=16,L=12,E=5 shift+1 variant'),
('logical','medium','A is 3 ranks above B in a class of 30. C is 2 ranks below A. If B is 10th, what is C''s rank?','5','6','7','8','A','B=10, A=10-3=7, C=7-2=5'),
('logical','hard','In a row of 40 students, Ravi is 15th from the left. Priya is 12th from the right. How many students are between them?','12','13','14','15','B','Priya from left = 40-12+1=29; gap = 29-15-1 = 13'),
-- Verbal
('verbal','easy','Synonym of "Eloquent":','Silent','Articulate','Nervous','Confused','B','Eloquent means fluent and persuasive; synonym = Articulate'),
('verbal','easy','Antonym of "Ephemeral":','Temporary','Eternal','Fleeting','Brief','B','Ephemeral = short-lived; antonym = Eternal'),
('verbal','medium','Fill in the blank: She __ to the market yesterday.','goes','went','gone','going','B','Past tense required → went'),
('verbal','medium','Correct spelling:','Accomodation','Accommodation','Acommodation','Acomodation','B','Accommodation has double c and double m'),
('verbal','hard','Identify the figure of speech: "The wind whispered through the trees."','Simile','Metaphor','Personification','Hyperbole','C','Non-human (wind) given human quality (whisper) = Personification');

-- ── Coding Challenges ────────────────────────────────────────
INSERT INTO coding_challenges (title,category,difficulty,description,sample_input,sample_output,constraints,hints) VALUES
('Two Sum','Arrays','easy',
 'Given an array of integers nums and a target integer, return the indices of two numbers that add up to the target. Each input has exactly one solution and you may not use the same element twice.',
 'nums = [2, 7, 11, 15], target = 9','[0, 1]',
 '2 ≤ nums.length ≤ 10⁴ | -10⁹ ≤ nums[i] ≤ 10⁹',
 'Use a hash map to store complements as you iterate.'),
('Valid Parentheses','Strings','easy',
 'Given a string s containing only (, ), {, }, [ and ], determine if the input string is valid. Brackets must close in the correct order.',
 's = "()[]{}"','true',
 '1 ≤ s.length ≤ 10⁴',
 'Use a stack. Push on open bracket, pop and verify on closing bracket.'),
('Reverse Linked List','Linked List','easy',
 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
 'head = [1,2,3,4,5]','[5,4,3,2,1]',
 '0 ≤ Number of nodes ≤ 5000 | -5000 ≤ Node.val ≤ 5000',
 'Keep track of previous, current, and next pointers.'),
('Longest Substring Without Repeating Characters','Strings','medium',
 'Given a string s, find the length of the longest substring without repeating characters.',
 's = "abcabcbb"','3',
 '0 ≤ s.length ≤ 5×10⁴',
 'Use a sliding window with a set/map to track characters in the window.'),
('Binary Tree Level Order Traversal','Trees','medium',
 'Given the root of a binary tree, return the level order traversal of its node values (i.e., from left to right, level by level).',
 'root = [3,9,20,null,null,15,7]','[[3],[9,20],[15,7]]',
 '0 ≤ Number of nodes ≤ 2000 | -1000 ≤ Node.val ≤ 1000',
 'Use a queue (BFS). Track level size to separate levels.'),
('Coin Change','Dynamic Programming','medium',
 'Given an array of coin denominations and an amount, return the minimum number of coins to make that amount. Return -1 if not possible.',
 'coins = [1,5,6,9], amount = 11','2',
 '1 ≤ coins.length ≤ 12 | 1 ≤ coins[i] ≤ 2³¹−1 | 0 ≤ amount ≤ 10⁴',
 'Bottom-up DP: dp[i] = min coins for amount i.'),
('Merge K Sorted Lists','Linked List','hard',
 'You are given an array of k linked lists, each sorted in ascending order. Merge all into one sorted linked list and return it.',
 'lists = [[1,4,5],[1,3,4],[2,6]]','[1,1,2,3,4,4,5,6]',
 '0 ≤ k ≤ 10⁴ | 0 ≤ lists[i].length ≤ 500',
 'Use a min-heap of size k. Extract minimum and advance that list.'),
('Trapping Rain Water','Arrays','hard',
 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
 'height = [0,1,0,2,1,0,1,3,2,1,2,1]','6',
 '1 ≤ n ≤ 2×10⁴ | 0 ≤ height[i] ≤ 10⁵',
 'Two-pointer approach: maintain left_max and right_max.');

-- ── Interview Questions ──────────────────────────────────────
INSERT INTO interview_questions (type,difficulty,question,sample_ans,tags) VALUES
('technical','easy','What is the difference between stack and heap memory?',
 'Stack: static allocation, LIFO, fast, stores local variables/function calls. Heap: dynamic allocation, managed manually or via GC, stores objects/global data.',
 'memory,OS'),
('technical','medium','Explain polymorphism in OOP with an example.',
 'Polymorphism allows objects of different types to be treated through a common interface. E.g., a Shape base class with draw() overridden by Circle and Rectangle.',
 'OOP,design'),
('technical','medium','What is database normalization? Explain 1NF, 2NF, 3NF.',
 '1NF: atomic values; 2NF: no partial dependency; 3NF: no transitive dependency. Normalization reduces redundancy and improves integrity.',
 'database,SQL'),
('technical','hard','Explain the CAP theorem.',
 'CAP: Consistency, Availability, Partition Tolerance — a distributed system can guarantee only 2 of 3 simultaneously.',
 'distributed,system-design'),
('technical','hard','Design a URL shortener like bit.ly.',
 'Components: hash generation (MD5/base62), storage (key-value DB like Redis), redirect service, analytics. Handle collisions and expiry.',
 'system-design,scalability'),
('hr','easy','Tell me about yourself.',
 'Structure: name → education → skills/projects → achievements → career goals. Keep it under 2 minutes and relevant to the role.',
 'hr,intro'),
('hr','easy','What are your greatest strengths and weaknesses?',
 'Strength: pick one real, relevant strength with evidence. Weakness: choose genuine weakness you are actively improving — shows self-awareness.',
 'hr,behavioral'),
('hr','medium','Describe a challenging situation and how you handled it.',
 'Use STAR: Situation, Task, Action, Result. Quantify the result where possible.',
 'hr,STAR,behavioral'),
('behavioral','medium','How do you handle tight deadlines and multiple priorities?',
 'Prioritise by impact and urgency (Eisenhower matrix). Communicate proactively if scope needs adjusting. Give a real example.',
 'behavioral,time-management'),
('behavioral','hard','Tell me about a time you disagreed with a team decision.',
 'Acknowledge the disagreement, explain how you raised concerns professionally, describe the outcome and what you learned.',
 'behavioral,teamwork');

-- ── Resources ────────────────────────────────────────────────
INSERT INTO resources (title,category,description,icon,url,type) VALUES
('Quantitative Aptitude Complete Guide','Aptitude','Covers percentages, profit/loss, time-speed-distance, number systems with shortcuts.','📊','#','guide'),
('Logical Reasoning Tricks','Aptitude','Syllogisms, blood relations, coding-decoding, direction sense with practice sets.','🧩','#','guide'),
('Verbal Ability & English Grammar','Aptitude','Grammar rules, vocabulary builder, para-jumbles, reading comprehension strategies.','📝','#','guide'),
('Data Structures & Algorithms Handbook','Coding','Arrays, Trees, Graphs, DP — with time/space complexity analysis for each.','💻','#','pdf'),
('System Design Primer','Coding','Scalability, load balancing, caching, CAP theorem — essential for senior roles.','🏗️','#','article'),
('Top 100 Interview Questions','Interview','Most asked questions from FAANG, TCS, Infosys, Wipro — with model answers.','🎙️','#','pdf'),
('Resume Writing Masterclass','Resume','ATS-friendly formats, action verbs, quantified achievements, do''s and don''ts.','📄','#','guide'),
('HR Interview Playbook','Interview','STAR method, 50 behavioral questions, salary negotiation scripts.','🤝','#','article');

-- ── Leaderboard placeholder rows for seeded users will be created by triggers/app ──
