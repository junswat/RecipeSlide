// Database Operations using Dexie.js

let db;

export async function initDB() {
    db = new Dexie("RecipeDB");

    db.version(1).stores({
        recipes: '++id, title, category, favorite, createdAt'
    });

    console.log('DB Initialized');
}

export async function saveRecipe(recipe) {
    return await db.recipes.add(recipe);
}

export async function updateRecipe(id, updates) {
    return await db.recipes.update(id, updates);
}

export async function getRecipes() {
    return await db.recipes.orderBy('createdAt').reverse().toArray();
}

export async function getRecipe(id) {
    return await db.recipes.get(id);
}

export async function deleteRecipe(id) {
    return await db.recipes.delete(id);
}
