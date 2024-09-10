const socket = io();

let currentItemIndex;

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

// Открытие модального окна
showAllItemsButton.onclick = () => {
    socket.emit('getAllItems');
    itemsModal.style.display = 'block';
};

// Закрытие модального окна
closeItemsModal.onclick = () => {
    itemsModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target === itemsModal) {
        itemsModal.style.display = 'none';
    }
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

window.onclick = (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    } else if (event.target === priceHistoryModal) {
        priceHistoryModal.style.display = 'none';
    }
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


let currentItemName; // Для хранения имени предмета
let currentItemAveragePrice; // Для хранения средней цены предмета

const updateUI = (data) => {
    document.getElementById('gold').textContent = `Gold: ${data.gold} 🪙`;
    document.getElementById('player-name').textContent = `Name: ${data.sellerName} `;
    document.getElementById('level').textContent = `Level: ${data.level}`;
    document.getElementById('experience').textContent = `Experience: ${data.experience}`;

    const inventoryDiv = document.getElementById('inventory');
    inventoryDiv.innerHTML = '<h2>Your Inventory</h2>';

    data.inventory.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `${item.name} - ${item.price} 🪙`;

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

        sellButton.style.marginLeft = '20px';

        itemDiv.appendChild(sellButton);
        itemDiv.appendChild(historyButton);
        inventoryDiv.appendChild(itemDiv);
    });
};
// Функция для отображения уровня и опыта
const displayPlayerStats = (playerData) => {
    document.getElementById('level').textContent = `Level: ${playerData.level}`;
    document.getElementById('experience').textContent = `Experience: ${playerData.experience}`;
};

// Обработка обновлений от сервера
socket.on('update', (data) => {
    updateUI(data);
    displayPlayerStats(data);
});

submitPriceButton.onclick = () => {
    const sellPrice = parseInt(priceInput.value);
    if (!isNaN(sellPrice) && sellPrice > 0) {
        socket.emit('sell', { itemIndex: currentItemIndex, itemName: currentItemName, sellPrice });
        modal.style.display = 'none';
    } else {
        alert('Please enter a valid price.');
    }
};


submitPriceButton.onclick = () => {
    const sellPrice = parseInt(priceInput.value);
    if (!isNaN(sellPrice) && sellPrice > 0) {
        // Отправляем как имя предмета, так и его цену
        socket.emit('sell', { itemIndex: currentItemIndex, itemName: currentItemName, sellPrice });
        modal.style.display = 'none';
    } else {
        alert('Please enter a valid price.');
    }
};


// Получение cookie по имени
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

socket.on('setCookie', (data) => {
    document.cookie = `playerId=${data.playerId}; path=/`;
});

socket.on('init', (data) => {
    updateUI(data);
});

socket.on('update', (data) => {
    updateUI(data);
});

socket.on('updateMarket', (marketItems) => {
    const marketDiv = document.getElementById('market-items');
    marketDiv.innerHTML = ''; // очищаем рынок

    const currentPlayerId = getCookie('playerId');

    marketItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = item.seller === 'Special Offer' ? 'market-item special-offer' : 'market-item';
        itemDiv.innerHTML = `
            <span>${item.name} - ${item.price} 🪙</span>
            ${item.seller === 'Special Offer' ? `<div>Base Price: ${item.basePrice} 🪙</div><div>Discount: ${item.discount}%</div>` : ''}
            <div> (Seller: ${item.seller})</div>
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


// Пример генерации начальных данных с использованием случайных имен и цен
const generateInitialItems = () => {
    const items = [];
    for (let i = 0; i < 10; i++) {
        items.push({
            name: getRandomName(),
            price: getRandomPrice(),
            seller: 'exampleSeller' // Можно заменить на идентификатор продавца
        });
    }
    return items;
};
