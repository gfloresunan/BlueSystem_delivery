function normalizeForSearch(text) {
    if (!text) return "";
    return text.trim().toLowerCase()
        .replace(/á/g, "a")
        .replace(/é/g, "e")
        .replace(/í/g, "i")
        .replace(/ó/g, "o")
        .replace(/ú/g, "u")
        .replace(/ü/g, "u")
        .replace(/ñ/g, "n");
}

function calculateRelevanceScoreOld(queryNorm, titleNorm, descriptionNorm = "", categoryNorm = "", extraNorm = "") {
    if (!queryNorm || !titleNorm) return 0;
    let score = 0;

    if (titleNorm === queryNorm) score += 100;
    else if (titleNorm.startsWith(queryNorm)) score += 50;
    else if (titleNorm.includes(queryNorm)) score += 30;

    if (categoryNorm) {
        if (categoryNorm === queryNorm) score += 25;
        else if (categoryNorm.includes(queryNorm)) score += 15;
    }

    if (extraNorm && extraNorm.includes(queryNorm)) score += 12;
    if (descriptionNorm && descriptionNorm.includes(queryNorm)) score += 8;

    return score;
}

function calculateRelevanceScoreNew(queryNorm, titleNorm, descriptionNorm = "", categoryNorm = "", extraNorm = "") {
    if (!queryNorm || !titleNorm) return 0;
    let score = 0;

    const qStem = queryNorm.endsWith('s') && queryNorm.length > 3 ? queryNorm.slice(0, -1) : queryNorm;
    const tStem = titleNorm.endsWith('s') && titleNorm.length > 3 ? titleNorm.slice(0, -1) : titleNorm;
    const cStem = categoryNorm.endsWith('s') && categoryNorm.length > 3 ? categoryNorm.slice(0, -1) : categoryNorm;

    if (titleNorm === queryNorm || tStem === qStem) score += 100;
    else if (titleNorm.startsWith(queryNorm) || titleNorm.startsWith(qStem)) score += 50;
    else if (titleNorm.includes(queryNorm) || titleNorm.includes(qStem) || queryNorm.includes(titleNorm)) score += 30;

    if (categoryNorm) {
        if (categoryNorm === queryNorm || cStem === qStem) score += 25;
        else if (categoryNorm.includes(queryNorm) || queryNorm.includes(categoryNorm) || categoryNorm.includes(qStem) || cStem.includes(qStem)) score += 15;
    }

    if (extraNorm && (extraNorm.includes(queryNorm) || extraNorm.includes(qStem))) score += 12;
    if (descriptionNorm && (descriptionNorm.includes(queryNorm) || descriptionNorm.includes(qStem))) score += 8;

    return score;
}

const businesses = [
    { name: "El Chanchito", category: "Restaurante" },
    { name: "FRITONI", category: "Restaurante" },
    { name: "Variedades TECNOHOME", category: "Tecnología" },
    { name: "El Dariano", category: "Farmacia" }
];

const queries = ["Restaurante", "Restaurantes", "Tecnología", "Farmacia", "Farmacias", "Chanchito", "FRITONI", "TECNOHOME", "Dariano"];

console.log("=== SEARCH SIMULATION ===");
queries.forEach(q => {
    const qNorm = normalizeForSearch(q);
    console.log(`\nQuery: "${q}" (norm: "${qNorm}")`);
    businesses.forEach(b => {
        const tNorm = normalizeForSearch(b.name);
        const cNorm = normalizeForSearch(b.category);
        const oldScore = calculateRelevanceScoreOld(qNorm, tNorm, "", cNorm, "");
        const newScore = calculateRelevanceScoreNew(qNorm, tNorm, "", cNorm, "");
        console.log(`  -> ${b.name} (${b.category}): OldScore = ${oldScore} | NewScore = ${newScore}`);
    });
});
