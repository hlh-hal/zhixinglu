import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import logsRoutes from './routes/logs.js';
import reviewsRoutes from './routes/reviews.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationsRoutes from './routes/notifications.js';
import communityRoutes from './routes/community.js';
import adminRoutes from './routes/admin.js';
import importExportRoutes from './routes/import-export.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/file', importExportRoutes);
app.use('/api/settings', settingsRoutes);

// General Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// For Vercel, we need to export the app
export default app;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
  });
}
