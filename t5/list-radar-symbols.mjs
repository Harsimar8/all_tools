import fs from "fs";

const files = {
    numeric: "node_modules/milsymbol/src/numbersidc/sidc/ground.js",
    letter: "node_modules/milsymbol/src/lettersidc/sidc/ground.js"
};

console.log("\n");
console.log("============================================================");
console.log("              MILSYMBOL RADAR SYMBOL LIST");
console.log("============================================================");

function inspectFile(label, file) {

    console.log("\n################ " + label + " ################");

    if (!fs.existsSync(file)) {
        console.log("FILE NOT FOUND:", file);
        return;
    }

    const content = fs.readFileSync(file, "utf8");

    const regex =
        /sId\["([^"]+)"\]\s*=\s*\[([^\]]*)\]/g;

    let match;
    let count = 0;

    while ((match = regex.exec(content)) !== null) {

        const sidc = match[1];
        const icons = match[2];

        if (/radar|sensor|surveillance|ground controlled|acquisition|tracking|air defense|air-defence|early warning|electronic/i.test(
            sidc + " " + icons
        )) {

            console.log(
                `${String(++count).padStart(3, " ")} | ${sidc} | ${icons.trim()}`
            );
        }
    }

    console.log("\nRadar-related definitions found:", count);
}

inspectFile("NUMERIC SIDC", files.numeric);
inspectFile("LETTER SIDC", files.letter);

console.log("\n============================================================");
console.log("INSPECTION COMPLETE");
console.log("============================================================");