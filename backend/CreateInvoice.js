var crypto = require('crypto');
var request = require('request');


function sendInvoice(invoiceDataArray, callback) {


    var reqJson = {
        Customer: {
            //Id: null,
            Name: 'FirstCustomer Inc',
            RegNo: '1122334455',
            NotTDCustomer: false,
            VatRegNo: '11223344',
            CurrencyCode: 'EUR',
            PaymentDeadLine: 7,
            OverDueCharge: 0,
            RefNoBase: 1,
            Address: 'Merimiehenkatu 31',
            CountryCode: 'FI',
            County: 'Finland',
            City: 'Helsinki',
            PostalCode: '',
            PhoneNo: '6548765',
            PhoneNo2: '',
            HomePage: '',
            Email: 'customermail@gmail.com',
        },
        DocDate: '20230113131239',
        DueDate: '20230125131239',
        InvoiceNo: '123',
        RefNo: '1232',
        DepartmentCode: '',
        ProjectCode: '',
        InvoiceRow: [
            {
                Item:
                    {
                        Code: 1234567,
                        Description: 'Bag of goldflakes',
                        Type: 3,
                        UOMName: 'kg',
                    },
                Quantity: '2',
                Price: '1000',
                DiscountPct: 0,
                DiscountAmount: 0,
                TaxId: '9ac274e8-f8cf-4e0a-962b-70d2b43029ce',
                LocationCode: 1,
            },
        ],
        TotalAmount: 2000,
        RoundingAmount: 0,
        TaxAmount: [{TaxId: '9ac274e8-f8cf-4e0a-962b-70d2b43029ce', Amount: 400}],
        HComment: '',
        FComment: '',
    };

    var ApiId = '55d7f89a-67bb-4938-aa53-e484e10f2206';
    var ApiKey = '8z4RMNbHFnrt1fdVSPweaG+KAPwCELVLzCPByWgFM+M=';

    function pad2(n) {
        return n > 9 ? '' + n : '0' + n;
    }

    function getTimestamp() {
        var d = new Date();
        var yyyy = d.getFullYear();
        var MM = pad2(d.getMonth() + 1);
        var dd = pad2(d.getDate());
        var HH = pad2(d.getHours());
        var mm = pad2(d.getMinutes());
        var ss = pad2(d.getSeconds());
        return yyyy + MM + dd + HH + mm + ss;
    }

    var timestamp = getTimestamp();
    var dataString = ApiId + timestamp + JSON.stringify(reqJson);
    var hash = crypto.createHmac('sha256', ApiKey).update(dataString).digest('base64');
    var signature = encodeURIComponent(hash);

    console.log(dataString);
    console.log(hash);
    console.log(signature);

    var url = 'https://aktiva.merit.ee/api/v1/sendinvoice' +
        '?ApiId=' + ApiId + '&timestamp=' + timestamp + '&signature=' + signature;

    request({
            url: url,
            method: 'POST',
            json: true,
            headers: {'content-type': 'application/json',},
            body: reqJson,
        },

        function (request, response) {
            console.log('Status code: ', response.statusCode, ' -- ', response.statusMessage);
            console.log('Headers: ', response.headers['content-type']);
            console.log('Body: ', response.body);
        }
    )

}

module.exports = {
    sendInvoice: sendInvoice
};