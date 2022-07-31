
var Promise = require('bluebird');
var request = require('request');

exports.sendPeriodicAlerts = function (connection, configs) {
    return new Promise(function (resolve, reject) {
        console.log(configs);
        var postQuery = "CALL sp_get_unsent_alerts()";
        //console.log(postQuery);
        connection.query(postQuery, function (err, result) {
            if (err) {
                reject(err);
            } else {
                var smss = result[0];
//                console.log(smss);

                var smsCount = smss.length;
                var i = 0;
                for (i = 0; i < smsCount; i++) {
                    var sms = smss[i];
                    var isodata = {
                        'mobile': sms.phonenumber,
                        'message': sms.smsTemplate
                    };

                    exports.postRequest(isodata, configs.SMSWSURL).then(function (smsResult) {
                        smsResult.result = result;
                        console.log(smsResult);
                    });
                }
                var updateSql = "CALL sp_update_unsent_alerts()";
                connection.query(updateSql, function (err, result) {
                    resolve(result);
                });

            }
        });
    });
};

exports.doCOB = function (connection) {
    return new Promise(function (resolve, reject) {

        var postQuery = "CALL sp_DailyMonitoring()";
        console.log(postQuery);
        connection.query(postQuery, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};


exports.unlockMpesaTransactions = function (connection) {
    return new Promise(function (resolve, reject) {

        var postQuery = "CALL sp_mpesaLockMonitor()";
        console.log(postQuery);
        connection.query(postQuery, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};


exports.postRequest = function (isodata, postUrl) {

    return new Promise(function (resolve, reject) {

        request({
            url: postUrl,
            method: "POST",
            json: isodata,
            headers: {'Content-Type': 'application/json'}
            // form: requestData
        }, function (err, resp, body) {
            if (err) {
                console.log(err);
            } else {

                var respBody = resp.body;
                //console.log(respBody);
                resolve(respBody);
            } // end else
        }); // end request
    }); // end promise
};
