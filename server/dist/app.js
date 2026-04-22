import cors from 'cors';
import express from 'express';
import { activityRouter } from './routes/activity.route.js';
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/api/activity', activityRouter);
export { app };
