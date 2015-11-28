"use strict";

var fs = require("fs");
var makeBmp = require("./make-bmp");

function printHelp() {
	console.log("	Usage: node %s [encode|decode] <file-to-convert>", process.argv[1]);
}

process.argv[3] = process.argv[3] || "";

fs.exists(process.argv[3], function (exists) {
	if (!exists) {
		printHelp();
	} else {
		switch (process.argv[2]) {
			case "encode":
				console.log("Encoded bitmap " + makeBmp.toBitmap(process.argv[3]));
				break;

			case "decode":
				console.log("Decoded file " + makeBmp.fromBitmap(process.argv[3]));
				break;

			default:
				printHelp();
				break;
		}
	}
});