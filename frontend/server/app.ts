import 'dotenv/config';
import express from 'express';
import { apiRouter } from './routes';

// Shared by the local Node server and the Vercel function.
// Importing this module never opens a listening socket.
export const app = express();
app.use(express.json());
app.use('/api', apiRouter);

export default app;
