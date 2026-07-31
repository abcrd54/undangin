import { progress } from './progress.js';

export const image = (() => {

    /**
     * @type {NodeListOf<HTMLImageElement>|null}
     */
    let images = null;

    /**
     * @param {HTMLImageElement} el 
     * @returns {void}
     */
    const setupImage = (el) => {
        if (el.hasAttribute('data-src')) {
            el.onload = () => {
                el.classList.remove('opacity-0');
                progress.complete('image');
            };
            el.onerror = () => progress.invalid('image');
            el.src = el.getAttribute('data-src');
            return;
        }

        if (el.complete && el.naturalWidth !== 0 && el.naturalHeight !== 0) {
            progress.complete('image');
            return;
        }

        if (el.complete) {
            progress.invalid('image');
            return;
        }

        el.onload = () => {
            el.classList.remove('opacity-0');
            progress.complete('image');
        };
        el.onerror = () => progress.invalid('image');
    };

    /**
     * @returns {boolean}
     */
    const hasDataSrc = () => Array.from(images).some((i) => i.hasAttribute('data-src'));

    /**
     * @returns {Promise<void>}
     */
    const load = () => {
        const imgs = Array.from(images);
        imgs.forEach(setupImage);
        return Promise.resolve();
    };

    /**
     * @param {string} url 
     * @returns {void}
     */
    const download = (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${window.location.hostname}_image_${Date.now()}`;
        a.click();
    };

    /**
     * @returns {object}
     */
    const init = () => {
        images = document.querySelectorAll('img');
        images.forEach(progress.add);

        return {
            load,
            download,
            hasDataSrc,
        };
    };

    return {
        init,
    };
})();