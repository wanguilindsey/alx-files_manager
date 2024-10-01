import { MongoClient } from 'mongodb';

class DBClient {
    constructor() {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';
        const uri = `mongodb://${host}:${port}`;

        this.client = new MongoClient(uri, { useUnifiedTopology: true });
        this.db = null;

        this.client.connect()
            .then((client) => {
                this.db = client.db(database);
                console.log('Connected to MongoDB');
            })
            .catch((err) => console.error('MongoDB connection error:', err));
    }

    isAlive() {
        return this.db !== null;
    }

    async nbUsers() {
        return this.db.collection('users').countDocuments();
    }

    async nbFiles() {
        return this.db.collection('files').countDocuments();
    }
}

const dbClient = new DBClient();
export default dbClient;

