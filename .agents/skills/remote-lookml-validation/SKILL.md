---
name: remote-lookml-validation
description: >-
  How to validate LookML syntax against a sandbox remote Looker instance using looker-cli.
---
This skill covers how to enter/switch session workspace/dev modes, update LookML project files, and execute the LookML project validator using `looker-cli`.
---
### Validate Local Configuration & Auth
At any point, you can verify that `looker-cli` is installed and configured with a valid profile and authentication token.
1. **Check Configured Profiles**:
   ```bash
   looker-cli profile ls
   ```
   *Expected Output*: Displays available profiles. Note which profile is active. If more than one profile is available, a sandbox profile should be identified and set/retrieved as `SANDBOX_PROFILE` in a dev.env file in the local working project.
2. **Verify Authentication Token**:
   ```bash
   looker-cli user me --token-file
   ```
   *Expected Output*: Returns user details (e.g., User ID, Email, Name) indicating a valid session token in `~/.looker_auth`.
3. **Confirm target project**
    A "sandbox project ID" should be idnetified, and can be set/retrieved as `SANDBOX_PROJECT_ID` in a dev.env file in the local working project
---
### Switching Session Workspace to Dev Mode
Looker prohibits modifying project files while in `production` mode. Always update the session to `dev` mode before starting to work.
1. **Check Current Session State**:
   ```bash
   looker-cli session get --token-file
   ```
2. **Switch to Dev Workspace**:
   ```bash
   looker-cli session update dev --token-file
   ```
   *Expected Output*:
   ```json
   {
     "workspace_id": "dev"
   }
   ```
---
### Inspecting and Updating Project Files
1. **List Project Files**:
   ```bash
   looker-cli project file ls <PROJECT_ID> --token-file
   ```
2. **View Current File Content**:
   ```bash
   looker-cli project file cat <PROJECT_ID> <FILE_PATH> --token-file
   ```
3. **Update Project File**:
   Write the desired LookML code to a local temporary file (e.g. `updated_file.lkml`), then upload it:
   ```bash
   looker-cli project file update <PROJECT_ID> <FILE_PATH> ./updated_file.lkml --token-file
   ```
   *Expected Output*: `Updated file '<FILE_PATH>' in project '<PROJECT_ID>'`
---
### Running the LookML Validator
Validate the LookML project code to catch syntax and model errors.
```bash
looker-cli project validate <PROJECT_ID> --token-file
```
* **Clean Result**:
  ```text
  Project is valid.
  ```
* **Validation Failure**: Returns formatted table with error details (`severity`, `file_path`, `line_number`, `message`).
---
### Checking Model Interpretation
Inspect how Looker semantically parses and interprets models, explores, and fields.

1. **Inspect Parsed Model JSON**:
   ```bash
   looker-cli model cat <MODEL_NAME> --token-file
   ```
   *Expected Output*: Returns JSON schema of the LookML model as compiled by Looker.

2. **Inspect Explore Definition & Fields via API**:
   ```bash
   looker-cli api lookmlmodel lookml_model_explore <MODEL_NAME> <EXPLORE_NAME> --token-file
   ```
   *Expected Output*: Returns detailed field definitions, joins, and filter specifications for the Explore.

3. **Fetch Generated SQL for Inline Query**:
   For rare edge cases, to confirm how Looker compiles specific field/join/model declarations into SQL:
   ```bash
   echo '{"model":"<MODEL_NAME>","view":"<EXPLORE_NAME>","fields":["<VIEW_NAME>.<FIELD_NAME>"]}' | looker-cli api query run_inline_query sql - --token-file
   ```
   *Expected Output*: Returns the exact SQL statement compiled by Looker without executing the underlying database query.
