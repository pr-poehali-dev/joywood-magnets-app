#!/usr/bin/env python3
"""
Копирует backend/shared/utils.py во все папки функций.
Запуск: npm run sync:utils   или   python scripts/sync_utils.py
"""
import os
import shutil

SHARED = os.path.join(os.path.dirname(__file__), '..', 'backend', 'shared', 'utils.py')
BACKEND = os.path.join(os.path.dirname(__file__), '..', 'backend')

SKIP = {'shared'}

copied = []
for name in sorted(os.listdir(BACKEND)):
    folder = os.path.join(BACKEND, name)
    if not os.path.isdir(folder) or name in SKIP:
        continue
    if not os.path.exists(os.path.join(folder, 'index.py')):
        continue
    dest = os.path.join(folder, 'utils.py')
    shutil.copy2(SHARED, dest)
    copied.append(name)

print(f'✅ utils.py скопирован в {len(copied)} функций:')
for name in copied:
    print(f'   • {name}')
