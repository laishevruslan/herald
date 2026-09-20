
L'ajout, la modification et la suppression des images est la fonctionnalité clé de Backtivisda.
Autant les autres fonctionnalités de Backtivisda relèvent du confort, il est inconcevable de réaliser tout le traitement des images *à la main*. Ce traitement a très vite été automatisé, d'abord à l'aide de scripts puis désormais à l'aide de Backtivisda.

## Le traitement des images

Pour fonctionner, Aktivisda a besoin d'avoir, pour chaque image :

* des **informations associées** à cette image : nom et catégories ;
* de **l'image en elle même**, la plus légère possible : elle est donc compressée (sans perte de qualité) ;
* d'une **vignette de cette image**, c'est-à-dire de l'image dans une mauvaise résolution extrêmement légère pour pouvoir être affichée rapidement à l’utilisateur·ice dans la galerie ;
* idéalement, de la **zone cliquable de l’image**. Dans le cas d'une image avec un fond transparent, on ne souhaite pas qu'un clic de l'utilisateur·ice sur cet arrière plan sélectionne l'image ;
* idéalement, de la **forme de l'image** afin de pouvoir afficher un arrière plan lorsque l'image est insérée sur un qrcode ;

Par ailleurs, Aktivisda fonctionne très bien avec des **images vectorielles** : ces images sont en général plus légères que des photos et supportent bien les changements de couleurs ainsi que le redimensionnement infini. C'est un format extrêmement bien adapté aux illustrations, symboles, logos, etc.

Mais il est fréquent que les images sur nos ordinateurs **ne soient pas vectorisées**. Backtivisda propose directement de vectoriser les images, notamment celles avec plusieurs couleurs. Ces traitements utilisent le logiciel libre [Inkscape](https://inkscape.org) (avec un algorithme maison pour gérer la vectorisation multi-color).

Ces traitements sont réalisés sur un serveur dédié.

## Comment ajouter des images

/// admonition | À savoir
    type: warning
Comme mentionné dans cette documentation, backtivisda fonctionne **mais** certains chemins sont impraticables, en particulier :

* Les images en jpeg **ne peuvent pas être vectorisées**, vous aurez un message `server side error`. Dans ce cas, changer le format vers du png au préalable.
* Attention avec les images déjà au format vectoriel. Ce format étant assez complexe, il est possible (voir très probable) que votre image ne soit pas exploitable pleinement par Aktivisda. Il est donc recommandé, de manière assez paradoxale de donner à manger un png de bonne qualité et de laisser Backtivisda faire la vectorisation
///

La procédure d'ajout d'images est totalement guidée, pas à pas.

1. Se rendre sur l'onglet « symbole » ou « image de fond » suivant ce que vous souhaitez ajouter ;
2. Charger l'image et sélectionner si vous souhaitez vectoriser l'image ou l'ajouter telle quelle (par ex. pour les photos)
![](/assets/images/backtivisda-add-image-2.png)
3. Vous devez ensuite sélectionner le nombre de couleurs présentes dans votre image. Penser à bien cocher/décocher la case si la couleur blanche de votre image est réellement du blanc ou bien un fond transparent.
![](/assets/images/backtivisda-add-image-3.png)
4. Après avoir passé toutes les étapes qui suivent, vous voyez votre image ajoutée avec un petit macaron « nouveau ». Votre image est utilisable localement pour faire des visuels.
![](/assets/images/backtivisda-add-image-all.png)
5. Comme toute modification dans Backtivisda, elle est éphémère tant que vous ne cliquez pas sur « **Synchroniser** ». La page de synchronisation ressemble à cela :
![](/assets/images/backtivisda-add-image-sync.png)

À noter que si vous souhaitez annuler un upload d'une image spécifique ou bien la supprimer, vous pouvez l'ouvrir depuis la gallerie et vous verrez alors un bouton « Supprimer » :

![](/assets/images/backtivisda-add-image-remove-image.png)