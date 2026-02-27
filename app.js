'use strict';

//завантаження змінних з файлу .env
require('dotenv').config();

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const app = express();

//підключення бібліотеки SweetAlert2
app.use('/sweetalert2', express.static(__dirname + '/node_modules/sweetalert2/dist'));

//Налаштування сховища сесій у базі даних MySQL
const sessionStore = new MySQLStore({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT || 3306
});

//конфігурація шаблонізатора (View Engine)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

//Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//налаштування папки для статичних файлів
app.use(express.static(path.join(__dirname, 'public')));


//механізм сесій користувачів
app.use(session({
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7дн
}));


//Маршрути
const indexRouter = require('./routes/index');  //головна сторінка
const authRouter = require('./routes/auth');    //авторизація та профіль
const apiRouter = require('./routes/polls');    //API опитувань
const pagesRouter = require('./routes/pages');  //yніверсальний обробник
app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', apiRouter);
app.use('/', pagesRouter);


//error 404 - сторінку не знайдено
app.use((req, res) => {
    res.status(404).render('error', {
        message: 'Page Not Found',
        error: { status: 404 },
        title: '404 Error'
    });
});

//Запуск HTTP сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});