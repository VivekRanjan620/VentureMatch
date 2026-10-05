import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { AppError } from './lib/errors';
import { env } from './config/env';

const app = express();

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Global Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API v1 Routes
app.use('/api/v1', routes);

// 404 Handler for unregistered routes
app.use((_req, _res, next) => {
  next(AppError.notFound('Route not found'));
});

// Global Error Handler
app.use(errorHandler);

export default app;
