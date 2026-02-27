//Ініціалізація системи відображення опитувань та голосування
function initVoteSystem() {
    const container = document.getElementById('pollsContainer');
    const searchInput = document.getElementById('mySearch');
    const searchBtn = document.getElementById('searchBtn');

    //змінна стану для "пам'ятання" поточного контексту запиту
    let currentFetchUrl = '/polls';

    if (!container) return;

    //Універсальна функція завантаження
    async function loadPolls(url) {
        try {
            // Якщо передана нова URL (наприклад, пошук), вона зберігається.
            // Якщо не передана (оновлення після голосу), використовується збережена.
            if (url) {
                currentFetchUrl = url;
            }

            const response = await fetch(currentFetchUrl); //мережевий запит до сервера

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const polls = await response.json();
            renderPolls(polls); //виклик функції відтворення отриманих даних
        } catch (err) {
            console.error('Error loading polls:', err);
        }
    }

    //Динамічний рендеринг інтерфейсу опитувань
    function renderPolls(polls) {
        container.innerHTML = '';    //очищення контейнера
        if (!Array.isArray(polls) || polls.length === 0) {
            container.innerHTML = '<p>No polls found.</p>';
            return;
        }

        polls.forEach(poll => {
            //створення базової структури форми опитування
            const pollContainer = document.createElement('div');
            pollContainer.classList.add('poll-container');

            const pollTitle = document.createElement('h3');
            pollTitle.textContent = poll.Text || 'Без назви питання';
            pollContainer.appendChild(pollTitle);

            const userName = document.createElement('h4');
            userName.textContent = `by ${poll.user_name || 'Anonymous'}`;
            pollContainer.appendChild(userName);

            //обробка та відображення зображення у форматі Base64
            if (poll.imageBase64) {
                const img = document.createElement('img');
                img.src = poll.imageBase64;
                img.alt = 'Question image';
                img.classList.add('poll-image');

                pollContainer.appendChild(img);
            }

            const form = document.createElement('form');

            //виключення можливості порожніх варіантів відповідей
            const validOptions = poll.options.filter(opt =>
                opt && opt.options_text && opt.options_text.trim() !== ''
            );

            //розрахунок загальної кількості голосів тільки для валідних опцій
            const totalVotes = validOptions.reduce((sum, opt) => sum + Number(opt.votes ?? 0), 0);

            //генерація варіантів відповідей
            validOptions.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.classList.add('option-block');

                const label = document.createElement('label');
                label.classList.add('option-label');

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `poll-${poll.id_Question}`;
                input.value = option.id_options;
                input.classList.add('option-input');

                const textSpan = document.createElement('span');
                textSpan.classList.add('option-text');
                textSpan.textContent = option.options_text;

                //Обчислення відсотка голосів для кожного варіанту
                const percent = totalVotes > 0 ? ((Number(option.votes) / totalVotes) * 100).toFixed(1) : 0;
                const percentSpan = document.createElement('span');
                percentSpan.classList.add('option-percent');
                percentSpan.textContent = `${Number(percent)}%`;

                label.append(input, textSpan, percentSpan);
                optionDiv.appendChild(label);

                //створення progress bar (лінія прогресу)
                const fill = document.createElement('div');
                fill.classList.add('option-fill');
                fill.style.width = `${percent}%`;

                label.title = `Votes: ${Number(option.votes)}`;

                optionDiv.appendChild(fill);
                form.appendChild(optionDiv);
            });

            const voteButton = document.createElement('button');
            voteButton.classList.add('submit_button');
            voteButton.textContent = 'Confirm';
            voteButton.type = 'button';
            form.appendChild(voteButton);

            //стилізація обраного варіанту при зміні вибору
            form.addEventListener('change', e => {
                if (e.target.matches('input[type="radio"]')) {
                    form.querySelectorAll('.option-block').forEach(div => div.classList.remove('selected'));
                    e.target.closest('.option-block').classList.add('selected');
                }
            });


            //ЛОГІКА ГОЛОСУВАННЯ
            voteButton.addEventListener('click', async () => {
                //відправка POST на сервер та оновлення інтерфейсу без перезавантаження
                const selectedOption = form.querySelector('input[type="radio"]:checked');
                if (!selectedOption) return Swal.fire({ title: 'Please select an option!', width: 402 });

                const optionId = selectedOption.value;

                try {
                    const response = await fetch('/vote', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            pollId: poll.id_Question,
                            optionId: optionId
                        })
                    });

                    const data = await response.json();
                    if (!response.ok) throw data;

                    //візуалізація успіху 
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: 'Vote counted!',
                        width: 250,
                        showConfirmButton: false,
                        timer: 1300
                    });

                    //оновлення списку опитувань для відображення нових результатів
                    await loadPolls();

                } catch (err) {
                    //обробка помилок
                    if (err?.error === 'not_logged_in') Swal.fire({ icon: "info", title: "You must log in to vote!" });
                    else if (err?.error === 'already_voted') Swal.fire({ position: "top-end", icon: "info", title: "You have already voted!", showConfirmButton: false, timer: 1500 });
                    else Swal.fire({ icon: "error", title: "Oops...", text: "Something went wrong!" });
                }
            });

            pollContainer.appendChild(form);
            container.appendChild(pollContainer);
        });
    }


    //ПОШУК
    if (searchBtn && searchInput) {
        const handleSearch = () => {
            const query = searchInput.value.trim();
            if (!query) return Swal.fire('Please enter something to search!');

            //виклик завантаження з параметрами фільтрації
            loadPolls(`/search?q=${encodeURIComponent(query)}`);
        };

        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }

    //Початкове завантаження
    //Визначення початкового стану сторінки на основі контексту
    if (window.pageContext && window.pageContext.isMyPolls && window.pageContext.userId) {
        loadPolls(`/polls/user/${window.pageContext.userId}`);
    } else {
        loadPolls('/polls');
    }
}
//запуск системи голосування відразу після завантаження сторінки
document.addEventListener('DOMContentLoaded', initVoteSystem);