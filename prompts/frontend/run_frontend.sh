while true; do
  claude --model opusplan --verbose -p "$(cat prompts/frontend/FRONTEND_LOOP_PROMPT.md)" \
  --output-format stream-json | python3 watch_agent.py \
  2>&1 | tee -a frontend.log
  echo "--- frontend итерация завершена, пауза 10 сек ---"
  sleep 10
done
