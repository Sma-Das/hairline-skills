#!/usr/bin/env bash
# Copy the hairline-stack template into a new directory.
#
#   scaffold.sh <dir> <go-module> [title]
#   scaffold.sh ./acme-usage github.com/acme/usage "Acme Usage"
#
# Copies hairline-ui's CSS, font, and JS into web/ui/src/hairline. Set HAIRLINE_UI to
# point at that skill when it is not next to this one. Refuses a non-empty target.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="${1:?usage: scaffold.sh <dir> <go-module> [title]}"
module="${2:?usage: scaffold.sh <dir> <go-module> [title]}"
title="${3:-$(basename "$dir")}"
hairline="${HAIRLINE_UI:-$here/../hairline-ui}"
name="$(basename "$dir" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9-\n' '-')"

if [[ ! "$module" =~ ^[A-Za-z0-9._~/-]+$ ]]; then
  echo "module path has characters Go does not allow: $module" >&2
  exit 1
fi
if [[ -e "$dir" && -n "$(ls -A "$dir" 2>/dev/null)" ]]; then
  echo "refusing to write into non-empty $dir" >&2
  exit 1
fi
if [[ ! -f "$hairline/assets/hairline.css" ]]; then
  echo "hairline-ui not found at $hairline (set HAIRLINE_UI)" >&2
  exit 1
fi

mkdir -p "$dir"
cp -R "$here/templates/." "$dir/"
mv "$dir/gitignore" "$dir/.gitignore"
mv "$dir/dockerignore" "$dir/.dockerignore"

# Placeholders: __MODULE__ (Go module), __NAME__ (package name), __TITLE__ (page title).
esc() { printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'; }
while IFS= read -r -d '' f; do
  sed -i.bak -e "s|__MODULE__|$(esc "$module")|g" -e "s|__NAME__|$(esc "$name")|g" -e "s|__TITLE__|$(esc "$title")|g" "$f"
  rm -f "$f.bak"
done < <(find "$dir" -type f \( -name '*.go' -o -name 'go.mod' -o -name '*.json' -o -name '*.html' -o -name '*.svelte' -o -name '*.js' \) -not -path '*/node_modules/*' -print0)

dest="$dir/web/ui/src/hairline"
mkdir -p "$dest/js"
cp "$hairline/assets/palettes.css" "$hairline/assets/hairline.css" "$hairline/assets/dm-sans.woff2" "$hairline/assets/FONT-LICENSE.txt" "$dest/"
cp "$hairline/assets/js/"*.js "$dest/js/"

cat <<EOF
Scaffolded $dir ($module).
Next:
  cd $dir/web/ui && npm install && npm test && npm run build
  cd $dir && go test ./... && go run ./cmd/sample
  # page work: keep cmd/sample running, then npm run dev in web/ui
EOF
