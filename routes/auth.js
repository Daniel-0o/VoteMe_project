const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const router = express.Router();

//Сторінка вибору дії (логін/реєстрація)
router.get('/Auth/auth-page', (req, res) => {
    res.render('Auth/auth-page', { title: 'Authentication' });
});

//Сторінка логіну
router.get('/Auth/log-in', (req, res) => {
    res.render('Auth/log-in', { title: 'Log In', error: null });
});

//Сторінка реєстрації
router.get('/Auth/sign-up', (req, res) => {
    res.render('Auth/sign-up', { title: 'Sign Up' });
});

//ОБРОБКА РЕЄСТРАЦІЇ
router.post('/Auth/register', async (req, res) => {
    const { name, email, password } = req.body;

    //валідація полів
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Fill up all the fields plaese' });
    }
    //валідація довжини пароля
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password is too short' });
    }
    //валідація email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address' });
    }

    //перевірка на дублікати імені та емейл
    const checkSql = 'SELECT * FROM users WHERE Name = ? OR Email = ?';
    db.query(checkSql, [name, email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Server error' });
        }

        if (results.length > 0) {
            const existingUser = results[0];
            if (existingUser.Name === name) {
                return res.status(409).json({ error: 'This name is already taken' });
            }
            if (existingUser.Email === email) {
                return res.status(409).json({ error: 'This email address is already registered' });
            }
        }

        //успіх - хешування та зберігання
        try {
            const hashedPassword = await bcrypt.hash(password, 10); //рівень складності хешування

            const insertSql = 'INSERT INTO users (Name, Email, Password) VALUES (?, ?, ?)';
            db.query(insertSql, [name, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Unknown error' });
                }

                //Створення сесії
                req.session.user = {
                    id: result.insertId,
                    name: name,
                    email: email
                };

                req.session.save(() => {
                    //повертаємо посилання для переходу
                    res.json({ success: true, redirect: '/Auth/profile' });
                });
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Помилка сервера' });
        }
    });
});


//ОБРОБКА ЛОГІНУ
router.post('/Auth/login', async (req, res) => {
    const { email, password } = req.body;

    //повідомлення про невдалу спробу
    const authError = 'Invalid Email or Password';

    db.query('SELECT * FROM users WHERE Email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'server error' });

        // користувача немає в базі
        if (results.length === 0) {
            return res.status(401).json({ error: authError });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.Password);

        //пароль не підійшов
        if (!isMatch) {
            return res.status(401).json({ error: authError });
        }

        //Успіх
        req.session.user = {
            id: user.id,
            name: user.Name,
            email: user.Email
        };

        req.session.save((err) => {
            if (err) return res.status(500).json({ error: 'Помилка сесії' });
            res.json({ success: true, redirect: '/Auth/profile' });
        });
    });
});



//Обробка запиту на відображення профілю користувача (контроль доступу)
router.get('/Auth/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/Auth/auth-page'); //переадресація
    }
    res.render('Auth/profile', { //рендеринг сторінки профілю
        title: 'Profile',
        user: req.session.user,
    });
});


//Перевірка сесії
router.get('/Auth/check-session', (req, res) => {
    if (req.session.user) {
        return res.redirect('/Auth/profile');
    } else {
        return res.redirect('/Auth/auth-page');
    }
});


//Маршрут для відображення сторінки home.ejs
router.get('/Home/home', (req, res) => {
    res.render('Home/home', {
        title: 'Home',
        user: req.session.user,
    });
});


//Обробка запиту на відображення сторінки додавання опитування (контроль доступу)
router.get('/Home/add-new', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/Home/message-home'); //переадресація в разі відсутності
    }
    res.render('Home/add-new', { //перехід на бажану сторінку
        title: 'Add Poll',
        user: req.session.user,
    });
});


//Вихід
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send('Помилка виходу');
        res.redirect('/Auth/auth-page');
    });
});

module.exports = router;
