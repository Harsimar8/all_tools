import fs from "fs";

const files = {
    numeric: "node_modules/milsymbol/src/numbersidc/sidc/air.js",
    letter: "node_modules/milsymbol/src/lettersidc/sidc/air.js"
};

console.log("\n");
console.log("============================================================");
console.log("             MILSYMBOL AIRCRAFT SYMBOL LIST");
console.log("============================================================");


/*
============================================================
NUMERIC SIDC DEFINITIONS
============================================================
*/

console.log("\n");
console.log("################ NUMERIC SIDC ################");

const numericContent = fs.readFileSync(files.numeric, "utf8");

const numericRegex =
    /sId\["([^"]+)"\]\s*=\s*\[([^\]]*)\]/g;

let match;
let numericCount = 0;

while ((match = numericRegex.exec(numericContent)) !== null) {

    const sidcPart = match[1];
    const icons = match[2];

    console.log(
        `${String(++numericCount).padStart(3, " ")} | ` +
        `${sidcPart} | ${icons.trim()}`
    );
}


/*
============================================================
LETTER SIDC DEFINITIONS
============================================================
*/

console.log("\n");
console.log("################ LETTER SIDC ################");

const letterContent = fs.readFileSync(files.letter, "utf8");

const letterRegex =
    /sId\["([^"]+)"\]\s*=\s*\[([^\]]*)\]/g;

let letterCount = 0;

while ((match = letterRegex.exec(letterContent)) !== null) {

    const sidc = match[1];
    const icons = match[2];

    console.log(
        `${String(++letterCount).padStart(3, " ")} | ` +
        `${sidc} | ${icons.trim()}`
    );
}


/*
============================================================
SUMMARY
============================================================
*/

console.log("\n");
console.log("============================================================");
console.log("SUMMARY");
console.log("============================================================");

console.log(`Numeric definitions : ${numericCount}`);
console.log(`Letter definitions  : ${letterCount}`);

console.log("\nInspection completed.");