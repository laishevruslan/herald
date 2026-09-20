# Les modèles

## Définition
Un modèle, ou gabarit ou template en anglais, correspond à un exemple de visuel que les utilisateurices peuvent modifier. Un modèle est constitué d'une image de fond et d'un ensemble d'éléments textuels ou images. Ces éléments peuvent être déplacés, tournés et être mis au premier plan ou à l'arrière plan, afin de constituer le visuel souhaité.

Ces modèles peuvent être exportés en format image (png, jpeg ou pdf) et sauvegardés dans leur représentation interne (un format json, sous forme de fichier ou d'url) pour pouvoir être rechargés plus tard.

Note pour les développeur·euses : Un modèle peut être sérializé en json.

## Modifier dans backtivisda

Pour modifier ou ajouter un modèle dans Backtivisda, **rien de plus simple**. Il vous suffit d'ouvrir un modèle existant (vous pouvez également ouvrir l'url `/edit` si vous n'avez pas encore de visuel), de le modifier et enfin de le sauvegarder. Au moment de le sauvegarder, vous avez une nouvelle option « Sauvegarder en base de données ». Vous aurez ensuite le choix entre écraser le modèle en cours de modification ou en créer un nouveau.

/// admonition | Astuce
    type: info
Vous pouvez même charger un visuel envoyé par un·e autre utilsateur·ice en format `.json` !
///

## Traduire un modèle

### Motivations

/// admonition | News 1.1.0
    type: tip
La traduction a été mise en place dans la version 1.1.0 pour la Fresque du Climat
///

L'objectif est de pouvoir proposer des déclinaisons d'un même modèle en plusieurs langues. En premier lieu, il s'agit de pouvoir changer le texte affiché en fonction de la langue, mais on se rend compte qu'il faudrait potentiellement également pouvoir changer la taille du texte (un mot allemand est plus long qu'un mot anglais) ainsi que sa position. De même, on pourrait être tenté de changer l'image en fonction de la langue, pour afficher le logo dans la bonne langue par exemple.

Pour répondre à ces différents besoins, chaque attribut du modèle (le texte, la taille du texte, sa couleur, etc.) comporte désormais une valeur par défaut et, si nécessaire, une valeur spécifique à la langue, exactement comme si on disait : "Le modèle en anglais, c'est le même que celui en français, on change simplement le contenu du texte".

### Comment l’utiliser

#### Sur backtivisda

C'est sur backtivisda que les traductions et les ajustements sont réalisés. Pour cela, lorsqu'on édite un modèle, il y a un sélecteur de langues. Lorsqu'une langue y est sélectionnée, on bascule en mode _traduction_. La plupart des paramètres deviennent alors non modifiables. Toutes les modifications alors effectuées le sont dans la langue voulue.

Les traductions peuvent également être réalisées dans des outils externes tels que [Tolgee](https://tolgee.io/).

#### Sur Aktivisda

Sur Aktivisda, il est impossible de traduire un modèle, il est néanmoins possible de changer la langue d'affichage de son modèle. Par défaut, le modèle apparaît dans la langue de l'interface de l'utilisateur·ice.

### Pour les développeur·euses

Au sein du fichier `.json` d'un modèle, on ajoute pour chaque composant une clé `i18n` où chaque sous-clé `<i18n-code>` correspond à une représentation partielle de l'objet json.
Par exemple :
```json
{
    "text": "texte par défaut",
    "size": 80,
    "color": "#ffffff",
    ...,
    "i18n": {
        "fr": {
            "size": 70
        },
        "en": {
            "text": "in english",
            "color": "#000000"
        }
    }
}
```

Et très concrètement, lorsqu'on sélectionne une langue, on écrase les valeurs par défaut par celles spécifiques à la langue, ainsi la version anglaise (`en`) est équivalent à :
```json
{
    "text": "in english",
    "size": 80,
    "color": "#000000",
    ...
}
```

_A priori_, il est possible d'indiquer n'importe quelle paramètre dans les clés `i18n`, mais le code d'affichage n'est peut-être pas encore totalement réactif à ces changements. Au niveau de l'interface, seuls les éléments traduisibles apparaissent en _mode traduction_.

## Verrouiller un modèle


Il est possible de restreindre les valeurs des différents attributs des composants d'un modèle avec un système de _règles_. Cela a pour objectif de simplifier l'interface en limitant les options possibles et de contraindre les utilisateurices à respecter la charte graphique de l'organisation.

Les types règles actuellement en place sont :

* **fixer** la valeur d’un attribut à la valeur présente dans le modèle (valeur qui peut être différente suivant la langue). Dans ce cas, l'utilisateur·ice ne voit pas l'option pour modifier cette valeur ;
* ajouter des valeurs **minimales** et **maximales** pour les différents nombres

Les attributs auxquels on peut appliquer des règles sont actuellement :

* la modification de n'importe quel attribut (et même la sélection du modèle) (`rules.self.fixed`)
* supprimer un élément ou non (`rules.presence.fixed`) ;
* duppliquer un élément ou non (`rules.unicity.fixed`) ;
* Fixer ou modifier les attributs textuels :
    * `position` : on peut interdire la modification, uniquement appliquer des règles sur x ou sur y, et indiquer des plages de valeurs ;
    * `color`
    * `angle`
    * `justification`
    * `shadow` : règle actuellement globale : on peut soit tout modifier, soit rien modifier ;
    * `background` : règle actuellement globale : on peut soit tout modifier, soit rien modifier ;
    * `text`
    * `size` : on peut spécifier des valeurs minimales et/ou maximales

Par exemple, on peut :

* interdire toute modification d'un champ texte ;
* obliger un élément à ne pas bouger _sauf dans une zone restreinte_ rectangulaire ;
* interdire toute modification de la police de caractère ;

D'autres types derègles pourraient être ajoutées au besoin :

* contraindre les valeurs à être dans une liste ;
* contraindre les choix des couleurs/symboles parmis celles ayant un tag particuler
* Augmenter la _finesse_ d'application des règles, par exemple en contraignant le décalage de l'ombre mais en laissant libre le choix de la couleur ;

Il existe également des règles qui s'appliquent au document dans son intégralité, par exemple pour interdire l'ajout de nouveaux éléments `qrcode`, `image` ou `text` (règle `document.rules.components.[qrcode|image|text].fixed`)

Pour les développeur·euses, les règles sont écrites au sein de chaque composant dans la sous-clé `rules` :
```json
{
    "text": "mon texte",
    "size": 80,
    "position": {
        "x": 0.3,
        "y": 0.2
    },
    "rules": {
        "text": {
            "fixed": true
        },
        "position": {
            "properties": {
                "x": {
                    "fixed": true
                },
                "y": {
                    "min": 0.1
                }
            }
        },
        "size": {
            "min": 70,
            "max": 100
        }
    }
}
```