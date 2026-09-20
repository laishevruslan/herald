'use strict';

import { defineStore } from 'pinia';
import { useStore } from '@datastore';

export const useCredentialsStore = defineStore('credentials', {
    state: () => {
        return {
            gitlabToken: localStorage.getItem('backtivisda/gitlab/token'),
            serverToken: localStorage.getItem('backtivisda/server/token'),
        };
    },
    getters: {},
    actions: {
        setGitlabToken(gitlabToken) {
            this.gitlabToken = gitlabToken;
            localStorage.setItem('backtivisda/gitlab/token', gitlabToken);
        },
        setServerToken(serverToken) {
            this.serverToken = serverToken;
            localStorage.setItem('backtivisda/server/token', serverToken);
        },
        post(url, body) {
            const serverUrl = useStore().config.backtivisda.server;
            return new Promise((resolve, reject) => {
                fetch(`${serverUrl}/${url}`, {
                    method: 'POST',
                    body: body,
                    headers: { 'x-access-token': this.serverToken },
                }).then((response) => {
                    if (response.ok) {
                        resolve(response);
                    } else if (response.status == 401) {
                        response.text().then((text) => reject(text.message));
                    } else if (response.status == 500) {
                        reject("Server side error");
                    }
                }).catch((err) => {
                    reject(err);
                });
            });
        },
    },
});
