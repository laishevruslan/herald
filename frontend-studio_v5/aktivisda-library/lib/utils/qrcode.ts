import QRCode from 'qrcode';

export function createSvgQrcode(value: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (value == '') reject();

        const qrcode = QRCode.create(value, <QRCode.QRCodeOptions><any>{
            errorCorrectionLevel: 'H',
            width: 128, // it does not like this option:/
            version: 100,
        });

        const size = qrcode.modules.size;
        const data = qrcode.modules.data;

        const qrcodeContainer = document.createElement('div');
        const qrcodeSvg = document.createElement('svg');
        qrcodeSvg.setAttribute('width', `${size}`);
        qrcodeSvg.setAttribute('height', `${size}`);
        qrcodeSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        qrcodeSvg.setAttribute('xmlns:dc', 'http://purl.org/dc/elements/1.1/');
        qrcodeSvg.setAttribute('xmlns:cc', 'http://creativecommons.org/ns#');
        qrcodeSvg.setAttribute('xmlns:rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
        qrcodeSvg.setAttribute('xmlns:svg', 'http://www.w3.org/2000/svg');
        qrcodeSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        qrcodeSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        qrcodeSvg.setAttribute('xmlns:sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd');
        qrcodeSvg.setAttribute('xmlns:inkscape', 'http://www.inkscape.org/namespaces/inkscape');
        qrcodeSvg.setAttribute('xml:space', 'preserve');
        qrcodeSvg.setAttribute('version', '1.1'), qrcodeContainer.appendChild(qrcodeSvg);

        let newRow = false;
        let lineLength = 0;

        for (let i = 0; i < data.length; i++) {
            const col = Math.floor(i % size);
            const row = Math.floor(i / size);

            if (!col && !newRow) newRow = true;

            if (data[i]) {
                lineLength++;

                if (!(i > 0 && col > 0 && data[i - 1])) {
                    newRow = false;
                }

                if (!(col + 1 < size && data[i + 1])) {
                    const rect = document.createElement('rect');
                    rect.setAttribute('y', String(row));
                    rect.setAttribute('x', String(1 + col - lineLength));
                    rect.setAttribute('height', String(1.1));
                    rect.setAttribute('width', String(0.1 + lineLength));
                    qrcodeSvg.appendChild(rect);
                    lineLength = 0;
                }
            }
        }
        let qrcodeStr = qrcodeContainer.innerHTML.replace('viewbox', 'viewBox');

        resolve(qrcodeStr);
    });
};
