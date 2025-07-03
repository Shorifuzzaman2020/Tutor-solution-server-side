
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.get('/',(req, res) =>{
    res.send('Tutor server site')
})
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzmpelq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database connection and server startup
async function startServer() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");
    
    // Start Express server
    app.listen(port, () => {
      console.log(`Server is running on port: ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
}

startServer();


// POST /users - Save user data
app.post('/users', async (req, res) => {
  try {
    const userData = req.body;
    const db = client.db('tutorSolutionDB');
    const collection = db.collection('users');

    const existingUser = await collection.findOne({ uid: userData.uid });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const result = await collection.insertOne(userData);
    res.status(201).json({ insertedId: result.insertedId });
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
