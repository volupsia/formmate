import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function main() {
  // Test with trailing slash, and without trailing slash
  const transport = new SSEClientTransport(new URL("http://localhost:5000/mcp/sse"), {
    headers: {
      "Authorization": "Bearer f3400e0ac65e11770f5c13d94fc24c76d244368814eefcbd"
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
