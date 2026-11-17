#!/usr/bin/env python3
"""Check current published HTML, core assets/imports, and daily JSON without network access."""
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
PUBLIC_HOST = 'sabbirimon.github.io'
PUBLIC_PATH = '/sabbirimon/'
errors = []
checked = set()
html_documents = {}


def fail(message):
    errors.append(message)


def label(path):
    return str(path.relative_to(ROOT))


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = Counter()
        self.references = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get('id'):
            self.ids[attrs['id']] += 1
        for attribute in ('href', 'src', 'poster'):
            if attrs.get(attribute):
                self.references.append((attrs[attribute], f'{tag}[{attribute}]'))
        if tag == 'object' and attrs.get('data'):
            self.references.append((attrs['data'], 'object[data]'))
        if attrs.get('srcset') and not attrs['srcset'].startswith('data:'):
            for item in attrs['srcset'].split(','):
                if item.strip():
                    self.references.append((item.strip().split()[0], f'{tag}[srcset]'))
        if tag == 'meta' and attrs.get('property') in ('og:image', 'og:video') and attrs.get('content'):
            self.references.append((attrs['content'], 'social media asset'))

    handle_startendtag = handle_starttag


def parse_page(path):
    if path not in html_documents:
        parser = Page()
        parser.feed(path.read_text())
        html_documents[path] = parser
        for identifier, count in parser.ids.items():
            if count > 1:
                fail(f'{label(path)}: duplicate DOM id {identifier!r} ({count} instances)')
    return html_documents[path]


def check_reference(value, owner, kind='reference'):
    value = value.strip()
    if not value or '${' in value:
        return
    try:
        parsed = urlsplit(value)
    except ValueError:
        fail(f'{label(owner)}: invalid {kind}: {value!r}')
        return
    if parsed.scheme or parsed.netloc:
        if parsed.scheme not in ('http', 'https') or parsed.netloc != PUBLIC_HOST:
            return  # External links, data URLs, and mail links are not local assets.
        if not parsed.path.startswith(PUBLIC_PATH):
            return
        target = DOCS / unquote(parsed.path[len(PUBLIC_PATH):])
    elif parsed.path.startswith('/'):
        if not parsed.path.startswith(PUBLIC_PATH):
            fail(f'{label(owner)}: root-relative URL escapes the GitHub Pages project: {value}')
            return
        target = DOCS / unquote(parsed.path[len(PUBLIC_PATH):])
    else:
        target = owner.parent / unquote(parsed.path) if parsed.path else owner
    target = target.resolve()
    if not target.is_relative_to(DOCS.resolve()):
        fail(f'{label(owner)}: local {kind} escapes docs/: {value}')
        return
    if target.is_dir():
        target /= 'index.html'
    if not target.is_file():
        fail(f'{label(owner)}: missing {kind}: {value}')
        return
    checked.add(target)
    if parsed.fragment and target.suffix == '.html':
        if unquote(parsed.fragment) not in parse_page(target).ids:
            fail(f'{label(owner)}: missing anchor in {target.name}: #{parsed.fragment}')


def load_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as error:
        fail(f'{label(path)}: cannot read JSON: {error}')
        return None


def valid_question(question):
    return (isinstance(question, dict)
            and isinstance(question.get('question'), str) and question['question'].strip()
            and isinstance(question.get('options'), list) and len(question['options']) == 4
            and all(isinstance(option, str) and option.strip() for option in question['options'])
            and len(set(question['options'])) == 4
            and type(question.get('answer')) is int and 0 <= question['answer'] < 4)


