# Aktivisda.earth

_Aktivisda_ is a web application to facilitate the creation of visuals that use the graphic charter of an organization, and the spreading of this graphic charter.

_Backtivisda_ is the web application to manage Aktivisda: add and remove symbols, backgrounds etc.
(**Still under development, backtivisda currently only support adding images**)

## Instances

Aktivisda can be instantiated for your organization. Everything can be customized.

| Organization         | Url                                          | Repository                                                                                                                                                                                     |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extinction Rebellion | https://extinctionrebellion.aktivisda.earth/ | |
| Alternatiba          | https://alternatiba.aktivisda.earth/         | ![https://alternatiba.aktivisda.earth/](https://framagit.org/aktivisda/alternatiba/badges/main/pipeline.svg) [Framagit](https://framagit.org/aktivisda/alternatiba/)                           |
| AMAP          | https://amap.aktivisda.earth/         |                          |
| Climate Fresk          | https://aktivisda.climatefresk.org/         |                          |

| … much more in projects!

Send an email to dev@aktivisda.earth if you want your own instance!

## Installation

This repository cannot be used on its own as it requires data. I recommand to go to https://framagit.org/aktivisda/extinction-rebellion and to follow the installation procedure.

## Documentation

See doc folder.

### Creating a token for Backtivisda

See on Gitlab

## Development

### Aktivisda requires npm < 16

Use nvm : https://github.com/nvm-sh/nvm

### Dependencies

Aktivisda relies on many awesome Open Source Projects :

-   [Konva](konvajs.org) for the Visual Editor
-   [Scour](https://github.com/scour-project/scour) to optimize the SVG
-   [Inkscape](https://inkscape.org/) to manipulate SVGs
-   [Potrace](http://potrace.sourceforge.net/) for image's vectorization
-   [ImageMagick](https://imagemagick.org/script/magick.php) for images manipulations
-   ...

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. You can contact me at `dev@aktivisda.earth`.

## Authors

Thank you for all your contributions to Aktivisda

- Charly for the `es` translation.
- Alice for the `pt` translation
- @Hyziu-03 for the `pl` translation
- @lost_geographer for the `it` translation
- @larus-argentatus for documentation `en` translation

## License

[GNU AGPLv3](https://framagit.org/aktivisda/aktivisda/-/blob/main/LICENSE)
