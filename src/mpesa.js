const Promise = require('bluebird');
const core = require('./core.js');

exports.sendB2c = function (request, configs) {

    return new Promise(function (resolve, reject) {
        var isodata = {
            "menu": "b2c",
            "method": "postPayment",
            "amount": request.amount,
            "phonenumber": request.phonenumber,
            "paymentpurposeID": request.paymentpurposeID,
            "AppName": "Tajiri"
        };

        console.log(isodata);
        core.postRequest(isodata, configs.lativePG).then(function (mpesaResult) {
            console.log(mpesaResult);
            resolve(mpesaResult);
        });
    });

};

exports.sendStkPush = function (request, configs) {

    return new Promise(function (resolve, reject) {

        var isodata = {
            "menu": "c2b",
            "method": "sendSTKPushRequest",
            "amount": request.amount,
            "phonenumber": request.phonenumber,
            "paymentID": request.paymentid,
            "paymentType":request.paymentType,
            "AppName": "Tajiri"
        };

        core.postRequest(isodata, configs.lativePG).then(function (mpesaResult) {
            console.log(mpesaResult);
            resolve(mpesaResult);
        });
    });

};
