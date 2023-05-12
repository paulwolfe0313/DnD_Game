const express = require('express');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Add this line

const jwt = require('jsonwebtoken');
const token = jwt.sign({ email: user.email }, 'your_secret_key', { expiresIn: '1h' });


const app = express();
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, { useUnifiedTopology: true });

let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Replace with environment variable
        pass: process.env.GMAIL_PASS  // Replace with environment variable
    }
});

app.post('/signup', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('test'); // replace 'test' with your database name
        const users = database.collection('users'); // replace 'users' with your collection name

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const user = { email: req.body.email, password: hashedPassword };
        const result = await users.insertOne(user);

        // Add these lines
        let mailOptions = {
            from: 'yourEmail@gmail.com',
            to: user.email,
            subject: 'Registration Confirmation',
            text: `Hello ${user.email},\n\nThank you for registering!`
        };
    
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log('Confirmation email sent: ' + info.response);
            }
        });

        res.status(201).send('User created');
    } catch (error) {
        res.status(500).send('Error occurred');
        console.error(error);
    } finally {
        await client.close();
    }
});

app.post('/login', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('test');
        const users = database.collection('users');

        const user = await users.findOne({ email: req.body.email });

        if (!user) {
            return res.status(400).send('Incorrect email or password');
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordValid) {
            return res.status(400).send('Incorrect email or password');
        }

        // Create a token
        const token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET);
        res.header('auth-token', token).send(token);

    } catch (error) {
        res.status(500).send('Error occurred');
        console.error(error);
    } finally {
        await client.close();
    }
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});