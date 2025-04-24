const hre = require("hardhat");
const pinataSDK = require("@pinata/sdk");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();

// 設置全局 fetch
if (!globalThis.fetch) {
    globalThis.fetch = fetch;
}

async function main() {
    try {
        console.log("開始整合測試 IPFS 和智能合約...");

        // 1. 初始化 Pinata
        console.log("\n1. 連接到 Pinata...");
        const pinata = new pinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_API_SECRET
        });
        await pinata.testAuthentication();
        console.log("Pinata 連接成功！");

        // 2. 準備產品數據
        console.log("\n2. 準備產品數據...");
        const productData = {
            name: "測試產品-001",
            description: "這是一個測試產品的詳細描述",
            specifications: {
                size: "10x20x30 cm",
                weight: "500g",
                color: "紅色"
            },
            manufacturer: "測試製造商",
            productionDate: new Date().toISOString()
        };

        // 3. 上傳到 IPFS
        console.log("\n3. 上傳數據到 IPFS...");
        const result = await pinata.pinJSONToIPFS(productData, {
            pinataMetadata: {
                name: 'product-data.json'
            }
        });
        const ipfsCid = result.IpfsHash;
        console.log("IPFS CID:", ipfsCid);
        console.log("IPFS 訪問鏈接:", `https://gateway.pinata.cloud/ipfs/${ipfsCid}`);

        // 4. 連接智能合約
        console.log("\n4. 連接智能合約...");
        const contractAddress = "0xe391aDF6Df8075D198C37b7B0cAC8C82fc4cE2BC";
        const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
        const contract = ProductRegistry.attach(contractAddress);

        // 5. 註冊品牌
        console.log("\n5. 註冊品牌...");
        const timestamp = Date.now();
        const brandId = `BRAND_${timestamp}`;
        const brandTx = await contract.registerBrand(brandId);
        await brandTx.wait();
        console.log("品牌註冊成功！品牌 ID:", brandId);

        // 6. 註冊產品
        console.log("\n6. 註冊產品...");
        const productId = `PROD_${timestamp}`;
        const publicKey = "0x123456"; // 示例公鑰
        const productTx = await contract.registerProduct(productId, ipfsCid, publicKey);
        await productTx.wait();
        console.log("產品註冊成功！產品 ID:", productId);

        // 7. 驗證產品信息
        console.log("\n7. 驗證產品信息...");
        const productInfo = await contract.getProduct(productId);
        console.log("鏈上產品信息:", {
            ipfsCid: productInfo[0],
            publicKey: productInfo[1],
            registrationTime: new Date(Number(productInfo[2]) * 1000).toLocaleString(),
            isActive: productInfo[3]
        });

        // 8. 從 IPFS 讀取產品詳細信息
        console.log("\n8. 從 IPFS 讀取產品詳細信息...");
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`);
        if (!response.ok) {
            throw new Error(`讀取失敗: ${response.statusText}`);
        }
        const retrievedData = await response.json();
        console.log("IPFS 存儲的產品詳細信息:", retrievedData);

    } catch (error) {
        console.error("測試過程中發生錯誤:", error.message);
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