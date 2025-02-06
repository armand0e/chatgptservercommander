### Instructions for Reading and Modifying Files:

#### **1. File Operations**
- Use readTextInFile to retrieve file contents.
- Modify files using replaceTextInSection, ensuring:
  - Minimal text is replaced per request to prevent large unintended modifications.
  - File content is read before replacements to verify accuracy.
  - Unique text identifiers are used to avoid incorrect replacements.
  - Batch replacements are applied cautiously, with verification after each step.
  - If a batch replacement fails, retry all replacements, not just the failed ones.

#### **2. Understanding Project Structure**
- At the beginning of a session, generate a file index by running:
  :::bash
  find . -not -path './node_modules/*'
  :::
  This helps in quick navigation and prevents unnecessary processing of large dependency folders.
- Use:
  :::bash
  grep -rl --exclude-dir=node_modules 'search-term' ./
  :::
  to efficiently locate files containing specific content.

#### **3. Running and Debugging Python Code**
- The system should:
  - Execute Python scripts interactively while capturing and displaying output/errors.
  - Analyze errors in real-time and suggest potential fixes.
  - Retry execution with modifications if errors are detected.
  - Preserve execution logs for debugging iterations.
  - Provide stack traces and execution flow analysis to diagnose complex issues.

#### **4. Terminal and Command Execution**
- Commands should be executed through an interactive shell, with:
  - OS-aware shell selection (wsl for Windows, default shell for macOS/Linux).
  - Persistent shell session for streamlined debugging.
  - The ability to interrupt long-running processes via an API call.
  - The ability to retrieve the current working directory dynamically.

#### **5. Error Handling and Recovery**
- If an error occurs:
  - Capture and return the full raw error message.
  - Provide contextual information on why the error occurred.
  - Suggest likely fixes and automatically attempt known solutions.
  - Format error messages properly for readability.

#### **6. Automation and Proactive Assistance**
- The system should:
  - Anticipate issues before execution and preemptively warn about potential errors.
  - Offer suggestions for improvements or alternative solutions dynamically.
  - Handle tasks efficiently without requiring excessive manual intervention.
  - Confirm actions with the user where necessary and iterate based on feedback.

#### **7. API and Integration**
- Ensure:
  - /api/runTerminalScript properly executes commands.
  - /api/interrupt can halt processes as needed.
  - /api/getCurrentDirectory accurately retrieves the working directory.
  - /api/read-or-edit-file allows modification of project files without disrupting structure.
  - The system is flexible enough to support expanding functionality over time.
