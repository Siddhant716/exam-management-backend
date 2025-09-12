require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth');
const examRoutes = require('./src/routes/exams');
// const scoreRoutes = require('./src/routes/scores');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Root route to show backend is running
app.get('/', (req, res) => {
  res.json({ 
    message: 'Equestrian Exam Management System (EEMS) Backend is running!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
// app.use('/api/scores', scoreRoutes);

app.use(errorHandler);
const judgeRoutes = require('./src/routes/judge');
app.use('/api/judges', judgeRoutes);


const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
});
