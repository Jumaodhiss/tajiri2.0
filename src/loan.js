/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

const Promise = require('bluebird');
const core = require('./core.js');
const mpesa = require('./mpesa.js');

exports.pad = function (n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

exports.getLoans = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbloans WHERE loanStatus!='paid' and phonenumber='" + request.mobileNumber + "'";
        //console.log(loginQuery);
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {

                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};

exports.sendLoanConfirmation = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        //M-Pesa B2C
        console.log(request);
        var postQuery = "CALL sp_confirmMicroLoan(?,?,?)";


        connection.query(postQuery, [
            request.loannumber,
            request.confirmLoan,
            request.phonenumber
        ], function (err, result) {
            if (err) {
                reject(err);
            } else {
                var resp = result[0][0];
                console.log(resp.ID);
                var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
                connection.query(loginQuery, function (err, rows, fields) {
                    if (err) {
                        reject(err);
                    } else {
                        if (request.confirmLoan == 1) {
                            var mpesaRequest = {
                                'amount': resp.principle,
                                'phonenumber': request.phonenumber,
                                'paymentpurposeID': exports.pad(resp.ID, 12)
                            };
                            resp.expectedPaymentPlan = rows;
                            mpesa.sendB2c(mpesaRequest, configs).then(function (mpesaResults) {
                                //Mpesa can delay the process
                                console.log(mpesaResults);
                                if (mpesaResults.errorCode != undefined || mpesaResults.reesponseCodeFromDB=='001') {
                                    var postQuery = "CALL sp_updateB2CMicroLoan(?,?,?)";
                                    resp.responseCode = '021';
                                    resp.responseDetails = 'Error while processing';

                                    connection.query(postQuery, [
                                        request.loannumber,
                                        request.confirmLoan,
                                        request.phonenumber
                                    ], function (err, result) {

                                    });
                                }
                                resp.mpesaResults = mpesaResults;
                                resolve(resp);

                            });
                        } else {
                            resp.expectedPaymentPlan = rows;
                            resolve(resp);
                        }
                    }
                });
            }
        });
    });
};

exports.postLoanToSP = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        console.log(request);

        var loannumber = "LC001" + request.CustomerNo + "" + Math.floor(100000 + Math.random() * 900000);
        request.loannumber = loannumber;
        var postQuery = "CALL sp_postMicroLoan(?,?,?,?,?,?,?,?)";



        connection.query(postQuery, [
            request.currentLoanLimit,
            request.interestRate,
            request.principal,
            request.phonenumber,
            request.loannumber,
            request.paymentperiod,
            request.paymentoption,
            request.startdate
        ], function (err, result) {
            if (err) {
                reject(err);
            } else {
                var resp = result[0][0];
                var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
                //console.log(resp);
                connection.query(loginQuery, function (err, rows, fields) {
                    if (err) {
                        reject(err);
                    } else {
                        resp.expectedPaymentPlan = rows;
                        console.log(resp);
                        resolve(resp);
                    }
                });
            }
        });
    });
};

exports.getLoanHistory = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbloans WHERE phonenumber='" + request.mobileNumber + "' order by id desc";
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {
                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};

exports.getLoanRepayment = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbRepayment WHERE loannumber='" + request.loannumber + "' ORDER BY ID ASC";
        //console.log(loginQuery);
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {
                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};

exports.getLoanExtension = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbLoanExtension WHERE loannumber='" + request.loannumber + "'";
        //console.log(loginQuery);
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {
                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};

exports.getLoanTopup = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbLoanTopup WHERE loannumber='" + request.loannumber + "'";
        //console.log(loginQuery);
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {
                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};

exports.postLoanExtension = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        //M-Pesa Checkout for Fee component
        // console.log(request);
        var postQuery = "CALL sp_postExtension(?,?,?)";
        //console.log(postQuery);
        connection.query(postQuery, [
            request.loannumber,
            request.extensionPeriod,
            request.extensionFee
        ], function (err, result) {
            if (err) {
                reject(err);
            } else {

                var resp = result[0][0];
                console.log(resp);
                var mpesaRequest = {
                    'amount': request.extensionFee,
                    'phonenumber': request.phonenumber,
                    'paymentType': 'Extension',
                    'paymentid': exports.pad(resp.ID, 12)
                };
                var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
                console.log(loginQuery);
                connection.query(loginQuery, function (err, rows, fields) {

                    if (err) {
                        reject(err);
                    } else {
                        mpesa.sendStkPush(mpesaRequest, configs).then(function (mpesaResults) {
                            //Mpesa can delay the process
                           if (mpesaResults.errorCode != undefined || mpesaResults.reesponseCodeFromDB=='001') {
                                resp.responseCode = '021';
                                resp.responseDetails = 'Error while processing';
                            }
                            resp.expectedPaymentPlan = rows;
                            resp.mpesaResults = mpesaResults;
                            resolve(resp);
                        });
                    }
                });
            }
        });
    });
};

exports.confirmLoanTopup = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        //M-Pesa B2C
        // console.log(request);
        var postQuery = "CALL sp_confirmTopup(?,?,?)";
        //console.log(postQuery);
        connection.query(postQuery, [
            request.loannumber,
            request.confirm,
            request.phonenumber
        ], function (err, result) {
            if (err) {
                reject(err);
            } else {
                //console.log(result)
                var resp = result[0][0];
                var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
                console.log(resp);
                connection.query(loginQuery, function (err, rows, fields) {

                    if (err) {
                        reject(err);
                    } else {

                        var mpesaRequest = {
                            'amount': resp.principle,
                            'phonenumber': request.phonenumber,
                            'paymentpurposeID': exports.pad(resp.ID, 12)
                        };

                        mpesa.sendB2c(mpesaRequest, configs).then(function (mpesaResults) {
                            //Mpesa can delay the process
                            if (mpesaResults.errorCode != undefined || mpesaResults.reesponseCodeFromDB == '001') {
                                resp.responseCode = '021';
                                resp.responseDetails = 'Error while processing';
                            }
                            resp.expectedPaymentPlan = rows;
                            resp.mpesaResults = mpesaResults;
                            resolve(resp);
                        });
                    }
                });
            }
        });
    });
};

