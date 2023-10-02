const https = require('https');
const crypto = require('crypto');
const Base64 = require('base-64');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const date = new Date();
const isoDate = date.toISOString();

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

let reqJson = {
    Periodstart: 20230320,
    PeriodEnd: 20230921,
    UnPaid: true
};

var ApiId = '55d7f89a-67bb-4938-aa53-e484e10f2206';
var ApiKey = '8z4RMNbHFnrt1fdVSPweaG+KAPwCELVLzCPByWgFM+M=';
var timestamp = getTimestamp();
var datastring = ApiId + timestamp + JSON.stringify(reqJson);
var hash = crypto.createHmac('sha256', ApiKey).update(datastring).digest('base64');
console.log(datastring);

var payload = JSON.stringify(reqJson); // Convert the payload to JSON string

var options = {
    hostname: 'aktiva.merit.ee',
    port: 443,
    path: `/api/v2/getinvoices?ApiId=${ApiId}&timestamp=${timestamp}&signature=${encodeURIComponent(hash)}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload) // Set the content length header
    }
};
function makeRequest() {
    var req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => {
            data += chunk;
        });
        res.on('end', async () => {
            //console.log(data);
            // Function to save invoice data to the database
            async function saveInvoice(invoiceData) {
                try {
                    invoiceData.EInvSentDate = new Date(invoiceData.EInvSentDate).toISOString();
                    // Check if an invoice with the same SIHId already exists

                    const existingInvoice = await prisma.invoice.findMany({
                        where: {
                            SIHId: invoiceData.SIHId,
                        },
                    });
                    const result = existingInvoice.find(({ SIHId }) => SIHId === invoiceData.SIHId);
                    //console.log(result);
                    //console.log( existingInvoice !== "[]" && result.SIHId !== invoiceData.SIHId)


                    // If it does not exist, save the new invoice
                    if( result !== undefined) {
                        if (!existingInvoice && existingInvoice !== [] && result.SIHId !== invoiceData.SIHId) {
                            const savedInvoice = await prisma.invoice.create({
                                data: {
                                    id: invoiceData.SIHId,
                                    SIHId: invoiceData.SIHId,
                                    TotalAmount: invoiceData.TotalAmount,
                                    ProfitAmount: invoiceData.ProfitAmount,
                                    TotalSum: invoiceData.TotalSum,
                                    UserName: invoiceData.UserName,
                                    ReferenceNo: invoiceData.ReferenceNo,
                                    PriceInclVat: invoiceData.PriceInclVat,
                                    PaidAmount: invoiceData.PaidAmount,
                                    EInvSent: invoiceData.EInvSent,
                                    EInvSentDate: invoiceData.EInvSentDate,
                                    EmailSent: invoiceData.EInvSentDate,
                                    Paid: invoiceData.Paid
                                }
                            });
                            console.log(`Invoice saved with ID: ${savedInvoice.id}`);
                        } else {
                            console.log(`Invoice with SIHId: ${invoiceData.SIHId} already exists.`);
                        }
                    } else {
                        const savedInvoice = await prisma.invoice.create({
                            data: {
                                id: invoiceData.SIHId,
                                SIHId: invoiceData.SIHId,
                                TotalAmount: invoiceData.TotalAmount,
                                ProfitAmount: invoiceData.ProfitAmount,
                                TotalSum: invoiceData.TotalSum,
                                UserName: invoiceData.UserName,
                                ReferenceNo: invoiceData.ReferenceNo,
                                PriceInclVat: invoiceData.PriceInclVat,
                                PaidAmount: invoiceData.PaidAmount,
                                EInvSent: invoiceData.EInvSent,
                                EInvSentDate: invoiceData.EInvSentDate,
                                EmailSent: invoiceData.EInvSentDate,
                                Paid: invoiceData.Paid
                            }
                        });
                        console.log(`Invoice saved with ID: ${savedInvoice.id}`);
                    }


                } catch (error) {
                    console.error('Error saving invoice:', error);
                }
            }

            // Assuming data is a JSON string, parse it to an object
            const parsedData = JSON.parse(data);

            // Check if parsedData is an array or an object and handle accordingly
            if (Array.isArray(parsedData)) {
                for (const invoiceData of parsedData) {
                    saveInvoice(invoiceData);
                }
            } else {
                saveInvoice(parsedData);
            }



    // Save each invoice to the database
            //for (const invoiceData of data) {
                //saveInvoice(data);
            //}
        });
    });

    req.on('error', error => {
        console.error(error);
    });

    req.write(payload); // Write the payload to the request body
    req.end();
}

// Schedule the function to run after every minute (60000 milliseconds)
setInterval(makeRequest, 180000);
//makeRequest();
