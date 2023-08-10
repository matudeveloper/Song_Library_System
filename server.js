require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const yaml = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const session = require('express-session');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON data
app.use(bodyParser.json());

// Initialize Prisma client
const prisma = new PrismaClient();

app.get('/dashboard', (req, res) => {
    // Assuming you have an HTML file named 'dashboard.html' in a 'views' directory
    //res.sendFile(path.join(__dirname, 'Wiews', 'dashboard.html'));
    res.sendFile(path.join(__dirname, '/frontend/Views/dashboard.html')); // Adjust the path as needed

});

app.use(express.static(__dirname + '/frontend/public')); // Replace 'public' with the directory containing your static files
//console.log(app.use(express.static(__dirname + '/frontend/public')))

// Setup express-session middleware
app.use(session({
    secret: 'your-session-secret', // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
}));

// Endpoint to handle user registration
// Sign Up route
app.post('/users', async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

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

// Sign In route
app.post('/login', async (req, res) => {
    try {


        const { email, password } = req.body;

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

        // Redirect the user to the dashboard page
        res.redirect('/dashboard');
    } catch (error) {

        console.error('Error processing /login:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// Serve Swagger documentation
const swaggerDocument = yaml.load('swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}. Documentation at http://localhost:${PORT}/docs`);
});