// app.js

// https://itmdapps.milwaukee.gov/MPDCallData/index.jsp?district=1
// https://itmdapps.milwaukee.gov/MPDCallData/index.jsp?district=All
// https://www.npmjs.com/package/table-scraper
// https://github.com/mysqljs/mysql
// https://www.npmjs.com/package/execsql #maybe some day?
// https://www.npmjs.com/package/tasktimer
// https://stackoverflow.com/questions/9472167/what-is-the-best-way-to-delete-old-rows-from-mysql-on-a-rolling-basis

// Libraries
var scraper = require('table-scraper')
var TaskTimer = require('tasktimer')
const request = require('request-promise')
var moment = require('moment')
var config = require('./config.js');

const { Pool } = require('pg');
const pool = new Pool(config);

pool.on('connect', () => {
  // console.log('connected to the db');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// const pg = require('pg');

// const { Pool } = require('pg')
// const pool = new Pool(config)

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens


// var mysql = require('mysql2')
// var config = require('dotenv').config({path: './database.config'}); // For config

// var { Pool } = require('pg');
// const sql_client_pool = new Pool(config);


// Vars
var timer = new TaskTimer(60000)

var urlMFD = 'https://itmdapps.milwaukee.gov/MFDCallData/'
var urlMPD = 'https://itmdapps.milwaukee.gov/MPDCallData/'

initDB()

// getMPD(urlMPD, function (mpd_results) {
//   parseMPD(mpd_results)
// })

timer.addTask({
    name: 'job1',       // unique name of the task
    tickInterval: 5,    // run every 5 ticks (5 x interval = 5000 ms)
    totalRuns: 0,      // run 5 times only. (set to 0 for unlimited times)
    callback: function (task) {
      getMPD(urlMPD, function(mpd_results) {
          parseMPD(mpd_results)
      })
    }
})

// timer.addTask({
//     name: 'job2',       // unique name of the task
//     tickInterval: 2,    // run every 5 ticks (5 x interval = 5000 ms)
//     totalRuns: 0,      // run 5 times only. (set to 0 for unlimited times)
//     callback: function (task) {
//       getMFD(urlMFD, function(mfd_results) {
//           parseMFD(mfd_results)
//       })
//     }
// })

timer.start()

function initDB() {

  const queryText =
    ` CREATE TABLE if not exists calls (
      callnumber varchar (10) NOT NULL,
      timestamp char(50) NOT NULL,
      location char (50) NOT NULL,
      district char (50) NOT NULL,
      calltype char (50) NOT NULL,
      status char (50) NOT NULL,
      PRIMARY KEY (callnumber))
    `;

  pool.connect((err, client, release) => {
    if (err) {
      return console.error('Error acquiring client', err.stack)
    }
    client.query(queryText, (err, result) => {
      release()
      if (err) {
        return console.error('Error executing query', err.stack)
      }
      console.log('initDB()')
    })
  })

}

function getMFD( my_url, callback ) {
  var request_options = {
    method: 'GET',
    uri: my_url,
    json: true,
    headers: {
      'Cache-Control': 'no-cache'
    } // headers
  } // request_options
  request( request_options )
    .then(function (response) {  // Request was successful
      var json_result = response
      callback( json_result )
    })
    .catch(function (err) {
      console.log( err ) // Something bad happened, handle the error
    })
}

function getMPD(my_url, callback) {
  scraper
    .get(my_url)
    .then(function(response) {
      // var json_result = response
      callback( response )
    })
    .catch(function (err) {
      console.log("Got error with scraper request:\n" + err)
    })
}

function parseMPD( tableData ) {
  // var connection = mysql.createConnection({
  //   host     : process.env.DATABASE_HOST,
  //   user     : process.env.DATABASE_USER,
  //   password : process.env.DATABASE_PASSWORD,
  //   database : process.env.DATABASE_NAME
  // })
  tableData[0].forEach(function(mpdcall) { // Using [0] since it's the first and only table, at least now. B-).
    var callnumber = mpdcall['Call Number']
    var timestamp = mpdcall['Date/Time']
    var location = mpdcall.Location
    var district = mpdcall['Police District']
    var calltype = mpdcall['Nature of Call']
    var status = mpdcall.Status

    var timestamp = moment(new Date(timestamp)).format("YYYY-MM-DD HH:mm:ss");

    // var sql_insert = `INSERT IGNORE INTO calls (callnumber, timestamp, location, district, calltype, status) VALUES (${callnumber}, '${timestamp}', '${location}', '${district}', '${calltype}', '${status}')`
 
    var queryText = `
                    INSERT INTO calls( callnumber, timestamp, location, district, calltype, status) 
                    VALUES( ${callnumber}, '${timestamp}', '${location}', ${district}, '${calltype}', '${status}')
                    ON CONFLICT (callnumber) 
                    DO NOTHING;
                    `;

    pool.connect((err, client, release) => {
      if (err) {
        return console.error('Error acquiring client', err.stack)
      }
      client.query(queryText, (err, result) => {
        release()
        if (err) {
          return console.error('Error executing query', err.stack)
        }
        // console.log('initDB()')
      })
    })

    // console.log(SQL_QUERY_INIT);
  
    
  })
  // connection.end()
}

function parseMFD( jsonData ) {
  // var connection = mysql.createConnection({
  //   host     : process.env.DATABASE_HOST,
  //   user     : process.env.DATABASE_USER,
  //   password : process.env.DATABASE_PASSWORD,
  //   database : process.env.DATABASE_NAME
  // })
  jsonData.forEach(function(mpdcall) { // Using [0] since it's the first and only table
    var callnumber = mpdcall['cfs']
    var timestamp = mpdcall['callDate']
    var location = mpdcall['address']
    var district = mpdcall['city']
    var calltype = mpdcall['type']
    var status = mpdcall['disposition']
    
    var timestamp = moment(new Date(timestamp)).format("YYYY-MM-DD HH:mm:ss");
    var queryText = `
                      INSERT INTO calls (callnumber, timestamp, location, district, calltype, status) 
                      VALUES (${callnumber}, '${timestamp}', '${location}', '10', '${calltype}', '${status}')
                      ON CONFLICT (callnumber) 
                      DO NOTHING;
                    `;
    pool.connect((err, client, release) => {
      if (err) {
        return console.error('Error acquiring client', err.stack)
      }
      client.query(queryText, (err, result) => {
        release()
        if (err) {
          return console.error('Error executing query', err.stack)
        }
        // console.log('initDB()')
      })
    })
    // connection.execute(
    //   sql_insert,
    //   function(err, results, fields) {
    //     if (err) throw err;
    //   }
    // )

  })
  // connection.end()
}
