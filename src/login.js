/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var Promise = require('bluebird');
var core = require('./core.js');
var csv = require('csv-parser');
var fs = require('fs');

exports.getLogin = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {
        console.log(request);
        var postQuery = "CALL sp_Login(?,?,?)";
        //console.log(request.phonenumber, request.password, , request.imei);
        connection.query(postQuery, [request.phonenumber, request.password, request.imei], function (err, result) {
            if (err) {
                reject(err);
            } else {


                var resp = result[0][0];

                console.log(result);


                if (resp.isNewLoan == '0') {
                    var loginQuery = "SELECT * FROM tbpaymentplan WHERE loannumber='" + resp.loannumber + "' order by ID asc";
                    //console.log(loginQuery);
                    connection.query(loginQuery, function (err, rows, fields) {

                        if (err) {
                            reject(err);
                        } else {

                            resp.expectedPaymentPlan = rows;
                            var expectedPaymentPlan = resp.expectedPaymentPlan;

                            var noOfPaymentPlan = expectedPaymentPlan.length;
                            console.log(resp);
                            var installment = 0;
                            var i = 0;
                            for (i = 0; i < noOfPaymentPlan; i++) {
                                var currentPlan = expectedPaymentPlan[i];
                                //var paid=currentPlan.paid;
                                var paid = new Uint8Array(currentPlan.paid);
                                console.log(paid);
                                if (parseInt(installment) === 0) {
                                    if (parseInt(paid) === 0) {
                                        installment = currentPlan.installment;
                                    }
                                }
                            }
                            var loginQuery = "SELECT id, extensionPeriod,(CEIL((extensionFee*" + resp.outstandingAmount + ")/100)) AS extensionFee FROM tbExtensionFee";
                            console.log(loginQuery);
                            connection.query(loginQuery, function (err, extensionRows, fields) {

                                if (err) {
                                    reject(err);
                                } else {
                                    resp.extensionPlan = extensionRows;

                                    var totalTopup = "SELECT sum(principleTopup) as totalTopup FROM tbLoanTopup WHERE loannumber='" + resp.loannumber + "'";
                                    console.log(totalTopup);
                                    connection.query(totalTopup, function (err, topupRows, fields) {

                                        if (err) {

                                            reject(err);
                                        }
                                        resp.topupRows = topupRows[0];
                                    });
                                }

//                                resp.alertType = 'SUCCESS-REG';
//                                exports.sendSMS(connection, resp, configs);
                                console.log("=====================================================");
                                console.log(resp);
                                console.log("=====================================================");
                                resolve(resp);

                            });
                        }
                    });
                } else {
                    console.log(resp);
                    resolve(resp);
                }
            }
        });
    });
};

exports.validationOTP = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {

        //console.log(request);
        var postQuery = "CALL sp_validationOTP(?,?,@response)";

        connection.query(postQuery, [request.phonenumber, request.otp, '@response'], function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};



exports.setNewPin = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {

        //console.log(request);
        var postQuery = "CALL sp_setNewPin(?,?)";

        connection.query(postQuery, [request.phonenumber, request.password], function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result[0][0]);
            }
        });
    });
};

exports.securityQuesrionDetails = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {

        //console.log(request);
        var postQuery = "SELECT securityquestion,securityanswer,'000' AS responseCode, 'Request Successful' AS responseDetails FROM tbcustomerlogin WHERE UserName='" + request.phonenumber + "'";

        connection.query(postQuery, function (err, result) {


            if (err) {
                reject(err);
            } else {
                var resp = result[0];
                resolve(resp);
            }
        });
    });
};



exports.securityQuestionDetails = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {

        //console.log(request);
        var postQuery = "SELECT securityquestion,securityanswer,'000' AS responseCode, 'Request Successful' AS responseDetails FROM tbcustomerlogin WHERE UserName='" + request.phonenumber + "'";

        connection.query(postQuery, function (err, result) {


            if (err) {
                reject(err);
            } else {
                var resp = result[0];
                resolve(resp);
            }
        });
    });
};

exports.sendOTPDirect = function (connection, request, configs) {

    console.log(request);
    return new Promise(function (resolve, reject) {


        var postQuery = "CALL sp_sendOTPDirect(?,?)";

        connection.query(postQuery, [request.phonenumber, request.message], function (err, result) {
            if (err) {
                reject(err);
            }


            var isodata = {
                'mobile': request.phonenumber,
                'message': request.message
            };

            core.postRequest(isodata, configs.SMSWSURL).then(function (smsResult) {
                console.log(smsResult);
                resolve(result[0][0]);
            });
        });

    });
};

