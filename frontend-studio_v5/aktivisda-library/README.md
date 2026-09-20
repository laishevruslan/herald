# Aktivisda-library

The core of image manipulation in Aktivisda.

Features:
* Incremental modifications of the image ;
* Load and Save the image representation in JSON ;
* Export image in pdf using PdfMake ;
* Display image interactively using konva (based on HTML5 Canvas) ;
* Export image in png or jpeg, compressed by JpegOptim or oxipng (using webassembly)
* Support png, jpeg, svg, qrcode components

## Tests

There is two kind of tests for aktivisda-library:
* unittests
* integration tests

Integration tests should cover the complete codebase (coverage ~100%). Integration tests should be created for each

```terminal
npm run test -- --testNamePattern textList
```

### Template tests

They are defined in `vida.test.ts`.

#### Checklist to create a new one

Everytime you fix a bug in the library, everytime you develop a new feature, you should add a new "template test".

- [ ] Do not hesitate to edit a little bit your template to create buggy situations : try to with normal and extremal values (for example big and small text sizes) ;
- [ ] Check that the resulting images are as expected (an angle if you wanted one) ;
- [ ] Check that pdf = png. You can open both svg and png on Inkscape, remove the svg background, put the png as background and see if some components are not on the same place ;
- [ ] Add png and jpeg files is assets

