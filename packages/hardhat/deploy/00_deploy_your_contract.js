// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");

const localChainId = "31337";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  const goerliStakingAddress = "0x35e3Cb6B317690d662160d5d02A5b364578F62c9";
  const goerliDisputeManager = "0x8c344366D9269174F10bB588F16945eb47f78dc9";

  await deploy("SubgraphBridge", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [
      goerliStakingAddress,
      goerliDisputeManager,
    ],
    log: true,
  });

  const SubgraphBridge = await ethers.getContract("SubgraphBridge");

  await deploy("YourContract", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    args: [SubgraphBridge.address],
    log: true,
  });

  const YourContract = await ethers.getContract("YourContract");

  // Getting a previously deployed contract
  /*  await YourContract.setPurpose("Hello");
  
    To take ownership of yourContract using the ownable library uncomment next line and add the 
    address you want to be the owner. 
    // yourContract.transferOwnership(YOUR_ADDRESS_HERE);

    //const yourContract = await ethers.getContractAt('YourContract', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A") //<-- if you want to instantiate a version of a contract at a specific address!
  */

  /*
  //If you want to send value to an address from the deployer
  const deployerWallet = ethers.provider.getSigner()
  await deployerWallet.sendTransaction({
    to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
    value: ethers.utils.parseEther("0.001")
  })
  */

  /*
  //If you want to send some ETH to a contract on deploy (make your constructor payable!)
  const yourContract = await deploy("YourContract", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  /*
  //If you want to link a library into your contract:
  // reference: https://github.com/austintgriffith/scaffold-eth/blob/using-libraries-example/packages/hardhat/scripts/deploy.js#L19
  const yourContract = await deploy("YourContract", [], {}, {
   LibraryName: **LibraryAddress**
  });
  */

  // Verify your contracts with Etherscan
  // You don't want to verify on localhost
  // if (chainId !== localChainId) {
  //   await run("verify:verify", {
  //     address: SubgraphBridge.address,
  //     contract: "contracts/SubgraphBridge.sol:SubgraphBridge",
  //     contractArguments: [
  //       goerliDisputeManager,
  //       goerliStakingAddress,
  //     ],
  //   });
  //   await run("verify:verify", {
  //     address: YourContract.address,
  //     contract: "contracts/YourContract.sol:YourContract",
  //     contractArguments: [
  //       SubgraphBridge.address,
  //     ],
  //   });
  // }
};
module.exports.tags = ["YourContract"];
