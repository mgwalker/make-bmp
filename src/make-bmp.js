const fs = require("fs-ext");
const path = require("path");
const uuid = require("node-uuid");

function getBufferForNumber(size, bytes) {
	let buffer = new Buffer([ ]);
	for(var shift = 0; shift < bytes; shift++) {
		buffer = Buffer.concat([ buffer, new Buffer([ (size >> (shift * 8)) & 0xff ]) ]);
	}
	return buffer;
}

function getNumberFromBuffer(buffer) {
	let number = 0;
	for(var i = 0; i < buffer.length; i++) {
		number += (buffer[i] << (8 * i));
	}
	return number;
}

function getBitmapHeader(rows, columns, metadataLength) {
	const size = (rows * columns * 4) + 54 + metadataLength + 4;
	let buffer = new Buffer([ 0x42, 0x4d ]);
	buffer = Buffer.concat([ buffer, getBufferForNumber(size, 4), new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00 ]) ]);
	buffer = Buffer.concat([ buffer, new Buffer([ 0x28, 0x00, 0x00, 0x00 ]) ]);
	buffer = Buffer.concat([ buffer, getBufferForNumber(columns, 4), getBufferForNumber(rows, 4) ]);
	buffer = Buffer.concat([ buffer, new Buffer([ 0x01, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x74, 0x12, 0x00, 0x00, 0x74, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]) ]);
	return buffer;
}

function convertToBitmap(sourceFile) {
	const inFile = fs.openSync(sourceFile, "r");
	const inStats = fs.statSync(sourceFile);
	const square = Math.ceil(Math.sqrt(inStats.size / 4.0));

	const filename = uuid.v4().toString(16);
	const outFile = fs.openSync(`./${filename}.bmp`, "w");

	const metadata = new Buffer(JSON.stringify({
		filename: path.basename(sourceFile),
		size: inStats.size
	}));

	fs.writeSync(outFile, getBitmapHeader(square, square, metadata.length), 0, 54);
	fs.writeSync(outFile, getBufferForNumber(metadata.length, 4), 0, 4);
	fs.writeSync(outFile, metadata, 0, metadata.length);

	const tempBuffer = new Buffer(10240);
	let readBytes = 0;
	let totalBytes = 0;
	do {
		readBytes = fs.readSync(inFile, tempBuffer, 0, 10240);
		fs.writeSync(outFile, tempBuffer, 0, readBytes);
		tempBuffer.fill(0x00);
		totalBytes += readBytes;
	} while(readBytes === 10240)

	const padding = new Buffer((square * square * 4) - inStats.size);
	padding.fill(0x00);
	fs.writeSync(outFile, padding, 0, padding.length);
	fs.closeSync(outFile);
}

function convertFromBitmap(sourceFile) {
	const inFile = fs.openSync(sourceFile, "r");
	fs.seekSync(inFile, 54, 0);

	const metadataLengthBuffer = new Buffer(4);
	fs.readSync(inFile, metadataLengthBuffer, 0, 4);
	const metadataLength = getNumberFromBuffer(metadataLengthBuffer);
	const metadataBuffer = new Buffer(metadataLength);
	fs.readSync(inFile, metadataBuffer, 0, metadataLength);
	const metadata = JSON.parse(metadataBuffer.toString("utf-8"));
	console.log(metadata);

	const outFile = fs.openSync(metadata.filename, "w");
	const tempBuffer = new Buffer(10240);
	let bytesNeeded = metadata.size;
	let bytesToRead = (bytesNeeded > 10240 ? 10240 : bytesNeeded);
	while(bytesNeeded > 0) {
		let read = fs.readSync(inFile, tempBuffer, 0, bytesToRead);
		fs.writeSync(outFile, tempBuffer, 0, read);
		bytesNeeded -= read;
		bytesToRead = (bytesNeeded > 10240 ? 10240 : bytesNeeded);
	}

	fs.closeSync(outFile);
}

module.exports = {
	toBitmap: convertToBitmap,
	fromBitmap: convertFromBitmap
}
