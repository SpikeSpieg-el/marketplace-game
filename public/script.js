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


const updateUI = (data) => {
    document.getElementById('gold').textContent = `Gold: ${data.gold}`;
    document.getElementById('player-name').textContent = `Name: ${data.sellerName}`; // Добавлено отображение имени игрока

    const inventoryDiv = document.getElementById('inventory');
    inventoryDiv.innerHTML = '<h2>Your Inventory</h2>'; // Заголовок
    data.inventory.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `${item.name} - ${item.price} gold`;

        const sellButton = document.createElement('button');
        sellButton.textContent = 'Sell';
        sellButton.onclick = () => {
            currentItemIndex = index; // Сохраняем индекс предмета
            priceInput.value = ''; // Очищаем поле ввода
            modal.style.display = 'block'; // Показываем модальное окно продажи
        };

        const historyButton = document.createElement('button');
        historyButton.textContent = 'Price History';
        historyButton.onclick = () => {
            showPriceHistory(item.name);
        };

        sellButton.style.marginLeft = '20px'; // Добавляет отступ слева

        itemDiv.appendChild(sellButton);
        itemDiv.appendChild(historyButton);
        inventoryDiv.appendChild(itemDiv);
    });
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
    marketItems.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'market-item';
        itemDiv.innerHTML = `
            <span>${item.name} - ${item.price} gold</span>
            <span> (Seller: ${item.seller})</span>
        `;

        if (item.seller !== getCookie('playerId') || item.seller === 'Special Offer') { 
            const buyButton = document.createElement('button');
            buyButton.textContent = 'Buy';
            buyButton.onclick = () => {
                socket.emit('buy', { itemIndex: index });
            };
            itemDiv.appendChild(buyButton);
        }

        marketDiv.appendChild(itemDiv);
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
