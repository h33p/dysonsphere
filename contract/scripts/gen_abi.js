
const hre = require("hardhat");
const fs = require('fs');

async function gen_abi() {
  // Write out the abi
  console.log("Writing out interface ABI.");
  const artifact = await hre.artifacts.readArtifact("IDysonSphere");
  const content = "// Generated using dysonsphere/contract/scripts/gen_abi.js\nexport const DYSONSPHERE_ABI = " + JSON.stringify(artifact.abi, null, 2) + ";\n";
  fs.writeFileSync('./IDysonSphere.ts', content);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
gen_abi().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
