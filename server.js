// Импортируем необходимые модули
var express = require('express'); // Модуль для создания веб-сервера
var app = express(); // Создаем экземпляр express-приложения
var server = require('http').Server(app); // Создаем HTTP-сервер на основе express-приложения
var io = require('socket.io')(server); // Подключаем Socket.IO для работы с веб-сокетами

// Инициализируем переменные для хранения состояния игры
var players = {}; // Объект для хранения информации об игроках (ключ - socket.id)
var stars = []; // Массив для хранения координат звезд
var dogs = []; // Массив для хранения информации о собаках
let dogCounter = 0; // Счетчик для генерации уникальных ID собак

// Функция для генерации случайных координат для звезды
function generateStarPosition() {
    return {
        x: Math.floor(Math.random() * 700) + 50, // Случайная координата X (от 50 до 750)
        y: Math.floor(Math.random() * 500) + 50, // Случайная координата Y (от 50 до 550)
    };
}

// Функция для генерации случайных координат и ID для собаки
function generateDogPosition() {
    dogCounter++; // Увеличиваем счетчик ID собак
    return {
        x: Math.floor(Math.random() * 700) + 50, // Случайная координата X (от 50 до 750)
        y: Math.floor(Math.random() * 500) + 50, // Случайная координата Y (от 50 до 550)
        dogId: dogCounter, // Уникальный ID собаки
        isChasing: true,    // Указывает, что собака "активна" и преследует игрока
    };
}

// Функция для создания начального массива звезд
function generateInitialStars(count) {
    const initialStars = [];
    for (let i = 0; i < count; i++) {
        initialStars.push(generateStarPosition());
    }
    return initialStars;
}

// Создаем начальный массив звезд (6 штук)
stars = generateInitialStars(6);

// Настройка статического каталога (для отдачи файлов index.html, css и т.д.)
app.use(express.static(__dirname + '/public'));

// Обработчик GET-запроса на главную страницу
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html'); // Отправляем файл index.html
});

// Функция для определения ближайшего игрока к собаке
function getClosestPlayerFromServer(dog, players) {
    let closestPlayer = null; // Инициализируем ближайшего игрока как null
    let minDistance = Infinity; // Инициализируем минимальное расстояние как бесконечность

    for (const playerId in players) { // Перебираем всех игроков
        const player = players[playerId]; // Получаем данные игрока
        // Вычисляем расстояние между собакой и игроком
        const distance = Math.sqrt(Math.pow(dog.x - player.x, 2) + Math.pow(dog.y - player.y, 2));
        if (distance < minDistance) { // Если текущее расстояние меньше минимального
            minDistance = distance; // Обновляем минимальное расстояние
            closestPlayer = player; // Обновляем ближайшего игрока
        }
    }
    return closestPlayer; // Возвращаем ближайшего игрока
}


