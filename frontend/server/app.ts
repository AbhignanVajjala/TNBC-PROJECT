import 'dotenv/config';
import express from 'express';
import { apiRouter } from './routes';

// Shared by the local Node server and the Vercel function.
// Importing this module never opens a listening socket.
export const app = express();
app.use(express.json({limit:'16kb',strict:true}));
app.use('/api', apiRouter);
app.use('/api', (_req,res)=>res.status(404).json({error:'API endpoint not found.'}));

export default app;
