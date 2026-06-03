import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes';
import tellerRoutes from './routes/tellerRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/teller', tellerRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
