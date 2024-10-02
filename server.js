import express from 'express';
import { dbClient } from './utils/db';
import routes from './routes/index.js'; // Load routes

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Load all routes
app.use(routes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
