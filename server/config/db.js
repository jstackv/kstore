const mongoose = require('mongoose');

// Serverless platforms (Vercel) can run many concurrent function instances,
// and each cold start would otherwise open its own MongoDB connection,
// quickly exhausting Atlas's connection limit. Caching the connection (and
// the in-flight connect promise) on `global` means warm invocations of the
// same instance reuse it instead of reconnecting. This is a no-op but
// harmless for traditional long-lived hosting (Render/Railway/local) too.
let cached = global.__kstoreMongoose;
if (!cached) {
  cached = global.__kstoreMongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((m) => {
      console.log(`MongoDB connected: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // let the next call retry instead of reusing a dead promise
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
