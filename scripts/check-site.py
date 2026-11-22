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
CANONICAL_HOST = 'imon.com.bd'
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
        self.canonical = None
        self.robots = None
        self.has_title = False
        self.has_description = False
        self.jsonld = []

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
        if tag == 'title' and not self.has_title:
            self.has_title = True
        if tag == 'meta':
            name = (attrs.get('name') or '').lower()
            if name == 'description' and attrs.get('content'):
                self.has_description = True
            elif name == 'robots' and attrs.get('content'):
                self.robots = attrs['content']
        if tag == 'link':
            relations = {item.lower() for item in (attrs.get('rel') or '').split()}
            if 'canonical' in relations and attrs.get('href'):
                self.canonical = attrs['href']

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


def check_canonical_and_sitemap():
    """A page in the sitemap must declare itself as canonical.

    The sitemap says which URLs exist; the canonical tag says which URL is
    the real one. When the two disagree, a search engine can index the
    same page under two addresses, so the two lists are checked against
    each other here. A page that opts out with `noindex` is left alone.
    """
    sitemap_path = DOCS / 'sitemap.xml'
    if not sitemap_path.is_file():
        fail('docs/sitemap.xml: the sitemap is missing')
        return
    listed = re.findall(r'<loc>\s*([^<]+?)\s*</loc>', sitemap_path.read_text())
    if not listed:
        fail('docs/sitemap.xml: the sitemap lists no URLs')
        return

    for url in listed:
        path = urlsplit(url).path
        page_path = DOCS / path.lstrip('/')
        if page_path.is_dir():
            page_path = page_path / 'index.html'
        if not page_path.is_file():
            fail(f'docs/sitemap.xml: the listed page {url} does not exist in docs/')
            continue
        page = parse_page(page_path)
        if page.robots and 'noindex' in page.robots.lower():
            continue
        if not page.canonical:
            fail(f'{label(page_path)}: the page is in the sitemap but declares no canonical URL')
        elif page.canonical.rstrip('/') != url.rstrip('/'):
            fail(f'{label(page_path)}: canonical URL {page.canonical!r} does not match the sitemap entry {url!r}')
        if not page.has_description:
            fail(f'{label(page_path)}: the page has no meta description')


def check_jsonld():
    """Structured data must be valid JSON with the fields a reader needs.

    A malformed JSON-LD block is silently ignored by every search engine,
    so a broken one costs the page its rich result without any visible
    error. Every block on every page is parsed here.
    """
    for path in list(DOCS.glob('*.html')) + list((DOCS / 'gridworks').glob('*.html')):
        text = path.read_text()
        blocks = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
                            text, re.DOTALL | re.IGNORECASE)
        for block in blocks:
            try:
                data = json.loads(block)
            except ValueError as error:
                fail(f'{label(path)}: invalid JSON-LD: {error}')
                continue
            # A `@graph` carries its `@context` on the parent object, so the
            # context is only required on a standalone block.
            standalone = not (isinstance(data, dict) and '@graph' in data)
            if standalone and not (isinstance(data, dict) and data.get('@context')):
                fail(f'{label(path)}: the JSON-LD block needs an @context')
            nodes = data.get('@graph') if isinstance(data, dict) and '@graph' in data else [data]
            if not isinstance(nodes, list) or not nodes:
                fail(f'{label(path)}: the JSON-LD block has no nodes')
                continue
            for node in nodes:
                if not isinstance(node, dict):
                    fail(f'{label(path)}: every JSON-LD node must be an object')
                    continue
                if not node.get('@type'):
                    fail(f'{label(path)}: every JSON-LD node needs an @type')


