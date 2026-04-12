import { useState, useEffect } from 'react';
import { Key, Save, RefreshCw, Wand2, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ApiKeySettings() {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadApiKey();
    }, []);

    const loadApiKey = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/system/api-key');
            if (!response.ok) {
                throw new Error('Failed to fetch API Key');
            }
            const data = await response.json();
            setApiKey(data.apiKey || '');
            setError(null);
        } catch (err: any) {
            console.error('Failed to load API Key:', err);
            setError('Failed to load API Key');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch('/api/system/api-key', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey }),
            });

            if (!response.ok) {
                throw new Error('Failed to save API Key');
            }

            toast.success('API Key saved. Server restarting...');
            setError(null);

            // Wait for restart
            setTimeout(() => {
                window.location.reload();
            }, 3000);

        } catch (err: any) {
            console.error('Failed to save API Key:', err);
            setError('Failed to save changes');
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = () => {
        const randomString = Array.from(crypto.getRandomValues(new Uint8Array(24)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        setApiKey(randomString);
    };

    const handleCopy = async () => {
        if (!apiKey) return;
        try {
            await navigator.clipboard.writeText(apiKey);
            toast.success('API Key copied to clipboard');
        } catch (err) {
            toast.error('Failed to copy API Key');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-primary-muted">Loading settings...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        API Key Configuration
                    </h2>
                    <p className="text-sm text-primary-muted mt-1">
                        Manage the Global API Key used for integrations like MCP (Model Context Protocol).
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-app rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md active:scale-95"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-900/30">
                    {error}
                </div>
            )}

            <div className="bg-app-surface border border-border rounded-lg overflow-hidden shadow-sm">
                <div className="p-4 bg-app-subtle/50">
                    <label className="block text-sm font-medium mb-2 text-primary-muted">
                        Global API Key
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="flex-1 px-3 py-2 bg-app-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            disabled={!apiKey}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap font-medium"
                            title="Copy to Clipboard"
                        >
                            <Copy className="w-4 h-4" />
                            Copy
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors flex items-center gap-2 whitespace-nowrap font-medium"
                        >
                            <Wand2 className="w-4 h-4" />
                            Generate
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-lg">
                <strong>Note:</strong> Changes to the API Key will restart the server. It may take a few moments for the new settings to take effect.
            </div>
        </div>
    );
}
