const socket = io();

let currentItemIndex;
let currentItemName; // Для хранения имени предмета
let currentItemAveragePrice; // Для хранения средней цены предмета

// Обработчики для модального окна продажи
const modal = document.getElementById('price-modal');
const closeModal = document.querySelector('.close');
const submitPriceButton = document.getElementById('submit-price');
const priceInput = document.getElementById('price-input');

// Обработчики для модального окна истории цен
const priceHistoryModal = document.getElementById('price-history-modal');
const closePriceHistoryModal = document.querySelector('.close-history');
const priceHistoryDetails = document.getElementById('price-history-details');

const showAllItemsButton = document.getElementById('showAllItemsButton');
const itemsModal = document.getElementById('items-modal');
const closeItemsModal = document.getElementById('close-items-modal');
const itemsDetails = document.getElementById('items-details');

const questsModal = document.getElementById('quests-modal');
const showQuestsButton = document.getElementById('show-quests-button');
const closeQuestsButton = document.querySelector('.close-quests');
const questListDiv = document.getElementById('questList');

// Закрытие окна при клике вне его
window.onclick = (event) => {
    if (event.target === questsModal) {
        questsModal.style.display = 'none';
    } else if (event.target === itemsModal) {
        itemsModal.style.display = 'none';
    } else if (event.target === modal) {
        modal.style.display = 'none';
    } else if (event.target === priceHistoryModal) {
        priceHistoryModal.style.display = 'none';
    }
};

// Открытие окна с квестами
showQuestsButton.onclick = () => {
    socket.emit('getPlayerQuests'); // Запрашиваем квесты у сервера
    questsModal.style.display = 'block';
};

// Закрытие модального окна
closeQuestsButton.onclick = () => {
    questsModal.style.display = 'none';
};

// Получаем и отображаем список квестов
socket.on('playerQuests', (quests) => {
    questListDiv.innerHTML = quests.map(quest => `
        <div class="quest-item">
            <h3>${quest.description}</h3>
            <p>Reward: ${quest.reward.gems} gems</p>
            <p>Status: ${quest.completed ? 'Completed' : 'In progress'}</p>
        </div>
    `).join('');
});

// Функция для объединения предметов
const mergeItems = (itemName) => {
    const playerId = getCookie('playerId'); // Предполагается, что playerId хранится в cookie
    // Отправляем запрос на сервер для объединения предметов
    socket.emit('mergeItems', { itemName });
};

// Обработчик для объединения предметов
socket.on('mergeResult', (result) => {
    if (result.success) {
        // Обновляем инвентарь и другие данные после успешного объединения
        updateUI(result.updatedData);
        alert('Items merged successfully!');
    } else {
        alert(result.message || 'An error occurred while merging items.');
    }
});

// Открытие модального окна с предметами
showAllItemsButton.onclick = () => {
    socket.emit('getAllItems');
    itemsModal.style.display = 'block';
};

let allItemsState = {}; // Локальное состояние для всех предметов

// Обработка ответа от сервера
socket.on('allItems', (data) => {
    const { items, averagePrices } = data;

    // Обновляем состояние всех предметов
    items.forEach(item => {
        if (!allItemsState[item]) {
            allItemsState[item] = {};
        }

        const newPrice = averagePrices[item].price;

        // Сравниваем текущую цену с предыдущей
        let priceChange = '';
        if (allItemsState[item].price !== undefined) {
            if (newPrice > allItemsState[item].price) {
                priceChange = '↗️'; // Цена увеличилась
            } else if (newPrice < allItemsState[item].price) {
                priceChange = '↘️'; // Цена уменьшилась
            }
        }

        // Обновляем состояние предмета
        allItemsState[item].price = newPrice;
        allItemsState[item].change = priceChange;
    });

    // Рендерим список предметов
    renderItemsList();
});

// Функция для рендера списка предметов
function renderItemsList() {
    itemsDetails.innerHTML = `
        <h3>Items List</h3>
        <ul>
            ${Object.keys(allItemsState).map(item => {
                const priceData = allItemsState[item];
                const priceText = priceData.price ? priceData.price.toFixed(1) + ' 🪙' : 'N/A';
                const changeText = priceData.change || ''; // Добавляем стрелку
                return `<li>${item} - Average Price: ${priceText} ${changeText}</li>`;
            }).join('')}
        </ul>
    `;
}

document.getElementById('toggle-inventory').addEventListener('click', () => {
    const inventoryDiv = document.getElementById('inventory');
    const toggleButton = document.getElementById('toggle-inventory');

    if (inventoryDiv.style.display === 'none') {
        inventoryDiv.style.display = 'block';
        toggleButton.textContent = 'Hide Inventory'; // Меняем текст кнопки
    } else {
        inventoryDiv.style.display = 'none';
        toggleButton.textContent = 'Show Inventory'; // Меняем текст кнопки
    }
});

closeModal.onclick = () => {
    modal.style.display = 'none';
};

closePriceHistoryModal.onclick = () => {
    priceHistoryModal.style.display = 'none';
};

submitPriceButton.onclick = () => {
    const sellPrice = parseInt(priceInput.value);
    if (!isNaN(sellPrice) && sellPrice > 0) {
        socket.emit('sell', { itemIndex: currentItemIndex, sellPrice });
        modal.style.display = 'none';
    } else {
        alert('Please enter a valid price.');
    }
};

