-- 班級網頁 資料庫結構 (PostgreSQL / Neon)

-- status 是為了以後「付款才能啟用帳號」預留的掛鉤：目前預設 'active'，
-- 自助註冊馬上就能用；以後要開付款闗卡時，把新帳號預設改成 'pending'，
-- 確認付款後再把該帳號的 status 改成 'active' 即可，不用再改 schema。
CREATE TABLE teachers (
  id            serial PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active'))
);

-- 每個老師最多同時帶一個班級（teacher_id 唯一）；老師畢業班級時整批清空這個班的
-- 資料重來，不保留歷史班級紀錄。同一個 DB 可以有多個老師，各自的班級資料互不可見。
CREATE TABLE class_info (
  id           serial PRIMARY KEY,
  teacher_id   integer NOT NULL UNIQUE REFERENCES teachers(id) ON DELETE CASCADE,
  grade        integer NOT NULL,
  class_number integer NOT NULL
);

CREATE TABLE students (
  id       serial PRIMARY KEY,
  class_id integer NOT NULL REFERENCES class_info(id) ON DELETE CASCADE,
  seat_no  integer NOT NULL,
  name     text NOT NULL DEFAULT '',
  active   boolean NOT NULL DEFAULT true,
  UNIQUE (class_id, seat_no) -- 座號只需要同一班內唯一，不同班可以重複用同一個座號
);

CREATE TABLE daily_notes (
  id       serial PRIMARY KEY,
  class_id integer NOT NULL REFERENCES class_info(id) ON DELETE CASCADE,
  date     date NOT NULL,
  text     text NOT NULL,
  seq      integer NOT NULL
);
CREATE INDEX idx_daily_notes_class_date ON daily_notes(class_id, date);

CREATE TABLE attendance_records (
  date       date NOT NULL,
  student_id integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status     smallint NOT NULL DEFAULT 0 CHECK (status BETWEEN 0 AND 3), -- 0=未 1=到 2=缺 3=假
  PRIMARY KEY (date, student_id)
);

CREATE TABLE assignments (
  id       serial PRIMARY KEY,
  class_id integer NOT NULL REFERENCES class_info(id) ON DELETE CASCADE,
  date     date NOT NULL,
  name     text NOT NULL,
  seq      integer NOT NULL
);
CREATE INDEX idx_assignments_class_date ON assignments(class_id, date);

CREATE TABLE homework_submissions (
  assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    integer NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  missing       boolean NOT NULL DEFAULT false, -- true = 缺交
  PRIMARY KEY (assignment_id, student_id)
);

CREATE TABLE parents (
  id            serial PRIMARY KEY,
  student_id    integer NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

-- 老師產生連結給家長自行註冊用；一個學生同時只有一組有效邀請碼，
-- 註冊成功後就刪掉（一次性），或是超過 expires_at 就視為失效。
CREATE TABLE parent_invites (
  id         serial PRIMARY KEY,
  student_id integer NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);

-- 登入速率限制用；共用資料庫是為了在多台/多個 process 的部署環境下
-- 仍然算同一個計數（記憶體內計數在那種環境下每個 process 各算各的，不準）
CREATE TABLE login_attempts (
  id           serial PRIMARY KEY,
  ip           text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, attempted_at);
