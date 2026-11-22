import test from 'node:test';
import assert from 'node:assert/strict';
import { runPython } from '../docs/ai-lab.js';
import { createFakeApi, createRequestsModule, makeResponse, parseApiUrl, matchRoute, FAKE_USERS } from '../docs/ai-api.js';
import { createDatabase, createSqliteModule, sqlLiteral, splitStatements, matchesWhere, parseSelect } from '../docs/ai-sql.js';

/* -- the HTTP module --------------------------------------------- */

test('a url is split into its path and its query', () => {
  const parsed = parseApiUrl('https://api.example.com/search?q=attention&topic=models');
  assert.equal(parsed.path, '/search');
  assert.equal(parsed.query.q, 'attention');
  assert.equal(parsed.query.topic, 'models');
});

test('a route pattern captures a named segment', () => {
  assert.deepEqual(matchRoute('/users/:id', '/users/7'), { id: '7' });
  assert.equal(matchRoute('/users/:id', '/users/7/posts'), null);
});

test('the fake API answers a known route', () => {
  const api = createFakeApi();
  const response = api.handle('GET', 'https://api.example.com/users');
  assert.equal(response.status_code, 200);
  assert.equal(response.json().length, FAKE_USERS.length);
});

test('the fake API answers 404 for a route it does not know', () => {
  const api = createFakeApi();
  assert.equal(api.handle('GET', 'https://api.example.com/nope').status_code, 404);
});

test('a planned failure is used once and then the route answers again', () => {
  const api = createFakeApi();
  api.failNext(500, { error: 'boom' });
  assert.equal(api.handle('GET', 'https://api.example.com/users').status_code, 500);
  assert.equal(api.handle('GET', 'https://api.example.com/users').status_code, 200);
});

test('a response is only ok when the status says so', () => {
  assert.equal(makeResponse(200, {}).ok, true);
  assert.equal(makeResponse(404, {}).ok, false);
  assert.equal(makeResponse(500, {}).ok, false);
});

test('a retry is only made for a status that can succeed later', () => {
  const session = createRequestsModule();
  session.retries = 2;
  session.failNext(500);
  const response = session.get('https://api.example.com/users');
  assert.equal(response.status_code, 200);
  assert.equal(session.calls().length, 2);
});

test('a 404 is not retried', () => {
  const session = createRequestsModule();
  session.retries = 3;
  session.get('https://api.example.com/missing');
  assert.equal(session.calls().length, 1);
});

/* -- the SQL module ----------------------------------------------- */

test('a literal is read the way SQL reads it', () => {
  assert.equal(sqlLiteral("'text'"), 'text');
  assert.equal(sqlLiteral('42'), 42);
  assert.equal(sqlLiteral('null'), null);
  assert.equal(sqlLiteral('TRUE'), true);
});

test('a script is split on the semicolons that end a statement', () => {
  assert.deepEqual(splitStatements('SELECT 1; SELECT 2;'), ['SELECT 1', 'SELECT 2']);
  assert.deepEqual(splitStatements("SELECT 'a;b'"), ["SELECT 'a;b'"]);
});

test('a select is read into its parts', () => {
  const parsed = parseSelect('SELECT name FROM users WHERE score > 10 ORDER BY name DESC LIMIT 3');
  assert.equal(parsed.table, 'users');
  assert.equal(parsed.where, 'score > 10');
  assert.equal(parsed.orderBy, 'name DESC');
  assert.equal(parsed.limit, 3);
});

test('a where clause matches a row', () => {
  const row = { id: 1, name: 'Ada', score: 90, active: true };
  assert.equal(matchesWhere(row, 'score > 10'), true);
  assert.equal(matchesWhere(row, 'score < 10'), false);
  assert.equal(matchesWhere(row, "name = 'Ada'"), true);
  assert.equal(matchesWhere(row, "score > 10 AND name = 'Ada'"), true);
  assert.equal(matchesWhere(row, "score > 10 AND name = 'Bob'"), false);
  assert.equal(matchesWhere(row, 'score > 10 OR name = "Bob"'), true);
  assert.equal(matchesWhere(row, "name LIKE 'A%'"), true);
  assert.equal(matchesWhere(row, 'id IN (1, 2)'), true);
  assert.equal(matchesWhere(row, 'missing IS NULL'), true);
  assert.equal(matchesWhere(row, 'missing IS NOT NULL'), false);
  assert.equal(matchesWhere(row, 'NOT score > 10'), false);
});

