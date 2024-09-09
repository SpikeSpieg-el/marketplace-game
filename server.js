const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

const itemNames = ['Sword', 'Shield', 'Potion', 'Helmet', 'Boots', 'Bow', 'Arrows', 'Gloves', 'Armor', 'Ring'];

let players = {};
let market = [];
let priceHistory = {};

// Генерация случайных предметов для нового игрока
const generateRandomItems = () => {
    let items = [];
    for (let i = 0; i < 10; i++) {
        items.push({
            name: itemNames[Math.floor(Math.random() * itemNames.length)], // Выбираем случайное имя из списка
            price: Math.floor(Math.random() * 100) + 1, // случайная стоимость от 1 до 100
        });
    }
    return items;
};

// Генерация начальных предметов для рынка
const generateMarketItems = () => {
    let items = [];
    for (let i = 0; i < 10; i++) {
        items.push({
            name: itemNames[Math.floor(Math.random() * itemNames.length)], // Выбираем случайное имя из списка
            price: Math.floor(Math.random() * 20) + 20, // случайная стоимость от 20 до 40
            seller: 'exampleSeller', // Можно заменить на идентификатор продавца
        });
    }
    return items;
};

// Восстановление состояния игрока
const findOrCreatePlayer = (playerId) => {
    if (!players[playerId]) {
        players[playerId] = {
            id: playerId,
            gold: 10000,
            inventory: generateRandomItems(),
            sellerName: `Player${Math.floor(Math.random() * 1000)}` // Присваиваем случайное имя
        };
    }
    return players[playerId];
};

// Функция добавления предмета по акции
const addSpecialOffer = () => {
    const itemName = itemNames[Math.floor(Math.random() * itemNames.length)];
    let price = Math.floor(Math.random() * 40) + 30; // случайная стоимость от 30 до 70

    // Проверяем есть ли история цен для этого предмета
    if (priceHistory[itemName]) {
        const avgPrice = priceHistory[itemName].reduce((sum, p) => sum + p, 0) / priceHistory[itemName].length;
        price = Math.floor(avgPrice * 0.75); // Устанавливаем цену со скидкой 25%
    }

    const item = {
        name: itemName,
        price: price,
        seller: 'Special Offer'
    };

    market.push(item);
    io.emit('updateMarket', market);

    // Удаляем предмет через 60 секунд
    setTimeout(() => {
        const index = market.findIndex(m => m.name === itemName && m.seller === 'Special Offer');
        if (index !== -1) {
            market.splice(index, 1);
            io.emit('updateMarket', market);
        }
    }, 60000);
};

// Запуск специального предложения каждую минуту
setInterval(() => {
    addSpecialOffer();
}, 60000);

// Функция для сброса состояния игры
const resetGame = () => {
    players = {}; // Сброс состояния игроков
    market = generateMarketItems(); // Новые предметы на рынке
    priceHistory = {}; // Сброс истории цен

    io.emit('init', {
        inventory: [],
        gold: 10000,
    });

    io.emit('updateMarket', market); // Обновление рынка
};

// Обработка событий
app.use(cookieParser());
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    // Идентификатор игрока из cookies
    const playerId = socket.handshake.headers.cookie && socket.handshake.headers.cookie.includes('playerId')
        ? socket.handshake.headers.cookie.split('playerId=')[1]
        : uuid.v4();

    // Устанавливаем cookie для идентификатора игрока
    socket.emit('setCookie', { playerId });
    socket.handshake.headers.cookie = `playerId=${playerId}`;

    // Восстанавливаем или создаем нового игрока
    const player = findOrCreatePlayer(playerId);
    socket.emit('init', player);

    // Обновляем информацию о рынке
    socket.emit('updateMarket', market);

    // Продажа предмета
    socket.on('sell', (data) => {
        const { itemIndex, sellPrice } = data;
        const player = players[playerId];

        if (itemIndex >= 0 && itemIndex < player.inventory.length) {
            const item = player.inventory[itemIndex];
            item.price = sellPrice;
            item.seller = playerId;

            // Удаляем товар из инвентаря игрока и добавляем его на рынок
            player.inventory.splice(itemIndex, 1);
            market.push(item);

            // Добавляем цену в историю цен
            if (!priceHistory[item.name]) {
                priceHistory[item.name] = [];
            }
            priceHistory[item.name].push(sellPrice);

            // Обновляем рынок для всех игроков
            io.emit('updateMarket', market);
            socket.emit('update', player);
        }
    });

    // Обработка запроса на получение истории цен
  socket.on('getPriceHistory', (itemName) => {
    const history = priceHistory[itemName] || [];
    const averagePrice = history.length > 0 ? (history.reduce((sum, p) => sum + p, 0) / history.length).toFixed(1) : 0;

    socket.emit('priceHistory', { itemName, history, averagePrice });
});


    // Покупка предмета
    socket.on('buy', (data) => {
        const { itemIndex } = data;
        const buyer = players[playerId];
        const item = market[itemIndex];

        if (item && buyer.gold >= item.price) {
            buyer.gold -= item.price;
            buyer.inventory.push(item);

            if (item.seller !== 'Special Offer') {
                const seller = players[item.seller];
                seller.gold += item.price;
                io.to(item.seller).emit('update', seller);
            }

            // Удаляем предмет с рынка
            market.splice(itemIndex, 1);

            // Обновляем состояние покупателя
            socket.emit('update', buyer);

            // Обновляем рынок для всех
            io.emit('updateMarket', market);
        }
    });

    // Сброс состояния игры
    socket.on('resetGame', () => {
        resetGame();
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', playerId);
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
