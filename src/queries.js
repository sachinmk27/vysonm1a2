export const DROP_USERS_TABLE = "DROP TABLE IF EXISTS users";
export const DROP_TODOS_TABLE = "DROP TABLE IF EXISTS todos";
export const CREATE_USERS_TABLE = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at INT NOT NULL DEFAULT current_timestamp
)`;
export const CREATE_TODOS_TABLE = `CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT current_timestamp,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
)`;

export const UPDATE_TODO_STATUS = `UPDATE todos SET is_completed = 1 WHERE id IN (?)`;

export const FETCH_TODO_BY_USER = `SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC`;

export const ALTER_TODOS_DUE_DATE = `
  BEGIN TRANSACTION;
  ALTER TABLE todos ADD COLUMN due_date TEXT DEFAULT NULL;
  UPDATE todos SET due_date = created_at + 604800*1000;
  COMMIT;
`;
// export const ALTER_TODOS_DUE_DATE = `
//   ALTER TABLE todos ADD COLUMN due_date TEXT DEFAULT NULL;
// `;
export const ALTER_TODOS_DESCRIPTION = `ALTER TABLE todos ADD COLUMN description TEXT DEFAULT NULL`;

export const FETCH_OVERDUE_TODOS = `
SELECT * FROM todos WHERE is_completed = 0 and due_date < unixepoch()*1000 ORDER BY due_date; `;

export const DELETE_USER = `DELETE FROM users WHERE id = ?`;

export const FETCH_TODO_COUNT_BY_USER = `SELECT user_id, count(id) as count FROM todos GROUP BY user_id`;

export const FETCH_LATEST_TODO_BY_USER = `SELECT 
  users.id, users.name, todos.title, todos.created_at 
  from users inner join todos 
  on users.id = todos.user_id 
  where todos.id = 
    (select id from todos 
      where user_id = users.id 
      order by created_at desc 
      limit 1);`;

export const FETCH_LATEST_TODO_BY_USER_1 = `
  SELECT users.id, users.name, 
      latest_todos.title,
      latest_todos.due_date
    FROM users
    INNER JOIN (
      SELECT user_id, MAX(created_at),
        id, due_date, title
      FROM todos 
      GROUP BY user_id)
    AS latest_todos
    ON users.id = latest_todos.user_id
`;

export const FETCH_REPORT = `
  SELECT id, name, email, report.completed, report.not_completed FROM users 
    INNER JOIN (
      SELECT user_id, 
        SUM(is_completed) as completed,
        (COUNT(*) - SUM(is_completed)) as not_completed,
        COUNT(*) as total
      FROM todos 
      GROUP BY user_id
    ) AS report ON id = report.user_id;
`;

export const MODIFY_IS_COMPLETED_COL = `
  BEGIN TRANSACTION;
  DROP TABLE IF EXISTS new_todos;
  CREATE TABLE IF NOT EXISTS new_todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT CHECK( status in ('pending', 'in_progress', 'completed')) NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT current_timestamp,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
  );
  INSERT INTO new_todos (id, title, created_at, user_id, status)
    SELECT id, title, created_at, user_id,
      CASE
        WHEN is_completed = 0 THEN 'pending'
        ELSE 'completed'
      END as status
    FROM todos;
  DROP TABLE todos;
  ALTER TABLE new_todos RENAME TO todos;
  COMMIT;
`;

export const FETCH_TODOS_NOT_COMPLETED_LAST_7_DAYS = `
  SELECT * FROM todos WHERE status != 'completed' and created_at > (unixepoch() - 604800)*1000
`;

export const FETCH_INACTIVE_USERS_PAST_30_DAYS = `
SELECT users.id, users.name, report.total, report.completed
  FROM users 
  INNER JOIN (
    SELECT user_id, count(*) as total,
      SUM( CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM todos
      WHERE created_at > (unixepoch() - 86400*30)*1000
      GROUP BY user_id
      HAVING completed = 0
  ) as report
  ON users.id = report.user_id
`;
export default {
  DROP_USERS_TABLE,
  DROP_TODOS_TABLE,
  CREATE_USERS_TABLE,
  ALTER_TODOS_DUE_DATE,
  CREATE_TODOS_TABLE,
  FETCH_TODO_BY_USER,
  FETCH_TODO_COUNT_BY_USER,
  MODIFY_IS_COMPLETED_COL,
};