def main():
    for required in ('index.html', 'app.js', 'style.css', 'sw.js', 'manifest.webmanifest', '.nojekyll'):
        if not (DOCS / required).is_file():
            fail(f'docs/{required}: required published file is missing')

    for path in list(DOCS.glob('*.html')) + list((DOCS / 'gridworks').glob('*.html')):
        page = parse_page(path)
        for value, kind in page.references:
            check_reference(value, path, kind)

    # Inspect current first-party modules/styles only. Old fingerprinted bundles
    # in docs/assets/ and the retired Workbox runtime are deliberately excluded.
    for path in list(DOCS.glob('*.css')) + list((DOCS / 'gridworks').glob('*.css')):
        text = path.read_text()
        for value in re.findall(r'''url\(\s*['"]?([^)'"\s]+)['"]?\s*\)''', text):
            check_reference(value, path, 'CSS asset')
        for value in re.findall(r'''@import\s+['"]([^'"]+)['"]''', text):
            check_reference(value, path, 'CSS import')

    for path in list(DOCS.glob('*.js')) + list((DOCS / 'gridworks').glob('*.js')):
        if path.name.startswith('workbox-'):
            continue
        text = path.read_text()
        imports = re.findall(r'''(?:\b(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?|\bimport\s*\(\s*)['"]([^'"]+)['"]''', text)
        for value in imports:
            if value.startswith(('.', '/')):
                check_reference(value, path, 'JavaScript import')
        for _, value in re.findall(r'''\b(?:fetch|new\s+URL|register)\s*\(\s*(['"])([^'"]+)\1''', text):
            if value.startswith(('.', '/')):
                check_reference(value, path, 'runtime asset')
        if path.name == 'sw.js':
            match = re.search(r'const\s+FILES\s*=\s*\[([\s\S]*?)\]', text)
            if match:
                for value in re.findall(r'''['"]([^'"]+)['"]''', match.group(1)):
                    check_reference(value, path, 'offline cache asset')

    manifest_path = DOCS / 'manifest.webmanifest'
    manifest = load_json(manifest_path)
    if isinstance(manifest, dict):
        for icon in manifest.get('icons', []):
            if isinstance(icon, dict) and isinstance(icon.get('src'), str):
                check_reference(icon['src'], manifest_path, 'manifest icon')
        if isinstance(manifest.get('start_url'), str):
            check_reference(manifest['start_url'], manifest_path, 'manifest start URL')

    quiz = load_json(DOCS / 'data/quiz.json')
    questions = quiz.get('questions') if isinstance(quiz, dict) else None
    if not isinstance(questions, list) or len(questions) != 30:
        fail('docs/data/quiz.json: the daily pack must contain exactly 30 questions')
    elif not all(valid_question(question) for question in questions):
        fail('docs/data/quiz.json: every question needs four distinct choices and a valid answer index')
    if isinstance(quiz, dict):
        source = quiz.get('source', {})
        if not isinstance(source, dict) or not source.get('name') or not source.get('url'):
            fail('docs/data/quiz.json: question source attribution is required')
        elif source.get('name') == 'Open Trivia DB' and source.get('licenseUrl') != 'https://creativecommons.org/licenses/by-sa/4.0/':
            fail('docs/data/quiz.json: Open Trivia DB questions require CC BY-SA 4.0 attribution')
    bank = load_json(DOCS / 'data/quiz-bank.json')
    if not isinstance(bank, list) or len(bank) < 30 or not all(valid_question(question) for question in bank):
        fail('docs/data/quiz-bank.json: the fallback bank needs at least 30 valid questions')

    news = load_json(DOCS / 'data/news.json')
    if not isinstance(news, dict) or not isinstance(news.get('stories'), list):
        fail('docs/data/news.json: expected a snapshot with a stories array')
    else:
        ids = set()
        for story in news['stories']:
            if not isinstance(story, dict) or type(story.get('id')) is not int or story['id'] <= 0 or not isinstance(story.get('title'), str) or not story['title'].strip():
                fail('docs/data/news.json: invalid story identity or title')
                continue
            if story['id'] in ids:
                fail(f'docs/data/news.json: duplicate story {story["id"]}')
            ids.add(story['id'])
            try:
                link = urlsplit(story.get('url', ''))
                if link.scheme not in ('http', 'https') or not link.netloc:
                    fail(f'docs/data/news.json: story {story["id"]} needs an HTTP(S) source URL')
            except ValueError:
                fail(f'docs/data/news.json: invalid source URL for story {story["id"]}')

    if errors:
        print('\n'.join(f'ERROR: {message}' for message in errors), file=sys.stderr)
        raise SystemExit(1)
    print(f'Site checks passed: {len(html_documents)} HTML page(s), {len(checked)} local asset/anchor targets, 30 daily questions, valid news snapshot.')


if __name__ == '__main__':
    main()
