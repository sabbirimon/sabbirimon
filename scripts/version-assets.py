"""Stamp local JS and CSS requests in the Pages artifact, including offline precaching."""
import re
import sys
from pathlib import Path

docs = Path(sys.argv[1])
revision = sys.argv[2]
if not re.fullmatch(r'[a-f0-9]{7,40}', revision):
    raise SystemExit('Expected a Git revision')
# Restrict rewriting to asset attributes and module specifiers. Lesson examples
# and strings such as the file tab called "style.css" must retain their text.
path = r'(?P<url>(?!/)[.\w/-]+\.(?:js|css))'
attribute = re.compile(r'(?P<prefix>\b(?:src|href)=["\'])' + path + r'(?=["\'])')
module = re.compile(r'(?P<prefix>\b(?:from\s+|import\s*\(\s*|import\s+)["\'])' + path + r'(?=["\'])')

def version(match):
    return match['prefix'] + match['url'] + '?v=' + revision

for file in sorted(docs.rglob('*')):
    if file.suffix not in {'.js', '.html'} or file.name.startswith('workbox-'):
        continue
    original = file.read_text()
    text = module.sub(version, original)
    if file.suffix == '.html':
        text = attribute.sub(version, text)
    if file.name == 'sw.js':
        precache = re.compile(r'(const FILES = \[)(.*?)(\];)', re.DOTALL)
        entry = re.compile(r'(?P<prefix>["\'])' + path + r'(?=["\'])')
        text, count = precache.subn(lambda m: m[1] + entry.sub(version, m[2]) + m[3], text)
        if count != 1:
            raise SystemExit('Could not version the offline asset list')
    if text != original:
        file.write_text(text)
