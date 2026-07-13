from pathlib import Path

path = Path("scripts/apply_content_system_v2.py")
text = path.read_text(encoding="utf-8")
old = '''    replace_once(
        path,
        '    expect(next.sceneNodeIndex).toBe(0);\\n    expect(next.locked).toBe(false);\\n',
        '    expect(next.sceneNodeIndex).toBe(0);\\n    expect(next.sceneNodeId).toBe(sceneForMonth(next).nodes[0].id);\\n    expect(next.locked).toBe(false);\\n',
    )
'''
new = '''    text = read(path)
    old_position_assertion = '    expect(next.sceneNodeIndex).toBe(0);\\n    expect(next.locked).toBe(false);\\n'
    new_position_assertion = '    expect(next.sceneNodeIndex).toBe(0);\\n    expect(next.sceneNodeId).toBe(sceneForMonth(next).nodes[0].id);\\n    expect(next.locked).toBe(false);\\n'
    if text.count(old_position_assertion) != 2:
        raise RuntimeError(f"{path}: expected two next-month position assertions")
    write(path, text.replace(old_position_assertion, new_position_assertion))
'''
if text.count(old) != 1:
    raise RuntimeError("migration hotfix target not found exactly once")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
