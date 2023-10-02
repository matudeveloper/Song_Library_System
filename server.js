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
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const getinvoisces = require('./backend/GetAllInvoices'); // include the helper.js file
const { createProxyMiddleware } = require('http-proxy-middleware');
const crypto = require('crypto');
//const fetch = require('node-fetch');
var invoiceSender = require('./backend/CreateInvoice');


// Read the SSL certificate files
const privateKey = fs.readFileSync('./key.pem', 'utf8');
const certificate = fs.readFileSync('./cert.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate };

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
module.exports = app;

// Parse JSON data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Assuming you have the necessary middleware for parsing JSON body.
app.use(express.json());
app.use(cookieParser());

// CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://localhost:3000"); // Update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
/*
app.use('/dashboard%20backend', express.static('path/to/dashboard backend'));
app.use(cors({
    origin: 'http://localhost:3000', // allow requests from this origin
    credentials: true, // allow sending of cookies or authorization headers
}));

app.use('/api', createProxyMiddleware({
    target: 'https://aktiva.merit.ee',
    changeOrigin: true, // needed for virtual hosted sites
    pathRewrite: {
        [`^/api`]: '/api/v2', // rewrite path
    },
}));
*/
// Initialize Prisma client
const prisma = new PrismaClient();

// Create an HTTPS service
const httpsServer = https.createServer(credentials, app);



// Dashboard Route (protected)
app.get("/dashboard", async (req, res) => {
    const token = req.cookies.authToken;

    if (!token) {
        return res.status(401).json({ error: "Not Authorized" });
    }

    res.sendFile(path.join(__dirname, '/frontend/Views/dashboard.html')); // Adjust the path as needed



});

function getTimestamp() {
    let d = new Date();
    let yyyy = d.getFullYear();
    let MM = ('0' + (d.getMonth() + 1)).slice(-2);
    let dd = ('0' + d.getDate()).slice(-2);
    let HH = ('0' + d.getHours()).slice(-2);
    let mm = ('0' + d.getMinutes()).slice(-2);
    let ss = ('0' + d.getSeconds()).slice(-2);
    return '' + yyyy + MM + dd + HH + mm + ss;
}

app.post('/update-invoice', async (req, res) => {
    try {
        const id = req.body.id;
        const updatedData = req.body;

        // Update the invoice in the database using Prisma client
        const updatedInvoice = await prisma.invoice.update({
            where: { id: id },
            data: updatedData,
        });


        // Constructing the API payload
        const apiPayload = {
            Customer: {
                Name: updatedInvoice.UserName,
                RegNo: updatedInvoice.VatRegNo,
                // ... populate other customer details
            },
            DocDate: new Date(updatedInvoice.createdAt).toISOString(),
            InvoiceNo: updatedInvoice.ReferenceNo,
            TotalAmount: updatedInvoice.TotalAmount,
            // ... Populate other fields as necessary
        };

        let reqJson = {
            Id: "52c58d10-5889-4cf3-b0bb-d0595e7e83e2"
        };

        var ApiId = '52c58d10-5889-4cf3-b0bb-d0595e7e83e2';
        var ApiKey = '8z4RMNbHFnrt1fdVSPweaG+KAPwCELVLzCPByWgFM+M=';
        var timestamp = getTimestamp();
        var datastring = ApiId + timestamp + JSON.stringify(reqJson);
        var hash = crypto.createHmac('sha256', ApiKey).update(datastring).digest('base64');

        const payload = JSON.stringify(apiPayload);

        var options = {
            hostname: 'aktiva.merit.ee',
            port: 443,
            path: `/api/v1/deleteinvoice/?ApiId=${ApiId}&timestamp=${timestamp}&signature=${encodeURIComponent(hash)}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload) // Set the content length header
            }
        };

        const apiReq = https.request(options, apiRes => {
            let data = '';
            apiRes.on('data', chunk => {
                data += chunk;
            });
            apiRes.on('end', () => {
                console.log('API request response:', data);
            });
        });

        apiReq.on('error', error => {
            console.error('API request error:', error);
        });

        apiReq.write(payload);
        apiReq.end();

        invoiceSender.sendInvoice(updatedInvoice, function (error, response) {
            if (error) {
                console.error('An error occurred:', error);
            } else {
                console.log('Status code: ', response.statusCode, ' -- ', response.statusMessage);
                console.log('Headers: ', response.headers['content-type']);
                console.log('Body: ', response.body);
            }
        });

        // Send the updated invoice data back to the client as JSON
        res.json(updatedInvoice);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating invoice: ' + error.message);
    }
});


// Dashboard Route (protected)
app.get("/api/invoice/:id", async (req, res) => {
    const token = req.cookies.authToken;

    if (!token) {
        return res.status(401).json({ error: "Not Authorized" });
    }
    //res.sendFile(path.join(__dirname, '/frontend/Views/invoice.html')); // Adjust the path as needed
    // Getting the invoice id from the URL parameter
    const invoiceId = req.params.id;
    //res.sendFile(path.join(__dirname, '/frontend/Views/invoice.html'));
    try {
        // Query the database to find the invoice by ID
        const invoice = await prisma.invoice.findUnique({
            where: {
                SIHId: invoiceId
            }
        });

        if (!invoice) {
            return res.status(404).json({ error: "Invoice not found" });
        }
        //res.sendFile(path.join(__dirname, '/frontend/Views/invoice.html'));
        // Send the invoice data as response
        return res.json(invoice);

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});



// Dashboard Route (protected)
app.get("/invoice/:id", async (req, res) => {
    const token = req.cookies.authToken;

    if (!token) {
        return res.status(401).json({error: "Not Authorized"});
    }

    res.sendFile(path.join(__dirname, '/frontend/Views/invoice.html'));

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

        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error processing /users:', error);
        return res.status(500).json({ error: '500 An error occurred' });
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

// Array of invoices as an example
let invoices = [
    {
        id: '1',
        InvoiceNo: '1000',
        TotalAmount: 100.00
    },
    {
        id: '2',
        InvoiceNo: '1001',
        TotalAmount: 150.00
    }
];

// PUT endpoint to update a specific invoice
app.put('/invoice/:id', (req, res) => {
    // Extract the invoice ID from the URL parameters
    const { id } = req.params;

    // Find the invoice in the array by ID
    const invoice = invoices.find(inv => inv.id === req.params.id);
    console.log(req.params.id)
    // If the invoice is not found, send a 404 response
    if (!invoice) {
        return res.status(404).send('Invoice not found');
    }

    // Update the invoice with the data from the request body
    Object.assign(invoice, req.body);

    // Send a success response
    res.send(invoice);
});

// Endpoint to fetch all invoices from the database
app.get('/invoices', async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany();
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching invoices' });
    }
});

// Update an item endpoint
app.put('/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const updatedItem = req.body;

    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found' });
    }

    items[itemIndex] = { ...items[itemIndex], ...updatedItem };
    res.json(items[itemIndex]);
});

// Delete an item endpoint
app.delete('/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
        return res.status(404).json({ message: 'Item not found' });
    }

    items.splice(itemIndex, 1);
    res.status(204).send();
});


// Serve Swagger documentation
const swaggerDocument = yaml.load('swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve static files from the "images" directory
//app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/images', express.static(__dirname+'/frontend/assets/img/'));
app.use(express.static(__dirname+'/frontend/public/'));
app.use(express.static(__dirname+'/frontend/Views/'));

    // Start the server
// Start the server on port 3000

httpsServer.listen(3000, () => {
    console.log(`Server is running on port https://localhost:${PORT}. Documentation at https://localhost:${PORT}/api-docs`);

});
/*
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}. Documentation at http://localhost:${PORT}/api-docs`);
});

 */