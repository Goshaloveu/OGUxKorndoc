path = '/home/georgiy/projects/OGUxKorndoc/TASKS.md'
with open(path, 'r') as f:
    content = f.read()

old14 = '**Статус:** `[~]`\n\n---\n\n### TASK-015'
new14 = '**Статус:** `[x]`\n\n---\n\n### TASK-015'
assert old14 in content, 'TASK-014 pattern not found'
content = content.replace(old14, new14)

old15 = '**Статус:** `[ ]`\n\n---\n\n### TASK-016'
new15 = '**Статус:** `[x]`\n\n---\n\n### TASK-016'
assert old15 in content, 'TASK-015 pattern not found'
content = content.replace(old15, new15)

old16 = '**Проверка:** все 4 вкладки загружаются с данными, создание пользователя работает\n\n**Статус:** `[ ]`\n\n---\n\n## БЛОК 4'
new16 = '**Проверка:** все 4 вкладки загружаются с данными, создание пользователя работает\n\n**Статус:** `[x]`\n\n---\n\n## БЛОК 4'
assert old16 in content, 'TASK-016 pattern not found'
content = content.replace(old16, new16)

old_progress = 'Выполнено: 10 / 18\nБлок 1 (Инфраструктура):  4/4\nБлок 2 (Backend API):      6/6\nБлок 3 (Frontend):         0/6\nБлок 4 (Интеграция):       0/2'
new_progress = 'Выполнено: 16 / 18\nБлок 1 (Инфраструктура):  4/4\nБлок 2 (Backend API):      6/6\nБлок 3 (Frontend):         6/6\nБлок 4 (Интеграция):       0/2'
assert old_progress in content, 'progress pattern not found'
content = content.replace(old_progress, new_progress)

with open(path, 'w') as f:
    f.write(content)

print('TASKS.md updated successfully')