exports.sendOTPRegistration = function (connection, request, configs) {

    return new Promise(function (resolve, reject) {

        var otp = Math.floor(1000 + Math.random() * 9000);
        console.log(otp);
        //console.log(request);
        var postQuery = "CALL sp_sendOTP(?,?,?,@response)";

        connection.query(postQuery, [request.phonenumber, otp, (request.isRegistration == undefined) ? 1 : request.isRegistration, '@response'], function (err, result) {
            if (err) {
                reject(err);
            }
            var resp = result[0][0];
            console.log(resp);
            if (resp.responseCode == '000') {
                var isodata = {
                    'mobile': request.phonenumber,
                    'message': '<#> ' + resp.otp + 'App Code: 81Ewt5bYTpJ'
                };

                core.postRequest(isodata, configs.SMSWSURL).then(function (smsResult) {
                    console.log(smsResult);
                    resolve(resp);
                });
            } else {
                resolve(resp);
            }
        });

    });
};
function validNames(crbname, fname, lname) {

    var arrName = crbname.replace(/[^a-zA-Z ]/g, "").split(" ").map(function (val) {
        return val;
    });

    var countlname = 0;
    var countfname = 0;
    var i = 0;
    var aLength = arrName.length;
    for (i = 0; i < aLength; i++) {
        console.log(arrName[i]);
        if (arrName[i].toString().toUpperCase() === lname.toUpperCase().toString()) {
            countlname++;
        }
        if (arrName[i].toUpperCase().toString() === fname.toUpperCase().toString()) {
            countfname++;
        }
    }

    if (parseInt(countfname) === 0 || parseInt(countlname) === 0) {
        return false;
    }

    return true;
}


exports.updateRegistrationFailure = function (connection, updateData, phonenumber) {
    return new Promise(function (resolve, reject) {

        var crbDataProc = "call sp_updateRegistrationFailure(?,?)";

        connection.query(crbDataProc, [
            phonenumber,
            JSON.stringify(updateData)
        ], function (err, resultTuDB) {
            if (err) {
                reject(err);
            }
            resolve(resultTuDB);
        });
    });
};


exports.saveTUData = function (connection, crbResult, phonenumber) {
    return new Promise(function (resolve, reject) {


        if (crbResult.customerDetailsExits == 0) {
            var crbDataProc = "call sp_saveTUCRBData(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

            connection.query(crbDataProc, [
                phonenumber,
                crbResult.DateOfBirth,
                crbResult.ResponseCode,
                crbResult.OtherNames.replace(/[^\w\s]/gi, ''),
                crbResult.NationalID,
                crbResult.Probability,
                crbResult.ReasonCodeAARC4,
                crbResult.Grade,
                crbResult.ReasonCodeAARC2,
                crbResult.ReasonCodeAARC3,
                crbResult.Salutation,
                crbResult.MobiLoansScore,
                crbResult.PaOpenMobiLoanAccounts,
                crbResult.NpaAccounts,
                crbResult.NpaOpenMobiLoanAccounts,
                crbResult.ReasonCodeAARC1,
                crbResult.AvgMobiLoanPrincipalAmount,
                crbResult.CreditHistory,
                crbResult.Surname.replace(/[^\w\s]/gi, ''),
                crbResult.Crn,
                crbResult.totalNpas,
                crbResult.phoneDetails,
                crbResult.dateDiff,
                crbResult.NpaClosedAccounts,
                crbResult.NpaClosedMobiLoanAccounts,
                crbResult.NpaOpenAccounts
            ], function (err, resultTuDB) {
                if (err) {
                    reject(err);
                }

                resolve(resultTuDB);
            });
        } else {
            var resultTuDB = {};
            resultTuDB.responseCode = '000';
            resultTuDB.responseDetails = 'Customer Exists';
            resolve(resultTuDB);
        }
    });
};


exports.fetchTUDetails = function (connection, request, configs) {
    return new Promise(function (resolve, reject) {




        var transUnionDuplicateCheckQuery = "SELECT * FROM TajiriMF.tbTUCRBData where NationalID='" + request.idnumber + "'";
        //console.log(loginQuery);
        connection.query(transUnionDuplicateCheckQuery, function (err, custRows, fields) {

            if (err) {
                reject(err);
            } else {
                var custData = custRows[0];

                if (custData == undefined) {
                    var isodata = {
                        'nationalID': request.idnumber,
                        'name1': request.firstname,
                        'name2': request.lastname,
                        'dateOfBirth': request.dob,
                        'phonenumber': request.phonenumber
                    };
                    //console.log(isodata);
                    core.postRequest(isodata, configs.TUCRBUrl).then(function (crbResult) {

                        crbResult.customerDetailsExits = 0;
                        resolve(crbResult);
                    });
                } else {
                    custData.customerDetailsExits = 1;
                    resolve(custData);
                }
            }
        });


    });
};

