require('dotenv').config(); // Load environment variables from .env file
const express = { NextFunction, Request, Response } = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const yaml = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const path = require('path');
const jwt = require('jsonwebtoken');
const LocalStorage = require('node-localstorage').LocalStorage;
const cookieParser = require('cookie-parser');


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Assuming you have the necessary middleware for parsing JSON body.
app.use(express.json());
app.use(cookieParser());

// Initialize Prisma client
const prisma = new PrismaClient();


// Dashboard Route (protected)
app.get("/dashboard", async (req, res) => {
    const token = req.cookies.authToken;

    if (!token) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    res.sendFile(path.join(__dirname, '/frontend/Views/dashboard.html')); // Adjust the path as needed



});


app.use(express.static(__dirname + '/frontend/public')); // Replace 'public' with the directory containing your static files


// Register new user
app.post('/users', async (req, res) => {
    const { email, password } = req.body;

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error processing /users:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user !== null) {
            const token = jwt.sign({ userId: user.id }, 'YOUR_SECRET_KEY');
            res.cookie('authToken', token, {
                httpOnly: false,
                expires: new Date(Date.now() + (3600 * 1000)),  // 1 hour expiration
                secure: process.env.NODE_ENV === 'production',  // In production, make sure cookies are sent over HTTPS
                sameSite: 'strict'
            });
            res.status(201).json({ message: 'Login successful' });
        }



    } catch (error) {
        console.error('Error processing /login:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


app.post('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ message: 'Logged out' });
});


// Serve Swagger documentation
const swaggerDocument = yaml.load('swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}. Documentation at http://localhost:${PORT}/api-docs`);
});