// Обработчик событий Socket.IO при подключении нового пользователя
io.on('connection', function (socket) {
    console.log('подключился пользователь'); // Выводим сообщение в консоль сервера

    // Создаем нового игрока и добавляем его в объект players
    players[socket.id] = {
        rotation: 0, // Начальный угол поворота
        x: generateStarPosition().x, // Начальная координата X
        y: generateStarPosition().y, // Начальная координата Y
        playerId: socket.id, // Уникальный ID игрока (socket.id)
        score: 0, // Начальный счет игрока
    };

    // Отправляем клиенту начальные данные (список текущих игроков, координаты звезд, начальный счет)
    socket.emit('currentPlayers', players);
    socket.emit('starLocation', stars);
    socket.emit('scoreUpdate', socket.id, players[socket.id].score);

    // Сообщаем всем остальным клиентам о появлении нового игрока
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Отправляем новому клиенту всех "активных" собак
    dogs.forEach(dog => {
        if (dog.isChasing) { // Если собака активна (преследует игрока)
            const closestPlayer = getClosestPlayerFromServer(dog, players); // Определяем ближайшего игрока
            dog.target = {  // Устанавливаем цель для собаки
                x: closestPlayer ? closestPlayer.x : dog.x, // Цель X: координата X ближайшего игрока (если есть), или координата X самой собаки
                y: closestPlayer ? closestPlayer.y : dog.y // Цель Y: координата Y ближайшего игрока (если есть), или координата Y самой собаки
            };
            socket.emit('newDog', dog); // Отправляем информацию о собаке клиенту
        }
    });

    // Обработчик события отключения пользователя
    socket.on('disconnect', function () {
        console.log('пользователь отключился'); // Выводим сообщение в консоль сервера
        delete players[socket.id]; // Удаляем информацию об игроке
        io.emit('playerDisconnect', socket.id); // Сообщаем всем клиентам об отключении игрока
        io.emit('currentPlayers', players); // Отправляем обновленный список игроков
    });

    // Обработчик события перемещения игрока
    socket.on('playerMovement', function (movementData) {
        if (players[socket.id]) {  // Если игрок существует
            players[socket.id].x = movementData.x; // Обновляем координату X
            players[socket.id].y = movementData.y; // Обновляем координату Y
            players[socket.id].rotation = movementData.rotation; // Обновляем угол поворота
            socket.broadcast.emit('playerMoved', players[socket.id]); // Сообщаем другим клиентам о перемещении игрока
        }
        dogs.forEach(dog => { // Для всех собак
            const closestPlayer = getClosestPlayerFromServer(dog, players); // Определяем ближайшего игрока
            dog.target = { // Обновляем цель для собаки
                x: closestPlayer ? closestPlayer.x : dog.x, // Цель X
                y: closestPlayer ? closestPlayer.y : dog.y  // Цель Y
            };
            io.emit('dogTargetUpdate', dog.dogId, dog.target); // Сообщаем всем клиентам об обновлении цели собаки
        });
    });

    // Обработчик события сбора звезды
    socket.on('starCollected', function () {
        if (players[socket.id]) { // Если игрок существует
            players[socket.id].score += 10; // Увеличиваем счет игрока
              const player = players[socket.id];
          let closestStarIndex = null;
         let minDistance = Infinity;
          for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
             const distance = Math.sqrt(Math.pow(star.x - player.x, 2) + Math.pow(star.y - player.y, 2));
             if (distance < minDistance) {
                 minDistance = distance;
                 closestStarIndex = i;
            }
          }
        if (closestStarIndex !== null) {
            stars.splice(closestStarIndex, 1)
            stars.push(generateStarPosition());
        }

           io.emit('starLocation', stars); // Отправляем обновленные координаты звезд
            io.emit('scoreUpdate', socket.id, players[socket.id].score); // Отправляем обновленный счет
        }
    });

    // Обработчик события попадания собаки в игрока
    socket.on('dogHitPlayer', function (playerId) {
        if (players[playerId]) { // Если игрок существует
            players[playerId].score -= 30; // Уменьшаем счет игрока
            io.emit('scoreUpdate', playerId, players[playerId].score); // Отправляем обновленный счет
        }
    });
    
    // Обработчик события удаления собаки
    socket.on('destroyDog', (dogId) => {
        dogs = dogs.filter(dog => dog.dogId !== dogId);
         io.emit('destroyDog', dogId); // Сообщаем всем клиентам об удалении собаки
    });
});

// Таймер для добавления новых собак каждые 2 секунды
setInterval(() => {
          const dogPosition = generateDogPosition(); // Генерируем позицию новой собаки
           const closestPlayer = getClosestPlayerFromServer(dogPosition, players); // Определяем ближайшего игрока
          dogPosition.target = { // Устанавливаем цель для собаки
              x: closestPlayer ? closestPlayer.x : dogPosition.x, // Цель X
              y: closestPlayer ? closestPlayer.y : dogPosition.y // Цель Y
          };
          dogPosition.isChasing = true; // Помечаем собаку как активную
          dogs.push(dogPosition); // Добавляем новую собаку в массив
          io.emit('newDog', dogPosition); // Отправляем информацию о новой собаке всем клиентам
        }, 2000);

// Запускаем сервер на порту 80
server.listen(80, function () {
    console.log(`Прослушиваем ${server.address().port}`);
});