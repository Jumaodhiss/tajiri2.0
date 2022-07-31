/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

//created by sure 05.03.2019
//modified by sure on 01-06-2019 to add ssl and restrict ssl traffic

const cluster = require('cluster');
const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const app = express();
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
var schedule = require('node-schedule');
var core = require('./src/core');
var mysql = require('mysql');
var configs = require('./configs');

var myconfigs = {};
configs.fetchConfigs().then(function (projectConfigs) {
    console.log(projectConfigs);

    readFile(projectConfigs.DBConfigs.SSLCAFile, 'utf8').then(function (SSLCAFile) {
        return SSLCAFile;
    }).then(function (SSLCAFile) {
        readFile(projectConfigs.DBConfigs.SSLKeyFile, 'utf8').then(function (SSLKeyFile) {
            return SSLKeyFile;
        }).then(function (SSLKeyFile) {
            readFile(projectConfigs.DBConfigs.SSLCertFile, 'utf8').then(function (SSLCertFile) {
                var connectionPool = mysql.createPool({
                    connectionLimit: 100,
                    host: projectConfigs.DBConfigs.host,
                    port: projectConfigs.DBConfigs.dbPort,
                    user: projectConfigs.DBConfigs.user,
                    password: projectConfigs.DBConfigs.password,
                    database: projectConfigs.DBConfigs.database,
                    timezone: 'EAT',
                    ssl: {
                        ca: SSLCAFile,
                        key: SSLKeyFile,
                        cert: SSLCertFile
                    }
                });

                if (cluster.isMaster) {

                    var ruleMpesaUnblocking = new schedule.RecurrenceRule();
                    ruleMpesaUnblocking.minute = new schedule.Range(0, 59, 5);


                    var ruleCOB = new schedule.RecurrenceRule();
                    ruleCOB.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
                    ruleCOB.hour = 02;
                    ruleCOB.minute = 31;

                    var ruleSendScheduledAlerts = new schedule.RecurrenceRule();
                    ruleSendScheduledAlerts.dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
                    ruleSendScheduledAlerts.hour = 8;
                    ruleSendScheduledAlerts.minute =10;


                    var jobRunCOB = schedule.scheduleJob(ruleCOB, function (fireDate) {//weekly
                        console.log('Scheduled Loan Monitoring ' + fireDate);
                        connectionPool.getConnection(function (err, connection) {
                            if (err) {
                                console.log(err);
                            }
                            core.doCOB(connection).then(function (cobResult) {
                                console.log(cobResult);
                                connection.release();
                            });
                        });
                    });


                    var jobSendAlerts = schedule.scheduleJob(ruleSendScheduledAlerts, function (fireDate) {//weekly
                        console.log('Scheduled Loan Monitoring ' + fireDate);
                        connectionPool.getConnection(function (err, connection) {
                            if (err) {
                                console.log(err);
                            }
                            core.sendPeriodicAlerts(connection,projectConfigs.TajiriBEParams).then(function (cobResult) {
                                console.log(cobResult);
                                connection.release();
                            });
                        });
                    });

                    var jobunlockMpesa = schedule.scheduleJob(ruleMpesaUnblocking, function (fireDate) {//weekly
                        console.log('Scheduled Loan Monitoring ' + fireDate);
                        connectionPool.getConnection(function (err, connection) {
                            if (err) {
                                console.log(err);
                            }
                            core.unlockMpesaTransactions(connection).then(function (cobResult) {
                                console.log(cobResult);
                                connection.release();
                            });
                        });
                    });

                    var numCPUs = require('os').cpus().length;
                    var numWorkers = numCPUs * numCPUs;
                    for (var i = 0; i < numWorkers; i++) {
                        cluster.fork();
                    }

                    cluster.on('online', function (worker) {
                        console.log('Tajiri Worker ' + worker.process.pid + ' is online');
                    });

                    cluster.on('exit', function (worker, code, signal) {
                        console.log('Tajiri Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
                        cluster.fork();
                    });
                } else {

                    var fs = Promise.promisifyAll(require('fs'));

                    var sslOptions = {
                        key: fs.readFileSync('/srv/applications/servercerts/utajiri.key'),
                        cert: fs.readFileSync('/srv/applications/servercerts/ssl_certificate.cer'),
                        ca: fs.readFileSync('/srv/applications/servercerts/IntermediateCA.cer')
                    };

                    var server = https.createServer(sslOptions, app);

                    server.listen(projectConfigs.TajiriBEParams.httpPort, '0.0.0.0', function (err) {
                        if (err) {
                            console.log(err);
                        }
                        console.log('Tajiri Backend Process ' + process.pid + " is listening to all incoming requests on https://www.utajiri.co.ke:%s", projectConfigs.TajiriBEParams.httpPort);
                    });

                    app.use(bodyParser.json({
                        defaultCharset: 'utf-8'
                    }));
                    //app.use(express.bodyParser());

                    app.post('/postData', function (req, res) {
                        try {

                            //console.log(req.body);

                            var menuName = req.body.menu;
                            var method = req.body.method;

                            var menu = require('./src/' + menuName);

                            //console.log(req.body);
                            connectionPool.getConnection(function (err, connection) {
                                if (err) {
                                    console.log(err);
                                }
                                menu[method](connection, req.body, projectConfigs.TajiriBEParams).then(function (result) {
                                    console.log(result);
                                    connection.release();
                                    res.json(result);
                                });
                            });
                        } catch (e) {
                            res.sendStatus(500);
                            console.error(e);
                            return console.error('index ' + e.stack);
                        }

                    }); //end app.post


                    //app.use(express.bodyParser());
                    app.post('/updateMpesaSTKPush', function (req, res) {
                        try {

                            var loan = require('./src/loan');
                            connectionPool.getConnection(function (err, connection) {
                                if (err) {
                                    console.log(err);
                                }
                                loan.processPaymentCallBack(connection, req.body, projectConfigs.TajiriBEParams).then(function (result) {
                                    console.log(result);
                                    connection.release();
                                    res.json(result);
                                });
                            });
                        } catch (e) {
                            res.sendStatus(500);
                            console.error(e);
                            return console.error('index ' + e.stack);
                        }

                    }); //end app.post

                    //app.use(express.bodyParser());
                    app.post('/updateMpesaC2BPush', function (req, res) {
                        try {

                            var loan = require('./src/loan');
                            connectionPool.getConnection(function (err, connection) {
                                if (err) {
                                    console.log(err);
                                }
                                loan.processPaymentCallBack(connection, req.body, projectConfigs.TajiriBEParams).then(function (result) {
                                    console.log(result);
                                    connection.release();
                                    res.json(result);
                                });
                            });
                        } catch (e) {
                            res.sendStatus(500);
                            console.error(e);
                            return console.error('index ' + e.stack);
                        }
                    }); //end app.post


                    //app.use(express.bodyParser());
                    app.post('/smsDeliveryCallback', function (req, res) {
                        try {

                            var loan = require('./src/loan');
                            connectionPool.getConnection(function (err, connection) {
                                if (err) {
                                    console.log(err);
                                }
                                loan.processPaymentCallBack(connection, req.body, projectConfigs.TajiriBEParams).then(function (result) {
                                    console.log(result);
                                    connection.release();
                                    res.json(result);
                                });
                            });
                        } catch (e) {
                            res.sendStatus(500);
                            console.error(e);
                            return console.error('index ' + e.stack);
                        }
                    }); //end app.post
                }
            });
        });
    });

});

