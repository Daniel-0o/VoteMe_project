const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true, // чекати, якщо всі з'єднання зайняті
    connectionLimit: 10,      //чаксимум 10 одночасних з'єднань
    queueLimit: 0 //необмежена черга запитів
});

module.exports = db; //доступ для інших файлів
