# Backend

/// admonition | En route vers le futur
    type: warning
Cette documentation a commencé à être écrite en vue de la v2.0 de Aktivisda. Il n'y a pour le moment pas de backend donc cette documentation est fausse.
///

Pour fonctionner, l'éditeur Aktivisda a besoin d'accéder aux différentes données, telles que la liste des images, les modèles ou encore la configuration générale de l'instance. Historiquement, ces données étaient ajoutées statiquement à Aktivisda lors de l'étape de compilation. Ceci pour des raisons de simplicité et de résilience. Mais cette solution n'est pas viable dans une optique de passage à l'échelle et de fournir des instances *clé en main* de Aktivisda :le temps de compilation des instances (et l'infrastructure associée) aurait été trop important.

La version 1.7.0 rend alors possible de ne plus recompiler Aktivisda à chaque nouvelle mise à jour des données. C'est en particulier le cas pour la liste des modèles ou des images : il suffit de modifier le fichier `templates.json`.

Par contre, certains fichiers nécessitent des pré-traitements pour pouvoir être compris par Aktivisda, c'est en particulier le cas pour le fichier `fonts.json` à partir duquel est généré un fichier `css` nécessaire à Aktivisda. Pour ce fichier en particulier, il est donc toujours nécessaire de recompiler le logiciel.

Ces pré-traitements n'ont pas de raison d'être fait à la pré-génération, ils peuvent également très bien être faits par le serveur.


## Spécifications

Pour fonctionner, Aktivisda a besoin d'avoir accès aux fichiers suivants :

* `fonts.css`
* `data/fonts.json`
* `data/backgrounds.json`
* `data/formats.json`
* `data/templates.json`
* `data/palettes.json`
* `data/tags.json`
* `config.json`



## Backend existants 

### Backend statique

**Intérêts :**

* Mise en place côté serveur facile à mettre en place
* Maintenabilité aisée

**Inconvénients**

* Délai de mise à jour de quelques minutes, car recompilation obligatoire


### Backend Gitlab

**Intérêts**

**Inconvénients** :

* Non adapté pour des *utilisations grand public*

### Backend Django

**Intérêts**

**Inconvénients**

* Permet de gérer de nombreuses instances en simultané