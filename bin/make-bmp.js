"use strict";

var fs = require("fs-ext");
var path = require("path");
var cliCursor = require("cli-cursor");
var uuid = require("node-uuid");

var spinnerCharacters = ["|", "/", "-", "\\"];

function getBufferForNumber(size, bytes) {
	var buffer = new Buffer([]);
	for (var shift = 0; shift < bytes; shift++) {
		buffer = Buffer.concat([buffer, new Buffer([size >> shift * 8 & 0xff])]);
	}
	return buffer;
}

function getNumberFromBuffer(buffer) {
	var number = 0;
	for (var i = 0; i < buffer.length; i++) {
		number += buffer[i] << 8 * i;
	}
	return number;
}

function getBitmapHeader(rows, columns, metadataLength) {
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
	var square = Math.ceil(Math.sqrt(inStats.size / 4.0));

	var filename = uuid.v4().toString(16);
	var outFile = fs.openSync("./" + filename + ".bmp", "w");

	var metadata = new Buffer(JSON.stringify({
		filename: path.basename(sourceFile),
		size: inStats.length
	}));

	fs.writeSync(outFile, getBitmapHeader(square, square, metadata.length), 0, 54);
	fs.writeSync(outFile, getBufferForNumber(metadata.length, 4), 0, 4);
	fs.writeSync(outFile, metadata, 0, metadata.length);

	var tempBuffer = new Buffer(10240);
	var readBytes = 0;
	var totalBytes = 0;
	cliCursor.hide();
	do {
		readBytes = fs.readSync(inFile, tempBuffer, 0, 10240);
		fs.writeSync(outFile, tempBuffer, 0, readBytes);
		tempBuffer.fill(0x00);
		totalBytes += readBytes;
		process.stdout.cursorTo(0);
		process.stdout.write(spinnerCharacters[0] + " | " + Math.round(100 * totalBytes / inStats.size) + "%");
		spinnerCharacters.push(spinnerCharacters.shift());
	} while (readBytes === 10240);
	process.stdout.write("\n");
	cliCursor.show();

	var padding = new Buffer(square * square * 4 - inStats.size);
	padding.fill(0x00);
	fs.writeSync(outFile, padding, 0, padding.length);
	fs.closeSync(outFile);
}

function convertFromBitmap(sourceFile) {
	var inFile = fs.openSync(sourceFile, "r");
	fs.seekSync(inFile, 54, 0);

	var metadataLengthBuffer = new Buffer(4);
	fs.readSync(inFile, metadataLengthBuffer, 0, 4);
	var metadataLength = getNumberFromBuffer(metadataLengthBuffer);
	var metadataBuffer = new Buffer(metadataLength);
	fs.readSync(inFile, metadataBuffer, 0, metadataLength);
	var metadata = JSON.parse(metadataBuffer.toString("utf-8"));

	var outFile = fs.openSync(metadata.filename, "w");
	var tempBuffer = new Buffer(10240);
	var bytesNeeded = metadata.size;
	var bytesToRead = bytesNeeded > 10240 ? 10240 : bytesNeeded;
	while (bytesNeeded > 0) {
		var read = fs.readSync(inFile, tempBuffer, 0, bytesToRead);
		fs.writeSync(outFile, tempBuffer, 0, read);
		bytesNeeded -= read;
		bytesToRead = bytesNeeded > 10240 ? 10240 : bytesNeeded;
	}

	fs.closeSync(outFile);
}

module.exports = {
	toBitmap: convertToBitmap,
	fromBitmap: convertFromBitmap
};