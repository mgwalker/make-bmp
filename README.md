# make-bmp

Make an arbitrary file into a (technically) valid bitmap.  I won't offer any suggestions about _why_ you might want to do that, but hey, you can do it if you want to!

## Installing

```
npm install -g @mgwalker/make-bmp
```

Or install locally if you want to use it as a library for reasons.

## Usage

```
make-bmp encode path-to-my-file.pdf
make-bmp decode path-to-encoded-bitmap.bmp
```

The library exports to methods:

```
var makeBmp = require("make-bmp");

makeBmp.toBitmap("path-to-file").then(filename => doStuff());
makeBmp.fromBitmap("path-to-bitmap").then(filename => doOtherStuff());
```

Both methods return a promise that resolve the output filename.  The `toBitmap` method creates an MD5 hash of the input file for the output filename.  The `fromBitmap` method reads the original filename from the metadata stuffed into the bitmap when it was created.