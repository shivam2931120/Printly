import os

directory = '/home/shivam/Printly'
skip = {'node_modules', '.git', 'dist', '.next'}

for root, dirs, files in os.walk(directory):
    dirs[:] = [d for d in dirs if d not in skip]
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            updated = content
            updated = updated.replace('border-[#1A1A1A]', 'border-[#333]')
            updated = updated.replace('border-[#111]', 'border-[#444]')
            
            if updated != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(updated)
                print(f"Updated borders in {path}")
