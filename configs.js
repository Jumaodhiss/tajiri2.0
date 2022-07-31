/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var redis = require('redis');


var redisIP = '139.59.18.222';
var redisPort = 4348;
var redisPass = 's1mban1m0j@';

var redClient = redis.createClient(redisPort, redisIP); //creates a new client
redClient.auth(redisPass);

exports.fetchConfigs = function () {
    return new Promise(function (resolve, reject) {
        getDatabaseConfigs().then(function (DBConfigs) {
            return DBConfigs;
        }).then(function (DBConfigs) {
            getTajiriBEParams().then(function (TajiriBEParams) {
                let config = {};
                config.TajiriBEParams = TajiriBEParams;
                config.DBConfigs = DBConfigs;
                resolve(config);
            });
        });
    }).catch(function (error) {
        reject(error);
    });
};


function getTajiriBEParams() {
    return new Promise(function (resolve, reject) {
        redClient.hgetall("TajiriBEParams", function (err, object) {
            if (err) {
                reject({});
            }
            resolve(object);
        });
    });

}
; // end fn getMPesaParameters

function getDatabaseConfigs() {
    return new Promise(function (resolve, reject) {
        redClient.hgetall("DBConfigs", function (err, object) {
            if (err) {
                reject({});
            }
            resolve(object);
        });
    });
}
; // end fn getMPesaParameters