// Функция для отображения истории цен
const showPriceHistory = (itemName) => {
    socket.emit('getPriceHistory', itemName);
};

socket.on('priceHistory', (data) => {
    const { itemName, history, averagePrice } = data;
    priceHistoryDetails.innerHTML = `
        <h3>${itemName}</h3>
        <p>Average Price: ${parseFloat(averagePrice).toFixed(1)} gold</p>
        <ul>
            ${history.map(price => `<li>${parseFloat(price).toFixed(1)} gold</li>`).join('')}
        </ul>
    `;
    priceHistoryModal.style.display = 'block';
});

// Функция для обновления интерфейса
const updateUI = (data) => {
    document.getElementById('gold').textContent = `Gold: ${data.gold} 🪙`;
    document.getElementById('gems').textContent = `Gems: ${data.gems} 💎`;
    document.getElementById('player-name').textContent = `Name: ${data.sellerName}`;
    document.getElementById('level').textContent = `Level: ${data.level}`;
    document.getElementById('experience').textContent = `Experience: ${data.experience}`;

    const inventoryDiv = document.getElementById('inventory');
    inventoryDiv.innerHTML = '<h2>Your Inventory</h2>';

    // Создаем объект для подсчета количества каждого предмета
    const itemCounts = {};

    // Подсчитываем количество одинаковых предметов
    data.inventory.forEach((item) => {
        if (!itemCounts[item.name]) {
            itemCounts[item.name] = 0;
        }
        itemCounts[item.name]++;
    });

    data.inventory.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}" style="width: 30px; height: 30px;"/>
            ${item.name} - ${item.price} 🪙 (Level: ${item.level_item || 1})  <!-- Изменено на item.level_item -->
        `;

        const sellButton = document.createElement('button');
        sellButton.textContent = 'Sell';
        sellButton.onclick = () => {
            currentItemIndex = index;  // Сохраняем индекс предмета
            currentItemName = item.name;  // Сохраняем имя предмета
            currentItemAveragePrice = allItemsState[item.name]?.price || 'N/A'; // Сохраняем среднюю цену
            document.getElementById('modal-item-name').textContent = `Sell ${item.name}`;  // Обновляем название предмета
            document.getElementById('modal-average-price').textContent = `Average Market Price: ${currentItemAveragePrice} 🪙`; // Отображаем среднюю цену
            priceInput.value = '';  // Очищаем поле ввода
            modal.style.display = 'block';  // Показываем модальное окно
        };

        const historyButton = document.createElement('button');
        historyButton.textContent = 'Price History';
        historyButton.onclick = () => {
            showPriceHistory(item.name);
        };

        // Проверка, есть ли несколько одинаковых предметов для объединения
        if (itemCounts[item.name] > 1) {
            const mergeButton = document.createElement('button');
            mergeButton.textContent = 'Merge';
            mergeButton.onclick = () => {
                mergeItems(item.name);
            };
            itemDiv.appendChild(mergeButton);
        }

        sellButton.style.marginLeft = '20px';
        itemDiv.appendChild(sellButton);
        itemDiv.appendChild(historyButton);
        inventoryDiv.appendChild(itemDiv);
    });
};

// Функция для отображения уровня и опыта
const displayPlayerStats = (playerData) => {
    document.getElementById('level').textContent = `Level: ${playerData.level} 🧊`;
    document.getElementById('experience').textContent = `Experience: ${playerData.experience} 💫`;
};

// Обработка обновлений от сервера
socket.on('update', (data) => {
    updateUI(data);
    displayPlayerStats(data);
});

// Получение cookie по имени
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null; // Если cookie не найден
}

socket.on('setCookie', (data) => {
    document.cookie = `playerId=${data.playerId}; path=/`;
});

socket.on('init', (data) => {
    updateUI(data);
});

socket.on('error', (message) => {
    alert(message); // Показываем сообщение об ошибке
});

socket.on('updateMarket', (marketItems) => {
    const marketDiv = document.getElementById('market-items');
    marketDiv.innerHTML = ''; // очищаем рынок

    const currentPlayerId = getCookie('playerId');

    marketItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = item.seller === 'Special Offer' ? 'market-item special-offer' : 'market-item';
        itemDiv.innerHTML = `
            <span><img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; float: left;"/>
            <span>${item.name} - ${item.price} 🪙</span>
            ${item.seller === 'Special Offer' ? `<div>Base Price: ${item.basePrice} 🪙</div><div>Discount: ${item.discount}%</div>` : ''}
            <div> (Seller: ${item.seller})</div>
            </span>
        `;

        if (item.seller !== currentPlayerId) {
            const buyButton = document.createElement('button');
            buyButton.className = 'buy-button';
            buyButton.textContent = 'Buy';
            buyButton.onclick = () => {
                socket.emit('buy', { itemIndex: index });
            };
            itemDiv.appendChild(buyButton);
        }

        marketDiv.appendChild(itemDiv);

        // Даем время на вставку элемента в DOM перед добавлением класса для анимации
        setTimeout(() => {
            itemDiv.classList.add('show');
        }, 10); // Небольшая задержка для активации анимации
    });
});
