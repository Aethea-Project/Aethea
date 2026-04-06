const fs = require("fs");
const path = "web/src/App.tsx";
let code = fs.readFileSync(path, "utf-8");

const startStr = "const LandingPage = () => {";
const endStrTokens = "const SidebarItem =";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStrTokens);

if (startIndex !== -1 && endIndex !== -1) {
    // We want to preserve the comment right above SidebarItem if possible, but it does not matter much if we just rewrite the comment.
    const newLandingPage = fs.readFileSync("temp_landing.js", "utf-8");
    const newCode = code.substring(0, startIndex) + newLandingPage + "\n\n/* --------- Sidebar --------- */\n\n" + code.substring(endIndex);
    fs.writeFileSync(path, newCode);
    console.log("Successfully patched App.tsx");
} else {
    console.log("Could not find start or end strings. start:", startIndex, "end:", endIndex);
}

