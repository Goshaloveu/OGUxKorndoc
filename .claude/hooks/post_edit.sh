#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null)
if [[ "$FILE" == *.py ]]; then
  uv run ruff check --fix "$FILE" 2>/dev/null
  uv run ruff format "$FILE" 2>/dev/null
fi