# Couleurs et palettes

Aucune modification n'est pour l'instant possible dans Backtivisda, les modifications doivent être effectuées directement dans les fichiers de données.

## Couleurs

Les couleurs sont définies dans le fichier `local/data/colors.json`.

```json
{
    "version": "1.0.26",
    "colors": [
        {
            "tags": "",
            "html": "#ffffff"
        },
        {
            "tags": "",
            "html": "#000000"
        }
    ]
}
```

-   Chaque couleur est définie en code HTML avec 6 caractères. Les lettres doivent être en minuscule ;
-   Pour les tags, voir [la documentation](/fr/tags).

## Palettes

Les palettes sont définies dans le fichier `local/data/palettes.json`.  Il s'agit tout simplement d'une suite de tableaux de couleurs de différentes tailles.

```json
[
    [ "#ffffff" ],
    [ "#000000" ],
    [ "#000000", "#ffffff" ],
]
```