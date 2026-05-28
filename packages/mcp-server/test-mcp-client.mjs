import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function main() {
  // Test with trailing slash, and without trailing slash
  const transport = new SSEClientTransport(new URL("http://localhost:5000/mcp/sse"), {
    headers: {
      "Authorization": "Bearer 2fd5e1f82c542d870b848338174bc0b23c38e2aebd824eae"
    }
  });
  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  
  console.log("Connecting...");
  try {
      await client.connect(transport);
      console.log("Connected!");
      const tools = await client.listTools();
      console.log("Tools:", tools);
  } catch (err) {
      console.error(err);
  }
  process.exit(0);
}

main().catch(console.error);
