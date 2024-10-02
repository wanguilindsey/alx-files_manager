import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(request, response) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      const email = auth[0];
      const password = auth[1];
      const hashedPassword = sha1(password);

      const user = await dbClient.getUser({ email });

      if (!user || hashedPassword !== user.password) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const key = `auth_${token}`;
      const duration = 60 * 60 * 24;
      await redisClient.set(key, user._id.toString(), duration);

      return response.status(200).json({ token });
    } catch (err) {
      console.error(err);
      return response.status(500).json({ error: 'Server error' });
    }
  }

  static async getDisconnect(request, response) {
    try {
      const userToken = request.header('X-Token');
      // console.log('USER TOKEN DISCONNECT', userToken);
      const userKey = await redisClient.get(`auth_${userToken}`);
      // console.log('USER KEY DISCONNECT', userKey);
      
      if (!userKey) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
      
      await redisClient.del(`auth_${userToken}`);
      return response.status(204).send(); // Send no content on successful disconnection
    } catch (err) {
      console.error(err);
      return response.status(500).json({ error: 'Server error' });
    }
  }
}

export default AuthController;
