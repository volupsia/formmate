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
<body class="bg-dark text-gray-200 h-screen flex flex-col font-mono text-sm leading-relaxed antialiased overflow-hidden">
    <header class="bg-darker p-4 border-b border-gray-800 flex justify-between items-center shadow-md z-20 shrink-0">
        <div>
            <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-info flex items-center gap-2">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                MCP Server Live Logs
            </h1>
            <p class="text-xs text-gray-500 mt-1">Intercepting live JSON-RPC traffic between any MCP client and this server</p>
        </div>
        <button onclick="clearLogs()" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded cursor-pointer transition-colors border border-gray-700 text-xs shadow-sm font-semibold flex items-center gap-2">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            Clear Logs
        </button>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
        <!-- left side table -->
        <div class="w-1/2 border-r border-gray-800 flex flex-col bg-dark relative">
            <div class="overflow-auto custom-scrollbar flex-1 relative" id="logs-container">
                <table class="w-full text-left border-collapse table-fixed">
                    <thead class="bg-darker sticky top-0 z-10 shadow-sm border-b border-gray-800">
                        <tr>
                            <th class="p-3 text-xs font-semibold text-gray-400 w-32 shrink-0">Time</th>
                            <th class="p-3 text-xs font-semibold text-gray-400 w-20 shrink-0">Dir</th>
                            <th class="p-3 text-xs font-semibold text-gray-400">Method/Type</th>
                        </tr>
                    </thead>
                    <tbody id="logs-table-body" class="divide-y divide-gray-800/50 flex-1">
                        <tr id="waiting-row">
                            <td colspan="3" class="p-4 text-center text-gray-500 italic">Waiting for JSON-RPC messages...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- right side details -->
        <div class="w-1/2 bg-[#181825] flex flex-col relative">
            <div class="p-3 bg-dark min-h-[44px] border-b border-gray-800 flex items-center justify-between text-xs font-semibold text-gray-400 shrink-0 z-10 shadow-sm">
                <span>Message Details</span>
                <span id="detail-session" class="text-gray-600 truncate max-w-[250px] font-mono text-[10px]"></span>
            </div>
            <div class="p-4 overflow-auto custom-scrollbar flex-1 relative bg-[#11111b]/50">
                <pre id="detail-content" class="text-[13px] text-gray-300 whitespace-pre-wrap break-all hidden font-mono leading-relaxed"></pre>
                <div id="detail-empty" class="text-center text-gray-500 italic mt-10">Select an item to view details</div>
            </div>
        </div>
    </div>

    <script>
        const tbody = document.getElementById('logs-table-body');
        const logsContainer = document.getElementById('logs-container');
        const detailSession = document.getElementById('detail-session');
        const detailContent = document.getElementById('detail-content');
        const detailEmpty = document.getElementById('detail-empty');
        
        let hasLogs = false;
        let selectedRow = null;

        window.clearLogs = function() {
            fetch('/mcp/admin/history', { method: 'DELETE' }).then(() => {
                tbody.innerHTML = '';
                hasLogs = false;
                if (selectedRow) selectedRow = null;
                detailContent.classList.add('hidden');
                detailEmpty.classList.remove('hidden');
                detailSession.innerText = '';
            });
        };

        const appendLog = function(data) {
            const waitingRow = document.getElementById('waiting-row');
            if (waitingRow && waitingRow.parentNode) {
                waitingRow.parentNode.removeChild(waitingRow);
            }
            
            const isOutgoing = data.type === 'outgoing';
            const row = document.createElement("tr");
            row.className = "hover:bg-white/5 cursor-pointer transition-colors";
            
            // Time
            const timeTd = document.createElement("td");
            timeTd.className = "p-3 text-[11px] text-gray-500 font-mono whitespace-nowrap truncate w-32";
            timeTd.innerText = new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit', fractionalSecondDigits: 3 });
            
            // Dir
            const dirTd = document.createElement("td");
            dirTd.className = "p-3 w-20";
            const badge = document.createElement('span');
            badge.className = \`px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-bold tracking-wide \${isOutgoing ? 'bg-info/20 text-info' : 'bg-success/20 text-success'}\`;
            badge.innerText = isOutgoing ? 'OUT' : 'IN';
            dirTd.appendChild(badge);

            // Method/Type
            const methodTd = document.createElement("td");
            methodTd.className = "p-3 text-sm truncate max-w-[200px]";
            
            let methodOrType = 'Unknown';
            let isError = false;
            
            if (data.message?.method) {
                methodOrType = data.message.method;
            } else if (data.message?.result !== undefined) {
                methodOrType = data.message.id !== undefined ? \`Result (id: \${data.message.id})\` : 'Result';
            } else if (data.message?.error) {
                methodOrType = data.message.id !== undefined ? \`Error (id: \${data.message.id})\` : 'Error';
                isError = true;
            } else if (data.message?.id !== undefined) {
                methodOrType = \`Message (id: \${data.message.id})\`;
            }
            
            methodTd.innerText = methodOrType;
            if (isError) {
                methodTd.classList.add('text-red-400');
            }

            row.appendChild(timeTd);
            row.appendChild(dirTd);
            row.appendChild(methodTd);
            
            row.onclick = () => {
                if (selectedRow) {
                    selectedRow.classList.remove('bg-white/10');
                    selectedRow.classList.remove('border-l-2');
                    selectedRow.classList.remove('border-primary');
                }
                selectedRow = row;
                row.classList.add('bg-white/10');
                row.classList.add('border-l-2');
                row.classList.add('border-primary');
                
                detailSession.innerText = \`Session: \${data.sessionId}\`;
                detailContent.innerHTML = syntaxHighlight(JSON.stringify(data.message, null, 2));
                detailContent.classList.remove('hidden');
                detailEmpty.classList.add('hidden');
            };
            
            tbody.appendChild(row);
            
            // smooth auto-scroll logic
            const isAtBottom = logsContainer.scrollHeight - logsContainer.scrollTop <= logsContainer.clientHeight + 80;
            if (isAtBottom) {
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        };

        // basic syntax highlighting for JSON payload
        function syntaxHighlight(json) {
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
                let cls = 'text-primary';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'text-info'; // keys
                    } else {
                        cls = 'text-success'; // string values
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'text-blue-400';
                } else if (/null/.test(match)) {
                    cls = 'text-red-400';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        // Fetch historical logs first
        fetch('/mcp/admin/history?limit=200')
            .then(res => res.json())
            .then(history => {
                if (history && history.length > 0) {
                    tbody.innerHTML = ''; hasLogs = true;
                    history.forEach(data => appendLog(data));
                    setTimeout(() => logsContainer.scrollTop = logsContainer.scrollHeight, 100);
                }
            })
            .finally(() => {
                // Connect live stream after history is loaded
                const evtSource = new EventSource("/mcp/admin/stream");
                evtSource.onmessage = function(event) {
                    if (!hasLogs) { tbody.innerHTML = ''; hasLogs = true; }
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #45475a; }
    </style>
</body>
</html>
`;
