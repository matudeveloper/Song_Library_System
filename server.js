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


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

//const swaggerDocument = yamljs.load('./swagger.yaml')
//app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))


// Parse JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Assuming you have the necessary middleware for parsing JSON body.
app.use(express.json());

// Initialize Prisma client
const prisma = new PrismaClient();

// Setup express-session middleware
app.use(session({
    secret: '12345678', // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
}));

// Middleware to authenticate token
// Middleware to check authentication and restrict access
function requireAuth(req, res, next) {
    //console.log(req.session.isAuthenticated);
    if (req.session.isAuthenticated) {
        // User is authenticated, proceed to the next middleware or route handler
        //next();
        console.log('you are signed in');
    } else {
        // User is not authenticated, redirect to login page
        //res.redirect('/');
    }
}

// Authorization middleware
const authorizeRequest = async (req, res, next) => {

    try {
        //console.log(req.sessionID);
        if (req.sessionID && req.sessionID === 'undefined') {
            // User is authenticated, proceed to the next middleware or route handler
            //next();
            //console.log('you are signed in');
        } else {
            // User is not authenticated, redirect to login page
            //res.redirect('/');
        }

        // Validate session
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authorization header required'});
        }

        // Validate extract session format
        if (!req.headers.authorization.startsWith('Bearer') || req.headers.authorization.split(' ').length !== 2) {
            return res.status(401).json({ error: 'Invalid authorization header format'});
        }

        // Extract sessionToken
        const sessionToken = req.headers.authorization.split(' ')[1];

        const session = await prisma.session.findUnique({
            where: {
                sessionToken: sessionToken,
            },
        });

        if (!session) {
            return res.status(401).json({ error: 'Invalid session token'});
        }
        console.log(session);
        // Add user to request
        const user = await prisma.user.findUnique({
            where: {
                id: session.userId,
            },
        });

        // Validate user
        if (!user) {
            return res.status(401).json({ error: 'Invalid session token'});
        }

        // Add sessionToken to request
        req.sessionToken = sessionToken;

        next();
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ error: 'Internal Server Error'});
    }
};

/*
// Serve dashboard page (protected with requireAuth middleware)
app.get('/dashboard', authorizeRequest, (req, res) => {
    // Assuming you have an HTML file named 'dashboard.html' in a 'views' directory
    //res.sendFile(path.join(__dirname, 'Wiews', 'dashboard.html'));


});
*/
// Dashboard Route (protected)
// Dashboard Route (protected)
app.get("/dashboard", async (req, res) => {
    const authHeader = req.headers.authorization;
    console.log(req.headers);
    if (!authHeader/* || !authHeader.startsWith('Bearer ')*/) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    const token = authHeader.split(' ')[1];

    try {
        //const decoded = jwt.verify(token, 'YOUR_SECRET_KEY');
        const session = await prisma.session.findUnique({
            where: { sessionToken: token }
        });

        if (!session) {
            return res.status(401).json({ error: "Session not found. Please login again." });
        }

        // Send the dashboard file
        res.sendFile(path.join(__dirname, '/frontend/Views/dashboard.html')); // Adjust the path as needed
    } catch (err) {
        console.error('Error in /dashboard:', err);
        res.status(500).json({ error: 'An error occurred' });
    }
});
/*
// Serve login page
app.get('/login', (req, res) => {
    // Serve your login HTML file
    res.sendFile(path.join(__dirname, '/frontend/Views/login.html')); // Adjust the path as needed
});
*/

app.use(express.static(__dirname + '/frontend/public')); // Replace 'public' with the directory containing your static files
//console.log(app.use(express.static(__dirname + '/frontend/public')))

// Endpoint to handle user registration
// Sign Up route
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

        // Generate a JWT token after verifying the password
        const token = jwt.sign({ userId: user.id }, 'YOUR_SECRET_KEY');  // Change the secret key

        const session = await prisma.session.create({
            data: {
                userId: user.id,
                sessionToken: token,
                expires: new Date(Date.now() + (3600 * 1000)) // 1 hour from now
            },
        });

        // Return session token to the client
        res.status(201).json({
            sessionToken: session.sessionToken
        });

    } catch (error) {
        console.error('Error processing /login:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});


app.delete('/login', authorizeRequest, async (req, res) => {

    // Delete session
    await prisma.session.delete({
        where: {
            sessionToken: req.sessionToken
        }
    })

    // Return session
    res.status(204).end()
})

// Serve Swagger documentation
const swaggerDocument = yaml.load('swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}. Documentation at http://localhost:${PORT}/api-docs`);
});