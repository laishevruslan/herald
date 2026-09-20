import Vue from 'vue';
import App from '@/aktivisda/App.vue';
import { createPinia, PiniaVuePlugin } from 'pinia';

import { i18n } from '@/plugins/i18n';
import '@/plugins/i18n-extended';
import '@/plugins/buefy';

import '@/assets/styles/main.scss';

import '@/plugins/vue-meta.js';

import '@/aktivisda/datastore.js';

const pinia = createPinia();

import router from '@/aktivisda/router';

import LazyLoadDirective from '@/directives/LazyLoadDirective';
Vue.directive('lazyload', LazyLoadDirective);

Vue.config.productionTip = false;
Vue.prototype.$isBacktivisda = false;
Vue.prototype.$isAktivisda = true;

Vue.use(PiniaVuePlugin);


Vue.use(pinia);
Vue.use(i18n);
Vue.use(router);


new Vue({
    pinia,
    router,
    i18n,
    render: (h) => h(App),
}).$mount('#app');



