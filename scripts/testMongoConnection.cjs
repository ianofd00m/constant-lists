require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

mongoose.connect(uri)
  .then(() => {
    console.log('Connected!');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error('Connection error:', err);
  });
