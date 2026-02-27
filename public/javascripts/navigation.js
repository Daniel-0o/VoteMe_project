// Очікування, поки браузер повністю завантажить всю структуру HTML
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main'); //знах головного блоку main

    //Функція динамічного завантаження контенту
    async function loadContent(url, addToHistory = true) {
        try {
            //хованя старого контенту
            main.classList.add('fade');

            //паралельно запускаємо завантаження даних
            const fetchPromise = fetch(url, { headers: { 'X-Requested-With': 'fetch' } });

            //очікування, щоб анімація  встигла спрацювати
            await new Promise(resolve => setTimeout(resolve, 250));

            const res = await fetchPromise;     //асинхронне очікування завершення HTTP запиту
            const html = await res.text();      //перетворення відповіді сервера у текст (HTML код сторінки)
            const parser = new DOMParser();     // Ініціалізація  DOMParser, який вміє читати текст як HTML документ
            const doc = parser.parseFromString(html, 'text/html');  //перетворення тексту на структуру сторінки, з якою може працювати браузер
            const newMain = doc.querySelector('main'); //вибирається лише центральна частина

            if (newMain) {
                window.pageContext = null; //очищення контексту
                main.innerHTML = newMain.innerHTML; //заміна контенту, поки main прозорий
                document.title = doc.title; //оновлення заголовку сторінки

                executeInlineScripts(main); //якщо на новій сторінці є свій pageContext, він встановиться тут
                reInitPageScripts();
            }

            if (addToHistory) history.pushState({ url }, '', url);

            main.classList.remove('fade'); //відображення вже нового контенту

        //Якщо сталася помилка, повертаємо видимість
        } catch (err) { 
            console.error('Помилка при завантаженні сторінки:', err);
            main.classList.remove('fade');
        }
    }


    //Виконання вбудованих скриптів
    function executeInlineScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) newScript.src = oldScript.src;
            else newScript.textContent = oldScript.textContent;
            newScript.defer = true;
            oldScript.replaceWith(newScript);
        });
    }

    //Перевизначення поведінки для <a> і кнопок, які мають у собі data-nav
    document.addEventListener('click', e => {
        const navEl = e.target.closest('a[data-nav], button[data-nav]');
        if (navEl && !navEl.hasAttribute('data-no-ajax')) {
            e.preventDefault();
            const url = navEl.dataset.nav || navEl.getAttribute('href');
            loadContent(url);
        }
    });


    //Підтримка кнопок назад та вперед
    window.addEventListener('popstate', e => {
        if (e.state?.url) loadContent(e.state.url, false);
    });

    //Реініціалізація логіки після динамічного оновлення
    function reInitPageScripts() {
        if (typeof initAuthButtons === 'function') initAuthButtons();
        if (typeof initVoteSystem === 'function') initVoteSystem();
        if (typeof initSignupLogic === 'function') initSignupLogic();
        if (typeof initLoginLogic === 'function') initLoginLogic();
    }

    //Початкове ініціалізування після завантаження вебдодатку
    reInitPageScripts();
});
