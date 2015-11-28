const fs = require("fs");
const makeBmp = require("./make-bmp");

function printHelp() {
	console.log("	Usage: node %s [encode|decode] <file-to-convert>", process.argv[1]);
}

process.argv[3] = process.argv[3] || "";

fs.exists(process.argv[3], (exists) => {
	if(!exists) {
		printHelp();
	} else {
		switch(process.argv[2]) {
			case "encode":
				makeBmp.toBitmap(process.argv[3]);
				break;

			case "decode":
				makeBmp.fromBitmap(process.argv[3]);
				break;

			default:
				printHelp();
				break;
		}
	}
});
