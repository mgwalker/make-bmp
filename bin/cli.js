#!/usr/bin/env node
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
				makeBmp.toBitmap(process.argv[3]).then(function (filename) {
					console.log("Encoded bitmap " + filename);
				});
				break;

			case "decode":
				makeBmp.fromBitmap(process.argv[3]).then(function (filename) {
					console.log("Decoded file " + filename);
				});
				break;

			default:
				printHelp();
				break;
		}
	}
});