export const image = (() => {

    let images = null;

    const setupImage = (el) => {
        if (el.hasAttribute('data-src')) {
            el.onload = () => el.classList.remove('opacity-0');
            el.src = el.getAttribute('data-src');
            return;
        }

        el.onload = () => el.classList.remove('opacity-0');
    };

    const hasDataSrc = () => Array.from(images).some((i) => i.hasAttribute('data-src'));

    const load = () => {
        Array.from(images).forEach(setupImage);
    };

    const download = (url) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${window.location.hostname}_image_${Date.now()}`;
        a.click();
    };

    const init = () => {
        images = document.querySelectorAll('img');

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