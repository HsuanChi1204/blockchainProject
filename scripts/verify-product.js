const hre = require("hardhat");
const pinataSDK = require("@pinata/sdk");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();

async function main() {
    try {
        console.log("開始驗證產品信息...");

        // 1. 連接智能合約
        console.log("\n1. 連接智能合約...");
        const contractAddress = "0xe391aDF6Df8075D198C37b7B0cAC8C82fc4cE2BC";
        const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
        const contract = ProductRegistry.attach(contractAddress);

        // 2. 獲取合約中存儲的產品信息
        console.log("\n2. 獲取合約中存儲的產品信息...");
        const productId = "PROD_1743732262988"; // 使用之前註冊的產品 ID
        const productInfo = await contract.getProduct(productId);
        const contractIpfsCid = productInfo[0];
        console.log("合約中存儲的 IPFS CID:", contractIpfsCid);

        // 3. 從 IPFS 讀取數據
        console.log("\n3. 從 IPFS 讀取數據...");
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${contractIpfsCid}`);
        if (!response.ok) {
            throw new Error(`讀取失敗: ${response.statusText}`);
        }
        const ipfsData = await response.json();
        console.log("IPFS 存儲的產品信息:", ipfsData);

        // 4. 驗證數據完整性
        console.log("\n4. 驗證數據完整性...");
        const pinata = new pinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_API_SECRET
        });

        // 獲取 Pinata 中的文件列表
        const pinList = await pinata.pinList({
            status: 'pinned',
            hashContains: contractIpfsCid
        });

        if (pinList.count > 0) {
            console.log("✅ 驗證成功：");
            console.log("- IPFS CID 在 Pinata 中有效");
            console.log("- 合約中存儲的 CID 與 IPFS 數據匹配");
            console.log("- 產品信息完整且可訪問");
        } else {
            console.log("❌ 驗證失敗：");
            console.log("- IPFS CID 在 Pinata 中未找到");
        }

        // 5. 顯示完整的產品信息
        console.log("\n5. 完整的產品信息：");
        console.log("產品 ID:", productId);
        console.log("IPFS CID:", contractIpfsCid);
        console.log("公鑰:", productInfo[1]);
        console.log("註冊時間:", new Date(Number(productInfo[2]) * 1000).toLocaleString());
        console.log("產品狀態:", productInfo[3] ? "活躍" : "停用");
        console.log("產品詳細信息:", ipfsData);

    } catch (error) {
        console.error("驗證過程中發生錯誤:", error.message);
        if (error.stack) {
            console.error("錯誤堆棧：", error.stack);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 