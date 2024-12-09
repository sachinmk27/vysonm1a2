import sqlite3 from "sqlite3";
import { faker } from "@faker-js/faker";
import sql from "./sql.js";
import queries from "./queries.js";

const ONE_MILLION = 1_000_000;
const USERS_TOTAL = 100 * ONE_MILLION;
const BATCH_SIZE = 2500; //1000_000_000

sqlite3.verbose();
const db = new sqlite3.Database("my.db");
let count = 0;

function createUser() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  count += 1;
  return {
    name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName: firstName + count, lastName }),
  };
}
const sentence = faker.lorem.sentence({ min: 3, max: 8 });
function createTodo() {
  return {
    title: sentence,
  };
}

async function insertTodos(todos) {
  const values = todos.map(() => `(?, ?, ?, ?)`);
  const insertStmt = db.prepare(
    `INSERT INTO todos (title, user_id, created_at, due_date) VALUES ${values}`
  );
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`BEGIN TRANSACTION`, (err) => {
        if (err) reject(err);
      });
      insertStmt.run(
        todos
          .map((todo) => [
            todo.title,
            todo.user_id,
            todo.created_at,
            todo.due_date,
          ])
          .flat(),
        (err) => {
          if (err) reject(err);
        }
      );
      insertStmt.finalize((err) => {
        if (err) reject(err);
      });
      db.run(`COMMIT`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

async function insertUsers(users) {
  const values = users.map(() => `(?, ?)`);
  const insertStmt = db.prepare(
    `INSERT INTO users (name, email) VALUES ${values}`
  );
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`BEGIN TRANSACTION`, (err) => {
        if (err) reject();
      });
      insertStmt.run(
        users.map((user) => [user.name, user.email]).flat(),
        (err) => {
          if (err) reject(err);
        }
      );
      insertStmt.finalize((err) => {
        if (err) reject();
      });
      db.run(`COMMIT`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

async function getUsers() {
  try {
    const userIds = await sql.fetchAll(db, `SELECT id FROM users`);
    return userIds;
  } catch (err) {
    console.error(err);
  }
}

async function getTodos() {
  try {
    const todoIds = await sql.fetchAll(db, `SELECT id FROM todos`);
    return todoIds;
  } catch (err) {
    console.error(err);
  }
}

async function updateTodosStatus(isCompleted, todos) {
  const values = new Array(todos.length).fill("?").join(",");
  const updateStmt = db.prepare(
    `UPDATE todos SET is_completed = ${isCompleted} WHERE id IN (${values})`
  );
  console.log(todos);
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`BEGIN TRANSACTION`, (err) => {
        if (err) reject(err);
      });
      updateStmt.run(
        todos.map((todo) => todo.id),
        (err) => {
          if (err) reject(err);
        }
      );
      updateStmt.finalize((err) => {
        if (err) reject(err);
      });
      db.run(`COMMIT`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

async function main() {
  await sql.run(db, queries.DROP_USERS_TABLE);
  await sql.run(db, queries.DROP_TODOS_TABLE);
  await sql.run(db, queries.CREATE_USERS_TABLE);
  await sql.run(db, queries.CREATE_TODOS_TABLE);
  console.time("insert users");
  for (let i = 0; i < 10; i++) {
    const users = faker.helpers.multiple(createUser, {
      count: BATCH_SIZE,
    });
    await insertUsers(users);
    console.log(`Inserted ${i + 1}/ ${USERS_TOTAL / BATCH_SIZE}`);
  }
  console.timeEnd("insert users");
  // const userIds = await getUsers();
  await sql.run(db, queries.ALTER_TODOS_DUE_DATE);
  console.time("insert todos");
  for (let i = 0; i < (USERS_TOTAL * 10) / BATCH_SIZE; i++) {
    const todos = faker.helpers
      .multiple(createTodo, { count: BATCH_SIZE })
      .map((todo, index) => {
        return {
          ...todo,
          user_id: 1,
          created_at: faker.date.recent({ days: 45 }),
          due_date:
            index % 2 == 0
              ? faker.date.recent({ days: 20 })
              : faker.date.soon({ days: 20 }),
        };
      });
    await insertTodos(todos);
    console.log(`Inserted ${i + 1}/ ${(USERS_TOTAL * 10) / BATCH_SIZE}`);
  }
  console.timeEnd("insert todos");
  const todoIds = await getTodos();
  for (let i = 0; i < USERS_TOTAL / BATCH_SIZE; i++) {
    await updateTodosStatus(1, faker.helpers.arrayElements(todoIds, 1000));
  }
  const resp = await sql.fetchAll(
    db,
    queries.FETCH_TODO_BY_USER,
    userIds[1].id
  );
  const resp1 = await sql.fetchAll(db, queries.FETCH_TODO_COUNT_BY_USER);
  console.log(resp1);

  console.time("s");
  await sql.run(db, "SELECT * FROM todos WHERE user_id=1");
  console.timeEnd("s");
}

main();
