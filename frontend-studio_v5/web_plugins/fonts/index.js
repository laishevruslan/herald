class FontsPlugin {
    static defaultOptions = {
        outputFile: 'assets.md',
    };

    // Any options should be passed in the constructor of your plugin,
    // (this is a public API of your plugin).
    constructor(options = {}) {
        // Applying user-specified options over the default options
        // and making merged options further available to the plugin methods.
        // You should probably validate all the options here as well.
        this.options = { ...FontsPlugin.defaultOptions, ...options };
    }

    run(compilation) {
        // todo handle old files
        // migration
        const version = this.options.fonts.version;

        let cssfile = '';

        for (const font of this.options.fonts.fonts) {
            cssfile += '@font-face {\n';
            cssfile += `\tfont-family: ${font.fontName};\n`;

            if (font['css']) {
                const css = font['css'];
                if (css['font-weight']) cssfile += `\tfont-weight: ${css['font-weight']};\n`;

                if (css['font-style']) cssfile += `\tfont-style: ${css['font-style']};\n`;

                if (css['font-display']) cssfile += `\tfont-display: ${css['font-display']};\n`;

                if (css['unicode-range']) cssfile += `\tunicode-range: ${css['unicode-range']};\n`;
            }

            const formats = Object.keys(font['formats']).map((format) => {
                const label_format = format === 'ttf' ? 'truetype' : format;
                const path = process.env.VUE_APP_NAME === 'aktivisda' ? '' : '/backtivisda/'
                return `url('${path}/static/fonts/${font['directory']}/${font['formats'][format]}') format('${label_format}')`; // Remove ./ in the front of font["directory"]
            });

            cssfile += `\tsrc: ${formats.join(', ')};\n`;

            cssfile += '}\n\n';
        }

        compilation.assets[this.options.outputFile] = {
            source: function () {
                return cssfile;
            },
            size: function () {
                return cssfile.length;
            },
        };
    }

    apply(compiler) {
        const pluginName = FontsPlugin.name;

        // Using webpack 4
        compiler.hooks.emit.tapPromise(pluginName, async (compilation) => this.run(compilation));
    }
}

module.exports = { FontsPlugin };
