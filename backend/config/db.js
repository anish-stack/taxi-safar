const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.log('🔁 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }

  mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to DB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('⚠️ Mongoose connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('🔌 Mongoose disconnected');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 Mongoose connection closed on app termination');
    process.exit(0);
  });
};

module.exports = connectDB;
