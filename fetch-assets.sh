#!/usr/bin/env bash
# Descarga los assets desde el CDN al repo local (corre esto en tu PC).
# Después, sustituye las URLs absolutas en index.html y styles/sections.css
# por las rutas locales: assets/ambient/*.jpg y assets/bottles/lineup.jpg
set -euo pipefail

mkdir -p assets/ambient assets/bottles

echo "→ Descargando ambientes..."
curl -L -o assets/ambient/hero.jpg  "https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215428_cd636008-d9cf-450f-9b77-502dbed8ac27.png"
curl -L -o assets/ambient/horno.jpg "https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215436_71ce5833-cae6-44ca-a45b-7e709d331dc0.png"
curl -L -o assets/ambient/agave.jpg "https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215445_985db3e4-90d1-4a86-8256-fdc749c3460f.png"
curl -L -o assets/ambient/macro.jpg "https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215452_30bdc78d-8b1d-4e50-b6ad-7b4dcc656f6d.png"

echo "→ Descargando foto del lineup de botellas..."
curl -L -o assets/bottles/lineup.jpg "https://d2ol7oe51mr4n9.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/726cb4ad-b7b0-403a-bf3a-265d4ab67d77.jpg"

echo
echo "→ Reemplazando URLs absolutas por rutas locales..."
sed -i.bak \
  -e 's|https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215428_cd636008-d9cf-450f-9b77-502dbed8ac27.png|assets/ambient/hero.jpg|g' \
  -e 's|https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215436_71ce5833-cae6-44ca-a45b-7e709d331dc0.png|assets/ambient/horno.jpg|g' \
  -e 's|https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215445_985db3e4-90d1-4a86-8256-fdc749c3460f.png|assets/ambient/agave.jpg|g' \
  -e 's|https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/hf_20260512_215452_30bdc78d-8b1d-4e50-b6ad-7b4dcc656f6d.png|assets/ambient/macro.jpg|g' \
  -e 's|https://d2ol7oe51mr4n9.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp/726cb4ad-b7b0-403a-bf3a-265d4ab67d77.jpg|assets/bottles/lineup.jpg|g' \
  index.html styles/sections.css

rm -f index.html.bak styles/sections.css.bak

echo "✓ Listo. Revisa con git diff y haz commit."
