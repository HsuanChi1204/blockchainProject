const hre = require("hardhat");

async function main() {
  console.log("開始部署合約到測試網...");

  // 獲取合約工廠
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  
  // 部署合約
  console.log("正在部署合約...");
  const productRegistry = await ProductRegistry.deploy();
  
  // 等待部署完成
  console.log("等待部署確認...");
  await productRegistry.waitForDeployment();
  
  const address = await productRegistry.getAddress();
  console.log("合約已部署到地址:", address);
  
  // 等待幾個區塊確認
  console.log("等待區塊確認...");
  const deploymentReceipt = await productRegistry.deploymentTransaction().wait(5);
  
  console.log("合約部署完成！");
  console.log("交易哈希:", deploymentReceipt.hash);
  
  // 驗證合約
  console.log("準備驗證合約...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("合約驗證成功！");
  } catch (error) {
    console.error("合約驗證失敗:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 