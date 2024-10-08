const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const uuid = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

const itemNames = [
    'Sword', 'Shield', 'Potion', 'Helmet', 'Boots', 'Bow', 'Arrows', 'Gloves', 'Armor', 'Ring',
    'Magic Wand', 'Staff', 'Dagger', 'Crossbow', 'Amulet', 'Cloak', 'Scroll', 'Boots of Speed', 'Ring of Strength', 'Helmet of Wisdom',
    'Baseball bat', 'Crystal Ball', 'Enchanted Shield', 'Robe', 'Staff of Fire', 'Belt of Giants', 'Boots of Stealth', 'Necklace of Healing',
    'Gauntlets', 'Boots of Flight', 'Orb of Power', 'Elixir of Life', 'Crown', 'Charm of Protection', 'Mighty Hammer', 'Mystic Tome'
];
const itemImages = {
    'Sword': '/images/sword.png',
    'Shield': '/images/shield.png',
    'Potion': '/images/potion.png',
    'Helmet': '/images/helmet.png',
    'Boots': '/images/boots.png',
    'Bow': '/images/bow.png',
    'Arrows': '/images/arrows.png',
    'Gloves': '/images/gloves.png',
    'Armor': '/images/armor.png',
    'Ring': '/images/ring.png',
    'Magic Wand': '/images/magic-wand.png',
    'Staff': '/images/staff.png',
    'Dagger': '/images/dagger.png',
    'Crossbow': '/images/crossbow.png',
    'Amulet': '/images/amulet.png',
    'Cloak': '/images/cloak.png',
    'Scroll': '/images/scroll.png',
    'Boots of Speed': '/images/boots-of-speed.png',
    'Ring of Strength': '/images/ring-of-strength.png',
    'Helmet of Wisdom': '/images/helmet-of-wisdom.png',
    'Baseball bat': '/images/baseball-bat.png',
    'Crystal Ball': '/images/crystal-ball.png',
    'Enchanted Shield': '/images/enchanted-shield.png',
    'Robe': '/images/robe.png',
    'Staff of Fire': '/images/staff-of-fire.png',
    'Belt of Giants': '/images/belt-of-giants.png',
    'Boots of Stealth': '/images/boots-of-stealth.png',
    'Necklace of Healing': '/images/necklace-of-healing.png',
    'Gauntlets': '/images/gauntlets.png',
    'Boots of Flight': '/images/boots-of-flight.png',
    'Orb of Power': '/images/orb-of-power.png',
    'Elixir of Life': '/images/elixir-of-life.png',
    'Crown': '/images/crown.png',
    'Charm of Protection': '/images/charm-of-protection.png',
    'Mighty Hammer': '/images/mighty-hammer.png',
    'Mystic Tome': '/images/mystic-tome.png'
};

