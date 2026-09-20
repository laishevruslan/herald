// Backtivisda

import Vue from 'vue';
import { createPinia, PiniaVuePlugin } from 'pinia';
import App from '@/backtivisda/App.vue';

import { i18n } from '@/plugins/i18n';
import '@/plugins/i18n-extended';
import '@/plugins/buefy';

import '@/assets/styles/main.scss';

import '@/plugins/vue-meta.js';


import 'img-comparison-slider';

Vue.use(PiniaVuePlugin);
const pinia = createPinia();

import router from '@/backtivisda/router';

// Tell Vue that the web component is present.
Vue.config.ignoredElements = [/img-comparison-slider/];

import LazyLoadDirective from '@/directives/LazyLoadDirective';

Vue.directive('lazyload', LazyLoadDirective);

Vue.config.productionTip = false;

Vue.prototype.$isBacktivisda = true;
Vue.prototype.$isAktivisda = false;

Vue.use(pinia);

// App for Backvitisda
new Vue({
    pinia,
    router,
    i18n,
    render: (h) => h(App),
}).$mount('#app');
