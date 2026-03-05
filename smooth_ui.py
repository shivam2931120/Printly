import os

directory = '/home/shivam/Printly/components'

def make_ui_smooth():
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                original = content
                
                # Broadly target our dark UI containers and panels
                content = content.replace('bg-[#0A0A0A] border border-[#333]', 'bg-[#0A0A0A] border border-[#333] rounded-2xl shadow-2xl')
                content = content.replace('bg-[#111] border border-[#333]', 'bg-[#111] border border-[#333] rounded-2xl shadow-2xl')
                content = content.replace('bg-surface-dark border', 'bg-surface-dark border rounded-2xl shadow-xl')
                content = content.replace('bg-background-card border', 'bg-background-card border rounded-2xl shadow-xl')
                
                # Fix sidebars and headers we strictly want flush, but most inner panels are fine.
                # Remove duplicate additions just in case
                content = content.replace('rounded-2xl rounded-2xl', 'rounded-2xl')
                content = content.replace('shadow-2xl shadow-2xl', 'shadow-2xl')
                content = content.replace('shadow-xl shadow-xl', 'shadow-xl')
                content = content.replace('shadow-lg shadow-lg', 'shadow-lg')

                if original != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Smoothed {path}")

make_ui_smooth()
