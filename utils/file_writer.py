import sys
import os
import datetime

LOG_FILE = "terminal_log.log"  # Ensure logging is consistent with Node.js

def log_message(message):
    """Append log messages to the shared log file."""
    timestamp = datetime.datetime.now().strftime("[%Y-%m-%d %H:%M:%S]")
    with open(LOG_FILE, "a", encoding="utf-8") as log:
        log.write(f"{timestamp} {message}\n")

def write_file(file_path, content):
    """Writes content to a file, ensuring proper directory structure and logging operations."""
    try:
        # Ensure the parent directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        # Write content to the file
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        log_message(f"[SUCCESS] File written successfully: {file_path}")
        print(f"[SUCCESS] File written: {file_path}")

    except Exception as e:
        log_message(f"[ERROR] Failed to write file {file_path}: {str(e)}")
        print(f"[ERROR] Failed to write file {file_path}: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        log_message("[ERROR] Usage: python file_writer.py <file_path> <content>")
        print("[ERROR] Usage: python file_writer.py <file_path> <content>")
        sys.exit(1)

    file_path = sys.argv[1]
    content = sys.argv[2]

    log_message(f"[INPUT] Writing to file: {file_path}")
    write_file(file_path, content)
