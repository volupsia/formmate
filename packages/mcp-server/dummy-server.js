const express = require('express');
const app = express();
app.get('/mcp/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.flushHeaders();
  const sessionId = "dummy-123";
  const absoluteEndpoint = `http://${req.get('host')}/mcp/messages/${sessionId}`;
  res.write(`event: endpoint\ndata: ${absoluteEndpoint}\n\n`);
  setInterval(() => res.write(':\n\n'), 1000);
});
app.post('*', (req, res) => {
  console.log(`POST ${req.url}`);
  res.status(404).send('Not found');
});
app.listen(5001, () => console.log('Dummy server on 5001'));
