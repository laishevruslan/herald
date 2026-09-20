const Generator = require('yeoman-generator');

const slugify = (str) =>
    str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

module.exports = class extends Generator {
    init() {
        this.log('Welcome to the aktivisda generator!');
    }

    async selectAktivisdaId() {
        this.aktivisdaId = (
            await this.prompt({
                type: 'input',
                name: 'aktivisdaId',
                message: "What's the name of your Aktivisda Instance?",
                default: 'My wonderful Organization',
            })
        ).aktivisdaId;

        this.style = await this.prompt([
            {
                type: 'input',
                name: 'primaryColor',
                message: "What's the primary color (hex)",
                default: '#5190f5',
            },
            {
                type: 'input',
                name: 'secondaryColor',
                message: "What's the secondary color (hex)",
                default: '#e90000',
            },
        ]);

        this.aktivisdaIdSlug = slugify(this.aktivisdaId);
    }

    writing() {
        this.fs.copyTpl(this.templatePath('README.md'), this.destinationPath('README.md'), {
            AKTIVISDA_ID: this.aktivisdaId,
            AKTIVISDA_ID_SLUG: this.aktivisdaIdSlug,
        });

        this.fs.copyTpl(this.templatePath('package.json'), this.destinationPath('package.json'), {
            AKTIVISDA_ID: this.aktivisdaId,
            AKTIVISDA_ID_SLUG: this.aktivisdaIdSlug,
        });

        this.fs.copyTpl(this.templatePath('local/config.json'), this.destinationPath('local/config.json'), {
            AKTIVISDA_ID: this.aktivisdaId,
            AKTIVISDA_ID_SLUG: this.aktivisdaIdSlug,
        });

        this.fs.copyTpl(this.templatePath('local/buefy.scss'), this.destinationPath('local/buefy.scss'), {
            PRIMARY_COLOR: this.style.primaryColor,
            SECONDARY_COLOR: this.style.secondaryColor,
            MAIN_FONT: 'YOUR FONT',
        });

        this.fs.copy(this.templatePath('.gitignore'), this.destinationPath('.gitignore'));

        this.fs.copy(this.templatePath('favicon.ico'), this.destinationPath('favicon.ico'));

        this.fs.copy(this.templatePath('.gitlab-ci.yml'), this.destinationPath('.gitlab-ci.yml'));

        this.fs.write(
            this.destinationPath('local/data/colors.json'),
            JSON.stringify(
                {
                    version: '1.0.26',
                    colors: [
                        { tags: '', html: '#ffffff' },
                        { tags: '', html: '#000000' },
                    ]
                },
                null,
                4,
            ),
        );

        this.fs.write(
            this.destinationPath('local/data/fonts.json'),
            JSON.stringify(
                {
                    version: '1.0.11',
                    fonts: [],
                },
                null,
                4,
            ),
        );

        this.fs.write(this.destinationPath('local/data/palettes.json'), JSON.stringify([['#ffffff'], ['#000000']], null, 4));

        this.fs.write(
            this.destinationPath('local/data/symbols.json'),
            JSON.stringify(
                {
                    version: '1.0.25',
                    symbols: [],
                },
                null,
                4,
            ),
        );

        this.fs.write(
            this.destinationPath('local/data/templates.json'),
            JSON.stringify(
                {
                    version: '1.0.25',
                    templates: [],
                },
                null,
                4,
            ),
        );

        this.fs.write(
            this.destinationPath('local/data/backgrounds.json'),
            JSON.stringify(
                {
                    version: '1.0.25',
                    backgrounds: [],
                },
                null,
                4,
            ),
        );

        this.fs.write(
            this.destinationPath('local/data/tags.json'),
            JSON.stringify(
                {
                    version: '1.0.25',
                    tags: {},
                },
                null,
                4,
            ),
        );

        this.fs.write(this.destinationPath('local/i18n/fr.json'), JSON.stringify({}, null, 4));

        this.fs.write(this.destinationPath('local/i18n/en.json'), JSON.stringify({}, null, 4));

        this.fs.write(this.destinationPath('local/data/formats.json'), JSON.stringify([], null, 4));

        this.fs.write(this.destinationPath('local/templates/.gitkeep'), '');

        this.fs.write(this.destinationPath('static/backgrounds/previews/.gitkeep'), '');
        this.fs.write(this.destinationPath('static/backgrounds/thumbnails/.gitkeep'), '');

        this.fs.write(this.destinationPath('static/fonts/.gitkeep'), '');

        this.fs.write(this.destinationPath('static/symbols/previews/.gitkeep'), '');
        this.fs.write(this.destinationPath('static/symbols/thumbnails/.gitkeep'), '');

        this.fs.write(this.destinationPath('static/templates/previews/.gitkeep'), '');
        this.fs.write(this.destinationPath('static/templates/thumbnails/.gitkeep'), '');
    }
};
