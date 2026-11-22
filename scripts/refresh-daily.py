#!/usr/bin/env python3
"""Refresh public news and daily MCQs with key-free APIs; standard-library only."""
import concurrent.futures
import datetime as dt
import html
import json
from pathlib import Path
import random
import sys
import time
import urllib.request
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'data'
# The daily pack rolls over at midnight UTC, so every visitor gets the same
# questions on the same day.
TODAY = dt.datetime.now(dt.timezone.utc).date().isoformat()
NOW = dt.datetime.now(dt.timezone.utc).isoformat()
GITHUB_LOGIN = 'sabbirimon'
# The four repositories the site features on its build-log section.
FEATURED = ('meshlit', 'OmniCast', 'OmniRecovery', 'HyperL')
# Languages folded into an "Other" row so the bar stays readable.
LANGUAGE_GROUPS = {
    'HTML': 'Web', 'CSS': 'Web', 'JavaScript': 'Web', 'TypeScript': 'Web',
    'PHP': 'Web', 'Python': 'Python', 'Go': 'Go', 'Shell': 'Shell',
    'Objective-C++': 'Other', 'C': 'C', 'C++': 'C++', 'CMake': 'Other',
    'Dockerfile': 'Other', 'PowerShell': 'Other', 'Vim script': 'Other',
    'Makefile': 'Other', 'Lua': 'Other', 'Ruby': 'Ruby', 'Java': 'Java',
    'Kotlin': 'Kotlin', 'Rust': 'Rust', 'Swift': 'Swift',
}

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'IMON-World/1.0 (public daily portfolio feed)', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.load(response)

def write(name, data):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def devto(tags):
    """Fetch DEV Community articles for a set of tags.

    The API takes one tag at a time and it also refuses requests that arrive
    together: several tags fetched side by side come back as the plain text
    "Retry later" instead of JSON. The tags are therefore asked for one after
    another with a short pause between them. A tag that fails is skipped
    rather than failing the whole lookup.
    """
    batches = []
    for tag in tags:
        if batches: time.sleep(0.4)
        try: batches.append(fetch(f'https://dev.to/api/articles?tag={tag}&per_page=12'))
        except Exception: batches.append([])
    records = []
    seen = set()
    for item in [item for batch in batches for item in batch]:
        if not isinstance(item.get('id'), int) or item['id'] in seen: continue
        link = item.get('url', '')
        if urlparse(link).scheme not in ('https', 'http'): continue
        if not item.get('title') or not item.get('published_timestamp'): continue
        published = dt.datetime.fromisoformat(item['published_timestamp'].replace('Z', '+00:00'))
        seen.add(item['id'])
        records.append({'id': item['id'], 'title': item['title'], 'url': link, 'time': published.timestamp(), 'publisher': item.get('user', {}).get('name') or 'DEV Community'})
    return records

def news():
    """Refresh the technology headlines.

    Hacker News is the preferred source. The DEV Community API stands in
    when it is unreachable, so a single service going down does not leave
    the section without any headlines.
    """
    def hacker_news():
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
        return records[:12], 'Hacker News', 'https://news.ycombinator.com/'
    try:
        records, source, source_url = hacker_news()
        write('news.json', {'updated': NOW, 'source': source, 'sourceUrl': source_url, 'stories': records})
        print(f'News: {len(records)} community headlines refreshed from {source}')
    except Exception as exc:
        print(f'Hacker News unavailable ({exc}); trying the DEV Community API', file=sys.stderr)
        try:
            records = devto(['webdev', 'programming', 'tech'])[:12]
            if len(records) < 3: raise ValueError('Insufficient fallback news records')
            write('news.json', {'updated': NOW, 'source': 'DEV Community', 'sourceUrl': 'https://dev.to/', 'stories': records})
            print(f'News: {len(records)} community headlines refreshed from DEV Community')
        except Exception as fallback:
            print(f'News unavailable; retaining last successful snapshot: {fallback}', file=sys.stderr)
            if not (OUT / 'news.json').exists(): write('news.json', {'updated': None, 'source': 'Hacker News', 'sourceUrl': 'https://news.ycombinator.com/', 'stories': []})