const questList = [
    { type: 'buyFromPlayer', description: 'Купи предмет у игрока', reward: { gems: 10 }, completed: false },
    { type: 'sellItem', description: 'Выстави предмет на продажу', reward: { gems: 10 }, completed: false },
    { type: 'sellItemToPlayer', description: 'Продай предмет игроку', reward: { gems: 5 }, completed: false },
    { type: 'buyForGold', threshold: 60, description: 'Купи на 60 gold или больше', reward: { gems: 10 }, completed: false },
    // Добавляем квесты для уровней покупки от 100 до 1000 золота
    { type: 'buyForGold', threshold: 100, description: 'Купи на 100 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 300, description: 'Купи на 300 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 500, description: 'Купи на 500 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 600, description: 'Купи на 600 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 700, description: 'Купи на 700 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 850, description: 'Купи на 850 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 870, description: 'Купи на 870 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 890, description: 'Купи на 890 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 900, description: 'Купи на 900 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 950, description: 'Купи на 950 gold или больше', reward: { gems: 10 }, completed: false },
    { type: 'buyForGold', threshold: 1000, description: 'Купи на 1000 gold или больше', reward: { gems: 10 }, completed: false }
];

const LEVEL_EXPERIENCE_THRESHOLD = 150;
const MAX_EXPERIENCE = 50;
const MIN_EXPERIENCE = 25;

const updatePlayerExperience = (player, experience) => {
    player.experience = (player.experience || 0) + experience;
    player.level = Math.floor(player.experience / LEVEL_EXPERIENCE_THRESHOLD) + 1; // Добавляем 1, чтобы уровень начинался с 1

    // Отправляем обновленное состояние игрока
    io.to(player.id).emit('update', player);
};

let players = {};
let market = [];
let priceHistory = {};

// Генерация случайных предметов для нового игрока
const generateRandomItems = () => {
    let items = [];
    for (let i = 0; i < 10; i++) {
        const name = itemNames[Math.floor(Math.random() * itemNames.length)];
        items.push({
            name: name,
            level_item: 1,  // Инициализируем уровень предмета
            price: Math.floor(Math.random() * 100) + 1, // случайная стоимость от 1 до 100
            image: `images/${name.toLowerCase().replace(/\s+/g, '-')}.png` // путь к изображению
        });
    }
    return items;
};

let lastPrices = {}; // Для отслеживания предыдущих средних цен

// Функция для расчета средней цены предмета и сравнения с предыдущей ценой
const calculateAveragePrices = () => {
    const averagePrices = {};
    
    itemNames.forEach(item => {
        const history = priceHistory[item] || [];
        const averagePrice = history.length > 0 ? history.reduce((sum, p) => sum + p, 0) / history.length : null;

        // Проверка изменения цены
        let priceChange = '';
        if (lastPrices[item] !== undefined) {
            if (averagePrice > lastPrices[item]) {
                priceChange = '↗️'; // Увеличение цены
            } else if (averagePrice < lastPrices[item]) {
                priceChange = '↘️'; // Уменьшение цены
            }
        }

        averagePrices[item] = {
            price: averagePrice,
            change: priceChange
            
        };

        // Обновляем последнюю цену
        lastPrices[item] = averagePrice;
    });
    return averagePrices;
};


// Восстановление состояния игрока
const findOrCreatePlayer = (playerId) => {
    if (!players[playerId]) {
        players[playerId] = {
            id: playerId,
            gold: 10000,
            gems: 10,
            inventory: generateRandomItems(),
            sellerName: `Player${Math.floor(Math.random() * 1000)}`,
            experience: 0,
            level: 1,
            quests: [...questList] // Копируем квесты для нового игрока
        };
    }
    return players[playerId];
};




const addSpecialOffer = () => {
    const numberOfOffers = Math.floor(Math.random() * 8) + 3; // случайное количество от 3 до 10
    const newOffers = [];

    for (let i = 0; i < numberOfOffers; i++) {
        const itemName = itemNames[Math.floor(Math.random() * itemNames.length)];
        let basePrice = Math.floor(Math.random() * 40) + 30; // случайная стоимость от 30 до 70
        let discount = Math.floor(Math.random() * 51) + 10; // случайная скидка от 10% до 60%

        // Проверяем есть ли история цен для этого предмета
        if (priceHistory[itemName]) {
            const avgPrice = priceHistory[itemName].reduce((sum, p) => sum + p, 0) / priceHistory[itemName].length;
            basePrice = avgPrice; // Устанавливаем базовую цену по средней цене из истории
        }

        const discountedPrice = Math.floor(basePrice * (1 - discount / 100)); // Применяем скидку

        const item = {
            name: itemName,
            price: discountedPrice,
            basePrice: basePrice, // Добавляем базовую цену
            discount: discount, // Добавляем информацию о скидке
            seller: 'Special Offer',
            image: itemImages[itemName] // Добавляем URL изображения
        };

        newOffers.push(item); // Добавляем предмет в список новых акций
    }

    market = [...newOffers, ...market]; // Добавляем акции в начало рынка
    io.emit('updateMarket', market);

    // Удаляем предметы через 60 секунд
    setTimeout(() => {
        market = market.filter(m => m.seller !== 'Special Offer');
        io.emit('updateMarket', market);
    }, 60000);
};

// Запуск специальных предложений каждую минуту
setInterval(() => {
    addSpecialOffer();
}, 60000);

/*
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
*/

// Обработка событий
app.use(cookieParser());
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

        // Отправляем список всех предметов и их средние цены при подключении
        const averagePrices = calculateAveragePrices();
        socket.emit('allItems', { items: itemNames, averagePrices });

    // Идентификатор игрока из cookies
    let playerId = socket.handshake.headers.cookie && socket.handshake.headers.cookie.includes('playerId')
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

    
    // Функция для продажи предмета
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
// Проверяем квест на продажу предмета
const sellQuest = player.quests.find(q => q.type === 'sellItem' && !q.completed);
if (sellQuest) {
    player.gems += sellQuest.reward.gems;
    sellQuest.completed = true;
    socket.emit('questCompleted', sellQuest.description);
}
        // Расчет опыта
        const averagePrice = calculateAveragePrices()[item.name];
        const priceInRange = averagePrice ? (sellPrice >= averagePrice * 0.9 && sellPrice <= averagePrice * 1.1) : false;
        const experience = priceInRange ? MAX_EXPERIENCE : MIN_EXPERIENCE;
        updatePlayerExperience(player, experience);

        // Обновляем средние цены для всех игроков
        const averagePrices = calculateAveragePrices();
        io.emit('allItems', { items: itemNames, averagePrices });

            // Обновляем рынок для всех игроков
            
            io.emit('updateMarket', market);
            socket.emit('update', player);
        }
    });

    // Получение истории цен
    socket.on('getPriceHistory', (itemName) => {
        const history = priceHistory[itemName] || [];
        const averagePrice = history.length > 0 ? (history.reduce((sum, p) => sum + p, 0) / history.length).toFixed(1) : 0;

        socket.emit('priceHistory', { itemName, history, averagePrice });
    });

    // Получение всех предметов и их средней цены
    socket.on('getAllItems', () => {
        const averagePrices = calculateAveragePrices();
        socket.emit('allItems', { items: itemNames, averagePrices });
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
    
                // Проверка квеста "Продать так, чтобы его купил игрок"
                if (seller.quests) {
                    const quest = seller.quests.find(q => q.type === 'sellItemToPlayer' && !q.completed);
                    if (quest) {
                        seller.gems += quest.reward.gems;
                        quest.completed = true;
                        io.to(item.seller).emit('update', seller);
                        io.to(item.seller).emit('questCompleted', quest.description);
                    }
                }
            }
    
            // Проверяем квест на покупку у игрока
            const buyQuest = buyer.quests.find(q => q.type === 'buyFromPlayer' && !q.completed);
            if (buyQuest && item.seller !== 'Special Offer') {
                buyer.gems += buyQuest.reward.gems;
                buyQuest.completed = true;
                socket.emit('questCompleted', buyQuest.description);
            }
    
            // Проверка выполнения квестов на покупку за определенную сумму
            const buyGoldQuest = buyer.quests.find(q => q.type === 'buyForGold' && item.price >= q.threshold && !q.completed);
            if (buyGoldQuest) {
                buyer.gems += buyGoldQuest.reward.gems;
                buyGoldQuest.completed = true;
                socket.emit('questCompleted', buyGoldQuest.description);
            }
    
            market.splice(itemIndex, 1);
            socket.emit('update', buyer);
            io.emit('updateMarket', market);
        }
    });

    socket.on('questCompleted', (questDescription) => {
        const questDiv = document.createElement('div');
        questDiv.className = 'quest-completed';
        questDiv.textContent = `Quest Completed: ${questDescription}`;
        document.body.appendChild(questDiv);
    
        setTimeout(() => {
            questDiv.remove();
        }, 5000); // Удаляем уведомление через 5 секунд
    });
    
