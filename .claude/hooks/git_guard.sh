#!/bin/bash
INPUT=$(cat)
CMD=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null)

if echo "$CMD" | grep -qE 'git\s+push\s+.*--force|git\s+reset\s+--hard|git\s+clean\s+-fd'; then
  echo '{"decision":"block","reason":"Опасная git команда заблокирована хуком. Используй --force-with-lease вместо --force."}'
  exit 0
fi