# Screenshot Guide

Please capture the following screenshots and save them to `video/screenshots/`.
For a clean capture on macOS, press `Cmd+Shift+4`, then `Space`, and click the window you want to capture.

| # | Filename | What to capture | Notes |
|---|----------|-----------------|-------|
| 1 | `s01_intro.png` | The wiki article hero section | Zoom browser to 110% |
| 2 | `s02_docker_run.png` | Terminal showing `docker run` command | Use dark terminal theme |
| 3 | `s03_admin_portal.png` | http://localhost:5000/mate setup wizard | Full browser window |
| 4 | `s04_api_key.png` | Settings → API Key Configuration page | Blur the actual key if needed |
| 5 | `s05_mcp_config.png` | VS Code with `mcp_config.json` open | Show file tree on left |
| 6 | `s06_skill_file.png` | Terminal showing curl command + success | Show `.agent/skills/` dir |
| 7 | `s07_agent_prompt.png` | Agent chat with scaffold prompt typed | Show agent response beginning |
| 8 | `s08_running_app.png` | Browser showing the running React app | Show PostList with cards |
| 9 | `s09_deploy_prompt.png` | Agent chat with deploy prompt | Show `deploy_spa` tool call |
| 10 | `s10_live_app.png` | Browser at http://localhost:5000 showing live app | Full browser, no dev tools |

Once you have saved all 10 screenshots into `video/screenshots/`, run:
```bash
bash video/run_all.sh
```
