// app.js - Restaurant Digital Ordering System Frontend
// ===== APPLICATION STATE =====
const appState = {
    currentStep: 'landing',
    language: 'en',
    peopleCount: 2,
    avatars: [],
    cart: [],
    totalAmount: 0,
    tableId: null,
    tableNumber: null,
    sessionId: null,
    queueNumber: null,
    orderId: null,
    currentStatus: 'pending',
    adminLoggedIn: false,
    adminToken: null,
    currentFilter: 'all',
    searchTerm: '',
    nextCartId: 1,
    menuData: []
};

// ===== ANIMAL AVATARS =====
const animalAvatars = ['🧑', '👩', '👨', '👧', '👦', '👵', '👴', '👩‍🦰', '👨‍🦰', '🧔'];

// ===== MODAL STATE =====
let selectedSpicy = 0;
let selectedProtein = 'Original';
let selectedAvatar = null;
let currentModalItem = null;

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function getCurrentText(enText, thText) {
    return appState.language === 'th' ? thText : enText;
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #48bb78; color: white;
        padding: 15px 20px; border-radius: 12px;
        z-index: 2000; box-shadow: 0 8px 25px rgba(72, 187, 120, 0.3);
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }
    }, 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #f56565; color: white;
        padding: 15px 20px; border-radius: 12px;
        z-index: 2000; box-shadow: 0 8px 25px rgba(245, 101, 101, 0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 3000);
}

function getProteinIcon(protein) {
    const icons = {
        'Original': '🍽️',
        'Chicken': '🐔',
        'Pork': '🐷',
        'Beef': '🐮',
        'Vegetarian': '🥬',
        'Seafood': '🦐'
    };
    return icons[protein] || '🍽️';
}

// ===== NAVIGATION FUNCTIONS =====
window.startCustomerFlow = function() {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('customerApp').style.display = 'block';
    appState.currentStep = 'qr';
    
    // Connect to Socket.IO for customer
    if (window.restaurantSocket) {
        window.restaurantSocket.emit('join-customer', appState.tableNumber || 'guest');
    }
};

window.startAdminFlow = function() {
    if (!appState.adminLoggedIn) {
        showAdminLogin();
    } else {
        // Hide landing and customer app
        const landing = document.getElementById('landing');
        const customerApp = document.getElementById('customerApp');
        const adminApp = document.getElementById('adminApp');
        if (landing) {
            landing.style.display = 'none';
        }
        if (customerApp) {
            customerApp.style.display = 'none';
        }
        if (adminApp) {
            adminApp.style.display = 'block';
            adminApp.classList.remove('hidden');
        }
        loadAdminDashboard();
    }
};

function goBack() {
    // Check if admin is active
    const adminApp = document.getElementById('adminApp');
    const landing = document.getElementById('landing');
    const customerApp = document.getElementById('customerApp');
    if (adminApp && adminApp.style.display === 'block') {
        adminApp.style.display = 'none';
        adminApp.classList.add('hidden');
        if (landing) {
            landing.style.display = 'flex';
        }
        if (customerApp) {
            customerApp.style.display = 'none';
        }
        appState.adminLoggedIn = false;
        appState.adminToken = null;
        return;
    }

    const steps = ['qrStep', 'groupStep', 'avatarStep', 'menuStep', 'checkoutStep', 'statusStep'];
    let currentIdx = steps.findIndex(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
    });

    if (currentIdx === -1 || currentIdx === 0) {
        document.getElementById('customerApp').style.display = 'none';
        document.getElementById('landing').style.display = 'flex';
        resetApp();
        return;
    }

    document.getElementById(steps[currentIdx]).classList.add('hidden');
    document.getElementById(steps[currentIdx - 1]).classList.remove('hidden');

    if (steps[currentIdx - 1] === 'menuStep') {
        document.getElementById('cart').classList.remove('hidden');
    } else {
        document.getElementById('cart').classList.add('hidden');
    }
}

function resetApp() {
    appState.peopleCount = 2;
    appState.avatars = [];
    appState.cart = [];
    appState.totalAmount = 0;
    appState.tableId = null;
    appState.tableNumber = null;
    appState.sessionId = null;
    appState.currentFilter = 'all';
    appState.searchTerm = '';
    appState.nextCartId = 1;
    
    updateCartDisplay();
    
    document.querySelectorAll('.step-container').forEach(step => step.classList.add('hidden'));
    document.getElementById('qrStep').classList.remove('hidden');
    document.getElementById('cart').classList.add('hidden');
}

// ===== CUSTOMER FLOW =====
async function simulateQRScan() {
    try {
        const randomTableNum = Math.floor(Math.random() * 12 + 1);
        const tableNumber = 'T' + randomTableNum.toString().padStart(2, '0');
        
        const response = await window.restaurantAPI.tables.scan(tableNumber);
        
        if (response.success) {
            appState.tableId = response.data.tableId;
            appState.tableNumber = response.data.tableNumber;
            showSuccessMessage(`Scanned ${tableNumber} successfully!`);
            goToGroupSetup();
        }
    } catch (error) {
        console.error('QR Scan error:', error);
        showErrorMessage('Failed to scan QR code. Using offline mode.');
        appState.tableNumber = 'T' + Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0');
        goToGroupSetup();
    }
}

function goToGroupSetup() {
    document.getElementById('qrStep').classList.add('hidden');
    document.getElementById('groupStep').classList.remove('hidden');
}

function changePeopleCount(delta) {
    appState.peopleCount = Math.max(1, Math.min(10, appState.peopleCount + delta));
    document.getElementById('peopleCount').textContent = appState.peopleCount;
}

async function generateAvatars() {
    appState.avatars = [];
    for (let i = 0; i < appState.peopleCount; i++) {
        appState.avatars.push({
            id: i,
            animal: animalAvatars[i % animalAvatars.length],
            nickname: `Person ${i + 1}`,
            isOrdering: true,
            paymentMethod: 'cash'
        });
    }
    
    // Create session in database
    if (appState.tableId) {
        try {
            const response = await window.restaurantAPI.sessions.create({
                tableId: appState.tableId,
                peopleCount: appState.peopleCount,
                avatars: appState.avatars
            });
            
            if (response.success) {
                appState.sessionId = response.data.sessionId;
                console.log('Session created:', appState.sessionId);
            }
        } catch (error) {
            console.error('Session creation error:', error);
        }
    }
    
    document.getElementById('groupStep').classList.add('hidden');
    document.getElementById('avatarStep').classList.remove('hidden');
    renderAvatars();
}

function renderAvatars() {
    const grid = document.getElementById('avatarsGrid');
    grid.innerHTML = '';
    
    appState.avatars.forEach((avatar, index) => {
        const card = document.createElement('div');
        card.className = 'avatar-card';
        card.innerHTML = `
            <div class="avatar-icon" onclick="cycleAnimal(${index})">${avatar.animal}</div>
            <input type="text" class="avatar-input" placeholder="Nickname" 
                   value="${avatar.nickname}" onchange="updateNickname(${index}, this.value)">
            <label style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;">
                <input type="checkbox" ${avatar.isOrdering ? 'checked' : ''} onchange="toggleOrdering(${index})">
                <span>Will order food</span>
            </label>
        `;
        grid.appendChild(card);
    });
}

function cycleAnimal(index) {
    const currentIndex = animalAvatars.indexOf(appState.avatars[index].animal);
    const nextIndex = (currentIndex + 1) % animalAvatars.length;
    appState.avatars[index].animal = animalAvatars[nextIndex];
    renderAvatars();
}

function updateNickname(index, nickname) {
    appState.avatars[index].nickname = nickname.trim() || `Person ${index + 1}`;
}

function toggleOrdering(index) {
    appState.avatars[index].isOrdering = !appState.avatars[index].isOrdering;
}

async function goToMenu() {
    appState.avatars.forEach((avatar, index) => {
        if (!avatar.nickname || !avatar.nickname.trim()) {
            avatar.nickname = `Person ${index + 1}`;
        }
    });
    
    // Load menu from database
    try {
        const response = await window.restaurantAPI.menu.getAll();
        if (response.success) {
            appState.menuData = response.data;
        }
    } catch (error) {
        console.error('Menu load error:', error);
        showErrorMessage('Failed to load menu from server');
    }
    
    document.getElementById('avatarStep').classList.add('hidden');
    document.getElementById('menuStep').classList.remove('hidden');
    document.getElementById('cart').classList.remove('hidden');
    renderMenu();
}

// ===== LANGUAGE FUNCTIONS =====
function setLanguage(lang) {
    appState.language = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    updateLanguage();
}

function updateLanguage() {
    document.querySelectorAll('[data-en]').forEach(element => {
        const text = element.getAttribute(`data-${appState.language}`);
        if (text) element.textContent = text;
    });
    
    if (!document.getElementById('menuStep').classList.contains('hidden')) {
        renderMenu();
    }
    if (appState.avatars.length > 0) {
        renderAvatars();
        updateCartDisplay();
    }
}
// ===== MENU FUNCTIONS =====
function getFilteredMenu() {
    let items = appState.menuData;
    
    if (appState.currentFilter !== 'all') {
        items = items.filter(item => item.category === appState.currentFilter);
    }
    
    if (appState.searchTerm) {
        const searchLower = appState.searchTerm.toLowerCase();
        items = items.filter(item => 
            item.name_en.toLowerCase().includes(searchLower) ||
            item.name_th.toLowerCase().includes(searchLower) ||
            (item.description_en && item.description_en.toLowerCase().includes(searchLower)) ||
            (item.description_th && item.description_th.toLowerCase().includes(searchLower))
        );
    }
    
    return items;
}

function renderMenu() {
    const container = document.getElementById('menuItems');
    if (!container) return;
    
    container.innerHTML = '';
    const items = getFilteredMenu();
    
    if (items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #718096;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🔍</div>
                <p>No items found</p>
            </div>
        `;
        return;
    }
    
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'menu-item';
        itemCard.onclick = () => showItemModal(item);
        
        const badges = [];
        if (item.is_popular) badges.push('<span class="badge popular">popular</span>');
        if (item.is_spicy) badges.push('<span class="badge spicy">spicy</span>');
        if (item.is_vegetarian) badges.push('<span class="badge vegetarian">vegetarian</span>');
        
        const name = appState.language === 'th' ? item.name_th : item.name_en;
        const desc = appState.language === 'th' ? item.description_th : item.description_en;
        
        itemCard.innerHTML = `
            <div class="item-image">${item.icon}</div>
            <div class="item-details">
                <h4 class="item-name">${name}</h4>
                <p class="item-description">${desc || ''}</p>
                <div class="item-footer">
                    <span class="item-price">฿${item.price}</span>
                    <div class="item-badges">${badges.join('')}</div>
                </div>
            </div>
        `;
        container.appendChild(itemCard);
    });
}

const debouncedSearch = debounce((searchTerm) => {
    appState.searchTerm = searchTerm;
    renderMenu();
}, 300);

function searchMenu(searchTerm) {
    debouncedSearch(searchTerm);
}

function filterMenu(category, buttonElement) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    appState.currentFilter = category;
    renderMenu();
}

// ===== MODAL FUNCTIONS =====
function showItemModal(item) {
    const orderingAvatars = appState.avatars.filter(a => a.isOrdering);
    if (orderingAvatars.length === 0) {
        alert('No one is set to order food!');
        return;
    }
    
    selectedSpicy = 0;
    selectedProtein = 'Original';
    selectedAvatar = null;
    currentModalItem = { ...item };
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const name = appState.language === 'th' ? item.name_th : item.name_en;
    const desc = appState.language === 'th' ? item.description_th : item.description_en;
    
    const avatarOptions = orderingAvatars.map(avatar => 
        `<div class="avatar-assign" onclick="selectAvatarForOrder(${avatar.id}, event)">
            ${avatar.animal}<br><small>${avatar.nickname}</small>
        </div>`
    ).join('');

    const proteinOptions = ['Original', 'Chicken', 'Pork', 'Beef', 'Vegetarian', 'Seafood'];
    const spicyLevels = ['No Spicy', 'Mild', 'Medium', 'Hot', 'Extra Hot'];
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="margin-bottom: 15px;">${item.icon} ${name}</h3>
            <p style="color: #718096; margin-bottom: 20px;">${desc || ''}</p>
            <p style="font-size: 1.3rem; font-weight: bold; color: #667eea; margin-bottom: 25px;">
                Base Price: ฿${item.price}
            </p>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 15px;">🌶️ Spicy Level</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                    ${spicyLevels.map((level, index) => `
                        <div class="dietary-option ${index === 0 ? 'selected' : ''}" 
                             onclick="selectSpicyLevel(${index}, event)" data-spicy="${index}">
                            <div style="font-size: 1.5rem;">${'🌶️'.repeat(index)}</div>
                            <small>${level}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 15px;">🥩 Protein Choice</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                    ${proteinOptions.map((protein, index) => `
                        <div class="dietary-option ${index === 0 ? 'selected' : ''}" 
                             onclick="selectProtein('${protein}', event)" data-protein="${protein}">
                            <div style="font-size: 1.5rem;">${getProteinIcon(protein)}</div>
                            <small>${protein}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 15px;">📝 Special Instructions</h4>
                <textarea id="specialNotes" placeholder="Add special requests..." 
                          style="width: 100%; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; height: 80px;"></textarea>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 15px;">👥 Assign to: <span style="color: #e53e3e;">*</span></h4>
                <div class="assignment-grid">${avatarOptions}</div>
            </div>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 1.1rem; color: #4a5568;">Final Price</div>
                <div id="finalPrice" style="font-size: 1.5rem; font-weight: bold; color: #667eea;">฿${item.price}</div>
            </div>
            
            <div style="display: flex; gap: 15px;">
                <button onclick="addCustomizedItemToCart()" class="btn-primary" style="flex: 1;">Add to Cart</button>
                <button onclick="closeModal()" style="background: #e2e8f0; color: #4a5568; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) document.body.removeChild(modal);
    selectedSpicy = 0;
    selectedProtein = 'Original';
    selectedAvatar = null;
    currentModalItem = null;
}

function selectSpicyLevel(level, event) {
    event.stopPropagation();
    document.querySelectorAll('[data-spicy]').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-spicy="${level}"]`).classList.add('selected');
    selectedSpicy = level;
    updateFinalPrice();
}

function selectProtein(protein, event) {
    event.stopPropagation();
    document.querySelectorAll('[data-protein]').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-protein="${protein}"]`).classList.add('selected');
    selectedProtein = protein;
    updateFinalPrice();
}

function selectAvatarForOrder(avatarId, event) {
    event.stopPropagation();
    document.querySelectorAll('.avatar-assign').forEach(el => el.classList.remove('selected'));
    event.target.closest('.avatar-assign').classList.add('selected');
    selectedAvatar = avatarId;
}

function updateFinalPrice() {
    if (!currentModalItem) return;
    
    let finalPrice = parseFloat(currentModalItem.price);
    if (selectedSpicy > 0) finalPrice += selectedSpicy * 5;
    
    const proteinCosts = { 'Original': 0, 'Chicken': 20, 'Pork': 25, 'Beef': 40, 'Vegetarian': -10, 'Seafood': 60 };
    finalPrice += proteinCosts[selectedProtein] || 0;
    
    const finalPriceEl = document.getElementById('finalPrice');
    if (finalPriceEl) finalPriceEl.textContent = `฿${finalPrice}`;
}

function addCustomizedItemToCart() {
    if (selectedAvatar === null) {
        alert('Please select who this item is for!');
        return;
    }
    
    const notes = document.getElementById('specialNotes').value.trim();
    const finalPriceText = document.getElementById('finalPrice').textContent;
    const finalPrice = parseFloat(finalPriceText.replace('฿', ''));
    
    const avatar = appState.avatars[selectedAvatar];
    const name = appState.language === 'th' ? currentModalItem.name_th : currentModalItem.name_en;
    
    const cartItem = {
        cartId: appState.nextCartId++,
        itemId: currentModalItem.id,
        avatarId: selectedAvatar,
        name: name,
        icon: currentModalItem.icon,
        basePrice: parseFloat(currentModalItem.price),
        finalPrice: finalPrice,
        quantity: 1,
        customizations: {
            spicyLevel: selectedSpicy,
            protein: selectedProtein,
            notes: notes
        },
        displayName: `${name}${selectedProtein !== 'Original' ? ` (${selectedProtein})` : ''}${selectedSpicy > 0 ? ` 🌶️x${selectedSpicy}` : ''}`
    };
    
    appState.cart.push(cartItem);
    updateCartDisplay();
    closeModal();
    showSuccessMessage(`Added ${cartItem.displayName} to ${avatar.nickname}'s order!`);
}

// ===== CART FUNCTIONS =====
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const totalAmount = document.getElementById('totalAmount');
    
    if (!cartItems) return;
    
    cartItems.innerHTML = '';
    let totalItems = 0;
    let grandTotal = 0;
    
    if (appState.cart.length === 0) {
        cartItems.innerHTML = `
            <div style="text-align: center; color: #718096; padding: 20px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">🛒</div>
                <p>Cart is empty</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                <button onclick="toggleCart()" style="background: #e2e8f0; color: #4a5568; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">Hide Cart</button>
                <button onclick="clearCart()" style="background: #fed7d7; color: #c53030; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">Clear All</button>
            </div>
        `;
        
        const itemsByAvatar = {};
        appState.cart.forEach(item => {
            if (!itemsByAvatar[item.avatarId]) itemsByAvatar[item.avatarId] = [];
            itemsByAvatar[item.avatarId].push(item);
        });
        
        Object.keys(itemsByAvatar).forEach(avatarId => {
            const avatar = appState.avatars[avatarId];
            const items = itemsByAvatar[avatarId];
            const avatarTotal = items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
            
            const avatarSection = document.createElement('div');
            avatarSection.innerHTML = `
                <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong>${avatar.animal} ${avatar.nickname}</strong>
                        <span style="color: #667eea; font-weight: bold;">฿${avatarTotal}</span>
                    </div>
                    ${items.map(item => `
                        <div style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                            <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 5px;">${item.displayName}</div>
                            ${item.customizations.notes ? `<div style="font-size: 0.75rem; color: #718096;">"${item.customizations.notes}"</div>` : ''}
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <span style="font-size: 0.8rem;">฿${item.finalPrice} x ${item.quantity}</span>
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="updateItemQuantity(${item.cartId}, -1)" style="background: #e2e8f0; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;">-</button>
                                    <span style="font-weight: bold; min-width: 20px; text-align: center;">${item.quantity}</span>
                                    <button onclick="updateItemQuantity(${item.cartId}, 1)" style="background: #e2e8f0; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;">+</button>
                                    <button onclick="removeFromCart(${item.cartId})" style="background: #fed7d7; color: #c53030; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer;">×</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            cartItems.appendChild(avatarSection);
            
            totalItems += items.reduce((sum, item) => sum + item.quantity, 0);
            grandTotal += avatarTotal;
        });
    }
    
    cartCount.textContent = totalItems;
    totalAmount.textContent = `฿${grandTotal}`;
    appState.totalAmount = grandTotal;
    
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = grandTotal === 0;
    }
}

function updateItemQuantity(cartId, change) {
    const item = appState.cart.find(item => item.cartId === cartId);
    if (item) {
        item.quantity = Math.max(1, item.quantity + change);
        updateCartDisplay();
    }
}

function removeFromCart(cartId) {
    appState.cart = appState.cart.filter(item => item.cartId !== cartId);
    updateCartDisplay();
    showSuccessMessage('Item removed from cart');
}

function clearCart() {
    if (confirm('Clear entire cart?')) {
        appState.cart = [];
        updateCartDisplay();
        showSuccessMessage('Cart cleared!');
    }
}

function toggleCart() {
    const cart = document.getElementById('cart');
    cart.classList.toggle('hidden');
}
// ===== CHECKOUT FUNCTIONS =====
function goToCheckout() {
    if (appState.cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    document.getElementById('menuStep').classList.add('hidden');
    document.getElementById('checkoutStep').classList.remove('hidden');
    document.getElementById('cart').classList.add('hidden');
    renderCheckout();
}

function renderCheckout() {
    const container = document.getElementById('checkoutContent');
    let checkoutHTML = `<h3 style="margin-bottom: 25px;">Order Summary</h3>`;

    checkoutHTML += `
        <div style="margin-bottom: 25px; background: #f7fafc; padding: 18px 20px; border-radius: 10px;">
            <label style="font-weight: bold; margin-right: 20px;">
                <input type="radio" name="payMode" value="split" checked onchange="setPayMode('split')">
                Split the Bill
            </label>
            <label style="font-weight: bold;">
                <input type="radio" name="payMode" value="together" onchange="setPayMode('together')">
                Pay Together
            </label>
        </div>
    `;

    const itemsByAvatar = {};
    appState.cart.forEach(item => {
        if (!itemsByAvatar[item.avatarId]) itemsByAvatar[item.avatarId] = [];
        itemsByAvatar[item.avatarId].push(item);
    });

    const paymentOptions = `
        <option value="cash">Cash</option>
        <option value="qr">QR/PromptPay</option>
        <option value="card">Credit Card</option>
    `;

    Object.keys(itemsByAvatar).forEach(avatarId => {
        const avatar = appState.avatars[avatarId];
        const items = itemsByAvatar[avatarId];
        const avatarTotal = items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

        checkoutHTML += `
            <div style="background: #f7fafc; padding: 20px; border-radius: 12px; margin: 15px 0;">
                <h4 style="margin-bottom: 15px;">${avatar.animal} ${avatar.nickname}</h4>
                ${items.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                        <div>
                            <div style="font-weight: 600;">${item.displayName}</div>
                            ${item.customizations.notes ? `<div style="font-size: 0.8rem; color: #718096;">"${item.customizations.notes}"</div>` : ''}
                            <div style="font-size: 0.8rem;">Qty: ${item.quantity}</div>
                        </div>
                        <span style="font-weight: bold; color: #667eea;">฿${item.finalPrice * item.quantity}</span>
                    </div>
                `).join('')}
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <strong>Subtotal: ฿${avatarTotal}</strong>
                    </div>
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <span>Payment Method:</span>
                        <select class="avatar-payment-method" data-avatar="${avatarId}" 
                                style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 5px;">
                            ${paymentOptions}
                        </select>
                    </label>
                </div>
            </div>
        `;
    });

    checkoutHTML += `
        <div id="payTogetherSection" style="display:none; background: #f7fafc; padding: 20px; border-radius: 12px; margin: 15px 0;">
            <h4 style="margin-bottom: 15px;">All Guests</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>Grand Total: ฿${appState.totalAmount}</strong>
            </div>
            <label style="display: flex; align-items: center; gap: 10px;">
                <span>Payment Method:</span>
                <select id="payTogetherMethod" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 5px;">
                    ${paymentOptions}
                </select>
            </label>
        </div>
    `;

    checkoutHTML += `
        <div style="background: #667eea; color: white; padding: 25px; border-radius: 12px; text-align: center; margin-top: 25px;">
            <h3 style="margin-bottom: 10px;">Grand Total: ฿${appState.totalAmount}</h3>
            <p>Table: ${appState.tableNumber || 'N/A'}</p>
        </div>
        <button class="btn-primary" onclick="confirmOrder()" style="width: 100%; margin-top: 25px; font-size: 1.2rem; padding: 20px;">
            Confirm Order
        </button>
    `;

    container.innerHTML = checkoutHTML;
}

function setPayMode(mode) {
    const avatarSelects = document.querySelectorAll('.avatar-payment-method');
    const payTogetherSection = document.getElementById('payTogetherSection');
    
    if (mode === 'split') {
        avatarSelects.forEach(sel => sel.parentElement.parentElement.style.display = '');
        if (payTogetherSection) payTogetherSection.style.display = 'none';
    } else {
        avatarSelects.forEach(sel => sel.parentElement.parentElement.style.display = 'none');
        if (payTogetherSection) payTogetherSection.style.display = '';
    }
}

async function confirmOrder() {
    if (!appState.sessionId) {
        showErrorMessage('No active session. Please restart.');
        return;
    }
    
    try {
        // Prepare order items for API
        const orderItems = appState.cart.map(item => ({
            avatarId: appState.avatars[item.avatarId].id || item.avatarId,
            itemId: item.itemId,
            quantity: item.quantity,
            basePrice: item.basePrice,
            finalPrice: item.finalPrice,
            customizations: item.customizations
        }));
        
        const paymentMode = document.querySelector('input[name="payMode"]:checked').value;
        
        const response = await window.restaurantAPI.orders.create({
            sessionId: appState.sessionId,
            tableId: appState.tableId,
            items: orderItems,
            totalAmount: appState.totalAmount,
            paymentMode: paymentMode
        });
        
        if (response.success) {
            appState.orderId = response.data.orderId;
            appState.queueNumber = response.data.queueNumber;
            
            document.getElementById('queueNumberDisplay').textContent = appState.queueNumber;
            
            showSuccessMessage('Order confirmed! Your food will be ready soon.');
            
            document.getElementById('checkoutStep').classList.add('hidden');
            document.getElementById('statusStep').classList.remove('hidden');
            
            // Listen for status updates
            listenForOrderUpdates();
        }
    } catch (error) {
        console.error('Order confirmation error:', error);
        showErrorMessage('Failed to confirm order. Please try again.');
    }
}

function listenForOrderUpdates() {
    if (window.restaurantSocket && appState.tableNumber) {
        window.restaurantSocket.on('order-status-updated', (data) => {
            if (data.queueNumber === appState.queueNumber) {
                updateOrderStatus(data.status);
                showSuccessMessage(`Order ${data.queueNumber}: ${data.status}`);
            }
        });
    }
}

function updateOrderStatus(status) {
    const statusMap = {
        'pending': 0,
        'preparing': 1,
        'cooking': 2,
        'ready': 3,
        'served': 4
    };
    
    const steps = document.querySelectorAll('.status-step');
    const statusIndex = statusMap[status] || 0;
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < statusIndex) {
            step.classList.add('completed');
        } else if (index === statusIndex) {
            step.classList.add('active');
        }
    });
}

// ===== ADMIN FUNCTIONS =====
function showAdminLogin() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h2 style="margin-bottom: 30px; text-align: center;">Admin Login</h2>
            <div style="display: grid; gap: 15px;">
                <input type="text" id="adminUsername" placeholder="Username" value="admin"
                       style="width: 100%; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <input type="password" id="adminPassword" placeholder="Password" value="admin123"
                       style="width: 100%; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <button onclick="tryAdminLogin()" class="btn-primary" style="width: 100%;">Login</button>
                <button onclick="closeModal()" style="background: #e2e8f0; color: #4a5568; border: none; padding: 15px; border-radius: 8px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

async function tryAdminLogin() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    try {
        const res = await window.restaurantAPI.auth.login(username, password);
        if (res.success && res.data && res.data.token) {
            appState.adminLoggedIn = true;
            appState.adminToken = res.data.token;
            closeModal();
            // Remove any lingering modal overlays
            document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
            startAdminFlow();
        } else {
            showErrorMessage(res.message || 'Invalid credentials');
        }
    } catch (err) {
        showErrorMessage('Login failed: ' + (err.message || 'Server error'));
    }
}

function logout() {
    appState.adminLoggedIn = false;
    appState.adminToken = null;
    goBack();
}

async function loadAdminDashboard() {
    try {
        console.log('DEBUG: loadAdminDashboard called');
        const statsRes = await window.restaurantAPI.dashboard.getStats();
        if (statsRes.success) {
            const stats = statsRes.data;
            document.getElementById('todayOrders').textContent = stats.todayOrders;
            document.getElementById('todayRevenue').textContent = '฿' + stats.todayRevenue.toLocaleString();
            document.getElementById('occupiedTables').textContent = stats.occupiedTables;
            document.getElementById('avgWaitTime').textContent = stats.avgWaitTime + 'm';
        }
    } catch (error) {
        console.error('Dashboard stats error:', error);
    }
    
    await loadQueue();
    await loadTables();
    await loadMenuManagement();
    showAdminTab('queue');
    
    // Connect to Socket.IO for admin
    if (window.restaurantSocket) {
        window.restaurantSocket.emit('join-admin');
        
        // Listen for new orders
        window.restaurantSocket.on('new-order', (data) => {
            showSuccessMessage(`New order: ${data.queueNumber} - Table ${data.tableNumber}`);
            loadQueue();
        });
    }
}

function showAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(tabName + 'Tab')?.classList.remove('hidden');
}

async function loadQueue() {
    const queueList = document.getElementById('queueList');
    if (!queueList) return;
    
    try {
        const response = await window.restaurantAPI.orders.getQueue();
        if (response.success && response.data.length > 0) {
            queueList.innerHTML = response.data.map(order => `
                <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; color: black;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 1.2rem; color: #667eea;">${order.queue_number}</strong>
                            <span style="background: #edf2f7; padding: 4px 8px; border-radius: 6px; margin-left: 10px;">Table ${order.table_number}</span>
                            <div style="color: #718096; margin-top: 5px;">${order.item_count} items - ฿${order.total_amount}</div>
                        </div>
                        <select onchange="updateOrderStatusAdmin('${order.id}', this.value)" 
                                style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 5px;">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="cooking" ${order.status === 'cooking' ? 'selected' : ''}>Cooking</option>
                            <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                            <option value="served" ${order.status === 'served' ? 'selected' : ''}>Served</option>
                        </select>
                    </div>
                </div>
            `).join('');
        } else {
            queueList.innerHTML = '<div style="text-align: center; padding: 40px; color: #718096;">No orders in queue</div>';
        }
    } catch (error) {
        console.error('Queue load error:', error);
        queueList.innerHTML = '<div style="text-align: center; padding: 40px; color: #e53e3e;">Failed to load queue</div>';
    }
}

async function updateOrderStatusAdmin(orderId, status) {
    try {
        const response = await window.restaurantAPI.orders.updateStatus(orderId, status);
        if (response.success) {
            showSuccessMessage(`Order status updated to ${status}`);
            loadQueue();
        }
    } catch (error) {
        console.error('Status update error:', error);
        showErrorMessage('Failed to update order status');
    }
}

async function loadTables() {
    const tablesGrid = document.getElementById('tablesGrid');
    if (!tablesGrid) return;
    
    try {
        const response = await window.restaurantAPI.tables.getAll();
        if (response.success) {
            tablesGrid.innerHTML = response.data.map(table => `
                <div style="background: white; padding: 20px; border-radius: 12px; text-align: center; color: black;">
                    <h3 style="margin-bottom: 15px;">${table.table_number}</h3>
                    <div style="padding: 15px; border-radius: 8px; font-weight: 600;
                                background: ${table.status === 'free' ? '#c6f6d5' : table.status === 'occupied' ? '#fed7d7' : '#feebc8'};
                                color: ${table.status === 'free' ? '#22543d' : table.status === 'occupied' ? '#c53030' : '#c05621'};">
                        ${table.status.toUpperCase()}
                    </div>
                    ${table.status !== 'free' ? `<button onclick="resetTable(${table.id})" class="btn-primary" style="margin-top: 10px; padding: 8px 16px;">Reset</button>` : ''}
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Tables load error:', error);
        tablesGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: #e53e3e;">Failed to load tables</div>';
    }
}

async function resetTable(tableId) {
    try {
        const response = await window.restaurantAPI.tables.reset(tableId);
        if (response.success) {
            showSuccessMessage('Table has been reset');
            loadTables();
        }
    } catch (error) {
        console.error('Table reset error:', error);
        showErrorMessage('Failed to reset table');
    }
}

async function loadMenuManagement() {
    const list = document.getElementById('menuManagementList');
    if (!list) return;
    
    try {
        const response = await window.restaurantAPI.menu.getAll();
        if (response.success) {
            list.innerHTML = response.data.map(item => `
                <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; color: black;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                            <span style="font-size: 1.5rem;">${item.icon}</span>
                            <strong>${item.name_en} / ${item.name_th}</strong>
                        </div>
                        <div style="color: #718096; font-size: 0.9rem;">฿${item.price} - ${item.category}</div>
                    </div>
                    <button onclick="toggleMenuItemAvailability(${item.id}, ${!item.is_available})" 
                            style="background: ${item.is_available ? '#f56565' : '#48bb78'}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        ${item.is_available ? 'Disable' : 'Enable'}
                    </button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Menu management load error:', error);
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: #e53e3e;">Failed to load menu</div>';
    }
}

async function toggleMenuItemAvailability(itemId, newStatus) {
    try {
        const response = await window.restaurantAPI.menu.update(itemId, { is_available: newStatus });
        if (response.success) {
            showSuccessMessage(`Menu item has been ${newStatus ? 'enabled' : 'disabled'}`);
            loadMenuManagement();
        }
    } catch (error) {
        console.error('Menu item toggle error:', error);
        showErrorMessage('Failed to update menu item status');
    }
}