const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the website files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Health check (Kubernetes will use this later)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Runbook site running on port ${PORT}`);
});
