var fs = require("fs");

if(process.argv.length < 4 || !fs.existsSync(process.argv[3])) {
	console.log("	Usage: node %s [encode|decode]<file-to-convert>", process.argv[1]);
	process.exit(1);
}

function getSizeBuffer(size, bytes) {
	var buffer = new Buffer([ ]);
	for(var shift = 0; shift < bytes; shift++) {
		buffer = Buffer.concat([ buffer, new Buffer([ (size >> (shift * 8)) & 0xff ]) ]);
	}
	return buffer;
}

function getBitmapHeader(rows, columns) {
	var size = (rows * columns * 4) + 54;
	var buffer = new Buffer([ 0x42, 0x4d ]);
	buffer = Buffer.concat([ buffer, getSizeBuffer(size, 4), new Buffer([ 0x00, 0x00, 0x00, 0x00, 0x36, 0x00, 0x00, 0x00 ]) ]);
	buffer = Buffer.concat([ buffer, new Buffer([ 0x28, 0x00, 0x00, 0x00 ]) ]);
	buffer = Buffer.concat([ buffer, getSizeBuffer(columns, 4), getSizeBuffer(rows, 4) ]);
	buffer = Buffer.concat([ buffer, new Buffer([ 0x01, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x74, 0x12, 0x00, 0x00, 0x74, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 ]) ]);
	return buffer;
}

var inFile = fs.openSync(process.argv[2], "r");
var inStats = fs.statSync(process.argv[2]);
var square = Math.ceil(Math.sqrt(inStats.size / 4.0));

var outFile = fs.openSync("./test.bmp", "w");

fs.writeSync(outFile, getBitmapHeader(square, square), 0, 54);

var tempBuffer = new Buffer(10240);
var readBytes = 0;
var totalBytes = 0;
do {
	readBytes = fs.readSync(inFile, tempBuffer, 0, 10240);
	fs.writeSync(outFile, tempBuffer, 0, readBytes);
	tempBuffer.fill(0x00);
	totalBytes += readBytes;
	process.stdout.cursorTo(0);
	process.stdout.write(Math.round(100 * totalBytes / inStats.size) + "%");
} while(readBytes === 10240)
console.log();

var padding = new Buffer((square * square * 4) - inStats.size);
padding.fill(0x00);
fs.writeSync(outFile, padding, 0, padding.length);
fs.closeSync(outFile);