exports.postLoanTopup = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {

        // console.log(request);
        var postQuery = "CALL sp_postTopup(?,?,?,?)";
        //console.log(postQuery);
        connection.query(postQuery, [
            request.loannumber,
            request.principalTopup,
            request.interest,
            request.phonenumber
        ], function (err, result) {

            if (err) {
                reject(err);
            } else {
                var resp = result[0][0]; //Heheheh override. No need for a new table

                if (resp.responseCode.toLocaleString() === '000') {
                    var topupQuery = "SELECT  loannumber, '" + resp.revisedInstallment + "' as installment, '" + request.interest + "' as interest, '" + resp.outstandingAmountAfterTopup + "' as outstanding, duedate  FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' and paid=0 order by ID asc";
                    //console.log(topupQuery);

                    connection.query(topupQuery, function (err, rows, fields) {

                        if (err) {
                            reject(err);
                        } else {
                            resp.expectedPaymentPlan = rows;
                            resolve(resp);
                        }
                    });
                } else {
                    resolve(resp);
                }
            }
        });
    });
};

exports.payLoan = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        //M-Pesa Checkout
        console.log("========================Start Payment=============================");

        var postQuery = "CALL sp_insertPayment(?,?,?)";
        connection.query(postQuery, [
            request.loannumber,
            request.installment,
            request.phonenumber], function (err, result) {
            if (err) {
                reject(err);
            } else {
                console.log(result);
                var mpesaRequest = {
                    'amount': request.installment,
                    'phonenumber': request.phonenumber,
                    'paymentType': 'Repayment',
                    'paymentid': exports.pad(request.ID, 12)
                };
                var resp = result[0][0];

                if (resp.paymentStatus.toString() === 'outstanding') {
                    var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
                    ////console.log(loginQuery);
                    connection.query(loginQuery, function (err, rows, fields) {

                        if (err) {
                            reject(err);
                        } else {
                            console.log(mpesaRequest);

                            mpesa.sendStkPush(mpesaRequest, configs).then(function (mpesaResults) {
                                //Mpesa can delay the process
                                if (mpesaResults.errorCode != undefined || mpesaResults.reesponseCodeFromDB == '001') {
                                    resp.responseCode = '021';
                                    resp.responseDetails = 'Error while processing';
                                }
                                resp.expectedPaymentPlan = rows;
                                resp.mpesaResults = mpesaResults;
                                resolve(resp);
                            });
                        }
                    });
                } else {


                    mpesa.sendStkPush(mpesaRequest).then(function (mpesaResults) {
                        if (mpesaResults.errorCode != undefined || mpesaResults.reesponseCodeFromDB == '001') {
                            resp.responseCode = '021';
                            resp.responseDetails = 'Error while processing';
                        }
                        resp.mpesaResults = mpesaResults;
                        resolve(resp);
                    });

                }
            }
        });

    });
};


exports.payLoanOld = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        //M-Pesa Checkout
        console.log("========================Start Payment=============================");
        console.log(request);
        var postQuery = "CALL sp_insertPayment(?,?,?)";
        connection.query(postQuery, [
            request.loannumber,
            request.installment,
            request.ID], function (err, result) {
            if (err) {
                reject(err);
            } else {
                console.log(result);
                var mpesaRequest = {
                    'amount': request.installment,
                    'phonenumber': request.phonenumber,
                    'paymentid': exports.pad(request.ID, 12)
                };
                var resp = result[0][0];

                if (resp.paymentStatus.toString() === 'outstanding') {
                    var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
                    ////console.log(loginQuery);
                    connection.query(loginQuery, function (err, rows, fields) {

                        if (err) {
                            reject(err);
                        } else {
                            console.log(mpesaRequest);
                            mpesa.sendStkPush(mpesaRequest, configs).then(function (mpesaResults) {
                                //Mpesa can delay the process
                                if (mpesaResults.errorCode != undefined || mpesaResults.reesponseCodeFromDB=='001') {
                                    resp.responseCode = '021';
                                    resp.responseDetails = 'Error while processing';
                                }
                                resp.expectedPaymentPlan = rows;
                                resp.mpesaResults = mpesaResults;
                                resolve(resp);
                            });
                        }
                    });
                } else {

                    console.log(mpesaRequest);
                    mpesa.sendStkPush(mpesaRequest, configs).then(function (mpesaResults) {
                        console.log(mpesaResults);
                        resolve(resp);
                    });

                }
            }

        });

    });
};


exports.getInterest = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbInterest WHERE PAYMENT_OPTION='" + request.paymentoption + "' AND PRODUCTID='01' ORDER BY TENURE asc";
        ////console.log(loginQuery);
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {
                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};

exports.getPaymentPlan = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + request.loannumber + "' order by ID asc";
        ////console.log(loginQuery);
        connection.query(loginQuery, function (err, rows, fields) {
            if (err) {
                reject(err);
            } else {
                //                console.log(rows)
                resolve(rows);
            }
        });
    });
};
