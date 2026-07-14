#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).with_name("apply_perf_lazy_tree.py")
text = path.read_text(encoding="utf-8")
text = text.replace(
    '    "function SettingsPopover",\n)\nreplace_once(',
    '    "",\n)\nreplace_once(',
    1,
)
text = text.replace(
    'requireText("vite.config.ts", ["react-vendor", "tone"]);\nrequireText("src/app/useGameController.ts", [',
    'requireText("vite.config.ts", ["react-vendor", "tone"]);\n',
    1,
)
text = text.replace(
    "node_modules[\\\\/]",
    "node_modules[\\\\\\\\/]",
)
path.write_text(text, encoding="utf-8")
print("performance patch script fixed")
