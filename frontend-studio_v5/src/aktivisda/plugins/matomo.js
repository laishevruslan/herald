import router from '@/aktivisda/router';
import Vue from 'vue';
import VueMatomo from 'vue-matomo';

export const createMatomo = ({ enabled, host, siteId }) => {
    if (enabled) {
        Vue.use(VueMatomo, {
            host: host,
            siteId: siteId,
            trackerFileName: 'matomo',
            router: router,
            enableLinkTracking: true,
            requireConsent: false, // todo true
            trackInitialView: true,
            disableCookies: true,
            enableHeartBeatTimer: false,
            heartBeatTimerInterval: 15,
            debug: false,
            userId: undefined,
            cookieDomain: undefined,
            domains: undefined,
            preInitActions: [],
        });
    }

}
