# 张家称呼 · Teo Family Greetings

A small web app that tells each member of the Teo family what to call everyone else at Chinese New Year, in Mandarin (characters + Hanyu Pinyin) and Teochew (characters + an easy sound-it-out spelling, with recorded clips where available).

## How it works
- **Who are you?** Pick your name. The app walks the family tree and works out every title from your point of view, grouped by family, plus what your children call each person and a ready-to-say CNY greeting.
- **Not on the list?** Build any relationship in up to four steps (e.g. Mother → Elder brother → Wife) and press **Go!**
- Titles follow common Singapore Teochew/Mandarin usage, including birth-order numbering (大伯, 二姑, 三叔). Married-in relatives call the family what their spouse does.

## Privacy
The family list is encrypted (AES-256-GCM, key derived from the family passcode with PBKDF2-SHA256, 310k iterations). This public repo only contains ciphertext in `data/family.enc.json`. The readable `data/family.json` is git-ignored and must never be committed.

## Updating the family list
```bash
PASSCODE="the family passcode" node tools/encrypt.mjs data/family.json
git add data/family.enc.json && git commit -m "Update family list" && git push
```

## Teochew voice clips
Drop `.m4a` files in `audio/teochew/` named after the title key (e.g. `bobo.m4a`, `bobo-1.m4a` for 大伯, `greeting.m4a`) and list them in `audio/teochew/manifest.json`. A play button appears automatically.

## Tests
```bash
node tools/test.mjs
```
