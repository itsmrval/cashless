const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userRoutes = require('./routes/user');
const cardRoutes = require('./routes/card');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const beneficiaryRoutes = require('./routes/beneficiary');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const adminUser = new User({
        username: 'admin',
        password: 'admin',
        name: 'Administrator',
        role: 'admin'
      });

      await adminUser.save();
      console.log('Default admin user created: admin/admin');
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/v1/auth', authRoutes);
app.use('/v1/user', userRoutes);
app.use('/v1/user', beneficiaryRoutes);
app.use('/v1/card', cardRoutes);
app.use('/v1/transactions', transactionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
