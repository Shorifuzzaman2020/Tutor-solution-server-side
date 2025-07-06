
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
app.use(cors({
    origin: ['http://localhost:5173','https://fir-auth-5fe90.web.app'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
const logger = (req, res, next) => {
    console.log('inside the logger middleware');
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    console.log('cookie in the middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })

}
app.get('/', (req, res) => {
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

app.post('/jwt', async (req, res) => {
    const userData = req.body;
    const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    })

    res.send({ success: true })
})

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


app.post('/tutorials', async (req, res) => {
    try {
        const { userId, ...tutorialData } = req.body;

        const db = client.db('tutorSolutionDB');
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ uid: userId });

        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const newTutorial = {
            ...tutorialData,
            userName: user.displayName,
            userId: user.uid,
            createdAt: new Date().toISOString()
        };

        const tutorialCollection = db.collection('tutorials');
        const result = await tutorialCollection.insertOne(newTutorial);

        res.status(201).json({ insertedId: result.insertedId });
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.get('/tutorials', async (req, res) => {
    try {

        const db = client.db('tutorSolutionDB');
        const tutorialCollection = db.collection('tutorials');

        const tutorials = await tutorialCollection.find({}).toArray();

        res.status(200).json(tutorials);
    } catch (error) {
        console.error('Error fetching tutorials:', error);
        res.status(500).json({ error: 'Failed to fetch tutorials' });
    }
});


// GET /tutorials/:id - Get tutorial by ID
app.get('/tutorials/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const db = client.db('tutorSolutionDB');
        const tutorialCollection = db.collection('tutorials');

        const tutorial = await tutorialCollection.findOne({ _id: new ObjectId(id) });

        if (!tutorial) {
            return res.status(404).json({ error: 'Tutorial not found' });
        }

        res.status(200).json(tutorial);
    } catch (error) {
        console.error('Error fetching tutorial:', error);
        res.status(500).json({ error: 'Failed to fetch tutorial' });
    }
});

// PUT /tutorials/update/:id - Update tutorial by ID
app.put('/tutorials/update/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const db = client.db('tutorSolutionDB');
        const tutorialCollection = db.collection('tutorials');

        const result = await tutorialCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ error: 'Update failed' });
        }

        res.status(200).json({ message: 'Tutorial updated successfully' });
    } catch (error) {
        console.error('Error updating tutorial:', error);
        res.status(500).json({ error: 'Failed to update tutorial' });
    }
});


// DELETE /tutorials/:id - Delete a tutorial by ID
app.delete('/tutorials/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const db = client.db('tutorSolutionDB');
        const tutorialCollection = db.collection('tutorials');

        const tutorial = await tutorialCollection.findOne({ _id: new ObjectId(id) });

        if (!tutorial) {
            return res.status(404).json({ error: 'Tutorial not found' });
        }

        if (tutorial.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized: Only the owner can delete this tutorial.' });
        }

        const result = await tutorialCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
            res.status(200).json({ message: 'Tutorial deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete tutorial' });
        }
    } catch (error) {
        console.error('Error deleting tutorial:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// PUT /tutorials/:id - Update ReviewCount of a tutorial
app.put('/tutorials/:id', async (req, res) => {
    const { id } = req.params;
    const { ReviewCount } = req.body;

    try {
        const db = client.db('tutorSolutionDB');
        const tutorialCollection = db.collection('tutorials');

        const result = await tutorialCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { review: ReviewCount } } // ✅ Match frontend's display: `tutorial.review`
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ error: 'Review update failed' });
        }

        res.status(200).json({ message: 'Review updated successfully' });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// POST /bookings - Save a booking
app.post('/bookings', async (req, res) => {
    const { tutorId, image, language, price, tutorEmail, email } = req.body;

    if (!tutorId || !email || !tutorEmail) {
        return res.status(400).json({ error: 'Missing required booking fields.' });
    }

    try {
        const db = client.db('tutorSolutionDB');
        const bookingsCollection = db.collection('bookings');

        const newBooking = {
            tutorId: new ObjectId(tutorId),
            image,
            language,
            price,
            tutorEmail,
            email,
            bookedAt: new Date().toISOString()
        };

        const result = await bookingsCollection.insertOne(newBooking);

        res.status(201).json({ insertedId: result.insertedId, message: 'Booking successful' });
    } catch (error) {
        console.error('Error booking tutorial:', error);
        res.status(500).json({ error: 'Failed to book tutorial' });
    }
});


// GET /bookings?email=user@example.com
app.get('/bookings', verifyToken, async (req, res) => {
    // const { email } = req.query;
    // if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: 'forbidden access' })
    // }
    // if (!email) {
    //     return res.status(400).json({ error: 'Email query is required' });
    // }

    try {
        const { email } = req.query;
        if (email !== req.decoded.email) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        const db = client.db('tutorSolutionDB');
        const bookingsCollection = db.collection('bookings');

        const userBookings = await bookingsCollection.find({ email }).toArray();
        res.status(200).json(userBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});


// PUT /tutorials/:id/review - Increment review by 1
app.put('/tutorials/:id/review', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { email } = req.query;
    if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
    }
    try {
        const db = client.db('tutorSolutionDB');
        const tutorialCollection = db.collection('tutorials');

        const result = await tutorialCollection.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { review: 1 } } // ✅ Use $inc operator
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({ error: 'Review update failed' });
        }

        res.status(200).json({ message: 'Review incremented successfully' });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /stats/tutorials
app.get('/stats/tutorials', async (req, res) => {
    try {
        const db = client.db('tutorSolutionDB');
        const tutorials = db.collection('tutorials');

        const totalTutors = await tutorials.countDocuments();

        const reviewAggregation = await tutorials.aggregate([
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: "$review" },
                    languages: { $addToSet: "$language" }
                }
            }
        ]).toArray();

        const totalReviews = reviewAggregation[0]?.totalReviews || 0;
        const languages = reviewAggregation[0]?.languages || [];

        res.status(200).json({
            totalTutors,
            totalReviews,
            totalLanguages: languages.length
        });
    } catch (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ error: "Failed to fetch tutorial stats" });
    }
});

// GET /stats/users
app.get('/stats/users', async (req, res) => {
    try {
        const db = client.db('tutorSolutionDB');
        const users = db.collection('users');

        const totalUsers = await users.countDocuments();

        res.status(200).json({ totalUsers });
    } catch (err) {
        console.error("Error fetching user stats:", err);
        res.status(500).json({ error: "Failed to fetch user stats" });
    }
});
