/**
 * Created by sure on 4/16/16.
 */
var winston = require('winston');
var configs = require('../../config.js');

winston.emitErrs = true;
var logDir=configs.logFile;
//console.log(logDir);
var dateForlog=new Date().toISOString().
    replace(/T/, '').      // replace T with a space
    replace(/\..+/, '').
    replace(/[^\w\s]/gi, '').substring(0,10);

var logger = new winston.Logger({



    transports: [
        new winston.transports.File({
            level: 'info',
            filename: logDir+'/ccplog'+dateForlog+'.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 5,
            colorize: false
        }),
        new winston.transports.Console({
            level: 'debug',
            filename: logDir+'/ccpdebug'+dateForlog+'.log',
            handleExceptions: true,
            maxsize: 5242880, //5MB
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message,encoding){
        logger.info(message);
    }
};
module.exports.stream = {
    write: function(message,encoding){
        logger.error(message);
    }
};
module.exports.stream = {
    write: function(message,encoding){
        logger.debug(message);
    }
};