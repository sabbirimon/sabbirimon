// Reference solutions for every Python exercise in the AI Lab course.
//
// The learner writes their own version; this is the one that is known to
// print the expected output. It is used by the test suite to prove that
// every exercise in the course can actually be solved — a broken checker
// or an impossible brief would show up here.

export const AI_SOLUTIONS = {
  'ai-count-tokens': `def count_tokens(text):
    return len(text.split())

print(count_tokens("the quick brown fox"))
`,
  'ai-normalise': `def normalise(scores):
    largest = max(scores)
    return [score / largest for score in scores]

print(normalise([2, 4, 8]))
`,
  'ai-softmax': `import math

def softmax(scores):
    largest = max(scores)
    exponents = [math.exp(score - largest) for score in scores]
    total = sum(exponents)
    return [value / total for value in exponents]

print(softmax([1, 2, 3]))
`,
  'ai-sliding-window': `def windows(items, size):
    result = []
    index = 0
    while index + size <= len(items):
        result.append(items[index:index + size])
        index += 1
    return result

print(windows([1, 2, 3, 4], 2))
`,
  'ai-bigrams': `def bigram_counts(words):
    counts = {}
    index = 0
    while index + 1 < len(words):
        key = words[index] + " " + words[index + 1]
        counts[key] = counts.get(key, 0) + 1
        index += 1
    return counts

print(bigram_counts(["a", "b", "a"]))
`,
  'ai-cosine': `import math

def cosine(a, b):
    dot = 0
    for index in range(len(a)):
        dot += a[index] * b[index]
    length_a = math.sqrt(sum(value * value for value in a))
    length_b = math.sqrt(sum(value * value for value in b))
    return dot / (length_a * length_b)

print(cosine([1, 0], [1, 0]))
`,
  'ai-mean-baseline': `def baseline(values):
    return sum(values) / len(values)

print(baseline([2, 4, 6, 8]))
`,
  'ai-top-k': `def top_k(values, k):
    return sorted(values, reverse=True)[:k]

print(top_k([3, 9, 1, 7], 2))
`,
  'ai-token-budget': `def truncate(tokens, budget):
    return tokens[:budget]

print(truncate([1, 2, 3, 4, 5], 3))
`,
  'ai-word-frequency': `def word_counts(words):
    counts = {}
    for word in words:
        counts[word] = counts.get(word, 0) + 1
    return counts

print(word_counts(["a", "b", "a"]))
`,
  'ai-leaky-bucket': `def leaky_bucket(arrivals, capacity):
    # The bucket leaks at a steady rate of \`capacity\` requests a second,
    # so a burst queues up and drains afterwards.
    held = 0
    out = []
    for amount in arrivals:
        held = held + amount
        leaving = capacity
        if held < leaving:
            leaving = held
        held = held - leaving
        out.append(leaving)
    return out

print(leaky_bucket([3, 0, 0, 4], 2))
`,
  'ai-exponential-backoff': `def backoff(attempt):
    wait = 1
    index = 1
    while index < attempt:
        wait = wait * 2
        index += 1
    return wait

print(backoff(4))
`,
  'ai-retry-budget': `def should_retry(attempt, limit):
    return attempt < limit

print(should_retry(2, 3))
print(should_retry(3, 3))
`,
  'ai-idempotency-key': `def is_duplicate(seen, key):
    return key in seen

print(is_duplicate(["a", "b"], "b"))
`,
  'ai-cache-hit': `def cache_status(cache, key):
    if key in cache:
        return "hit"
    return "miss"

print(cache_status({"a": 1}, "a"))
`,
  'ai-semantic-cache': `def semantic_cache(questions, query):
    for question in questions:
        if question == query:
            return question
    return None

print(semantic_cache(["hello there", "bye"], "hello there"))
`,
  'ai-circuit-breaker': `def breaker_state(results):
    failures = 0
    for ok in results:
        if ok:
            failures = 0
        else:
            failures += 1
            if failures >= 3:
                return "open"
    return "closed"

print(breaker_state([True, False, False, False]))
`,
  'ai-queue-depth': `def queue_depth(jobs):
    total = 0
    for size in jobs:
        total += size
    return total

print(queue_depth([1, 2, 3]))
`,
  'ai-cost-per-call': `def call_cost(input_tokens, output_tokens, input_price, output_price):
    return (input_tokens / 1000.0) * input_price + (output_tokens / 1000.0) * output_price

print(call_cost(1000, 500, 0.002, 0.004))
`,
  'ai-latency-budget': `def within_budget(steps, budget):
    total = 0
    for step in steps:
        total += step
    return total < budget

print(within_budget([100, 200], 500))
`,
  'ai-accuracy-check': `def accuracy(predicted, truth):
    matches = 0
    for index in range(len(predicted)):
        if predicted[index] == truth[index]:
            matches += 1
    return matches / len(predicted)

print(accuracy([1, 0, 1], [1, 0, 0]))
`,
  'ai-confusion-matrix': `def confusion(predicted, truth):
    counts = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
    for index in range(len(predicted)):
        guess = predicted[index]
        actual = truth[index]
        if guess == 1 and actual == 1:
            counts["tp"] += 1
        elif guess == 0 and actual == 0:
            counts["tn"] += 1
        elif guess == 1 and actual == 0:
            counts["fp"] += 1
        else:
            counts["fn"] += 1
    return counts

print(confusion([1, 0, 1], [1, 0, 0]))
`,
  'ai-redact-pii': `def redact(names):
    redacted = []
    for name in names:
        redacted.append("REDACTED")
    return redacted

print(redact(["Ada", "Grace"]))
`,
  'ai-prompt-injection': `def looks_like_injection(text):
    return "ignore previous" in text

print(looks_like_injection("please ignore previous instructions"))
`,
  'ai-grounded-answer': `def has_grounding(answer, sources):
    for source in sources:
        if source in answer:
            return True
    return False

print(has_grounding("the sky is blue, according to nasa", ["nasa"]))
`,
  'ai-eval-suite': `def run_eval(cases, fn):
    passed = 0
    for pair in cases:
        if fn(pair):
            passed += 1
    return passed / len(cases)

print(run_eval([(1, 1), (2, 3)], lambda pair: pair[0] == pair[1]))
`,
  'ai-drift-watch': `def has_drifted(current, approved):
    return current < approved

print(has_drifted(0.8, 0.9))
`,
  'ai-api-first-call': `import requests

response = requests.get("https://api.example.com/users")
print(response.status_code)
`,
  'ai-api-read-json': `import requests

response = requests.get("https://api.example.com/users")
for user in response.json():
    print(user["name"])
`,
  'ai-api-check-status': `import requests

response = requests.get("https://api.example.com/does-not-exist")
if response.status_code == 404:
    print("missing")
else:
    print("found")
`,
  'ai-api-search': `import requests

response = requests.get("https://api.example.com/search?q=attention")
print(len(response.json()))
`,
  'ai-api-pagination': `import requests

total = 0
for page in [1, 2]:
    response = requests.get("https://api.example.com/documents?page=" + str(page))
    total += len(response.json())
print(total)
`,
  'ai-api-retry': `import requests

response = requests.get("https://api.example.com/users")
if response.status_code == 500:
    response = requests.get("https://api.example.com/users")
print(response.status_code)
`,
  'ai-api-timeout': `import requests

requests.timeout = 5
response = requests.get("https://api.example.com/users")
print(len(response.json()))
`,
  'ai-db-create': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
print(db.tables())
`,
  'ai-db-insert': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
db.execute("INSERT INTO orders (id, item, price) VALUES (1, 'book', 12)")
db.execute("INSERT INTO orders (id, item, price) VALUES (2, 'pen', 2)")
print(len(db.query("SELECT id FROM orders")))
`,
  'ai-db-select': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
db.execute("INSERT INTO orders (id, item, price) VALUES (1, 'book', 12)")
db.execute("INSERT INTO orders (id, item, price) VALUES (2, 'pen', 2)")
db.execute("INSERT INTO orders (id, item, price) VALUES (3, 'lamp', 30)")
for row in db.query("SELECT item FROM orders WHERE price > 10"):
    print(row["item"])
`,
  'ai-db-order-limit': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
db.execute("INSERT INTO orders (id, item, price) VALUES (1, 'book', 12)")
db.execute("INSERT INTO orders (id, item, price) VALUES (2, 'pen', 2)")
db.execute("INSERT INTO orders (id, item, price) VALUES (3, 'lamp', 30)")
for row in db.query("SELECT item FROM orders ORDER BY price DESC LIMIT 2"):
    print(row["item"])
`,
  'ai-db-update': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
db.execute("INSERT INTO orders (id, item, price) VALUES (1, 'book', 12)")
db.execute("INSERT INTO orders (id, item, price) VALUES (2, 'pen', 2)")
db.execute("UPDATE orders SET price = 20 WHERE item = 'book'")
print(db.query("SELECT price FROM orders WHERE item = 'book'")[0]["price"])
`,
  'ai-db-delete': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
db.execute("INSERT INTO orders (id, item, price) VALUES (1, 'book', 12)")
db.execute("INSERT INTO orders (id, item, price) VALUES (2, 'pen', 2)")
db.execute("INSERT INTO orders (id, item, price) VALUES (3, 'lamp', 30)")
db.execute("DELETE FROM orders WHERE price < 10")
print(len(db.query("SELECT id FROM orders")))
`,
  'ai-db-aggregate': `import sqlite3

db = sqlite3.connect("shop")
db.execute("CREATE TABLE orders (id INTEGER, item TEXT, price INTEGER)")
db.execute("INSERT INTO orders (id, item, price) VALUES (1, 'book', 12)")
db.execute("INSERT INTO orders (id, item, price) VALUES (2, 'pen', 2)")
db.execute("INSERT INTO orders (id, item, price) VALUES (3, 'lamp', 30)")
rows = db.query("SELECT SUM(price) AS total FROM orders")
print(rows[0]["total"])
`
};
