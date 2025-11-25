import os
import sys

# -------- CONFIGURATION --------
OUTPUT_FILE = "project_dump.txt"

# Allowed source file extensions
ALLOWED_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".css", ".scss"
}

# Directories to ignore
IGNORE_DIRS = {
    "node_modules",
    "public"
}

# -------- UTILITIES --------

def is_binary_file(filepath):
    """Safely detect binary files by reading small part."""
    try:
        with open(filepath, "rb") as f:
            chunk = f.read(1024)
        if b"\0" in chunk:
            return True
    except:
        return True
    return False

def should_ignore_dir(dirname):
    """Ignore node_modules, public, and hidden directories."""
    if dirname in IGNORE_DIRS:
        return True
    if dirname.startswith("."):
        return True
    return False

def should_ignore_file(filename):
    """Ignore dotfiles like .env, .gitignore, etc."""
    if filename.startswith("."):
        return True
    _, ext = os.path.splitext(filename)
    return ext not in ALLOWED_EXTENSIONS

# -------- MAIN SCRIPT --------

def dump_project(root_dir):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("=== PROJECT CODEBASE DUMP ===\n\n")

        for current_dir, dirs, files in os.walk(root_dir):
            # Modify dirs in-place to avoid walking ignored directories
            dirs[:] = [d for d in dirs if not should_ignore_dir(d)]

            for file in files:
                if file == OUTPUT_FILE:
                    continue
                if should_ignore_file(file):
                    continue

                filepath = os.path.join(current_dir, file)

                if is_binary_file(filepath):
                    continue

                relpath = os.path.relpath(filepath, root_dir)

                # Write header
                out.write(f"\n\n===== FILE: {relpath} =====\n\n")

                # Write file contents safely
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        out.write(f.read())
                except UnicodeDecodeError:
                    # fallback using latin-1 if needed
                    with open(filepath, "r", encoding="latin-1") as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"[ERROR READING FILE: {e}]\n")

    print(f"\n✔ Project code successfully dumped to '{OUTPUT_FILE}'")

# -------- ENTRY POINT --------

if __name__ == "__main__":
    project_root = os.path.abspath(os.path.dirname(__file__))
    dump_project(project_root)
