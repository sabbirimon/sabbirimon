#!/usr/bin/env python3
"""Refresh public news and daily MCQs with key-free APIs; standard-library only."""
import concurrent.futures
import datetime as dt
import html
import json
from pathlib import Path
import random
import sys
import urllib.request
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'data'
TODAY = dt.datetime.now(ZoneInfo('Asia/Dhaka')).date().isoformat()
NOW = dt.datetime.now(dt.timezone.utc).isoformat()

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'IMON-World/1.0 (public daily portfolio feed)', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)

def write(name, data):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def news():
    try:
        base = 'https://hacker-news.firebaseio.com/v0/'
        ids = fetch(base + 'topstories.json')[:18]
        def item(id):
            try: return fetch(base + f'item/{int(id)}.json')
            except Exception: return None
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            stories = list(pool.map(item, ids))
        records = []
        for s in stories:
            if not s or s.get('type') != 'story' or s.get('dead') or s.get('deleted'): continue
            link = s.get('url', f"https://news.ycombinator.com/item?id={s['id']}")
            if urlparse(link).scheme not in ('https', 'http'): continue
            records.append({'id': s['id'], 'title': html.unescape(s['title']), 'url': link, 'score': s.get('score', 0), 'time': s['time'], 'comments': s.get('descendants', 0)})
        if len(records) < 3: raise ValueError('Insufficient valid news records')
        write('news.json', {'updated': NOW, 'source': 'Hacker News', 'sourceUrl': 'https://news.ycombinator.com/', 'stories': records[:12]})
        print(f'News: {len(records[:12])} community headlines refreshed')
    except Exception as exc:
        print(f'News unavailable; retaining last successful snapshot: {exc}', file=sys.stderr)
        if not (OUT / 'news.json').exists(): write('news.json', {'updated': None, 'source': 'Hacker News', 'sourceUrl': 'https://news.ycombinator.com/', 'stories': []})

def science():
    try:
        raw = fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=12')
        records = []
        for item in raw.get('results', []):
            if not isinstance(item.get('id'), int) or not item.get('title') or urlparse(item.get('url', '')).scheme not in ('https', 'http'): continue
            published = dt.datetime.fromisoformat(item['published_at'].replace('Z', '+00:00'))
            records.append({'id': item['id'], 'title': item['title'], 'url': item['url'], 'time': published.timestamp(), 'publisher': item.get('news_site', 'Spaceflight News')})
        if not records: raise ValueError('No science stories returned')
        write('science.json', {'updated': NOW, 'source': 'Spaceflight News API', 'sourceUrl': 'https://www.spaceflightnewsapi.net/', 'stories': records})
        print(f'Science: {len(records)} space and science headlines refreshed')
    except Exception as exc:
        print(f'Science unavailable; retaining last successful snapshot: {exc}', file=sys.stderr)
        if not (OUT / 'science.json').exists(): write('science.json', {'updated': None, 'source': 'Spaceflight News API', 'stories': []})

def quiz():
    rng = random.Random('IMON:' + TODAY)
    try:
        raw = fetch('https://opentdb.com/api.php?amount=30&category=18&type=multiple')
        if raw.get('response_code') != 0 or len(raw.get('results', [])) != 30: raise ValueError('Daily API pack unavailable')
        questions = []
        for entry in raw['results']:
            correct = html.unescape(entry['correct_answer'])
            options = [correct] + [html.unescape(s) for s in entry['incorrect_answers']]
            if len(set(options)) != 4: raise ValueError('Ambiguous choices')
            rng.shuffle(options)
            questions.append({'question': html.unescape(entry['question']), 'options': options, 'answer': options.index(correct), 'explanation': f'The correct answer is {correct}.', 'category': 'Computers', 'difficulty': entry['difficulty']})
        source = {'name': 'Open Trivia DB', 'url': 'https://opentdb.com/', 'license': 'CC BY-SA 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/'}
    except Exception as exc:
        print(f'Quiz API unavailable; rotating original question bank: {exc}', file=sys.stderr)
        questions = json.loads((OUT / 'quiz-bank.json').read_text())
        rng.shuffle(questions)
        questions = questions[:30]
        source = {'name': 'IMON original question bank', 'url': 'https://github.com/sabbirimon/sabbirimon', 'license': 'Original educational content'}
    write('quiz.json', {'date': TODAY, 'updated': NOW, 'source': source, 'questions': questions})
    print(f'Quiz: {len(questions)} MCQs for {TODAY} from {source["name"]}')

if __name__ == '__main__':
    news()
    science()
    quiz()
