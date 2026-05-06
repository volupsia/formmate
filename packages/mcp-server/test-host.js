const express = require('express');
const app = express();
app.get('/test', (req, res) => {
    res.send(`Host: ${req.get('host')}`);
});
app.listen(5001, () => console.log('listening'));
