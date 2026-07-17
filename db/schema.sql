-- 班級網頁 資料庫結構 (PostgreSQL / Neon)

-- 目前帶的班級；同一時間只會有一列（沒有列 = 老師還沒建班）。
-- 班級畢業時整批清空重來，不保留歷史班級紀錄。
CREATE TABLE class_info (
  id           serial PRIMARY KEY,
  grade        integer NOT NULL,
  class_number integer NOT NULL
);

CREATE TABLE students (
  id      serial PRIMARY KEY,
  seat_no integer NOT NULL UNIQUE,
  name    text NOT NULL DEFAULT '',
  active  boolean NOT NULL DEFAULT true
);

CREATE TABLE daily_notes (
  id   serial PRIMARY KEY,
  date date NOT NULL,
  text text NOT NULL,
  seq  integer NOT NULL
);
CREATE INDEX idx_daily_notes_date ON daily_notes(date);

CREATE TABLE attendance_records (
  date       date NOT NULL,
  student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status     smallint NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 3), -- 0=未 1=到 2=缺 3=假
  PRIMARY KEY (date, student_id)
);

CREATE TABLE assignments (
  id   serial PRIMARY KEY,
  date date NOT NULL,
  name text NOT NULL,
  seq  integer NOT NULL
);
CREATE INDEX idx_assignments_date ON assignments(date);

CREATE TABLE homework_submissions (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  missing       boolean NOT NULL DEFAULT false, -- true = 缺交
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE teachers (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

CREATE TABLE parents (
  id            serial PRIMARY KEY,
  student_id    integer NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

-- 老師產生連結給家長自行註冊用；一個學生同時只有一組有效邀請碼，
-- 註冊成功後就刪掉（一次性）。
CREATE TABLE parent_invites (
  id         serial PRIMARY KEY,
  student_id integer NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE
);

-- 登入速率限制用；共用資料庫是為了在多台/多個 process 的部署環境下
-- 仍然算同一個計數（記憶體內計數在那種環境下每個 process 各算各的，不準）
CREATE TABLE login_attempts (
  id           serial PRIMARY KEY,
  ip           text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, attempted_at);
