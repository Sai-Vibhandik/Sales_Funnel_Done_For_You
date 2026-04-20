const mongoose = require('mongoose');

const connectDB = async () => {
  const atlasUri = process.env.MONGODB_URI;
  // const atlasUri = 'mongodb+srv://bniket2107_db_user:Bniket%402107@cluster0.i55mkfz.mongodb.net/growth-valley?appName=Cluster0&tls=true&tlsAllowInvalidCertificates=true'

  // Hide password in logs
  const sanitizedUri = atlasUri?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log('🔍 Connecting to MongoDB:', sanitizedUri);

  const options = {
    serverSelectionTimeoutMS: 30000, // 30 seconds for Atlas
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  };

  try {
    const conn = await mongoose.connect(atlasUri, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    return;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);

    // More specific error messages
    if (error.message.includes('ENOTFOUND')) {
      console.error('   → DNS lookup failed. Check if the cluster URL is correct.');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('   → Connection timed out. Check if your IP is whitelisted in MongoDB Atlas.');
    } else if (error.message.includes('authentication failed')) {
      console.error('   → Authentication failed. Check username and password.');
    } else if (error.message.includes('network error')) {
      console.error('   → Network error. Check your internet connection or firewall settings.');
    }
  }

  // If connection failed
  console.error('\n❌ Could not connect to MongoDB.');
  console.error('\n📋 To fix this:');
  console.error('1. For MongoDB Atlas: Whitelist your IP at https://cloud.mongodb.com → Network Access → Add IP');
  console.error('2. Check if the connection string is correct in .env file');
  console.error('3. Verify username and password are correct');
  console.error('4. Ensure network allows outbound connections on port 27017');
  process.exit(1);
};

module.exports = connectDB;