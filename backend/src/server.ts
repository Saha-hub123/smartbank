import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes';
import nasabahRoutes from './routes/nasabahRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/nasabah', nasabahRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
