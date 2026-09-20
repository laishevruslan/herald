# Créer son instance

/// admonition | Déploiement offert !
    type: tip

Dans le cadre de la **campagne de financement participatif**, [TelesCoop](https://www.telescoop.fr/) peut vous offrir la mise en place de votre instance, contactez nous par email : [dev@aktivisda.earth](mailto:dev@aktivisda.earth).
///

Une fois la volonté de créer son instance validée et les premiers éléments graphiques rassemblés ([cliquer ici](/deploy/prerequisites) pour en savoir plus), il est temps de créer son instance.

/// admonition | Instructions pour développeur·euses
    type: warning

Les instructions sur cette page doivent être réalisées par des développeur·euses et nécessitent une attention particulière. Des développements sont prévus début 2026 pour faciliter les installations futures. D'ici là, ne pas hésiter à contacter l'équipe pour profiter d'un déploiment gratuit.
///

**Ce qu'on doit créer**

Aktivisda est un site internet statique, cela signifie qu'il n'y a en particulier pas de base de données. Toutes les données sont stockées dans une **arborescence de dossiers et de fichiers** : Aktivisda s'attend à trouver chaque élément à un endroit précis.
Il est ensuite recommandé de stocker ces données **dans un projet Gitlab** (nécessaire pour utiliser _Backtivisda_).

Pour rendre accessible Aktivisda, il y a besoin de configurer un **serveur web**. Et pour faire fonctionner le CMS [Backtivisda](/fr/admin/backtivisda), il y a besoin d'utiliser de créer un **serveur dédié au traitement d'images** (ou d'en utiliser un existant). Deux étapes restantes sont la mise en place d'un runner Gitlab pour l'intégration continue et une instance Matomo pour évaluer la fréquentation du site.


## 1. Arborescence de fichiers

Pour créer l'arborescence de fichiers, il est recommandé d'utiliser le générateur [yeoman](https://yeoman.io/) dans un dossier vide.

1. Créer le dossier qui contiendra les données de votre instance Aktivisda et s'y rendre (remplacer `<moninstance>` par le nom de votre instance) :
    ```shell
    mkdir <moninstance>
    cd <moninstance>
    ```
2. Récupérer le code source de Aktivisda avec `git` et l'enregistrer dans un dossier `aktivisda-core`. Cela vous permettra d’accéder au générateur et de pouvoir lancer ou compiler Aktivisda localement sur votre ordinateur :
    ```shell
    git clone https://framagit.org/aktivisda/aktivisda.git aktivisda-core
    ```
3. Installer `yeoman` puis le générateur :
    ```shell
    npm install -g yo
    cd aktivisda-core/generator-aktivisda
    npm install
    npm link
    ```
4. Se rendre à la racine de notre projet (le dossier `<moninstance>`) puis y lancer le générateur, suivre les différentes étapes :
    ```shell
    yo aktivisda
    ```
**🥳 Félicitations ! Vous disposez alors de la base d'une instance Aktivisda !**
5. Tester localement Aktivisda. Depuis le dossier `<moninstance>`, exécuter :
    ```shell
    npm install
    npm run build:lib
    npm run serve:aktivisda
    ```

**Note** : cette opération crée des liens symboliques sur votre ordinateur à travers un script shell. Il est nécessaire d'être dans un environnement Linux.

Comme indiqué dans le terminal, vous pouvez visualiser votre instance Aktvisda à l’url [localhost:8080](http://localhost:8080).
Cette instance est encore une coquille vide, sans élément graphique ☹️ (voir ticket [#190](https://framagit.org/aktivisda/aktivisda/-/issues/190) pour ajouter des logos et images de base).

Pour ajouter des éléments, voir la [documentation](/admin/). Pour pouvoir commencer à ajouter des éléments _via_ Backtivisda, il est nécessaire de réaliser les étapes 2 (Projet Gitlab) et 3 (serveur Backtivisda).

## 2. Projet Gitlab

/// admonition | Quitter Gitlab ?
    type: info
Des développements sont prévus pour offrir un hébergement hors Gitlab, vous pouvez contribuer à son développement via [OpenCollective](https://opencollective.com/aktivisda).
///

**Pourquoi Gitlab ?**

Sauvegarder les données dans un projet Gitlab a pour avantages de :

* faciliter la collaboration à plusieurs grâce à la force de `git` ;
* disposer de toutes les fonctionnalités d'un projet Gitlab, en particulier l'intégration continue et la gestion des tickets.

En plus, l'API de Gitlab est utilisée pour permettre à Backtivisda de fonctionner.



1. Créer un projet sur n'importe quelle instance Gitlab :
    * La visibilité du projet peut-être privée, interne ou publique ;
    * L'instance Gitlab doit être accessible sur Internet (ou tout du moins accessible par le navigateur web de l'utilisateur qui ouvrira Backtivisda) ;
    * Il est possible d'utiliser [Framagit](https://framagit.org), instance proposée par l'association [Framasoft](https://framasoft.org) et où est également hébergé le code source de Aktivisda ;
    * Ne pas initialiser avec un `readme`.

2. Suivre les instructions qui apparaissent à l'écran et en particulier _« Push an existing folder »_, une fois dans notre projet, exécuter :
```shell
git init --initial-branch=main
git remote add origin git@framagit.org:mygroup/myrepo.git
```

3. S'assurer qu'il n'y a pas de modifications locales qu'on ne souhaiterait pas commiter ; on pense en particulier à des dossiers de travail. Les fichiers de travail peuvent être sauvegardés dans le dossier `_private` qui est ignoré par `git` par défaut (_cf._ le fichier `.gitignore`).

4. S'il n’y a pas de modifications locales à ne pas commiter, tout commiter :
```shell
git add .
git commit -m "Initial commit"
git push --set-upstream origin main
```

5. Pour pouvoir utiliser Backtivisda, il faut mettre à jour les variables suivantes dans le fichier `.local/config.json` (l'identifiant du projet est disponible dans l'interface Gitlab) :
```json
"gitlab": {
    "projectId": "119375",
    "url": "https://framagit.org",
    "repo": "/aktivisda/<nom du repo>/",
    "branch": "main"
},
```

**🥳 Félicitations ! Plus qu'une étape avant de pouvoir utiliser Backtivisda !**

## 3. Serveur Backtivisda

/// admonition | Erreurs d'installation
    type: error
Des changements récents dans une dépendance rendent compliqué l'installation d'un nouveau serveur (voir ticket [#191](https://framagit.org/aktivisda/aktivisda/-/issues/191)). Dans l'attente des développements de la nouvelle version v2, ne pas hésiter à contacter l'équipe technique.
///

Pour fonctionner, Backtivisda a besoin de se connecter à un serveur de manipulation d'images : compression, redimensionnement, vectorisation, etc.

/// admonition | Accéder au serveur communautaire
    type: tip
Vous ne souhaitez pas mettre en place votre propre serveur ? Écrire à [dev@aktivisda.earth](mailto:dev@aktivisda.earth) pour utiliser le serveur communautaire.
///

### Authentification

Il existe un mécanisme d'authentification pour limiter l'accès de votre serveur de traitement d'image. Pour l'initialiser :

1. Se rendre dans le dossier `server` du projet Aktivisda

2. Générer un `secrets` avec python3
```terminal
python3 -c "import secrets; print(secrets.token_hex())"
```

3. Copier-coller la valeur dans le fichier `.env`

4. Ajouter dans le fichier `.env` une variable `USERS` qui contient la liste des usernames autorisés à utiliser votre instance, chacun séparé par une virgule :
```txt
USERS="admin,admin2"
```

5. Créer un jeton d'authentification (token) pour chaque utilisateur renseigné préalablement :
```terminal
python3 scripts/create_token.py admin
python3 scripts/create_token.py admin2
```

Copier-coller ces valeurs et les garder précieusement (il sera toujours possible de les regénérer).

### Exécution

Tout le code du serveur est présent dans le dossier `server` de Aktivisda. Il y a notamment un `dockerfile`.

1. Compiler l'image docker :
```terminal
sudo docker build -t aktivisdaserver:latest .
```

2. Lancer l'image docker :
```terminal
sudo docker run -p 4000:4000 -t aktivisdaserver:latest
```

**Note** : il faut paramétrer Nginx (et probablement apache2) pour accepter les chargements d'images _un peu lourdes_. Il est conseillé d'ajouter dans la configuration Nginx :
```txt
client_max_body_size 10M;
```

Si vous vous rendez sur [localhost:4000](https://localhost:4000) vous devriez voir écrit « hello world ». Si tel est le cas, 🥳 bravo !

### Paramétrer Backtivisda

Vous pouvez désormais mettre à jour la configuration dans le fichier `local/config.json` :
```json
    "backtivisda": {
        "server": "https://server.aktivisda.earth"
    },
```

Pour faciliter le travail sur la branche `main`, vous devez autoriser les `developer` à la modifier (voir les « branch rules »)

👉 Vous pouvez alors utiliser [Backtivisda](/admin/backtivisda) !


## 4. Serveur web

/// admonition | Perdu·e ?
    type: note
Perdu·e à cette étape ? Ne pas hésiter à écrire à [dev@aktivisda.earth](mailto:dev@aktivisda.earth) pour demander à ce que cette section soit étoffée. Et si **au contraire** vous savez exactement quoi faire, ne pas hésiter à compléter ces instructions.
///

Il y a besoin de paramétrer un serveur web, par exemple avec Nginx, et de créer un utilisateur avec accès ssh pour le chargement du contenu de Aktivisda.

### Nginx

Pour permettre à l'utilisateur·ice d'accéder à toutes les pages de Aktivisda, il est nécessaire d'être vigilant·e à paramétrer Nginx pour lui dire de renvoyer `index.html` s'il ne trouve pas de fichier HTML correspondant. Il faut pour cela ajouter `/index.html` à l'instruction `try_files`.

```txt
location / {

    # Path to source
    alias /var/www/<your project>/www/;

    # Default indexes and catch-all
    index index.html;
    try_files $uri $uri/ /index.html;

    # Prevent useless logs
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }
    location = /robots.txt {
        allow all;
        log_not_found off;
        access_log off;
    }

    # Deny access to hidden files and directories
    location ~ ^/(.+/|)\.(?!well-known\/) {
        deny all;
    }
}

```

### Apache

Si votre serveur tourne sous Apache, vous pouvez créer un fichier `.htaccess` à la racine de votre projet.
Ce fichier doit contenir _a minima_ les éléments suivants :

```
<IfModule mod_headers.c>
    Header set Cache-Control "no-cache"
</IfModule>

RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## 5. Intégration continue

Par défaut, un fichier `.gitlab-ci.yml` est présent dans le projet. Celui-là appelle le fichier `common.gitlab-ci.yml` présent dans Aktivisda.

De cette manière, il n'y a pas à se soucier de mettre à jour l'intégration continue.

Il y a deux étapes dans l'intégraton continue :

1. La compilation de Aktivisda et de Backtivisda en utilisant la dernière version de Aktivisda
2. L'envoi en FTP du site sur le serveur


### Runner Gitlab

Pour réaliser les étapes d'intégration continue, il est nécessaire de disposer d'un runner Gitlab plutôt puissant.
(**Todo: documentation à compléter**)

### Paramétrisation

/// admonition | Sécurité
    type: warning
Attention à bien définir les variables comme _protected_.
///

Pour faire fonctionner l'envoi en FTP, il faut créer quatre variables CI/CD dans le projet Gitlab :

* `FTP_HOST` avec l'url (ou l'adresse IP) vers le serveur. Par ex. `aktivisda.earth` ;
* `FTP_PORT` avec le numéro de port `ssh` (utilisé pour se connecter en `SFTP`). _A priori_ `22` sauf paramétrisation particulière (mais conseillée) ;
* `FTP_PASSWORD` et `FTP_USER` les identifiants pour se connecter.

### Fonctionner sans intégration continue

Il est toujours possible de déployer Aktivisda sans mettre en place une intégration continue. Pour cela, il est nécessaire de mettre sur pied un environnement de développement puis de lancer les commandes :

```shell
npm run build:aktivisda
npm run build:backtivisda
```

Puis de déplacer le contenu du dossier `dist` sur le serveur distant.

_En cas de difficultés, se référer au fichier `common.gitlab-ci.yml` pour savoir quelles sont les commandes à jour._

## 6. Matomo

Il est possible de connecter [Matomo](https://fr.matomo.org/) à Aktivisda. Une fois le site internet ajouté sur une instance Matomo à laquelle vous avez accès (bien décocher la case **désactiver le journal de logs des utilisateur·ices** pour être en conformité avec la CNIL), il suffit de la renseigner dans le fichier `local/config.json`

```json
"matomo": {
    "enabled": true, // ou false
    "host": "https://stats.aktivisda.earth/matomo",
    "siteId": 25 // id du site web sur Matomo
},
```