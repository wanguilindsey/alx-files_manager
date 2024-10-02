import { dbClient } from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
    static async getStatus(req, res) {
        const redisAlive = redisClient.isAlive(); // Check if Redis is alive
        const dbAlive = dbClient.isAlive(); // Check if DB is alive
        
        return res.status(200).json({ redis: redisAlive, db: dbAlive });
    }

    static async getStats(req, res) {
        const usersCount = await dbClient.nbUsers(); // Get the number of users
        const filesCount = await dbClient.nbFiles(); // Get the number of files

        return res.status(200).json({ users: usersCount, files: filesCount });
    }
}

export default AppController;
