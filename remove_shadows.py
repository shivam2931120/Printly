import os
import re

directory = '/home/shivam/Printly/components'

# Match classes like shadow, shadow-sm, shadow-[something], hover:shadow-2xl, focus:shadow-inner
shadow_pattern = re.compile(r'\b(?:hover:|focus:)?shadow(?:-[a-z0-9]+|-\[[^\]]+\])?\b')

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove all shadow related classes globally
            updated = shadow_pattern.sub('', content)
            
            # Condense multiple spaces inside quotes back to one
            # Note: A simplistic approach, but good enough for class names
            updated = updated.replace('  ', ' ')
            
            if updated != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(updated)
                print(f"Removed shadow classes in {path}")
