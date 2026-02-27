const express = require('express');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const router = express.Router();

//функція для отримання варіантів відповідей та підрахунку голосів
const getOptionsForQuestions = (questions) => {
    const promises = questions.map(q => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT o.id_options, o.options_text, COUNT(av.id_options) AS votes
                FROM options o
                LEFT JOIN all_votes av ON av.id_options = o.id_options
                WHERE o.id_Question = ?
                GROUP BY o.id_options, o.options_text
            `;

            db.query(sql, [q.id_Question], (err, opts) => {
                if (err) return reject(err);

                //ЛОГІКА ДЛЯ ЗОБРАЖЕНЬ
                let imageBase64 = null;

                //перевіряємо чи прийшов буфер з бази даних
                if (q.image_data) {
                    imageBase64 = `data:image/jpeg;base64,${q.image_data.toString('base64')}`;//конвертація бінарних даних в рядок Base64
                }

                //Створення об'єкта результату для одного запиту
                resolve({
                    id_Question: q.id_Question,
                    Text: q.Text,
                    imageBase64: imageBase64,   //Зображення, конвертоване у формат Base64 для прямого вбудовування в тег <img>
                    user_name: q.user_name || 'Anonymous', //Anonymous замість користувача у випадку його відсутності
                    options: opts.map(o => ({   //перетворення масиву варіантів відповідей
                        id_options: o.id_options,
                        options_text: o.options_text,
                        votes: o.votes || 0     //0 за замовчуванням якщо голосів немає
                    }))
                });
            });
        });
    });
    // Очікування завершення всіх асинхронних операцій у масиві та повернення об'єднаного результату
    return Promise.all(promises);
};

//функція обробки помилок БД
const dbError = (res, err) => {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
};




//отримування всіх опитуваннь
router.get('/polls', (req, res) => {
    const sql = `
        SELECT q.*, u.Name AS user_name
        FROM question q
        LEFT JOIN users u ON q.user_id = u.id
        ORDER BY q.id_Question DESC
    `;

    db.query(sql, (err, questions) => {
        if (err) return dbError(res, err);

        getOptionsForQuestions(questions)
            .then(results => res.json(results))
            .catch(err => dbError(res, err));
    });
});

//пошук опитувань
router.get('/search', (req, res) => {
    const query = req.query.q;
    if (!query || query.trim() === '') return res.json([]);

    const sql = `
        SELECT q.*, u.Name AS user_name
        FROM question q
        LEFT JOIN users u ON q.user_id = u.id
        WHERE q.Text LIKE ? 
        LIMIT 20
    `;

    db.query(sql, [`%${query}%`], (err, questions) => {
        if (err) return dbError(res, err);

        getOptionsForQuestions(questions)
            .then(results => res.json(results))
            .catch(err => dbError(res, err));
    });
});

//опитування конкретного юзера
router.get('/polls/user/:id', (req, res) => {
    const userId = req.params.id;
    const sql = `
        SELECT q.*, u.Name AS user_name
        FROM question q
        LEFT JOIN users u ON q.user_id = u.id
        WHERE q.user_id = ?
        ORDER BY q.id_Question DESC
    `;

    db.query(sql, [userId], (err, questions) => {
        if (err) return dbError(res, err);

        getOptionsForQuestions(questions)
            .then(results => res.json(results))
            .catch(err => dbError(res, err));
    });
});

//рендер сторінки my-polls.ejs  (Мої опитування)
router.get('/my-polls', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    res.render('Auth/own-polls', {
        title: 'My Polls',
        userId: req.session.user.id,
        isMyPolls: true
    });
});




//голосування
router.post('/vote', (req, res) => {
    const { pollId, optionId } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ error: 'not_logged_in' });
    }

    const userId = req.session.user.id;

    //Перевірка чи вже користувач проголосував
    db.query(
        'SELECT * FROM all_votes WHERE user_id = ? AND id_Question = ?',
        [userId, pollId],
        (err, result) => {
            if (err) return dbError(res, err);
            if (result.length > 0) return res.status(403).json({ error: 'already_voted' });

            //Запис голосу
            db.query(
                'INSERT INTO all_votes (user_id, id_Question, id_options) VALUES (?, ?, ?)',
                [userId, pollId, optionId],
                (err2) => {
                    if (err2) return dbError(res, err2);

                    //Повернення оновленої кількості голосів
                    db.query(
                        'SELECT COUNT(*) AS votes FROM all_votes WHERE id_options = ?',
                        [optionId],
                        (err3, rows) => {
                            if (err3) return dbError(res, err3);
                            res.json({ votes: rows[0].votes });
                        }
                    );
                }
            );
        }
    );
});




const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//рендер сторінки додавання опитувань add-new.ejs
router.get('/polls/add', (req, res) => {
    res.render('Home/add-new', { title: 'Add new poll' });
});

//Обробка форми створення
router.post('/polls/add', upload.single('image'), (req, res) => {
    const { question, options } = req.body;
    const imageData = req.file ? req.file.buffer : null;
    const userId = req.session.user ? req.session.user.id : null;
    const validOptions = options.filter(opt => opt && opt.trim() !== '');

    //перевірки
    if (!question || validOptions.length < 2) {
        return res.status(400).send('Потрібно вказати питання та щонайменше два варіанти.');
    }
    if (!userId) {
        return res.status(401).send('Ви повинні увійти в систему, щоб додати питання.');
    }

    //Додавання питання
    db.query(
        'INSERT INTO question (Text, image_data, user_id) VALUES (?, ?, ?)',
        [question, imageData, userId],
        (err, result) => {
            if (err) {
                console.error('DB insert error (question):', err);
                return res.status(500).send('Помилка при додаванні питання.');
            }

            const questionId = result.insertId;

            //Додавання варіантів
            const optionsData = options.map(opt => [opt, questionId]);
            db.query(
                'INSERT INTO options (options_text, id_Question) VALUES ?', [optionsData],
                (err2) => {
                    if (err2) {
                        console.error('DB insert error (options):', err2);
                        return res.status(500).send('Помилка при додаванні варіантів.');
                    }
                    res.redirect('/Home/add-new?status=success');
                }
            );
        }
    );
});

module.exports = router;