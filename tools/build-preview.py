# Builds a single-file copy of the app (still passcode-locked) for previewing without a web server.
import re, sys, base64, json
out = sys.argv[1]
artifact = '--artifact' in sys.argv  # Claude-hosted page: no document skeleton of our own
def module(path):
    src = open(path).read()
    src = re.sub(r'^import[\s\S]*?from\s+[\'"][^\'"]+[\'"];\s*$', '', src, flags=re.M)
    names = re.findall(r'^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)', src, flags=re.M)
    src = re.sub(r'^export\s+', '', src, flags=re.M)
    if not names:
        return '(()=>{' + src + '})();'
    return 'const {' + ','.join(names) + '} = (()=>{' + src + '\nreturn {' + ','.join(names) + '};})();'
js = '\n'.join(module(f) for f in ['js/kinship.js', 'js/vault.js', 'js/chart.js', 'js/extras.js', 'js/app.js'])
seal = 'data:image/svg+xml;base64,' + base64.b64encode(open('assets/seal.svg', 'rb').read()).decode()
js = js.replace('src="assets/seal.svg"', f'src="{seal}"')
css = open('css/style.css').read()
box = open('data/family.enc.json').read()
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Teo Family Greetings</title><style>{css}</style></head><body><main id="app"></main>
<script>window.__PREVIEW_BOX__={box};</script>
<script>(()=>{{{js}}})();</script></body></html>'''
if artifact:
    html = f'''<title>Teo Family Greetings</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<style>{css}</style>
<main id="app"></main>
<script>window.__PREVIEW_BOX__={box};</script>
<script>(()=>{{{js}}})();</script>'''
open(out, 'w').write(html)
print(len(html))
