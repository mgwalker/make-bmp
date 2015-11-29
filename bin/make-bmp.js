"use strict";

var fs = require("fs-ext");
var path = require("path");
var crypto = require("crypto");
var uuid = require("node-uuid");

// Turn a number into a buffer of the specified size
// in little-endian
function getBufferForNumber(size, bytes) {
	var array = [];
	for (var shift = 0; shift < bytes; shift++) {
		array.push(size >> shift * 8 & 0xff);
	}
	return new Buffer(array);
}

// Get a number, stored in little-endian, from a buffer
function getNumberFromBuffer(buffer) {
	var number = 0;
	for (var i = 0; i < buffer.length; i++) {
		number += buffer[i] << 8 * i;
	}
	return number;
}

function getBitmapHeader(rows, columns, metadataLength) {
	// A bitmap version 3 header is a total of 54 bytes.  It
	// includes the total size of the file, which is 4 bytes
	// per pixel plus the size of the header plus the size
	// of the metadata plus the 4 bytes for the metadata size.
	//
	// http://www.fileformat.info/format/bmp/egff.htm
	var size = rows * columns * 4 + 54 + metadataLength + 4;
	var buffer = new Buffer([0x42, 0x4d]);
	buffer = Buffer.concat([buffer, getBufferForNumber(size, 4), new Buffer([0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00])]);
	buffer = Buffer.concat([buffer, new Buffer([0x28, 0x00, 0x00, 0x00])]);
	buffer = Buffer.concat([buffer, getBufferForNumber(columns, 4), getBufferForNumber(rows, 4)]);
	buffer = Buffer.concat([buffer, new Buffer([0x01, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x74, 0x12, 0x00, 0x00, 0x74, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])]);
	return buffer;
}

function convertToBitmap(sourceFile) {
	return new Promise(function (resolve) {
		var inFile = fs.createReadStream(sourceFile, { defaultEncoding: "binary" });
		var inStats = fs.statSync(sourceFile);

		// For simplicity's sake, make the bitmap a square, so
		// round up to the nearest square root of the input file
		// size (divided by four, because one pixel is 4 bytes).
		//
		// TODO: Instead of a square, compute a rectangle that is
		// nearest a square.  Alternatively, one pixel height.
		// But something that results in less padding, anyway.
		var square = Math.ceil(Math.sqrt(inStats.size / 4.0));

		// Generate a filename.
		var filename = uuid.v4().toString(16);
		var outFile = fs.createWriteStream("./" + filename + ".bmp", { defaultEncoding: "binary" });
		var md5 = crypto.createHash("md5");

		// Store off the original filename and original file
		// size in the metadata added to the bitmap.
		var metadata = new Buffer(JSON.stringify({
			filename: path.basename(sourceFile),
			size: inStats.size
		}));

		// Write out the bitmap header, metadata length, and
		// metadata to the new bitmap file.
		outFile.write(getBitmapHeader(square, square, metadata.length));
		outFile.write(getBufferForNumber(metadata.length, 4));
		outFile.write(metadata);

		inFile.pipe(outFile, { end: false });
		inFile.on("data", function (chunk) {
			return md5.update(chunk);
		});
		inFile.once("end", function () {
			var hash = md5.digest("hex");
			// Write out padding bytes to account for
			// rounding up the square root up above.
			var padding = new Buffer(square * square * 4 - inStats.size);
			padding.fill(0x00);
			outFile.end(padding, function () {
				fs.rename("./" + filename + ".bmp", "./" + hash + ".bmp", function () {
					resolve(hash + ".bmp");
				});
			});
		});
	});
}

function convertFromBitmap(sourceFile) {
	return new Promise(function (resolve) {
		try {
			(function () {
				var inFile = fs.createReadStream(sourceFile, { defaultEncoding: "binary" });
				inFile.once("readable", function () {
					// Skip the bitmap version 3 header since we
					// don't care about it.
					inFile.read(54);

					// Get the metadata.
					var metadataLength = getNumberFromBuffer(inFile.read(4));
					var metadata = JSON.parse(inFile.read(metadataLength).toString("utf-8"));

					var outFile = fs.createWriteStream(metadata.filename, { defaultEncoding: "binary" });

					// Pipe from the bitmap into the new file.
					inFile.pipe(outFile);
					inFile.once("end", function () {
						// When that's done, truncate the output file to
						// the write size.
						fs.truncate(metadata.filename, metadata.size, function () {
							resolve(metadata.filename);
						});
					});
				});
			})();
		} catch (e) {
			console.log(e);
		}
	});
}

module.exports = {
	toBitmap: convertToBitmap,
	fromBitmap: convertFromBitmap
};