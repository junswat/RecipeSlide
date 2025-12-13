// Database Operations using Dexie.js

let db;

export async function initDB() {
    db = new Dexie("RecipeDB");

    db.version(1).stores({
        recipes: '++id, title, category, favorite, createdAt'
    });

    db.version(2).stores({
        recipes: '++id, title, category, favorite, createdAt, image'
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

// Backup & Restore
export async function exportAllRecipes() {
    const recipes = await db.recipes.toArray();
    return JSON.stringify(recipes, null, 2);
}

export async function importRecipes(jsonString) {
    try {
        const recipes = JSON.parse(jsonString);
        if (!Array.isArray(recipes)) {
            throw new Error('Invalid backup file format');
        }

        // Validate basic structure of the first item found
        if (recipes.length > 0 && (!recipes[0].title || !recipes[0].createdAt)) {
            throw new Error('Invalid recipe data');
        }

        // Use bulkPut to overwrite existing items with same ID, or add new ones
        await db.recipes.bulkPut(recipes);
        return true;
    } catch (e) {
        console.error('Import failed:', e);
        throw e;
    }
}