def check_agent_files():
    """The machine-readable files must stay in step with the real site.

    They are the first thing a language model or a crawler reads, so a
    stale link here is worse than no file at all. Every entry point and
    every machine-readable path is checked against the files on disk.
    """
    agents_path = DOCS / '.well-known' / 'agents.json'
    agents = load_json(agents_path)
    if not isinstance(agents, dict):
        fail('docs/.well-known/agents.json: expected a JSON object')
    else:
        if agents.get('canonicalUrl') != f'https://{CANONICAL_HOST}/':
            fail('docs/.well-known/agents.json: canonicalUrl must be the apex domain')
        site = agents.get('site')
        if not isinstance(site, dict):
            fail('docs/.well-known/agents.json: a site object is required')
        else:
            for key in ('privacyPolicy', 'textSummary', 'sitemap', 'robots'):
                value = site.get(key)
                if not isinstance(value, str) or not value.startswith('https://'):
                    fail(f'docs/.well-known/agents.json: site.{key} must be an HTTPS URL')
        entries = agents.get('entryPoints')
        if not isinstance(entries, list) or not entries:
            fail('docs/.well-known/agents.json: entryPoints must be a non-empty list')
        else:
            for entry in entries:
                if not isinstance(entry, dict):
                    fail('docs/.well-known/agents.json: every entry point must be an object')
                    continue
                path = entry.get('path')
                if not isinstance(path, str) or not path.startswith('/'):
                    fail(f'docs/.well-known/agents.json: bad entry point path {path!r}')
                    continue
                if not entry_point_exists(path):
                    fail(f'docs/.well-known/agents.json: entry point {path} does not exist in docs/')
        readable = agents.get('machineReadable')
        if not isinstance(readable, list) or not readable:
            fail('docs/.well-known/agents.json: machineReadable must be a non-empty list')
        else:
            for item in readable:
                if not isinstance(item, dict):
                    fail('docs/.well-known/agents.json: every machine-readable entry must be an object')
                    continue
                path = item.get('path')
                if not isinstance(path, str) or not path.startswith('/'):
                    fail(f'docs/.well-known/agents.json: bad machine-readable path {path!r}')
                    continue
                if not entry_point_exists(path):
                    fail(f'docs/.well-known/agents.json: machine-readable path {path} does not exist in docs/')
        services = agents.get('thirdPartyServices')
        if not isinstance(services, list) or not services:
            fail('docs/.well-known/agents.json: thirdPartyServices must be a non-empty list')
        else:
            for service in services:
                if not isinstance(service, dict) or not service.get('host'):
                    fail('docs/.well-known/agents.json: every third-party service needs a host')

    llms_path = DOCS / 'llms.txt'
    if not llms_path.is_file():
        fail('docs/llms.txt: the plain-text site map is missing')
    else:
        text = llms_path.read_text()
        if not text.startswith('# '):
            fail('docs/llms.txt: the file must open with a level-one heading')
        if f'https://{CANONICAL_HOST}/' not in text:
            fail(f'docs/llms.txt: the canonical address https://{CANONICAL_HOST}/ must appear in the text')
        if 'privacy.html' not in text:
            fail('docs/llms.txt: the privacy notice must be linked from the plain-text map')
        # Every local page named in the file has to exist, or the map is
        # sending a reader to a 404.
        for match in re.findall(r'https://imon\.com\.bd/([A-Za-z0-9._/-]*)', text):
            if match and not entry_point_exists('/' + match):
                fail(f'docs/llms.txt: the linked path /{match} does not exist in docs/')

    robots_path = DOCS / 'robots.txt'
    if robots_path.is_file():
        robots = robots_path.read_text()
        if f'Sitemap: https://{CANONICAL_HOST}/sitemap.xml' not in robots:
            fail('docs/robots.txt: the sitemap declaration must point at the canonical address')


def entry_point_exists(path):
    """Does a site path such as '/lab.html' or '/gridworks/' exist?"""
    relative = path.lstrip('/')
    if not relative:
        return (DOCS / 'index.html').is_file()
    target = DOCS / relative
    if target.is_dir():
        target = target / 'index.html'
    return target.is_file()


def main():
    for required in ('index.html', 'app.js', 'style.css', 'sw.js', 'manifest.webmanifest', '.nojekyll'):
        if not (DOCS / required).is_file():
            fail(f'docs/{required}: required published file is missing')

    # The custom domain must be declared in the published artifact, not only in
    # the repository's Pages settings, so it survives a settings reset.
    cname_path = DOCS / 'CNAME'
    if not cname_path.is_file():
        fail('docs/CNAME: the custom domain declaration is missing')
    else:
        cname = cname_path.read_text().strip()
        if cname != CANONICAL_HOST:
            fail(f'docs/CNAME: expected {CANONICAL_HOST!r}, found {cname!r}')
        elif '\n' in cname_path.read_text().strip():
            fail('docs/CNAME: the custom domain declaration must be a single line')

    for path in list(DOCS.glob('*.html')) + list((DOCS / 'gridworks').glob('*.html')):
        page = parse_page(path)
        for value, kind in page.references:
            check_reference(value, path, kind)

    # Inspect current first-party modules/styles only. The retired Workbox
    # runtime is deliberately excluded.
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

    check_agent_files()
    check_canonical_and_sitemap()
    check_jsonld()

    if errors:
        print('\n'.join(f'ERROR: {message}' for message in errors), file=sys.stderr)
        raise SystemExit(1)
    print(f'Site checks passed: {len(html_documents)} HTML page(s), {len(checked)} local asset/anchor targets, 30 daily questions, valid news snapshot.')


if __name__ == '__main__':
    main()
