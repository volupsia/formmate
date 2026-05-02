// {{SESSION_ID}} and {{SESSION_ID_SHORT}} are replaced at request time by index.ts
export const loginHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FormCMS — MCP Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        dark: '#1e1e2e',
                        darker: '#181825',
                        primary: '#cba6f7',
                        success: '#a6e3a1',
                        info: '#89b4fa',
                        error: '#f38ba8',
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-dark text-gray-200 min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
        <div class="bg-darker border border-gray-800 rounded-2xl shadow-2xl p-8">
            <!-- Header -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-info/30 border border-primary/20 mb-4">
                    <svg class="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                </div>
                <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-info">FormCMS</h1>
                <p class="text-sm text-gray-500 mt-1">Sign in to authenticate your MCP session</p>
                <div class="mt-3 px-3 py-1.5 bg-info/10 border border-info/20 rounded-full inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-info animate-pulse"></span>
                    <span class="text-xs text-info font-mono">Session: {{SESSION_ID_SHORT}}</span>
                </div>
            </div>

            <!-- Login Form -->
            <form id="login-form" class="space-y-4">
                <input type="hidden" id="session-id" value="{{SESSION_ID}}">

                <div>
                    <label class="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                        Username or Email
                    </label>
                    <input
                        id="username"
                        type="text"
                        autocomplete="username"
                        class="w-full bg-dark border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                        placeholder="admin"
                    >
                </div>

                <div>
                    <label class="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        autocomplete="current-password"
                        class="w-full bg-dark border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                        placeholder="••••••••"
                    >
                </div>

                <div id="error-msg" class="hidden px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error"></div>

                <button
                    id="submit-btn"
                    type="submit"
                    class="w-full py-3 px-4 bg-gradient-to-r from-primary to-info text-darker font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                    <span id="btn-text">Sign in</span>
                    <svg id="spinner" class="hidden w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                </button>
            </form>

            <!-- Success state -->
            <div id="success-state" class="hidden text-center py-4">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 border border-success/30 mb-4">
                    <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <h2 class="text-lg font-bold text-success">Logged in successfully!</h2>
                <p class="text-sm text-gray-500 mt-2">You can close this tab and return to your AI assistant.</p>
            </div>
        </div>

        <p class="text-center text-xs text-gray-700 mt-4">FormCMS MCP Server — Session Authentication</p>
    </div>

    <script>
        const form = document.getElementById('login-form');
        const submitBtn = document.getElementById('submit-btn');
        const btnText = document.getElementById('btn-text');
        const spinner = document.getElementById('spinner');
        const errorMsg = document.getElementById('error-msg');
        const successState = document.getElementById('success-state');
        const sessionId = document.getElementById('session-id').value;

        document.getElementById('username').focus();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameOrEmail = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!usernameOrEmail || !password) {
                showError('Please enter your username and password.');
                return;
            }

            setLoading(true);
            errorMsg.classList.add('hidden');

            try {
                const res = await fetch('/mcp/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usernameOrEmail, password, sessionId }),
                });
                const data = await res.json();

                if (data.success) {
                    form.classList.add('hidden');
                    successState.classList.remove('hidden');
                    setTimeout(() => { try { window.close(); } catch (e) {} }, 1500);
                } else {
                    showError(data.error || 'Login failed. Please check your credentials.');
                    setLoading(false);
                }
            } catch (err) {
                showError('Could not reach the MCP server. Is it still running?');
                setLoading(false);
            }
        });

        function setLoading(on) {
            submitBtn.disabled = on;
            spinner.classList.toggle('hidden', !on);
            btnText.textContent = on ? 'Signing in…' : 'Sign in';
        }

        function showError(msg) {
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
        }
    </script>
</body>
</html>`;
