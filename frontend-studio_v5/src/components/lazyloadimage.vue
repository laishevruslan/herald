<template>
    <figure class="image__wrapper" v-lazyload>
        <b-loading class="image__spinner primary-loading" :is-full-page="false" :active="true" :can-cancel="false"></b-loading>
        <img class="image__item" :data-url="src" :alt="alt" />
    </figure>
</template>

<script>
// Insipired by https://css-tricks.com/lazy-loading-images-with-vue-js-directives-and-intersection-observer/

export default {
    name: 'lazy-load-image',
    props: {
        src: String,
        alt: String,
    },
    inserted: (element) => {
        function loadImage() {
            const imageElement = Array.from(element.children).find((element) => element.nodeName === 'IMG');
            if (imageElement) {
                imageElement.addEventListener('load', () => {
                    setTimeout(() => element.classList.add('loaded'), 100);
                });
                imageElement.addEventListener('error', (err) => console.error(err));
                imageElement.src = imageElement.dataset.url;
            }
        }

        // eslint-disable-next-line no-unused-vars
        function handleIntersect(entries, observer) {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    loadImage();
                    observer.unobserve(element);
                }
            });

            function createObserver() {
                const options = {
                    root: null,
                    threshold: '0',
                };
                const observer = new IntersectionObserver(handleIntersect, options);
                observer.observe(element);
            }

            if (window['IntersectionObserver']) {
                createObserver();
            } else {
                loadImage();
            }
        }
    },
};
</script>

<style scoped lang="scss">
.image {
    &__wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 4px;

        &.loaded {
            .image {
                &__item {
                    visibility: visible;
                    opacity: 1;
                    border: 0;
                }

                &__spinner {
                    display: none;
                    width: 100%;
                }
            }
        }
    }

    &__item {
        width: 100%;
        border-radius: 4px;
        transition: all 0.4s ease-in-out;
        opacity: 0;
        visibility: hidden;
    }
}
</style>
