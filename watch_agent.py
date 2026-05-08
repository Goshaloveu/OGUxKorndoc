import sys, json

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        event = json.loads(line)
        t = event.get("type", "")
        
        if t == "assistant":
            for block in event.get("message", {}).get("content", []):
                if block.get("type") == "text":
                    print(f"\n🤖 {block['text']}", flush=True)
                elif block.get("type") == "tool_use":
                    print(f"\n🔧 [{block['name']}] {json.dumps(block.get('input', {}))[:200]}", flush=True)
        
        elif t == "tool_result":
            content = event.get("content", "")
            if isinstance(content, list):
                content = " ".join(c.get("text","") for c in content)
            print(f"   ✅ {str(content)[:300]}", flush=True)
        
        elif t == "result":
            print(f"\n🏁 Сессия завершена: {event.get('subtype','')}", flush=True)

    except json.JSONDecodeError:
        print(line, flush=True)