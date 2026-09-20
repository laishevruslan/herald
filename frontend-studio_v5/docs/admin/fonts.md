# Polices de caractères

/// admonition | Passer par Git
    type: warning
Les polices de caractères ne sont pas du tout manipulables sur Backtivisda. Il est nécessaire de passer par le projet git (voir le ticket [#185](https://framagit.org/aktivisda/aktivisda/-/issues/185)).
///


**Ajouter une police**

1. Télécharger la police sur son ordinateur ;

2. La convertir en plusieurs formats, idéalement, `.otf`, `.woff` et `.ttf`. Pour cela, on peut télécharger [ce script](https://framagit.org/Marc-AntoineA/files-manipulator/-/tree/main/fonts-manipulator) puis exécuter :
```terminal
python3 fonts-manipulator/cli.py -i myfont.ttf --otf --woff --ttf
```

3. Ajouter les différents fichiers dans le dossier `static/fonts/` (possiblité de les regrouper en sous-dossiers) ;

4. Ouvrir le fichier `local/data/fonts.json` (ici pour la version v1.0.11) et ajouter une entrée:

```json
{
"version": "1.0.11",
"fonts": [
    {
      "css": {
        "font-style": "normal",
        "font-weight": "normal",
        "font-display": null,
        "unicode-range": null
      },
      "fontName": "< font name>", // used in css
      "directory": "./<your font name>",
      "formats": {
        "otf": "<font name>.otf", // complete path static/fonts/<your font name>/<font name>.otf
        "woff": "<font name>.woff",
        "ttf": "<font name>.ttf"
      },
      "name": "<label font name>", // to display
      "loaded": false,
      "italic": false,
      "bold": false,
      "alwaysLoaded": true, // if your font is heavy and specific (eg. chinese font), set alwaysLoaded: false
      "default": true
    },
    ...
    ]
}
```

5. Pour tester, il est nécessaire de **recompiler** Aktivisda, soit en utilisant l'intégration continue de Gitlab soit en lançant depuis son ordinateur :
```terminal
npm run serve:aktivisda
```

6. Bien penser à commiter les modifications (fichiers de polices et `fonts.json`).
