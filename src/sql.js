const run = async (db, query, params = []) => {
  if (params && params.length > 0) {
    return new Promise((resolve, reject) => {
      db.run(query, params, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
  return new Promise((resolve, reject) => {
    db.exec(query, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

export const fetchAll = async (db, sql, params) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

export default {
  run,
  fetchAll
}