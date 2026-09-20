'use strict';

import Vue from 'vue';

const plugin = {
    install(Vue) {
        if (typeof Vue.prototype.$t !== 'function') {
            throw new Error('vue-i18n is required');
        }

        // extend vue-i18n
        Object.assign(Vue.prototype, {
            // translate from a translation array --> key[index]
            $ta(path, index) {
                return this.$t(`${path}[${index}]`);
            },
        });
    },
};

Vue.use(plugin);
