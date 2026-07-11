-- 預設座號 1-28 全部啟用,對應原本 classroom.html 的預設學生人數
INSERT INTO students (seat_no, active)
SELECT seat_no, true FROM generate_series(1, 28) AS seat_no;
