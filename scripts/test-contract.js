const hre = require("hardhat");

async function main() {
    console.log("開始測試合約功能...");

    // 獲取合約實例
    const contractAddress = "0xe391aDF6Df8075D198C37b7B0cAC8C82fc4cE2BC";
    const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
    const contract = ProductRegistry.attach(contractAddress);

    try {
        // 1. 測試品牌註冊
        console.log("\n1. 測試品牌註冊");
        console.log("正在註冊品牌 BRAND001...");
        const brandTx = await contract.registerBrand("BRAND001");
        await brandTx.wait();
        console.log("品牌註冊成功！");

        // 驗證品牌註冊狀態
        const isBrandRegistered = await contract.isBrandRegistered("BRAND001");
        console.log("品牌註冊狀態:", isBrandRegistered);

        // 2. 測試產品註冊
        console.log("\n2. 測試產品註冊");
        console.log("正在註冊產品 PROD001...");
        const productTx = await contract.registerProduct(
            "PROD001",
            "QmTest123",  // IPFS CID
            "0x123456"    // 示例公鑰
        );
        await productTx.wait();
        console.log("產品註冊成功！");

        // 3. 查詢產品信息
        console.log("\n3. 查詢產品信息");
        const productInfo = await contract.getProduct("PROD001");
        console.log("產品信息:", {
            ipfsCid: productInfo[0],
            publicKey: productInfo[1],
            registrationTime: new Date(productInfo[2] * 1000).toLocaleString(),
            isActive: productInfo[3]
        });

        // 4. 測試產品停用
        console.log("\n4. 測試產品停用");
        console.log("正在停用產品 PROD001...");
        const deactivateTx = await contract.deactivateProduct("PROD001");
        await deactivateTx.wait();
        console.log("產品已停用！");

        // 5. 驗證錯誤處理
        console.log("\n5. 測試錯誤處理");
        try {
            await contract.getProduct("PROD001");
            console.log("錯誤：應該無法獲取已停用的產品");
        } catch (error) {
            console.log("成功：無法獲取已停用的產品");
        }

    } catch (error) {
        console.error("測試過程中發生錯誤:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 