

export function BlurFilter(pixelSize: number) {
    return (imageData: ImageData) => {
        const data = imageData.data;
        let width = imageData.width;
        let height = imageData.height;

        let nbBinsX = width / pixelSize;
        let nbBinsY = height / pixelSize;
        let nbmodified = 0;
        for (let xBin = 0; xBin < nbBinsX; ++xBin) {
            for (let yBin = 0; yBin < nbBinsY; ++yBin) {

                let xBinStart = xBin * pixelSize;
                let xBinEnd = xBinStart + pixelSize;

                let yBinStart = yBin * pixelSize;
                let yBinEnd = yBinStart + pixelSize;

                let red = 0;
                let blue = 0;
                let green = 0;

                let countPixels = 0;

                for (let x = xBinStart; x < xBinEnd; x += 1) {
                    if (x >= width) continue;

                    for (let y = yBinStart; y < yBinEnd; y += 1) {
                        if (y >= height) continue;

                        let i = (width * y + x) * 4;
                        if (data[i + 3] == 0) continue;

                        red += data[i + 0];
                        green += data[i + 1];
                        blue += data[i + 2];
                        countPixels++;
                    }
                }
                red = red / countPixels;
                green = green / countPixels;
                blue = blue / countPixels;

                for (let x = xBinStart; x < xBinEnd; x += 1) {
                    if (x >= width) continue;

                    for (let y = yBinStart; y < yBinEnd; y += 1) {
                        if (y >= height) continue;

                        let i = (width * y + x) * 4;
                        if (data[i + 3] == 0) continue;

                        data[i + 0] = red;
                        data[i + 1] = green;
                        data[i + 2] = blue;
                        ++nbmodified;
                    }
                }
            }
        }
    }
}
