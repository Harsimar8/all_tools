import ms from "milsymbol";

console.log("==============================================");
console.log("        MILSYMBOL AIRCRAFT INSPECTOR");
console.log("==============================================");

console.log("\nMilsymbol loaded successfully.");
console.log("Type:", typeof ms);
console.log("Available top-level properties:");

console.log(Object.keys(ms));

console.log("\n==============================================");
console.log("Searching the installed package...");
console.log("==============================================\n");

// --------------------------------------------------
// Try to inspect the exported symbol data
// --------------------------------------------------

function inspectObject(obj, path = "ms", depth = 0) {
    if (!obj || depth > 4) return;

    if (typeof obj !== "object" && typeof obj !== "function") {
        return;
    }

    let keys = [];

    try {
        keys = Object.keys(obj);
    } catch {
        return;
    }

    for (const key of keys) {

        const value = obj[key];
        const currentPath = `${path}.${key}`;

        // Look for aircraft-related names
        if (/aircraft|fighter|bomber|helicopter|transport|tanker|uav|awacs|recon|attack/i.test(key)) {
            console.log("FOUND:", currentPath);

            try {
                console.log("VALUE:", value);
            } catch {
                console.log("VALUE: [unable to display]");
            }

            console.log("----------------------------------------------");
        }

        // Continue recursively
        if (
            value &&
            typeof value === "object" &&
            depth < 4
        ) {
            inspectObject(value, currentPath, depth + 1);
        }
    }
}

inspectObject(ms);

console.log("\n==============================================");
console.log("Basic MilSymbol test");
console.log("==============================================");

try {

    // Example SIDC just to confirm rendering works.
    const symbol = new ms.Symbol(
        "10031000161211004600"
    );

    console.log("Symbol created successfully.");

    console.log("SIDC:", symbol.getSidc());

    console.log("SVG:");
    console.log(symbol.asSVG());

} catch (error) {

    console.error("Could not create symbol:");
    console.error(error);

}

console.log("\n==============================================");
console.log("INSPECTION COMPLETE");
console.log("==============================================");