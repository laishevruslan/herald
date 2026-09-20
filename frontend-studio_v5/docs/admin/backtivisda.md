# Backtivisda

/// admonition | Nouvelles fonctionnalités en pause
    type: info
Backtivisda est actuellement fonctionnel néanmoins certaines fonctionnalités pourraient être ajoutées afin que l'outil soit plus simple à utiliser.

Ces développements sont en pause en attendant le développement de la v2 dont l'objectif principal est de faciliter la généralisation des instances (et donc leurs administrations).
///

Backtivisda est le [Système de Gestion de Contenu](https://fr.wikipedia.org/wiki/Syst%C3%A8me_de_gestion_de_contenu) (CMS) de Aktivisda. Il permet d'administrer quotidiennement votre instance de Aktivisda (modifier les images, créer de nouveaux modèles, etc.)

En pratique, Backtivisda est une version modifiée d'Aktivisda où :

1. Les données sont **toujours synchronisées** avec votre projet Gitlab : on utilise l’API de Gitlab pour récupérer ces données ;
2. Il y a des fonctionnalités supplémentaires pour manipuler les images.

Backtivisda interagit donc avec l’instance Gitlab qui héberge vos données **et** avec un serveur où sont effectuées les opérations distantes (compression d'image, vectorisation, etc.)

## Faire sans backtivisda ?

L'intégralité des données de votre instance sont regroupées dans votre projet Gitlab. Cela signifie que toutes les manipulations d'administration peuvent y être effectuées.

**Néanmoins, il faut avoir en tête que manipuler des données n’est pas simple.**

En effet, une image par exemple est référencée à quatre endroits :

-   dans le fichier `symbols.json` où sont indiquées les méta-données de l’image : ses dimensions, ses catégories, son titre, etc. ;
-   dans le dossier `symbols` : directement l’image ;
-   dans le dossier `symbols/previews` : une miniature en formats `.png` ou `.jpg` ;
-   dans le dossier `symbols/thumbnails` : une miniature (très réduite) en format `.webp`.

Il faut :

-   générer les images au bon format et aux bonnes résolutions ;
-   s’assurer que les fichiers soient aux bons endroits et avec le bon nom.

Et comme, en plus, l'utilisation de Gitlab est austère, il a été développé une interface d'administration en lignée, nommée **Backtivisda**. Cette interface permet de réaliser les manipulations les plus courantes.<br/>
👉 [En savoir plus](/admin/backtivisda)

/// admonition | Regarder cette documentation
    type: warning
Se référer à cette documentation pour toute manipulation non encore disponible dans Backtivisda.
///

## S'authentifier

Pour fonctionner vous avez besoin de deux jetons (token) pour vous authentifier :

-   auprès de Gitlab : pour cela créer un _token d’accès_ au projet ;
-   auprès du serveur de traitement d’images : soit vous disposez de votre propre serveur, soit vous pouvez demander à [dev@aktivisda.earth](mailto:dev@aktivisda.earth) un token ;

Pour créer le token Gitlab :

![](/assets/images/backtivisda-token.png)
![](/assets/images/backtivisda-token-creation.png)

Il faut notamment veiller à :

* Choisir une date d'expiration dans suffisamment de temps pour que vous n'ayez pas à regénérer un token trop souvent ;
* choisir un nom adéquat. C'est avec ce nom que seront signées toutes les modifications que vous réaliserez sur Aktivisda (elles ne seront néanmoins pas visibles publiquement) ;
* choisir comme rôle "developer"

## Principe de fonctionnement

/// admonition | Attention à ne pas quitter la page
    type: warning
**Bon à savoir** pour le moment, les modifications ne sont pas sauvegardées sur votre ordinateur. Cela signifie en particulier que toutes vos modifications disparaissent à chaque fois que vous rafraîchissez votre navigateur (le fameux _F5_).
///

Voici ce qu'il se passe lorsqu’on souhaite faire une modification avec Backtivisda :

1. Se rendre sur `https://<votre instance Aktivisda>/backtivisda` ;
2. Le site est alors téléchargé par votre navigateur depuis un serveur où est disposé une version compilée de Backtivisda ;
3. Vous renseignez vos deux tokens (uniquement la première fois, ensuite ces tokens sont enregistrés dans votre navigateur) ;
4. Backtivisda va alors télécharger les données depuis Gitlab. Les données sont téléchargées au fur et à mesure, uniquement lorsque nécessaire (par exemple, les images de fond sont téléchargées lorsqu'on se rend sur cette page) ;
5. Vous faites les manipulations que vous souhaitez : ajout ou modification d’images, de modèles, etc. ;
6. Une fois satisfait·e, vous vous rendez sur la page _Synchroniser_, vérifiez vos modifications, écrivez un message décrivant vos modifications et cliquez sur le bouton _Synchroniser_ ;
7. Un **commit** est créé et transmis à Gitlab. Il s’agit d’un « paquet » de toutes vos modifications. Un point de sauvegarde est aussitôt créé, ce qui permet éventuellement d’annuler une modification ;
8. Ce commit crée une **pipeline** de compilation sur Gitlab (regarder la section _Pipelines_) qui permet l'intégration continue. ;
9. Cette pipeline attend qu’un **worker** soit disponible. Aujourd’hui, pour des contraintes techniques, ce worker n'est pas tout le temps disponible. Au bout de 4h, si aucun worker n'est disponible, l'intégration continue échoue ;
10. Une fois le worker disponible, Aktivisda est compilé en prenant en compte les nouvelles données (quelques minutes) ;
11. Le nouveau site est transféré depuis le worker vers le serveur en charge du service (via FTP ou SSH) ;
12. Ça y est, Aktivisda est disponible et intègre les dernières modifications ! Vous pouvez vous en rendre compte en regardant la date _Last Update_ dans la barre de navigation de Aktivisda.

## Fonctionnalités

Backtivisda permet de faire beaucoup de choses, mais pas tout. Cette page dresse un état des lieux de ce qu’il est possible / pas encore possible de faire.

### Modèles

**Possible** :

-   Ajouter un nouveau modèle à partir de l'éditeur _de modèles_. Le modèle peut-être lui-même chargé depuis un fichier `.json` ;
-   Modifier un modèle déjà présent en base de données (ticket [#173](https://framagit.org/aktivisda/aktivisda/-/issues/173)).

**À venir / non-supporté / envisagé** :

-   Supprimer un modèle ;
-   Modifier partiellement un modèle : par exemple, ne pas regénérer les différentes images si on a juste changé le label.

### Images/symboles

**Possible** :

-   Ajouter une image `.svg` telle quelle ;
-   Ajouter une image `.png` ou `.jpg` ;
-   Ajouter une image `.png` et la vectoriser.

**À venir / non supporté / envisagé** :

-   Vérifier que l'image `.svg` est correcte, voire la compresser ;
-   Remplacer une image déjà existante, notamment pour la vectoriser ;
-   Modifier les tags ou labels d'une image déjà existante.


### Image de fonds

**Possible** :

-   Ajouter une image `.svg` telle quelle ;
-   Ajouter une image `.png` ou `.jpg` ;
-   Ajouter une image `.png` et la vectoriser.

**À venir / non supporté / envisagé** :

-   Vérifier que l'image `.svg` est correcte, voire la compresser ;
-   Remplacer une image déjà existante, notamment pour la vectoriser ;
-   Modifier les tags ou labels d'une image déjà existante ;
-   Ajouter des images _locales_ (_ie._ intégrées aux modèles) dans la galerie (voir ticket [#176](https://framagit.org/aktivisda/aktivisda/-/issues/176)).


### Tags

**Possible** :

-   Ajouter des tags _via_ les formulaires d'ajout de symboles et d'images de fonds.

**À venir** :

-   Page dédiée pour l’ajout de tags.

### Sauvegarde

**Possible** :

-   Voir la liste de tous les éléments modifiés avec un petit badge (modified, new, deleted) pour chacun d’entre eux ;
-   Annuler une modification ;
-   Ajouter un message personnalisé de commit.

**À venir** :

-   Pré-remplir le message de commit en fonction des modifications effectuées ;
-   Conserver dans le navigateur les modifications effectuées ;
-   Permettre d’exporter toutes les modifications dans un fichier de texte ;
-   Mettre en cache les requêtes Gitlab effectuées (ticket [#175](https://framagit.org/aktivisda/aktivisda/-/issues/175)).
