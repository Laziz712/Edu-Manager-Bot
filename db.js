const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const DEFAULTS = {
  students: [],
  teachers: [],
  courses: [],
  news: [],
  enrollments: [],
  grades: [],
  attendance: [],
  lessons: [],
};

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULTS, null, 2));
    return JSON.parse(JSON.stringify(DEFAULTS));
  }

  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

  let changed = false;
  for (const key of Object.keys(DEFAULTS)) {
    if (!Array.isArray(data[key])) {
      data[key] = [];
      changed = true;
    }
  }
  if (changed) writeDB(data);

  return data;
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };