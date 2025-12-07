// Main Application Logic

import { initDB, saveRecipe, getRecipes, updateRecipe, deleteRecipe } from './db.js';
import { parseToSlides, extractIngredients } from './markdown-parser.js';
import { initSlider, loadSlides } from './slider.js';

// State
let recipes = [];
let currentFilter = {
    category: 'all',
    favorite: false,
    search: ''
};
let currentRecipeId = null;
let settings = {
    fontSize: localStorage.getItem('fontSize') || 'medium',
    wakeLock: localStorage.getItem('wakeLock') === 'true'
};
let wakeLockSentinel = null;

// Timer State
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

// DOM Elements (Initialized in setupDOM)
let views = {};
let modals = {};
let btns = {};
let forms = {};
let inputs = {};
let grids = {};
let display = {};

function setupDOM() {
    views = {
        board: document.getElementById('view-board'),
        register: document.getElementById('view-register'),
        slide: document.getElementById('view-slide')
    };

    modals = {
        settings: document.getElementById('settings-modal'),
        timer: document.getElementById('timer-modal'),
        shoppingList: document.getElementById('shopping-list-modal')
    };

    btns = {
        addRecipe: document.getElementById('btn-add-recipe'),
        closeRegister: document.getElementById('btn-close-register'),
        backBoard: document.getElementById('btn-back-board'),
        toggleFavorite: document.getElementById('btn-toggle-favorite'),
        settings: document.getElementById('btn-settings'),
        closeSettings: document.getElementById('btn-close-settings'),
        fontSizes: document.querySelectorAll('.btn-font-size'),
        timer: document.getElementById('btn-timer'),
        closeTimer: document.getElementById('btn-close-timer'),
        startTimer: document.getElementById('btn-start-timer'),
        resetTimer: document.getElementById('btn-reset-timer'),
        timerPresets: document.querySelectorAll('.btn-preset'),
        shoppingList: document.getElementById('btn-shopping-list'),
        closeShoppingList: document.getElementById('btn-close-shopping-list'),
        editRecipe: document.getElementById('btn-edit-recipe'),
        deleteRecipe: document.getElementById('btn-delete-recipe')
    };

    forms = {
        recipe: document.getElementById('recipe-form')
    };

    inputs = {
        id: document.getElementById('recipe-id'),
        markdown: document.getElementById('markdown-input'),
        category: document.getElementById('recipe-category'),
        search: document.getElementById('search-input'),
        wakeLock: document.getElementById('wakelock-switch')
    };

    grids = {
        recipe: document.getElementById('recipe-grid')
    };

    display = {
        timerMinutes: document.getElementById('timer-minutes'),
        timerSeconds: document.getElementById('timer-seconds'),
        shoppingList: document.getElementById('shopping-list-items'),
        shoppingListEmpty: document.getElementById('shopping-list-empty'),
        formHeader: document.querySelector('#view-register h2'),
        formSubmitBtn: document.querySelector('#recipe-form button[type="submit"]')
    };
}

let filterChips;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized');

    // Setup DOM elements
    setupDOM();

    // Initialize DB
    try {
        await initDB();
    } catch (err) {
        console.error('DB Init Failed:', err);
    }

    // Initialize Slider
    try {
        initSlider();
    } catch (err) {
        console.error('Slider Init Failed:', err);
    }

    // Load Recipes
    try {
        await loadRecipes();
    } catch (err) {
        console.error('Load Recipes Failed:', err);
    }

    // Apply Settings
    applySettings();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        } catch (err) {
            console.log('ServiceWorker registration failed: ', err);
        }
    }

    // Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Initialize filterChips
    filterChips = document.querySelectorAll('.filter-chip');

    // Navigation
    btns.addRecipe.addEventListener('click', () => {
        resetForm();
        switchView('register');
    });
    btns.closeRegister.addEventListener('click', () => switchView('board'));
    btns.backBoard.addEventListener('click', () => switchView('board'));

    // Form Submission
    forms.recipe.addEventListener('submit', handleRecipeSubmit);

    // Filter & Search
    inputs.search.addEventListener('input', (e) => {
        currentFilter.search = e.target.value.toLowerCase();
        renderRecipeGrid();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Handle Category Chips
            if (chip.dataset.category) {
                // Remove active from other category chips
                filterChips.forEach(c => {
                    if (c.dataset.category) c.classList.remove('active');
                });
                chip.classList.add('active');
                currentFilter.category = chip.dataset.category;
            }
            // Handle Favorite Chip
            else if (chip.dataset.filter === 'favorite') {
                chip.classList.toggle('active');
                currentFilter.favorite = chip.classList.contains('active');
            }
            renderRecipeGrid();
        });
    });

    // Favorite Toggle in Slide View
    btns.toggleFavorite.addEventListener('click', async () => {
        if (!currentRecipeId) return;

        const recipe = recipes.find(r => r.id === currentRecipeId);
        if (recipe) {
            const newStatus = !recipe.favorite;
            await updateRecipe(currentRecipeId, { favorite: newStatus });
            recipe.favorite = newStatus; // Update local state
            updateFavoriteBtnState(newStatus);
            // Refresh grid in background
            renderRecipeGrid();
        }
    });

    // Settings Modal
    btns.settings.addEventListener('click', () => {
        modals.settings.classList.add('active');
    });
    btns.closeSettings.addEventListener('click', () => {
        modals.settings.classList.remove('active');
    });

    // Font Size Control
    btns.fontSizes.forEach(btn => {
        btn.addEventListener('click', () => {
            const size = btn.dataset.size;
            settings.fontSize = size;
            localStorage.setItem('fontSize', size);
            applySettings();

            // Update UI
            btns.fontSizes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Wake Lock Control
    inputs.wakeLock.addEventListener('change', (e) => {
        settings.wakeLock = e.target.checked;
        localStorage.setItem('wakeLock', settings.wakeLock);
        applyWakeLock();
    });

    // Timer Modal
    btns.timer.addEventListener('click', () => {
        modals.timer.classList.add('active');
    });
    btns.closeTimer.addEventListener('click', () => {
        modals.timer.classList.remove('active');
    });

    // Timer Controls
    btns.timerPresets.forEach(btn => {
        btn.addEventListener('click', () => {
            stopTimer();
            timerSeconds = parseInt(btn.dataset.time);
            updateTimerDisplay();
        });
    });

    btns.startTimer.addEventListener('click', () => {
        if (isTimerRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    });

    btns.resetTimer.addEventListener('click', () => {
        stopTimer();
        timerSeconds = 0;
        updateTimerDisplay();
    });

    // Shopping List Modal
    btns.shoppingList.addEventListener('click', () => {
        renderShoppingList();
        modals.shoppingList.classList.add('active');
    });
    btns.closeShoppingList.addEventListener('click', () => {
        modals.shoppingList.classList.remove('active');
    });

    // Edit & Delete
    btns.editRecipe.addEventListener('click', () => {
        if (!currentRecipeId) return;
        const recipe = recipes.find(r => r.id === currentRecipeId);
        if (recipe) {
            populateForm(recipe);
            switchView('register');
        }
    });

    btns.deleteRecipe.addEventListener('click', async () => {
        console.log('Delete button clicked, currentRecipeId:', currentRecipeId);
        if (!currentRecipeId) {
            console.log('No currentRecipeId, returning');
            return;
        }
        const confirmResult = confirm('本当にこのレシピを削除しますか?');
        console.log('Confirm result:', confirmResult);
        if (confirmResult) {
            try {
                console.log('Deleting recipe:', currentRecipeId);
                await deleteRecipe(currentRecipeId);
                console.log('Recipe deleted successfully');
                await loadRecipes();
                console.log('Recipes reloaded');
                switchView('board');
                console.log('Switched to board view');
            } catch (err) {
                console.error('Failed to delete recipe:', err);
                alert('削除に失敗しました');
            }
        }
    });
}

function switchView(viewName) {
    // Hide all views
    Object.values(views).forEach(el => el.classList.remove('active'));

    // Show target view
    if (views[viewName]) {
        views[viewName].classList.add('active');
    }

    // Special handling
    if (viewName === 'board') {
        releaseWakeLock(); // Release lock when leaving slide view
    } else if (viewName === 'slide') {
        applyWakeLock(); // Request lock when entering slide view
    }
}

function resetForm() {
    inputs.id.value = '';
    inputs.markdown.value = '';
    inputs.category.value = 'other';
    display.formHeader.textContent = '新規レシピ登録';
    display.formSubmitBtn.textContent = '保存する';
}

function populateForm(recipe) {
    inputs.id.value = recipe.id;
    inputs.markdown.value = recipe.markdownText;
    inputs.category.value = recipe.category;
    display.formHeader.textContent = 'レシピ編集';
    display.formSubmitBtn.textContent = '更新する';
}

async function handleRecipeSubmit(e) {
    e.preventDefault();

    const id = inputs.id.value ? parseInt(inputs.id.value) : null;
    const markdown = inputs.markdown.value.trim();
    const category = inputs.category.value;

    if (!markdown) {
        alert('Markdownテキストを入力してください');
        return;
    }

    try {
        // Parse title from markdown (first # header)
        const titleMatch = markdown.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : '無題のレシピ';

        const recipeData = {
            title: title,
            markdownText: markdown,
            category: category,
            updatedAt: new Date()
        };

        if (id) {
            // Update existing
            await updateRecipe(id, recipeData);
        } else {
            // Create new
            recipeData.favorite = false;
            recipeData.createdAt = new Date();
            await saveRecipe(recipeData);
        }

        // Reset form and go back to board
        resetForm();
        await loadRecipes(); // Reload data
        switchView('board');

    } catch (err) {
        console.error('Failed to save recipe:', err);
        alert('レシピの保存に失敗しました');
    }
}

async function loadRecipes() {
    try {
        recipes = await getRecipes();
        renderRecipeGrid();
    } catch (err) {
        console.error('Failed to load recipes:', err);
    }
}

function renderRecipeGrid() {
    const grid = grids.recipe;
    grid.innerHTML = '';

    // Filter Logic
    const filteredRecipes = recipes.filter(recipe => {
        // Category Filter
        if (currentFilter.category !== 'all' && recipe.category !== currentFilter.category) {
            return false;
        }
        // Favorite Filter
        if (currentFilter.favorite && !recipe.favorite) {
            return false;
        }
        // Search Filter
        if (currentFilter.search && !recipe.title.toLowerCase().includes(currentFilter.search)) {
            return false;
        }
        return true;
    });

    if (filteredRecipes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round">search_off</span>
                <p>条件に一致するレシピが見つかりません。</p>
            </div>
        `;
        return;
    }

    filteredRecipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';

        // Category Label Map
        const catMap = {
            'japanese': '和食',
            'western': '洋食',
            'chinese': '中華',
            'other': 'その他'
        };

        card.innerHTML = `
            <div class="card-image">
                <span class="material-icons-round" style="font-size: 48px; color: #ddd;">restaurant</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${recipe.title}</h3>
                <div class="card-meta">
                    <span>${catMap[recipe.category] || 'その他'}</span>
                    ${recipe.favorite ? '<span class="card-favorite-icon material-icons-round">favorite</span>' : ''}
                </div>
            </div>
        `;

        card.addEventListener('click', () => openSlideView(recipe));
        grid.appendChild(card);
    });
}

function openSlideView(recipe) {
    currentRecipeId = recipe.id;

    // Generate slides from markdown
    const slides = parseToSlides(recipe.markdownText);

    // Update UI
    document.getElementById('slide-title').textContent = recipe.title;
    updateFavoriteBtnState(recipe.favorite);

    // Load into Swiper
    loadSlides(slides);

    // Apply current font size to new slides
    applySettings();

    // Switch view
    switchView('slide');
}

function updateFavoriteBtnState(isFavorite) {
    const icon = btns.toggleFavorite.querySelector('.material-icons-round');
    if (isFavorite) {
        icon.textContent = 'favorite';
        btns.toggleFavorite.classList.add('active');
    } else {
        icon.textContent = 'favorite_border';
        btns.toggleFavorite.classList.remove('active');
    }
}

// Settings & Wake Lock Logic
function applySettings() {
    // Apply Font Size
    const slideContents = document.querySelectorAll('.slide-content');
    slideContents.forEach(el => {
        el.classList.remove('text-small', 'text-medium', 'text-large', 'text-xlarge');
        el.classList.add(`text-${settings.fontSize}`);
    });

    // Update UI state
    btns.fontSizes.forEach(btn => {
        if (btn.dataset.size === settings.fontSize) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    inputs.wakeLock.checked = settings.wakeLock;
}

async function applyWakeLock() {
    if (settings.wakeLock && 'wakeLock' in navigator) {
        try {
            if (wakeLockSentinel) return; // Already locked
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            console.log('Wake Lock active');
            wakeLockSentinel.addEventListener('release', () => {
                console.log('Wake Lock released');
                wakeLockSentinel = null;
            });
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
        }
    } else {
        releaseWakeLock();
    }
}

function releaseWakeLock() {
    if (wakeLockSentinel) {
        wakeLockSentinel.release();
        wakeLockSentinel = null;
    }
}

// Re-acquire lock when visibility changes (e.g. switching tabs)
document.addEventListener('visibilitychange', async () => {
    if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
        await applyWakeLock();
    }
});

// Timer Logic
function startTimer() {
    if (timerSeconds <= 0) return;

    isTimerRunning = true;
    btns.startTimer.textContent = '一時停止';
    btns.startTimer.classList.add('active');

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            stopTimer();
            alert('タイマーが終了しました！');
            // TODO: Use Notification API if possible, or just play a sound
        }
    }, 1000);
}

function stopTimer() {
    isTimerRunning = false;
    btns.startTimer.textContent = 'スタート';
    btns.startTimer.classList.remove('active');
    clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    display.timerMinutes.textContent = minutes.toString().padStart(2, '0');
    display.timerSeconds.textContent = seconds.toString().padStart(2, '0');
}

// Shopping List Logic
function renderShoppingList() {
    if (!currentRecipeId) return;

    const recipe = recipes.find(r => r.id === currentRecipeId);
    if (!recipe) return;

    const ingredients = extractIngredients(recipe.markdownText);
    const listEl = display.shoppingList;
    const emptyEl = display.shoppingListEmpty;

    listEl.innerHTML = '';

    if (ingredients.length === 0) {
        listEl.style.display = 'none';
        emptyEl.style.display = 'flex';
        return;
    }

    listEl.style.display = 'block';
    emptyEl.style.display = 'none';

    ingredients.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="checkbox" id="item-${index}">
            <label for="item-${index}">${item}</label>
        `;
        listEl.appendChild(li);
    });
}