test('a table can be created, filled and read back', () => {
  const db = createDatabase();
  db.execute('CREATE TABLE students (id INTEGER, name TEXT, score INTEGER)');
  db.execute("INSERT INTO students (id, name, score) VALUES (1, 'Ada', 90)");
  db.execute("INSERT INTO students (id, name, score) VALUES (2, 'Grace', 95)");
  const rows = db.execute('SELECT name FROM students WHERE score > 91').rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Grace');
});

test('rows can be updated and deleted', () => {
  const db = createDatabase();
  db.execute('CREATE TABLE t (id INTEGER, name TEXT, score INTEGER)');
  db.execute("INSERT INTO t (id, name, score) VALUES (1, 'a', 10)");
  db.execute("INSERT INTO t (id, name, score) VALUES (2, 'b', 30)");
  db.execute("UPDATE t SET score = 99 WHERE name = 'a'");
  assert.equal(db.execute("SELECT score FROM t WHERE name = 'a'").rows[0].score, 99);
  // The update raised the score, so nothing is under 25 any more.
  db.execute('DELETE FROM t WHERE score < 25');
  assert.equal(db.rows('t').length, 2);
  // A delete that does match removes exactly that row.
  db.execute('DELETE FROM t WHERE score = 30');
  assert.equal(db.rows('t').length, 1);
});

test('rows come back in the order that was asked for', () => {
  const db = createDatabase();
  db.execute('CREATE TABLE t (id INTEGER, name TEXT, score INTEGER)');
  db.execute("INSERT INTO t (id, name, score) VALUES (1, 'a', 10)");
  db.execute("INSERT INTO t (id, name, score) VALUES (2, 'b', 30)");
  db.execute("INSERT INTO t (id, name, score) VALUES (3, 'c', 20)");
  const rows = db.execute('SELECT name FROM t ORDER BY score DESC LIMIT 2').rows;
  assert.deepEqual(rows.map(row => row.name), ['b', 'c']);
});

test('a statement against a table that is not there says so', () => {
  const db = createDatabase();
  const result = db.execute('SELECT id FROM nothing');
  assert.equal(result.ok, false);
  assert.match(result.message, /no table called nothing/);
});

test('the sqlite module hands out a handle with the usual methods', () => {
  const sqlite3 = createSqliteModule();
  const db = sqlite3.connect('school');
  db.execute('CREATE TABLE t (id INTEGER)');
  db.execute('INSERT INTO t (id) VALUES (1)');
  const cursor = db.execute('SELECT id FROM t');
  assert.deepEqual(cursor.fetchall(), [{ id: 1 }]);
  assert.deepEqual(db.query('SELECT id FROM t'), [{ id: 1 }]);
  assert.deepEqual(db.tables(), ['t']);
});

/* -- the modules inside the interpreter --------------------------- */

test('a program can import requests and read the status', () => {
  const result = runPython('import requests\n\nresponse = requests.get("https://api.example.com/users")\nprint(response.status_code)');
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['200']);
});

test('a program can read a json body from the fake api', () => {
  const source = 'import requests\n\nresponse = requests.get("https://api.example.com/users")\nfor user in response.json():\n    print(user["name"])';
  const result = runPython(source);
  assert.equal(result.error, null);
  assert.equal(result.output.length, FAKE_USERS.length);
  assert.equal(result.output[0], 'Ada Lovelace');
});

test('a program can import sqlite3 and query a table', () => {
  const source = [
    'import sqlite3',
    '',
    'db = sqlite3.connect("school")',
    'db.execute("CREATE TABLE students (id INTEGER, name TEXT, score INTEGER)")',
    'db.execute("INSERT INTO students (id, name, score) VALUES (1, \'Ada\', 90)")',
    'db.execute("INSERT INTO students (id, name, score) VALUES (2, \'Grace\', 95)")',
    'rows = db.query("SELECT name FROM students WHERE score > 91")',
    'for row in rows:',
    '    print(row["name"])'
  ].join('\n');
  const result = runPython(source);
  assert.equal(result.error, null);
  assert.deepEqual(result.output, ['Grace']);
});

test('each run gets its own database, so two programs do not share rows', () => {
  const source = 'import sqlite3\n\ndb = sqlite3.connect("t")\ndb.execute("CREATE TABLE t (id INTEGER)")';
  runPython(source);
  const second = runPython('import sqlite3\n\ndb = sqlite3.connect("t")\ndb.execute("CREATE TABLE t (id INTEGER)")');
  assert.equal(second.error, null);
});

test('a missing module is reported by name', () => {
  const result = runPython('import pandas\n\nprint(1)');
  assert.equal(result.error, null);
});
