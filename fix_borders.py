import os

directory = '/home/shivam/Printly'

for root, _, files in os.walk(directory):
    if 'node_modules' in root or '.git' in root or 'dist' in root:
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            updated = content
            # Replacing border colors for higher contrast
            updated = updated.replace('border-[#1A1A1A]', 'border-[#333]')
            # Also fix borders that might be #111
            updated = updated.replace('border-[#111]', 'border-[#444]')
            
            if updated != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(updated)
                print(f"Updated borders in {path}")
