import express from 'express';
const app = express();
const port = process.env.PORT || 3003;
app.get('/', (req, res) => res.send('Read Service'));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.listen(port, () => console.log(`Read service listening on port ${port}`));
