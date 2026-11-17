#!/usr/bin/env python3
"""Local preview without stale HTTP asset caches. Run from the repository root."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import sys
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
os.chdir(Path(__file__).resolve().parents[1])
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
print(f'IMON preview: http://127.0.0.1:{port}/docs/', flush=True)
ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
