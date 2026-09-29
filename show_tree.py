import os
import sys

def print_tree(startpath, exclude_dirs=None, indent=""):
    if exclude_dirs is None:
        exclude_dirs = {'.git', 'node_modules', 'venv', '__pycache__', '.next', '.pytest_cache', '.idea', '.vscode'}
    
    try:
        items = sorted(os.listdir(startpath))
    except PermissionError:
        return
    
    # Separate directories and files
    dirs = [item for item in items if os.path.isdir(os.path.join(startpath, item)) and item not in exclude_dirs]
    files = [item for item in items if os.path.isfile(os.path.join(startpath, item))]
    
    for i, d in enumerate(dirs):
        path = os.path.join(startpath, d)
        is_last = (i == len(dirs) - 1) and (len(files) == 0)
        connector = "└── " if is_last else "├── "
        print(f"{indent}{connector}{d}/")
        
        # Recurse
        next_indent = indent + ("    " if is_last else "│   ")
        print_tree(path, exclude_dirs, next_indent)
        
    for i, f in enumerate(files):
        is_last = (i == len(files) - 1)
        connector = "└── " if is_last else "├── "
        print(f"{indent}{connector}{f}")

if __name__ == "__main__":
    # Use current working directory or absolute path to cme_app
    root_path = os.path.dirname(os.path.abspath(__file__))
    print(f"Directory structure for: {root_path}")
    print("==================================================")
    print_tree(root_path)
