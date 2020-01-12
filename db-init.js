// app.js

// Links
// https://www.npmjs.com/package/node-mysql-importer
// https://medium.com/codebuddies/getting-to-know-asynchronous-javascript-callbacks-promises-and-async-await-17e0673281ee
//

// sudo su - postgres
// createuser--interactive--pwprompt
// createdb - O user mpd-calldata

var config = require('./config.js');
var { Pool } = require('pg');
const SQL = require('sql-template-strings')
const sql_pool = new Pool(config);

var SQL_QUERY_INIT = SQL`
CREATE TABLE if not exists calls (
  callnumber varchar (10) NOT NULL,
  timestamp char(50) NOT NULL,
  location char (50) NOT NULL,
  district char (25) NOT NULL,
  calltype char (25) NOT NULL,
  status char (25) NOT NULL,
  PRIMARY KEY (callnumber)
) `;

sql_pool.query(SQL_QUERY_INIT, (err, res) => {
    if (err) {
        console.log(err.message);
    } 
    else { console.log('initDB() materialized.'); }
    sql_pool.end()
})