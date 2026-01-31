import express from 'express';
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('API Gateway'));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));
app.listen(port, () => console.log(`API Gateway listening on port ${port}`));
