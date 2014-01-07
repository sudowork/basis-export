#!/usr/bin/env node
'use strict';

/**
 * BasisExport~dataCallback
 * @param {Error} err Error if applicable
 * @param {IncomingMessage} res HTTP response
 * @param {Object} data JSON of the Basis data (if available)
 * @return {void}
 */

var request = require('request');

var optimist = require('optimist')
    .usage('Usage: $0 [options] username')
    .options('d', {
      alias: 'date',
      describe: 'Date to get data for [default: yesterday]'
    })
    .options('p', {
      alias: 'pretty',
      describe: 'Whether or not to pretty-print the data',
      default: false,
      boolean: true
    }),
  argv;

var BASIS_API_URL = 'https://app.mybasis.com/api/v1/chart/',
    INTERVAL = 60,
    OFFSET = 0;

/**
 * Formats a date as a string "YYYY-mm-dd".
 *
 * @param {Date} date The date object to format
 * @return {string}
 */
function formatDateAsString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Given the date that data is needed for, the start and end dates are
 * returned as a tuple of [start, end].
 *
 * @param {Date} [date] Target date. Default is yesteday.
 * @return {[string]} Tuple of start and end date strings
 */
function getDateRange(date) {
  var msInADay = 1000 * 60 * 60 * 24,
      yesterday = new Date(Date.now() - msInADay),
      actualStart = date || yesterday,
      actualEnd = new Date(actualStart.getTime() + msInADay);
  return [actualStart, actualEnd].map(formatDateAsString);
}

/**
 * Returns the request options for a given username and date.
 *
 * @param {string} username The short-MD5 hash that Basis uses as a username
 * @param {Date} date The target date
 * @return {Object} Object containing the HTTP request options
 */
function getRequestOptions(username, date) {
  var endpoint = username + '.json',
      dateRange = getDateRange(date),
      options = {
        url: BASIS_API_URL + endpoint,
        qs: {
          summary: true,
          interval: INTERVAL,
          start_date: dateRange[0],
          start_offset: OFFSET,
          end_date: dateRange[1],
          end_offset: OFFSET,
          units: 'ms',
          heartrate: true,
          steps: true,
          calories: true,
          gsr: true,
          skin_temp: true,
          bodystates: true
        },
        json: true
      };
  return options;
}

/**
 * Makes an HTTP request to the Basis API to retrieve the data for a given user
 * and date.
 *
 * @param {string} username The short-MD5 of the username
 * @param {Date} date The target date
 * @param {BasisExport~dataCallback} callback Called after the request has succeeded or failed
 * @return
 * @module basis-export
 */
function exportBasisData(username, date, callback) {
  var options = getRequestOptions(username, date);
  request(options, callback);
}

/**
 * Called to populate the argv variable.
 *
 * @return
 */
function collectAndValidateArgs() {
  argv = optimist
    .check(function(argv) {
      var username = argv._[0],
          shortMD5 = /^[a-f0-9]{24}$/;
      if (!username) {
        throw new Error('username required');
      }
      if (!(typeof username === 'string' && username.match(shortMD5))) {
        throw new Error('username must be a short-MD5 hash');
      }
      if (argv.date && !Date.parse(argv.date)) {
        throw new Error('Invalid date option');
      }
    })
    .argv;
}

/**
 * If running in CLI-mode, then make the request and output the data to STDOUT.
 *
 * @return {number} Exit code
 */
function runExportBasisData() {
  var username = argv._[0],
      jsonSpace = argv.pretty ? '  ' : null;
  exportBasisData(username, argv.date, function (err, res, data) {
    if (err || res.statusCode !== 200) {
      console.error(err, res);
      return 1;
    } else {
      console.log(JSON.stringify(data, null, jsonSpace));
      return 0;
    }
  });
}

// If running from the command line, directly make the request.
if (require.main === module) {
  collectAndValidateArgs();
  process.exit(runExportBasisData());
} else {
  module.exports = exportBasisData;
}

