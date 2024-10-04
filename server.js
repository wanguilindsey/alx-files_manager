import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import controllerRouting from './routes/index';
import redisClient from './utils/redis';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: 'Wangui',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS in production
      httpOnly: true, // Ensures the cookie is only sent over HTTP(S), not accessible via JavaScript
      maxAge: 1000 * 60 * 60 * 24, // 1 day in milliseconds
    },
  }),
);

controllerRouting(app);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
