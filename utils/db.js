import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}/`;

class DBClient {
  constructor() {
    this.db = null;
    this.connect();
  }

  async connect() {
    try {
      const client = await MongoClient.connect(url, { useUnifiedTopology: true });
      this.db = client.db(database);
      console.log('Successfully connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
    }
  }

  isAlive() {
    return !!this.db; // Returns true if connected
  }

  async nbUsers() {
    return this.db ? this.db.collection('users').countDocuments() : 0;
  }

  async getUser(query) {
    console.log('QUERY IN DB.JS', query);
    const user = this.db ? await this.db.collection('users').findOne(query) : null;
    console.log('GET USER IN DB.JS', user);
    return user;
  }

  async nbFiles() {
    return this.db ? this.db.collection('files').countDocuments() : 0;
  }
}

const dbClient = new DBClient();
export default dbClient;
