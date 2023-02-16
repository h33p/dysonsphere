
const hre = require("hardhat");

async function deploy() {
  // Send money :)
  const FEECOLLECTOR_ADDRESS = "0xA9676193a74e8343142D8d2d706d006A420fB888";

  const TREASURY_ADDRESS = "0x3E1efDa147EC9309e1e47782EcaFeDe1d04b45E5";
  const AZIMUTH_ADDRESS = "0x223c067f8cf28ae173ee5cafea60ca44c335fecb";
  const ISWAPROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const WSTR_ADDRESS = "0xf0dc76c22139ab22618ddfb498be1283254612b1";
  const ROUTER_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const DysonSphere = await hre.ethers.getContractFactory("DysonSphere");
  const dyson_sphere = await DysonSphere.deploy(
    FEECOLLECTOR_ADDRESS,
    TREASURY_ADDRESS,
    AZIMUTH_ADDRESS,
    ISWAPROUTER_ADDRESS,
    WETH_ADDRESS,
    WSTR_ADDRESS,
    10000,
    ROUTER_FACTORY
  );

  await dyson_sphere.deployed();

  console.log("Contract deployed to address:", dyson_sphere.address);
  
  return dyson_sphere;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deploy().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
