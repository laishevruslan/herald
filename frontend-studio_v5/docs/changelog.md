# Journal de changements

## 1.7.2 (2025-10-16) - Adaptation du `aktivisda-generator` suite à la mise à jour 1.7.0

Depuis la version 1.7.0 le fichier `localconfig.json` a été renommé en `config.json` et son contenu a été mis à jour avec de nouveaux champs. Cette version corrige le générateur pour créer des instances aktivisda compatibles.

## 1.7.1 (2024-11-19) - Correction d'un bug sur la synchronisation Tolgee

La synchronisation échouait lorsqu'on essayait d'ajoute dans la configuration une langue qui n'était pas déjà présente dans la configuration. C'est désormais corrigé.


## 1.7.0 (2024-10-24) - Une première brique vers une plateforme Aktivisda pour toutes les structures

Cette mise à jour est une première brique indispensable en vue de créer une *plateforme Aktivisda* qui permettra d'avoir plusieurs structures utilisatrices d'Aktivisda sur un unique serveur. Cette plateforme sortira pour la v2.0 de Aktivisda et il reste [beaucoup de travail](https://framagit.org/aktivisda/aktivisda/-/milestones/4#tab-issues) avant d'y arriver.

Actuellement, Aktivisda est compilé pour chaque instance à chaque modification des données de cette dernière ou à chaque modification de Aktivisda. L'objectif à terme est de compiler Aktivisda **uniquement** aux corrections de bugs ou aux mises à jour de Aktivisda. De cette manière, on pourra multiplier librement le nombre d'instances de Aktivisda.

D'un point de vue très concret, cette mise à jour n'apporte pas de réel changement pour les utilisateur·ices actuels d'Aktivisda : il est toujours nécessaire de recompiler Aktivisda à chaque changement. Cette étape sera supprimée dans un deuxième temps.

Néanmoins, de très nombreuses modifications ont été réalisées dans le code. On n'a plus besoin de recompilation lorsqu'on modifie des données pour les symboles, images de fond, couleurs et tags.

Concernant les polices de caractères, les modèles ou la configuration, on a encore besoin de la compilation pour des toutes petites étapes, qui pourront être découplées de la grosse compilation :

* le fichier de polices de caractères nécessite un pré-traitement informatique ;
* la liste des modèles et le fichier de configuration sont utilisés pour construire la *sitemap* du site, c'est-à-dire un fichier utilisé par les moteurs de recherche pour améliorer le référencement. On leur liste toutes les pages du site internet.

Cette mise à jour fait évoluer le fichier de configuration `localconfig.json` s'appelle désormais `config.json`, il est désormais formaté comme les autres fichiers, avec l'ajout de la version courante. Et il est augmenté d'une section *gitlab* qui contient les informations de connexion au projet Gitlab.

Il reste plusieurs encore plusieurs chantiers pour réellement rendre Aktivisda dynamique :

* voir comment contourner la compilation complète du projet pour la personnalisation du fichier de style `buefy.scss` qui a essentiellement pour rôle de personnaliser la couleur principale de l'instance ;
* modifier l'intégration continue pour éviter de recompiler Aktivisda inutilement ;
* mettre en place une alternative à l'architecture *gitlab* actuelle pour utiliser au maximum l'intérêt d'avoir Aktivisda dynamique.

Enfin, cette mise à jour ajoute des *playbooks* Ansible pour faciliter le déploiement des projet.

En complément, petites corrections de bug sur la vectorisation d'images dans backtivisda (voir issue [#283](https://framagit.org/aktivisda/aktivisda/-/issues/283)).

## 1.6.0 (2024-10-16) - Nouvel élément textuel : choix dans une liste déroulante

Il est désormais possible de contraindre des options de texte parmi une liste pré-définie. Cela peut par exemple permettre d'avoir un champ texte "mois de l'année". Ces options sont internationalisables (chaque choix peut-être traduit), les traductions peuvent être synchronisées avec Tolgee.

Par simplicité d'interface, la modification des choix n'est faisable que dans Backtivisda. Pour ajouter un tel champ de texte, il faut (1) créer un élément textuel classique puis (2) le basculer en mode "choix" et alors renseigner les choix un par un.


## 1.5.1 (2024-10-14) - Correction d'un bug sur Backtivisda

Il n'était plus possible d'ajouter d'ajouter des images (et photos) sur les modèles dans l'interface de Backtisda (cf. ticket [#281](https://framagit.org/aktivisda/aktivisda/-/issues/281)).

Le problème me semble dater de la version 1.2.0. Des méthodes nouvellement ajoutées à `aktivisda/datastore.js` n'ont pas été ajoutées à `backtivisda/datastore.js`.

## 1.5.0 (2024-10-12) - Synchronisation des traductions avec Tolgee

Dans la suite de la mise à jour 1.0.42, il est désormais possible de synchroniser des traductions locales avec Tolgee.

Pour en savoir plus sur les traductions et comment mettre en place une synchronisation avec Tolgee, se référer à la nouvelle page de la documentation [Traductions](/fr/admin/i18n).

Les traductions de l'interface de Aktivisda sont désormais bien synchronisées :

* toutes les semaines, une pipeline planifiée de Gitlab regarde s'il y a des nouvelles traductions sur Tolgee et si c'est le cas, crée une merge request avec les changements demandés ;
* à chaque nouvelle version de Aktivisda, les chaînes de traduction sont automatiquement envoyées sur Tolgee.

Cette mise à jour permet de cloturer les tickets [#210](https://framagit.org/aktivisda/aktivisda/-/issues/210) et [#267](https://framagit.org/aktivisda/aktivisda/-/issues/267).

## 1.4.0 (2024-08-09) - Ajout de la possiblité d'annuler les dernières modifications

### feat: Annulation des modifications
Il s'agit d'une fonctionnalité très attendue, très commune dans ce genre de logiciels : la possibilité d'annuler ses dernières modifications.
Toutes les modifications peuvent être annulées, à l'exception de la suppression ou de l'ajout de certains éléments. Cette fonctionnalité était demandée depuis le tout tout début, comme en témoigne le numéro du ticket associé : le ticket [#9](https://framagit.org/aktivisda/aktivisda/-/issues/9).


### feat: Arrivée des premiers raccourcis claviers

Cette fonctionnalité s'accompagne du support des raccourcis claviers sur quelques fonctionnalités clés, actuellement l'annulation, le rétablissement, le passage au premier plan ou à l’arrière plan ainsi que la suppression d'éléments (voir ticket [#271](https://framagit.org/aktivisda/aktivisda/-/issues/271)).

D'autres raccourcis claviers pourraient arriver.

#### tests: Augmentation de la couverture du code

Le _verrouillage des modèles_ est désormais en grande partie testé, en particulier tout ce qui concerne les déplacements des composants directement à la souris. Dans ce cas, l'élément est automatiquement déplacé dans sa zone autorisée : ceci est plutôt bien testé, notamment la combinaison avec la fonctionnalité d'annulation (voir ticket [#274](https://framagit.org/aktivisda/aktivisda/-/issues/274)).

Ces tests ont permis de détecter quelques bugs dans certains cas particuliers.

#### bugs: Quelques corrections de bugs

* les zones de textes successivement déplacées à la main et en utilisant les curseurs (voir ticket [#270](https://framagit.org/aktivisda/aktivisda/-/issues/270)).
* bug au chargement de modèles vides (page `/edit`) ;


## 1.3.2 (2024-08-05) - Correction d'un bug d'export pdf

Lors de la création de nouvelles zones de textes depuis la version 1.2.0, la police utilisée était Arial. Cette police ne pouvait alors pas être changée. Cela dérangeait les utilisateurices au moment de de l’export pdf qui était impossible (voir ticket [#269](https://framagit.org/aktivisda/aktivisda/-/issues/269)).

Ce problème a été traité sous trois aspects différents :

* Améliorer le sélecteur de polices de caractères pour permettre à l'utilisateurice de choisir une police, même si la police actuellement choisie est non valide ;
* Faire en sorte qu'on choisisse une police de caractère existante à la création d'une nouvelle zone de textes ;
* Afficher un message d'erreurs plus explicite et stopper l'export pdf en cas d'erreur lors de l'export.

Par ailleurs, mise à jour de la page "Quickstart" suite à la version 1.2.0. Il manquait l'étape de compilation de la bibliothèque (voir ticket [#268](https://framagit.org/aktivisda/aktivisda/-/issues/268)).


## 1.3.1 (2024-07-22) - Correction d'un bug dans les traductions et mises à jour des traductions

Suite à la version 1.3.0, à partir du moment où une chaîne de traduction est surchargée dans la langue par défaut (c'est-à-dire l'anglais) alors la traduction proposée par Aktivisda est tout le temps ignorée.

Par exemple, si on définit `WELCOME.CONTACT` uniquement en anglais, alors l'utilisateur·ice espagnol·e verra le texte en anglais (et bien sûr, si on définit le texte en espagnol, alors c'est ce qu'iel verra).

Également, correction d'un bug (voir ticket [#266](https://framagit.org/aktivisda/aktivisda/-/issues/266)) sur les traductions du nom de l'instance en cas de changement de langue. Si on chargeat la page en français, alors le nom de l'instance en EN n’était pas chargé au changement de langue.

⭐ Ajout de nouvelles traductions en anglais, notamment toute la partie Backtivisda, traduit par la [Fresque du Climat](fresqueduclimat.org).

## 1.3.0 (2024-07-10) - Possiblité de changer les textes de Aktivisda

Il est désormais possible de personnaliser les différents textes qui apparaissent dans Aktivisda, en particulier les titres et les boutons.

Très concrètement, cela se réalise en définissant dans le fichier de configuration `config.json` des traductions qui seront utiliées à la place des traductions officielles :

1. Chercher à quelle clé de traduction correspond le texte qu'on souhaite modifier ;
2. Ajouter dans le fichier `localConfig` une entrée `i18n`, une sous-entrée correspondant à la langue choisie puis une sous-entrée avec la clé de traduction. La clé de traduction est à écrire dans sa version _chemin_, concaténée avec des `.` (par exemple : `WELCOME.CONTACT`).

!> ⚠️ **Prudence** : certaines clés de traduction pourraient changer d'une version à l'autre de Aktivisda. Par ailleurs, il est important de bien définir les textes dans toutes les langues car, s’il existe une traduction _officielle_ dans Aktivisda c’est celle-ci qui est utilisée.

_Exemple de fichier `config.json`:_
```json
{
    ...,
    "i18n": {
        "i18n": {
            "fr": {
                "SVGS.CONTRIBUTE": "le texte à afficher..."
            }
        }
    }
}
```

Un _call to action_ pour la traduction des modèles a également été ajouté sur Aktivisda, dans la liste des langues disponibles pour chaque modèle.


## 1.2.5 (2024-07-09) - Bug dans la modification de modèles internationalisées au sein de Backtivisda.

Depuis la version 1.1.0, il est possible de spécifier certaines valeurs des paramètres uniquement pour certaines langues, de manière à ajuster la mise en page en fonction de la langue par exemple. Or, il se trouve que si le modèle était sauvegardé alors qu'on était en train de modifier une langue spécifiquement alors la position de cette langue était considérée comme _position par défaut_ (voir ticket [#264](https://framagit.org/aktivisda/aktivisda/-/issues/264)). Plus précisément, si on exportait une image à partir du modèle en anglais, alors la mise en page "anglais" était considérée comme la mise en page par défaut.

Le problème se situait dans le code chargé d’ouvrir de nouveaux modèles. Ce dernier ne réinitialisait pas complètement sa représentation interne entre deux chargements, et conduisait à avoir des données incohérentes. Par ailleurs, ce code avait un _effet de bord_ en modifiant les données en entrées.

Un test a été ajouté.

## 1.2.4 (2024-07-08) - Bug dans le chargement de photos dans backtivisda

Suite à la mise à jour 1.2.0, l'ouverture de modèles avec des photos ne fonctionnait plus sur backtivisda, mais cela fonctionnait toujours sur Aktivisda.

## 1.2.3 (2024-07-01) - Correction d'un bug sur l'édition de textes directement dans l’éditeur

Sur Aktivisda, on peut modifier les champs de texte directement en double-cliquant dessus. Cette fonctionnalité a été légèrement revue dans la version 1.2.0 et était devenue inopérante : on ne pouvait plus cliquer ce champ de modification de texte au clic (voir ticket [#263](https://framagit.org/aktivisda/aktivisda/-/issues/263)). Le problème a été remonté par Alternatiba.

## 1.2.2 (2024-06-25) - Quelques corrections de bugs

Dans la continuité de la version 1.2.1, cette version apporte quelques corrections de bugs supplémentaires :

* fix(aktivisda) : Les boutons « mettre au premier plan » / « mettre en arrière plan » ne fonctionnaient pas sur le navigateur Chrome (le développement de Aktivisda est majoritairement réalisé sur le navigateur Firefox). Après investigation, le bug se situe directement dans la bibliothèque cœur « Aktivisda-library ». C'est désormais corrigé et un test a été ajouté afin de s'assurer de manière automatique que ces boutons fonctionnent toujours (voir ticket [#228](https://framagit.org/aktivisda/aktivisda/-/issues/228)) ;
* fix(lib): la taille de l'arrière plan du texte n'était pas mis à jour lorsque la taille du texte changait (voir ticket [#259](https://framagit.org/aktivisda/aktivisda/-/issues/259)).
* fix(lib): Le positionnement du texte était faux dans l'export de textes alignés à droite **et** avec une couleur d'arrière plan
* fix(lib): les exports pdfs géraient mal les zIndex. Le test associé est celui de la traduction des modèles ;
* fix(lib): Un export pdf de la Fresque du Climat était non fonctionnel à cause de l'usage d'une esperluète (`&`). Ce caractère spécial (ainsi que le `>`) est désormais géré (et il y a un test associé) (voir ticket [#257](https://framagit.org/aktivisda/aktivisda/-/issues/257)).


Par ailleurs, le badge _nouveau_ a été enlevé de la fonctionnalité d'import de fichiers : ce n'est plus du tout une nouvelle fonctionnalité.


## 1.2.1 (2024-06-24) - Quelques corrections de bugs

Quelques corrections de bugs dans une logique de dépiler les trop nombreux tickets présents sur le projet Framagit et accumulés ces derniers mois.

* fix(lib): Correction d'un bug de _mise à jour du visuelle_ lorsqu'on change le padding de l'arrière plan d'un texte. Le visuel mis à jour était faux. Un test a été ajouté pour détecter ce cas (voir ticket [#258](https://framagit.org/aktivisda/aktivisda/-/issues/258)). Un autre bug a été détecté (et corrigé!) sur les mises à jour de la couleur de fond d'un visuel.
* fix(aktivisda): Sélecteur de couleurs bugué pour les images de fond. Si on voulait changer la couleur d'une image de fond d'un visuel, on ne pouvait pas cliquer sur faire glisser les sélecteurs RGB (voir ticket [#250](https://framagit.org/aktivisda/aktivisda/-/issues/250))
* fix(backtivisda): Dans backtivisda, on peut ajouter des images png dans la liste des symboles, mais ces derniers n'étaient pas compressés et le champ `type === 'internalphoto'` n’était pas ajouté à l'image (ce qui plantait côté aktivisda). C'est désormais corrigé. Par ailleurs, j’ai remarqué que la compression des images (même jpeg) n'était en réalité pas activée. Corrigé ! (voir ticket [#248](https://framagit.org/aktivisda/aktivisda/-/issues/248))



## 1.2.0 (2024-06-20) - Création d'une bibliothèque Aktivisda pour plus de modularité et de résilience

Création d'une bibliothèque logicielle _Aktivisda-library_ (_cf._ ticket [#135](https://framagit.org/aktivisda/aktivisda/-/issues/135)) pour faciliter la création de logiciels similaires à Aktivisda. Aktivisda-library est notamment intégrée au site [Refigure](https://refigure.aktivisda.earth).

Cette bibliothèque JavaScript permet de créer des visuels dynamiquements avec :

* Mise à jour incrémentale du visuel. Par exemple, l'image n'est pas entièrement recalculée si on change seulement la couleur du texte ;
* Exports des images en différents formats : png, jpgeg et pdf ;
* Gestion des images vectorielles : support du format `.svgz`, possibilité de changer les couleurs _à la volée_.
* Générateur de codes QR
* Compression des images dans le navigateur
* Création d'un format interne pour stocker et charger des images dans aktivisda

Cette mise à jour s'accompagne de l'ajout de très nombreux tests pour vérifier le bon comportement des fonctionnalités de _Aktivisda-library_, ainsi que du passage à du `TypeScript` qui aide à garantir que le code est correct. C'était une étape nécessaire pour grandement faciliter la maintenance et l'évolution future du projet.
Une grande partie des tests consistent à générer des visuels à partir d'une description, de les exporter en png, jpeg, json et pdf et de s'assurer que ces différents formats sont cohérents. Les tests ont été écrits de manière à couvrir un maximum des cas d'utilisation possible de Aktivisda.

Cela a permis de corriger de nombreux bugs sur le cœur de Aktivisda, à savoir le rendu visuel, en particulier tout ce qui est relatif au format pdf :

* Les exports pdf supportent désormais les images pivotées (ticket [#136](https://framagit.org/aktivisda/aktivisda/-/issues/136))
* Les exports pdf supportent désormais les textes _avec ombres_ (voir ticket [#251](https://framagit.org/aktivisda/aktivisda/-/issues/251))
* Les photos avaient une mauvaise résolution dans les exports pdfs, elles sont désormais exportées avec leur résolution initiale (voir ticket [#234](https://framagit.org/aktivisda/aktivisda/-/issues/234))
* Les "rectangles déformés" étaient mal exportés en pdf, c'est corrigé ! (voir ticket [#215](https://framagit.org/aktivisda/aktivisda/-/issues/215))
* _la liste est vraiment non exhaustive, de nombreux petits bugs ont été corrigés au fil des mois à travailler sur cette nouvelle version._

Cette mise à jour est complétée par deux nouvelles fonctionnalités (fonctionnalitées non encore disponibles sur Aktivisda, seulement dans la bibliothèque internes)

* ✨ Support des émojis dans les visuels : on peut désormais ajouter des émojis sur les visuels. Attention l'export en PDF n'est pas encore possible ;
* ✨ Possibilité de flouter des zones des photos : le seul floutage proposé est pour le moment très grossier.
* ✨ Possibilité de créer les visuels uniquement sur un serveur sans passer par un navigateur. Cela pourrait être utile pour générer des images automatiquement. En l'état, cette fonctionnalité est utile pour tester Aktivisda.

## 1.1.0 (2024-05-30) - Bords arrondis, ombrage sur les textes, traduction et verrouillage des modèles

🙌 Cette mise à jour a été financée par la [Fresque du Climat](https://fresqueduclimat.org), merci à elles et eux pour soutenir ce projet de Commun Numérique. Aktivisda du fait de sa relative simplicité a pu s'adapter pour répondre aux besoins précis de la Fresque et coller au plus près à leur charte graphique et à leur volonté d'éviter que les utilisateur·ices détournent les visuels.

💻 Le développement de Aktivisda est désormais assuré par la société coopérative [TelesCoop](https://telescoop.fr) qu'a rejoint [Marc-Antoine](https://marc-antoinea.fr/), le développeur historique Aktivisda.

Cette version comporte quatre nouvelles fonctionnalités clés :

* effet d'ombre sur les lettres : on peut désormais ajouter un effet d'ombre derrière les lettres. On peut personnaliser le décalage ainsi que la couleur de cette ombre ;
* arrière plan _arrondi_ derrière les textes : l’arrière plan de chaque zone de texte peut désormais être un rectangle avec _des angles arrondis_ ;
* support du multi-langue pour les modèles : on peut décliner un même modèle en plusieurs langues ([en savoir plus](/fr/admin/templates))
* support du verrouillage partiel de modèles : on peut rendre non modifiable tout ou partie d'un visuel, pour s'assurer que certains éléments restent bien présents ou que leur taille, positionnement, couleur (ou autre) restent figés ([en savoir plus](/fr/admin/templates)) ;
* possibilité d'ajouter un fichier `.htpasswd` à la racine du projet pour ajouter une authentification par mot de passe au projet (basée sur apache2) ;


## 1.0.43 (2024-05-15) - Mise à jour des dépendances de Aktivisda

Mise à jour de nombreuses dépendances de Aktivisda pour faciliter sa maintenance future et corriger dans l'immédiat un bug dans l'intégration continue (voir ticket [#238](https://framagit.org/aktivisda/aktivisda/-/issues/238)).

Également désactivation de la pré-génération de toutes les pages du site web. Cette étape de pré-génération était trop coûteuse en puissance de calcul. Une méthode alternative existe et pourra être réalisée ultérieurement, une fois que la base du code aura été améliorée (voir ticket [#239](https://framagit.org/aktivisda/aktivisda/-/issues/239)).


## 1.0.42 (2024-04-06)

Mise en place d'une inter-connexion avec l’instance [Tolgee](https://tolgee.io/) de la [Fresque du Climat](https://fresqueduclimat.org). Les différents fichiers de traduction de Aktivisda sont automatiquement synchronisés avec Tolgee ce qui devrait permettre d’augmenter grandement la qualité (et le nombre) de langues dans lesquels Aktivisda est traduit.

À terme, il devrait également être possible de connecter Tolgee aux traductions locales propres à chaque instance.

## 1.0.41 (2024-04-02)

**Aktivisda** : Le nom et la description de l'instance peuvent désormais être différents suivant la langue sélectionnée par l'utilisateur·ice (voir ticket [#202](https://framagit.org/aktivisda/aktivisda/-/issues/202)).

Certaines descriptions Open Graph n'étaient pas encore traduites (voir ticket [#119](https://framagit.org/aktivisda/aktivisda/-/issues/119))

## 1.0.40 (2024-03-24)

**Aktivisda** : On peut ajouter un fichier de configuration Apache2 `.htaccess` à la racine de son projet. Ce fichier est alors ajouté au projet Aktivisda
```
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

## 1.0.39 (2024-03-24)

**Backtivisda** :
* feat: Toutes les images sont désormais chargées sur backtivisda, même lorsque le projet est privé. Pour cela, on ajoute le token privé comme paramètre de l'url (voir ticket [#213](https://framagit.org/aktivisda/aktivisda/-/issues/213)).
* fix: le chargement d'image vectorielle ne fonctionnait pas.
* test: ajout d'un test pour l'api afin d'augmenter la couverture du code ;

**Aktivisda** :
* fix: Le bouton « télécharger » n'apparaissait pas sur la galerie pour les images au format png ;

## 1.0.38 (2024-02-19)

**Intégration continue** : Ajout de la possibilité de spécifier la version de Aktivisda à utiliser pour son projet. Cela est particulièrement utile lors des phases de développement.

Pour spécifier la version, ajouter une clé `aktivisda.ref` dans le fichier `config.json`. La référence peut être un commit, une branche ou un tag.

```json
{
    ...,
    "aktivisda": {
        "ref": "main"
    }
}
```


## 1.0.37 (2024-02-19)

**Backtivisda / serveur** : Correction d’un bug sur le serveur de backtivisda, bug causé par l’ajout de l'infrastructure de tests en version 1.0.35 (voir ticket [#204](https://framagit.org/aktivisda/aktivisda/-/issues/204)). Ajout également d'un test de calcul de miniature pour à partir d'une image jpeg.

## 1.0.36 (2024-02-07)

**Backtivisda** : ajout de toutes les chaînes de traduction dans backtivisda grâce à [i18n-ally](https://github.com/lokalise/i18n-ally). Il est donc désormais possible de traduire l'interface d'administration en anglais (ou dans n'importe quel autre langue !).

## 1.0.35 (2024-02-05)

**Serveur** : Détecte et fixe un bug dans la dépendance interne [images-manipulator](https://framagit.org/Marc-AntoineA/files-manipulator/-/tree/main/images-manipulator). Ce bug est désormais détectable directement dans Aktivisda grâce à une nouvelle infrastructure de tests de l'API (voir ticket [#191](https://framagit.org/aktivisda/aktivisda/-/issues/191)).

## 1.0.34 (2034-12-19)

**Documentation** : Refonte de la documentation de [aktivisda.earth](https://aktivisda.earth) pour proposer un [guide pas à pas]([/fr/gettingstarted/quickstart) pour installer son mémo en autonomie. Cette documentation demeure bien incomplète et une installation en autonomie complète est encore hors de portée.

**Générateur** : Quelques fichiers générés par le package `yeoman` étaient faux.

## 1.0.33 (2023-10-07)

**backtivisda**: Les modèles déjà existants peuvent désormais être mis à jour (voir ticket [#173](https://framagit.org/aktivisda/aktivisda/-/issues/173))

**Documentation** : ajout d'une page [Spécifications](/fr/admin/specifications) avec les fonctionnalités présentes et futures de backtivisda

## 1.0.32 (2023-10-12)

Fonctionnalités:

- Possibilité de charger des png localement (voir ticket [#144](https://framagit.org/aktivisda/aktivisda/-/issues/144))
- Toutes les images png (chargées et exportées) dans Aktivisda sont désormais compressées localement grâce à Oxipng (voir ticket [#52](https://framagit.org/aktivisda/aktivisda/-/issues/52))

## 1.0.31 (2023-09-07)

Correction de bugs dans Aktivisda

-   Le bouton "Télécharger" était cassé ([#171](https://framagit.org/aktivisda/aktivisda/-/issues/171))
-  L'application ne se chargait plus si la langue anglaise n'était pas disponible dans l'application (le problème ne se posait que pour les instances disponibles uniquement en français) (voir ticket[#146](https://framagit.org/aktivisda/aktivisda/-/issues/146))
-   Correction d'un `console.error` liée à l'absence d'image OpenGraph au chargement de l'éditeur sans modèle prédéfinit (url `/edit`). Corrigé en utilisant l'image OpenGraph par défaut.

Documentation:

-   Création d'une nouvelle page de [tests](/dev/tests) avec les informations essentielles pour lancer les tests.

/// admonition | Histoire des modification perdu
Le suivi des changements a été créé en septembre 2023 mais le projet a commencé dès 2020 !
///