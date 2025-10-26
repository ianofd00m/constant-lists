require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/constant-lists';

mongoose.connect(uri)
  .then(() => {
    console.log('Connected!');
    return mongoose.connection.db.listCollections().toArray();
  })
  .then(collections => {
    console.log('Collections:', collections.map(c => c.name));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });