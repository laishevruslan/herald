import { useCredentialsStore } from '@/backtivisda/credentials';
import { useStore } from '@/backtivisda/datastore.js'

function gitlabHeaders() {
    const credentialsStore = useCredentialsStore();

    return {
        'PRIVATE-TOKEN': credentialsStore.gitlabToken,
        'Content-Type': 'application/json',
    };
}


export function gitlabRawUrl(filepath, gitlabConfig) {
    const credentialsStore = useCredentialsStore();

    const encodedFilepath = encodeURIComponent(filepath);
    const url = `${gitlabConfig.url}/api/v4/projects/${gitlabConfig.projectId}/repository/files/${encodedFilepath}/raw?ref=${gitlabConfig.branch}&private_token=${credentialsStore.gitlabToken}`;

    return url;
}

export function requestBlobFile(filepath) {
    const store = useStore();
    const gitlab = store.config.gitlab;
    const encodedFilepath = encodeURIComponent(filepath);
    const url = `${gitlab.url}/api/v4/projects/${gitlab.projectId}/repository/files/${encodedFilepath}/raw?ref=${gitlab.branch}`;

    return new Promise((resolve, reject) => {
        fetch(url, { method: 'GET', headers: gitlabHeaders() })
            .then((response) => response.blob())
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
}

export function requestFile(filepath) {
    const encodedFilepath = encodeURIComponent(filepath);

    const store = useStore();
    const gitlab = store.config.gitlab;
    const url = `${gitlab.url}/api/v4/projects/${gitlab.projectId}/repository/files/${encodedFilepath}/raw?ref=${gitlab.branch}`;

    return new Promise((resolve, reject) => {
        fetch(url, { method: 'GET', headers: gitlabHeaders() })
            .then((response) => {
                if (!response.ok)
                    reject(response.status);
                else
                    return response.json();
            })
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    })
}

// https://docs.gitlab.com/ee/api/commits.html

export function commit(actions, commit_message) {
    const store = useStore();
    const gitlab = store.config.gitlab;
    const url = `${gitlab.url}/api/v4/projects/${gitlab.projectId}/repository/commits`;

    const body = {
        branch: gitlab.branch,
        commit_message: commit_message,
        author_email: store.config.email,
        actions: actions,
    };

    return new Promise((resolve, reject) => {
        fetch(url, { method: 'POST', headers: gitlabHeaders(), body: JSON.stringify(body) }).then((response) => {
            if (!response.ok) {
                reject();
                return;
            }
            resolve();
        });
    });
}
