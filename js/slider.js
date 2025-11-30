// Slider Logic

let swiper;

export function initSlider() {
    swiper = new Swiper('.swiper', {
        // Optional parameters
        direction: 'horizontal',
        loop: false,

        // Pagination
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            type: 'fraction', // 'bullets' | 'fraction' | 'progressbar' | 'custom'
        },

        // Navigation arrows
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        // Effect
        effect: 'slide',
        spaceBetween: 20,
    });
}

export function loadSlides(slidesHtml) {
    if (!swiper) return;

    // Remove existing slides
    swiper.removeAllSlides();

    // Create new slides
    const slideElements = slidesHtml.map(html => {
        return `
            <div class="swiper-slide">
                <div class="slide-content">
                    ${html}
                </div>
            </div>
        `;
    });

    // Add to swiper
    swiper.appendSlide(slideElements);

    // Reset to first slide
    swiper.slideTo(0);
}
