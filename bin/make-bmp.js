"use strict";

var fs = require("fs-ext");
var path = require("path");
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
	var inFile = fs.openSync(sourceFile, "r");
	var inStats = fs.statSync(sourceFile);

	// For simplicity's sake, make the bitmap a square, so
	// round up to the nearest square root of the input file
	// size (divided by four, because one pixel is 4 bytes).
	var square = Math.ceil(Math.sqrt(inStats.size / 4.0));

	// Generate a filename.
	var filename = uuid.v4().toString(16);
	var outFile = fs.openSync("./" + filename + ".bmp", "w");

	// Store off the original filename and original file
	// size in the metadata added to the bitmap.
	var metadata = new Buffer(JSON.stringify({
		filename: path.basename(sourceFile),
		size: inStats.size
	}));

	// Write out the bitmap header, metadata length, and
	// metadata to the new bitmap file.
	fs.writeSync(outFile, getBitmapHeader(square, square, metadata.length), 0, 54);
	fs.writeSync(outFile, getBufferForNumber(metadata.length, 4), 0, 4);
	fs.writeSync(outFile, metadata, 0, metadata.length);

	// Now write over all the bytes from the input file.
	var tempBuffer = new Buffer(10240);
	var readBytes = 0;
	var totalBytes = 0;
	do {
		readBytes = fs.readSync(inFile, tempBuffer, 0, 10240);
		fs.writeSync(outFile, tempBuffer, 0, readBytes);
		tempBuffer.fill(0x00);
		totalBytes += readBytes;
	} while (readBytes === 10240);

	// Write out padding bytes to account for
	// rounding up the square root up above.
	var padding = new Buffer(square * square * 4 - inStats.size);
	padding.fill(0x00);
	fs.writeSync(outFile, padding, 0, padding.length);
	fs.closeSync(outFile);

	return filename + ".bmp";
}

function convertFromBitmap(sourceFile) {
	var inFile = fs.openSync(sourceFile, "r");

	// Skip the bitmap version 3 header since we don't care about it.
	fs.seekSync(inFile, 54, 0);

	// Read the length of the metadata
	var metadataLengthBuffer = new Buffer(4);
	fs.readSync(inFile, metadataLengthBuffer, 0, 4);
	var metadataLength = getNumberFromBuffer(metadataLengthBuffer);

	// Now read the metadata
	var metadataBuffer = new Buffer(metadataLength);
	fs.readSync(inFile, metadataBuffer, 0, metadataLength);
	var metadata = JSON.parse(metadataBuffer.toString("utf-8"));

	var outFile = fs.openSync(metadata.filename, "w");
	var tempBuffer = new Buffer(10240);

	// Use the metadata to figure out how many bytes to
	// read, in 10240-byte chunks.  Ignore the padding
	// bytes at the end of the bitmap.
	var bytesNeeded = metadata.size;
	var bytesToRead = bytesNeeded > 10240 ? 10240 : bytesNeeded;
	while (bytesNeeded > 0) {
		var read = fs.readSync(inFile, tempBuffer, 0, bytesToRead);
		fs.writeSync(outFile, tempBuffer, 0, read);
		bytesNeeded -= read;
		bytesToRead = bytesNeeded > 10240 ? 10240 : bytesNeeded;
	}

	fs.closeSync(outFile);
	return metadata.filename;
}

module.exports = {
	toBitmap: convertToBitmap,
	fromBitmap: convertFromBitmap
};