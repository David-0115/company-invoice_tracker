/** Database setup for BizTime. */
const { Client } = require('pg');
require('dotenv').config();


let DB_NAME;

if (process.env.NODE_ENV === 'test') {
    DB_NAME = `biztime_test`;
} else {
    DB_NAME = `biztime`;
}


const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: DB_NAME
});



db.connect();

module.exports = db;


