import mongoose from 'mongoose';

export const connectToDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ping-assignment';
    
    await mongoose.connect(mongoUri);
    
    console.log('📦 Connected to MongoDB database');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB database');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
    process.exit(1);
  }
};


