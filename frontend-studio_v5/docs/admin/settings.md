# Configuration

La configuration de l'instance n’est pas encore possible dans Backtivisda, il faut aller modifier directement les fichiers dans le projet Gitlab.

## Modifier les paramètres généraux

Différents paramètres sont définis dans le fichier `local/config.json`, en particulier : le nom de l’instance, son url, les langues disponibles, etc.

## Changer les couleurs primaires etc.

Modifier le fichier `local/buefy.scss` et en particulier :
* `--primary-color`
* `--secondary-color`
* `$title-font` : pour spécifier la police de caractère pour tous les titres

## Changer le favicon

Le favicon est la petite icône présente à côté du nom du site dans la barre d'onglets de son navigateur.

Il suffit de changer le fichier `favicon.ico` par un fichier du même nom.
Un favicon de taille 64x64px c'est bien.


