export const adminHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Server Logs</title>
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
                        info: '#89b4fa'
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-dark text-gray-200 h-screen flex flex-col font-mono text-sm leading-relaxed antialiased">
    <header class="bg-darker p-4 border-b border-gray-800 flex justify-between items-center shadow-md z-10">
        <div>
            <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-info flex items-center gap-2">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                MCP Server Live Logs
            </h1>
            <p class="text-xs text-gray-500 mt-1">Intercepting live JSON-RPC traffic between any MCP client and this server</p>
        </div>
        <button onclick="document.getElementById('logs').innerHTML=''" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded cursor-pointer transition-colors border border-gray-700 text-xs shadow-sm font-semibold flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Clear Logs
        </button>
    </header>
    <div class="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar" id="logs">
        <div class="text-center text-gray-500 italic mt-10" id="waiting-msg">Waiting for JSON-RPC messages...</div>
    </div>
    <script>
        const logsDiv = document.getElementById('logs');
        let hasLogs = false;

        const appendLog = function(data) {
            const isOutgoing = data.type === 'outgoing';
            const logEntry = document.createElement("div");
            
            // Layout styling based on direction
            logEntry.className = \`flex flex-col p-4 rounded-xl border max-w-[85%] \${isOutgoing ? 'ml-auto border-info/20 bg-info/5' : 'mr-auto border-success/20 bg-success/5'} shadow-sm transition-all hover:shadow-md\`;
            
            const header = document.createElement("div");
            header.className = "flex items-center gap-3 mb-2 pb-2 border-b border-gray-800";
            
            const badge = document.createElement('span');
            badge.className = \`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide \${isOutgoing ? 'bg-info/20 text-info' : 'bg-success/20 text-success'}\`;
            badge.innerText = isOutgoing ? 'SERVER OUT' : 'CLIENT IN';

            const time = document.createElement('span');
            time.className = 'text-gray-400 text-xs font-semibold tracking-wider';
            time.innerText = new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit', fractionalSecondDigits: 3 });
            
            const session = document.createElement('span');
            session.className = 'text-gray-600 text-[10px] ml-auto truncate max-w-[150px] font-mono';
            session.innerText = \`Sess: \${data.sessionId.substring(0, 8)}...\`;

            header.appendChild(badge);
            header.appendChild(time);
            header.appendChild(session);
            
            const content = document.createElement("pre");
            content.className = "whitespace-pre-wrap break-all text-[13px] text-gray-300 overflow-x-auto custom-scrollbar";
            content.textContent = JSON.stringify(data.message, null, 2);
            
            logEntry.appendChild(header);
            logEntry.appendChild(content);
            logsDiv.appendChild(logEntry);
            
            // smooth auto-scroll logic
            const isAtBottom = logsDiv.scrollHeight - logsDiv.scrollTop <= logsDiv.clientHeight + 150;
            if (isAtBottom) {
                logsDiv.scrollTop = logsDiv.scrollHeight;
            }
        };

        // Fetch historical logs first
        fetch('/admin/history?limit=200')
            .then(res => res.json())
            .then(history => {
                if (history && history.length > 0) {
                    logsDiv.innerHTML = ''; hasLogs = true;
                    history.forEach(data => appendLog(data));
                    setTimeout(() => logsDiv.scrollTop = logsDiv.scrollHeight, 100);
                }
            })
            .finally(() => {
                // Connect live stream after history is loaded
                const evtSource = new EventSource("/admin/stream");
                evtSource.onmessage = function(event) {
                    if (!hasLogs) { logsDiv.innerHTML = ''; hasLogs = true; }
                    let data;
                    try { data = JSON.parse(event.data); } catch(e) { return; }
                    appendLog(data);
                };
                evtSource.onerror = function(err) {
                    console.error("EventSource failed:", err);
                };
            });

    </script>
    <style>
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; border: 2px solid #1e1e2e; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #45475a; border-width: 1px; }
    </style>
</body>
</html>
`;