// Отправляем список квестов игрока по запросу
socket.on('getPlayerQuests', () => {
    const player = players[playerId];
    if (player && player.quests) {
        socket.emit('playerQuests', player.quests);
    }
});



socket.on('mergeItems', (data) => {
    const { itemName, playerId } = data;

    const player = findOrCreatePlayer(playerId);

    if (!player) {
        socket.emit('error', 'Player not found.');
        return;
    }

    // Фильтруем предметы по имени
    const itemsToMerge = player.inventory.filter(item => item.name.trim() === itemName.trim());

    if (itemsToMerge.length > 1) {
        // Находим первый предмет
        const item = itemsToMerge[0];
        const newLevel = item.level_item + 1;

        if (newLevel <= 10) {
            // Увеличиваем уровень первого предмета
            item.level_item = newLevel;

            // Удаляем остальные предметы с таким же именем
            for (let i = 1; i < itemsToMerge.length; i++) {
                const itemToRemove = itemsToMerge[i];
                const itemIndex = player.inventory.indexOf(itemToRemove);
                if (itemIndex !== -1) {
                    player.inventory.splice(itemIndex, 1);
                }
            }

            // Начисляем гемы в зависимости от нового уровня предмета
            player.gems += newLevel;

            // Отправляем обновленное состояние игрока на клиент
            socket.emit('update', player);
        } else {
            socket.emit('error', 'Max level reached for this item.');
        }
    } else {
        socket.emit('error', 'Not enough items to merge.');
    }
});







    socket.on('disconnect', () => {
        console.log('Player disconnected:', playerId);
    });
    
});



server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// Сброс состояния игры
/*    
    socket.on('resetGame', () => {
        resetGame();
    });
*/
/* 
добавить торговца с уникальными предметами

прокачка предметов 3 предмета в 1 до 10

доп валюта алмазы и покупка у торговца уникальные предметы

7 дневний вход и награды



*/