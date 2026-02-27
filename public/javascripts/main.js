//Керування dark mode
//отримання збережених налаштувань теми
let darkmode = localStorage.getItem('darkmode')
const themeSwitch = document.getElementById('theme-switcher')

//функція активації темного режиму та збереження в localStorage
const enableDarkmode = () => {
    document.body.classList.add('darkmode')
    localStorage.setItem('darkmode', 'active')
}

//функція для вимкнення темного режиму
const disableDarkmode = () => {
    document.body.classList.remove('darkmode')
    localStorage.setItem('darkmode', null)
}

//перевірка теми при завантаженні сторінки (для збереження вибору)
if (darkmode === "active") enableDarkmode()

//обробник події кліку
themeSwitch.addEventListener("click", () => {
    darkmode = localStorage.getItem('darkmode')
    darkmode !== "active" ? enableDarkmode() : disableDarkmode()
})



//Ініціалізація кнопок Login та SignUp
function initAuthButtons() {
    const loginBtn = document.getElementById('login_button');
    const signupBtn = document.getElementById('signup_button');

    //інтеграція з системою динамічного завантаження сторінок
    if (loginBtn) {
        loginBtn.setAttribute('data-nav', '/Auth/log-in');
    }
    if (signupBtn) {
        signupBtn.setAttribute('data-nav', '/Auth/sign-up');
    }
}

//Логіка обробки форми реєстрації
function initSignupLogic() {
    const form = document.getElementById('signUpForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); //скасування стандартного перезавантаження сторінки при відправці

        const errorDiv = document.getElementById('signup-error');
        const submitBtn = form.querySelector('button');

        //скидання стану форми
        submitBtn.disabled = true;
        errorDiv.style.display = 'none';

        //збір даних з полів форми в об'єкт JSON
        const formData = Object.fromEntries(new FormData(form));

        try {
            //асинхронна відправка даних на сервер (Fetch API)
            const res = await fetch('/Auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                //Успіх - переадресація в профіль
                window.location.href = data.redirect;
            } else {
                //обробка помилок валідації та візуальна індикація
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;

                //анімація помилки
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
            }
        } catch (err) {
            console.error(err);
            errorDiv.textContent = 'Помилка з\'єднання';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
        }
    });
}



//Логіка обробки форми входу
function initLoginLogic() {
    const form = document.getElementById('loginForm');
    if (!form) return; //перевірка наявності форми (для запобігання помилок)

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); //скасування стандартного перезавантаження сторнки

        const errorDiv = document.getElementById('login-error');
        const submitBtn = form.querySelector('button');

        // Візуальний ефект завантаження (також міні захист від повторних натискань)
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        errorDiv.style.display = 'none';

        //збір даних форми
        const formData = Object.fromEntries(new FormData(form));

        try {
            //відправка запиту на сервер для перевірки даних
            const res = await fetch('/Auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                //успіх - переходимо на профіль
                window.location.href = data.redirect;
            } else {
                //помилка - вивід повідомлення
                errorDiv.textContent = data.error;
                errorDiv.style.display = 'block';

                //скидання кнопки в початковий стан
                submitBtn.disabled = false;
                submitBtn.textContent = 'Log in';
            }
        } catch (err) {
            console.error(err);
            errorDiv.textContent = 'Server error';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
        }
    });
}


//Обробка вхідних параметрів URL після завантаження сторінки
document.addEventListener('DOMContentLoaded', () => {
    //отримуємо параметри з URL
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');

    //якщо знайдено параметр статусу success, виводимо спливаюче повідомлення
    if (status === 'success') {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            showConfirmButton: false,
            timer: 1500,
            width: 300,
            position: 'top-end'
        });

        //очищення "?status=success" з адреси, щоб при оновленні сторінки повідомлення не вискакувало знову
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
});