def science():
    """Refresh the science and space headlines.

    The Spaceflight News API is a small community service that goes down
    without warning, so the DEV Community API carries the feed when it is
    unreachable.
    """
    def spaceflight():
        raw = fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=12')
        records = []
        for item in raw.get('results', []):
            if not isinstance(item.get('id'), int) or not item.get('title') or urlparse(item.get('url', '')).scheme not in ('https', 'http'): continue
            published = dt.datetime.fromisoformat(item['published_at'].replace('Z', '+00:00'))
            records.append({'id': item['id'], 'title': item['title'], 'url': item['url'], 'time': published.timestamp(), 'publisher': item.get('news_site', 'Spaceflight News')})
        if not records: raise ValueError('No science stories returned')
        return records, 'Spaceflight News API', 'https://www.spaceflightnewsapi.net/'
    try:
        records, source, source_url = spaceflight()
        write('science.json', {'updated': NOW, 'source': source, 'sourceUrl': source_url, 'stories': records})
        print(f'Science: {len(records)} space and science headlines refreshed from {source}')
    except Exception as exc:
        print(f'Spaceflight News API unavailable ({exc}); trying the DEV Community API', file=sys.stderr)
        try:
            records = devto(['space', 'science'])[:12]
            if len(records) < 3: raise ValueError('Insufficient fallback science records')
            write('science.json', {'updated': NOW, 'source': 'DEV Community', 'sourceUrl': 'https://dev.to/', 'stories': records})
            print(f'Science: {len(records)} space and science headlines refreshed from DEV Community')
        except Exception as fallback:
            print(f'Science unavailable; retaining last successful snapshot: {fallback}', file=sys.stderr)
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

def github_stats():
    """Refresh the public GitHub numbers shown on the homepage.

    The GitHub API allows sixty unauthenticated requests an hour per
    address, so the browser must not call it on every page view: a
    visitor's network would spend the allowance for everyone behind the
    same address. The numbers are therefore collected here, once a day,
    and published as a static snapshot the page reads instead.

    A repository's language breakdown is a separate request per
    repository, so only the repositories that actually declare a
    language are asked. A repository that fails is skipped rather than
    failing the whole refresh: a partial breakdown is better than none.
    """
    def github(url):
        req = urllib.request.Request(url, headers={'User-Agent': 'IMON-World/1.0 (public daily portfolio feed)', 'Accept': 'application/vnd.github+json'})
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)

    try:
        profile = github(f'https://api.github.com/users/{GITHUB_LOGIN}')
        repos = [r for r in github(f'https://api.github.com/users/{GITHUB_LOGIN}/repos?per_page=100&type=owner') if not r.get('fork')]
    except Exception as exc:
        print(f'GitHub API unavailable; retaining the last successful stats snapshot: {exc}', file=sys.stderr)
        if not (OUT / 'github-stats.json').exists():
            write('github-stats.json', {'updated': None, 'source': 'GitHub REST API', 'profile': {'login': GITHUB_LOGIN, 'name': 'Sabbir Hassan Imon', 'url': f'https://github.com/{GITHUB_LOGIN}'}, 'stats': {}, 'topLanguages': [], 'featured': []})
        return

    # The language of a repository by size of its files, which says far
    # more than the number of repositories in each language.
    sizes = {}
    for repo in repos:
        if not repo.get('language'):
            continue
        try:
            sizes[repo['name']] = github(f'https://api.github.com/repos/{GITHUB_LOGIN}/{repo["name"]}/languages')
        except Exception:
            continue

    grouped = {}
    for breakdown in sizes.values():
        for language, size in breakdown.items():
            name = LANGUAGE_GROUPS.get(language, language)
            grouped[name] = grouped.get(name, 0) + size
    total = sum(grouped.values())
    languages = [{'name': name, 'share': round(size / total * 100) if total else 0} for name, size in sorted(grouped.items(), key=lambda item: -item[1])]

    featured = []
    for name in FEATURED:
        match = next((r for r in repos if r['name'].lower() == name.lower()), None)
        if not match:
            continue
        featured.append({
            'name': match['name'],
            'url': match['html_url'],
            'description': (match.get('description') or '').strip(),
            'language': match.get('language') or 'Other',
            'stars': match.get('stargazers_count', 0),
            'forks': match.get('forks_count', 0),
        })

    stats = {
        'followers': profile.get('followers', 0),
        'repositories': profile.get('public_repos', 0),
        'stars': sum(r.get('stargazers_count', 0) for r in repos),
        'forks': sum(r.get('forks_count', 0) for r in repos),
        'watchers': sum(r.get('watchers_count', 0) for r in repos),
        'membersSince': (profile.get('created_at') or '')[:10],
    }
    payload = {
        'updated': NOW,
        'source': 'GitHub REST API',
        'profile': {
            'login': profile.get('login', GITHUB_LOGIN),
            'name': profile.get('name') or 'Sabbir Hassan Imon',
            'url': profile.get('html_url', f'https://github.com/{GITHUB_LOGIN}'),
            'avatarUrl': profile.get('avatar_url', ''),
        },
        'stats': stats,
        'topLanguages': languages,
        'featured': featured,
    }
    write('github-stats.json', payload)
    print(f"GitHub: {stats['repositories']} repositories, {stats['stars']} stars, {stats['followers']} followers for {profile.get('login', GITHUB_LOGIN)}")

if __name__ == '__main__':
    news()
    science()
    quiz()
    github_stats()
