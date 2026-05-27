# Screenshot Guide — Cursor Video

Please capture the following screenshots and save them to `video/cursor/screenshots/`.
For a clean capture on macOS, press `Cmd+Shift+4`, then `Space`, and click the window you want to capture.

| # | Filename | What to capture | Notes |
|---|----------|-----------------|-------|
| 1 | `s01_intro.png` | The FormCMS wiki / landing page hero section | Zoom browser to 110% |
| 2 | `s02_docker_run.png` | Terminal showing `docker run` command | Use Cursor integrated terminal, dark theme |
| 3 | `s03_admin_portal.png` | http://localhost:5000/mate setup wizard | Full browser window |
| 4 | `s04_api_key.png` | Settings → API Key Configuration page | Blur the actual key if needed |
| 5 | `s05_mcp_config.png` | Cursor with `.cursor/mcp.json` open | Show file tree on left with .cursor folder visible |
| 6 | `s06_skill_file.png` | Terminal showing curl command + success | Show `.cursor/rules/` directory with skill file |
| 7 | `s07_cursor_prompt.png` | Cursor chat panel with scaffold prompt typed | Show Cursor agent response beginning |
| 8 | `s08_running_app.png` | Browser showing the running React app | Show PostList with cards |
| 9 | `s09_deploy_prompt.png` | Cursor chat with deploy prompt | Show `deploy_spa` tool call |
| 10 | `s10_live_app.png` | Browser at http://localhost:5000 showing live app | Full browser, no dev tools |

Once you have saved all 10 screenshots into `video/cursor/screenshots/`, run:
```bash
bash video/run_all.sh cursor
```
