// Markdown Parser

export function parseToSlides(markdownText) {
    if (!markdownText) return [];

    // Split by horizontal rule '---' or '***'
    // Also consider splitting by H1/H2 if no horizontal rules are found?
    // For now, let's stick to the requirement: "Markdownを見出し（#, ##, ###）で分割してスライド化"

    // Strategy:
    // 1. Convert Markdown to HTML using marked.js
    // 2. But we need to split it into slides FIRST.
    // So we should split the raw markdown string.

    // Regex to split by headers (#, ##, ###) or horizontal rules
    // This is a bit complex to do perfectly with regex alone.

    // Simple approach:
    // Iterate through lines. If a line starts with #, ##, ### or is ---, start a new slide.

    const lines = markdownText.split('\n');
    const slides = [];
    let currentSlideLines = [];

    lines.forEach((line, index) => {
        const isHeader = /^#{1,3}\s/.test(line);
        const isHr = /^(\*{3,}|-{3,})$/.test(line);

        if ((isHeader || isHr) && currentSlideLines.length > 0) {
            // Push current slide
            slides.push(currentSlideLines.join('\n'));
            currentSlideLines = [];
        }

        if (!isHr) {
            currentSlideLines.push(line);
        }
    });
    if (currentSlideLines.length > 0) {
        slides.push(currentSlideLines.join('\n'));
    }

    // Convert each slide to HTML
    return slides.map(slideMd => {
        return marked.parse(slideMd);
    });
}

export function extractIngredients(markdownText) {
    const ingredients = [];

    // Look for "Ingredients" or "材料" header
    // This regex looks for a header line, followed by a list
    const lines = markdownText.split('\n');
    let inIngredientsSection = false;

    for (const line of lines) {
        // Check for header
        if (line.match(/^#{1,3}\s*(Ingredients|材料|用意するもの)/i)) {
            inIngredientsSection = true;
            continue;
        }

        // Check for next header (end of section)
        if (inIngredientsSection && line.match(/^#{1,3}\s+/)) {
            inIngredientsSection = false;
            continue;
        }

        // Extract list items
        if (inIngredientsSection) {
            const match = line.match(/^[-*]\s+(.+)$/);
            if (match) {
                ingredients.push(match[1].trim());
            }
        }
    }

    return ingredients;
}
