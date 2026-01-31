import express from 'express';
const app = express();
const port = process.env.PORT || 3001;
app.get('/', (req, res) => res.send('Command Service'));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.listen(port, () => console.log(`Command service listening on port ${port}`));