exports.registerCustomer = function (connection, request, configs) {


    return new Promise(function (resolve, reject) {

        exports.fetchTUDetails(connection, request, configs).then(function (crbResult) {

            return crbResult;
        }).then(function (crbResult) {

            exports.saveTUData(connection, crbResult, request.phonenumber).then(function (crbDBSaveResult) {

                var postQuery = "CALL sp_postCustomerData(?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                //console.log(crbResult.OtherNames, crbResult.Surname);
                var crbDOB = crbResult.DateOfBirth;
                var CRBnames = crbResult.Surname.replace(/[^\w\s]/gi, '') + " " + crbResult.OtherNames.replace(/[^\w\s]/gi, '');

//.substr(id.length - 4)
                if (crbDOB == undefined) {
                    request.responseCode = 601;
                    request.responseDetails = "Invalid Customer details. NULL DOB from TU";
                    var updateData = {
                        'responseCode': request.responseCode,
                        'responseDetails': request.responseDetails,
                        'firstname': request.firstname,
                        'lastname': request.lastname,
                        'dateOfBirth': request.dob
                    };
                    exports.updateRegistrationFailure(connection, updateData, request.phonenumber);
                    resolve(request);
                } else {

                    var custDOBObj = request.dob.toString().split("-");
                    console.log(custDOBObj[2]);

                    var crbDOBObj = crbDOB.toString().toString().split("-");
                    console.log(crbDOBObj[0]);
                    
                    if (crbDOBObj[2] !== custDOBObj[2]) {//Variant Dobs
                        request.responseCode = 601;
                        request.responseDetails = "Invalid Customer details. Invalid DOB from TU or Customer";
                        var updateData = {
                            'responseCode': request.responseCode,
                            'responseDetails': request.responseDetails,
                            'firstname': request.firstname,
                            'lastname': request.lastname,
                            'dateOfBirth': request.dob
                        };
                        exports.updateRegistrationFailure(connection, updateData, request.phonenumber);
                        resolve(request);
                    } else {
                        if (!validNames(CRBnames, request.firstname.trim(), request.lastname.trim())) {
                            request.responseCode = 601;
                            request.responseDetails = "Invalid Customer details. Invalid names from TU or Customer";
                            var updateData = {
                                'responseCode': request.responseCode,
                                'responseDetails': request.responseDetails,
                                'firstname': request.firstname,
                                'lastname': request.lastname,
                                'dateOfBirth': request.dob
                            };
                            exports.updateRegistrationFailure(connection, updateData, request.phonenumber);
                            resolve(request);
                        } else {
                            connection.query(postQuery, [
                                request.firstname,
                                request.lastname,
                                request.gender,
                                request.pin,
                                request.dob,
                                request.idnumber,
                                request.imei,
                                request.email,
                                request.phonenumber,
                                request.securityquestion,
                                request.securityanswer,
                                crbResult.AvgMobiLoanPrincipalAmount,
                                crbResult.MobiLoansScore,
                                crbResult.numberOfMarchingPhones
                            ], function (err, result) {
                                console.log(result);
                                if (err) {
                                    console.log(err);
                                    reject(err);
                                } else {
                                    var resp = result[0][0];
                                    console.log(result);

                                    if (resp.responseCode.toString() === '000') {
                                        resp.alertType = 'SUCCESS-REG';
                                        exports.sendSMS(connection, resp, configs);
                                        resolve(resp);
                                    } else {
                                        resolve(resp);
                                    }
                                }
                            });
                        }
                    }
                }


            });
        });

    });

};

exports.sendSMS = function (connection, resp, configs) {
    return new Promise(function (resolve, reject) {


        var loginQuery = "SELECT * FROM tbAlertsTemplate where alertType='" + resp.alertType + "'";
        console.log(loginQuery);
        connection.query(loginQuery, function (err, rowAlert, fields) {

            if (err) {
                reject(err);
            } else {
                console.log(rowAlert);
                var isodata = {
                    'mobile': resp.MobileNumber1,
                    'message': rowAlert[0].smsTemplate.replace('@NAME', resp.FirstName)
                };
                console.log(isodata);
                core.postRequest(isodata, configs.SMSWSURL).then(function (smsResult) {
                    console.log(smsResult);
                    resolve(smsResult);
                });
            }
        });
    });
};
