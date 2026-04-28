import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activityRouter } from './routes/activity.route.js';
import { reportRouter } from './routes/report.route.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDir, '../.env') });

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/activity', activityRouter);
app.use('/api/reports', reportRouter);

export { app };
