# Guide: Testing AI MCP Integrations (Clean Slate Strategy)

When developing an MCP server (like FormCMS) while simultaneously trying to test the end-user experience, you run into two major issues:
1. **Context Contamination**: The AI sees your open backend files (e.g., `schema.ts`) and gets distracted.
2. **Shared Memory**: The AI remembers your past conversations and Knowledge Items (KIs), preventing it from acting like a "brand new user."

This guide explains how to properly isolate the AI to test the true onboarding flow.

## 1. The Dual-Window Workspace

To prevent the AI from seeing your backend source code, you must separate the workspaces:

* **Window 1 (Backend)**: Open ONLY `formcms-repos` in this IDE instance. Use this window to write backend code, manage Docker, and restart the MCP server. Do not chat with the AI about frontend usage here.
* **Window 2 (Frontend)**: Open a completely new IDE instance pointing ONLY to your test project (e.g., `react-demo/my-app`).

The AI's context is scoped to the active IDE window. By keeping them separate, Window 2's AI will only see frontend files.

## 2. The "Clean Slate" Terminal Trick

Even with separate windows, the AI shares a global "brain" across your computer (`~/.gemini/antigravity`). To force the AI to forget all past Knowledge Items and act like a brand new user:

1. Open your terminal.
2. Back up the AI's brain:
   ```bash
   mv ~/.gemini/antigravity ~/.gemini/antigravity_backup
   ```
3. The next time you start a chat session, the AI will generate a fresh, empty brain folder. 

## 3. Step-by-Step Testing Workflow

Follow these steps for a pure end-to-end test:

1. **Start Backend**: From Window 1, start the FormCMS server on `localhost:5000` (make sure it's emitting `event: endpoint` on the SSE route).
2. **Wipe Memory**: Run the `mv` backup command shown above.
3. **Scaffold Frontend**: Open Window 2, scaffold a Vite app, and create your `antigravity.yaml` (pointing to the MCP server with your API key).
4. **Start Fresh Chat**: In Window 2, start a **new** AI chat session. This reads the YAML and triggers the MCP tool injection.
5. **Prompt**: Ask the AI: *"Create post, category, and tag entities."* The AI will now rely entirely on the dynamically injected MCP tools and your `SKILL.md` file, exactly as a new user would experience.

## 4. Restoring Your Memory

Once you've finished testing and want the AI to remember your past FormCMS context:

```bash
# Delete the temporary blank slate
rm -rf ~/.gemini/antigravity

# Restore your experienced brain
mv ~/.gemini/antigravity_backup ~/.gemini/antigravity
```
