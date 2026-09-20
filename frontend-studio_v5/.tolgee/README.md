# Tolgee

>
> Ce mini-projet permet de gérer la synchronisation à double sens avec un gestionnaire de traductions externe (en l'occurence [Tolgee](https://tolgee.io/)), mais cela pourrait également être [Weblate](https://weblate.org/fr/) ou autre.

La synchronisation correspond à deux phases distinctes :
* la transmission **du code source vers Tolgee** des nouvelles traductions présentes et ceci à chaque fois qu'il y a une modifications des données dans le projet Git. Cela fonctionne _via_ une étape de CI Gitlab déclenchée à chaque commit (étape `translation-pull`) (cette étape n'est lancée que si certains fichiers ont été modifiés)
* la récupération des **données de Tolgee** et leur publication automatique (ou semi-automatique) sur Aktivisda. Cela fonctionne _via_ une étape de CI Gitlab lancée régulièrement par un CRON job

Les synchronisations concernent deux types de données différentes :
* les données du logiciel Aktivisda en lui-même. Dans ce cas, les traductions de Tolgee sont soumises à publication dans Aktivisda par un mécanisme de Merge-Requests ;
* les données propres à chaque instance Aktivisda. Dans ce cas, les traductions sont publiées automatiquement sur le projet ;

Gestion des conflits : la question se pose dès lors qu'une même chaîne de traduction est différente sur Tolgee et sur le projet Aktivisda : laquelle doit-on considérer comme juste ? Qui est source de vérité ? Comment le déterminer automatiquement ?

## Développement

Le projet repose sur le petit utilitaire [TolGitBot](https://framagit.org/Marc-AntoineA/tolgitbot/).

La synchronisation est séparée en deux étapes _d’envoi des chaînes de traduction à Tolgee_ (le `push`) et _la récupération des chaînes de traduction depuis Tolgee_ (le `pull`).
* L'étape de `pull` est exécutée régulièrement à travers une _Pipeline planifiée_. Lorsqu'il y a des nouvelles traductions, ces dernières sont commitées sur une nouvelle branche crée automatiquement et sont associés à une merge request dédiée. Nous ne souhaitons pas que des modifications soient apportées sans validation humaine sur la branche principale. Des traductions pourraient par exemple être manquantes du côté de Tolgee.
* L'étape de `push` est exécutée à chaque commit sur la branche **main** qui touche à un fichier de traduction.


## Mise en place


- [ ] Créer la pipeline planifiée sur la branche `translations`
- [ ] Créer un compte _Bot_ pour commiter sur le projet :
   * Créer une clé ssh dédiée avec `ssh-keygen`
   * Ajouter la clé publique dans la section `Deploy Key` du projet Gitlab (voir `Settings` puis `Repository` puis `Deploy Keys`) (bien penser à lui octroyer des droits d’écriture)
   *

## Utilisaton en local

```
npm install
```

Lancer le script
**Ce script est en cours de développement, penser à commenter/décommenter les fonctions souhaitées**

-   Envoyer toutes les chaînes de traduction

```
npm run push
```

-   Récupérer toutes les traductions

```
npm run pull
```
