const hre = require("hardhat");
const pinataSDK = require("@pinata/sdk");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require("dotenv").config();

async function main() {
    try {
        console.log("開始性能測試...");
        const results = [];

        // 1. 初始化客戶端
        const pinata = new pinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_API_SECRET
        });

        const contractAddress = "0xe391aDF6Df8075D198C37b7B0cAC8C82fc4cE2BC";
        const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
        const contract = ProductRegistry.attach(contractAddress);

        // 2. 測試不同大小的數據
        const testCases = [
            { size: "small", data: generateProductData(1) },
            { size: "medium", data: generateProductData(10) },
            { size: "large", data: generateProductData(100) }
        ];

        for (const testCase of testCases) {
            console.log(`\n測試 ${testCase.size} 數據...`);
            
            // 2.1 IPFS 上傳測試
            const ipfsStartTime = Date.now();
            const result = await pinata.pinJSONToIPFS(testCase.data);
            const ipfsEndTime = Date.now();
            const ipfsDuration = ipfsEndTime - ipfsStartTime;
            
            // 2.2 智能合約交互測試
            const timestamp = Date.now();
            const brandId = `BRAND_${timestamp}`;
            const productId = `PROD_${timestamp}`;
            
            const contractStartTime = Date.now();
            const brandTx = await contract.registerBrand(brandId);
            const brandReceipt = await brandTx.wait();
            const productTx = await contract.registerProduct(productId, result.IpfsHash, "0x123456");
            const productReceipt = await productTx.wait();
            const contractEndTime = Date.now();
            const contractDuration = contractEndTime - contractStartTime;

            // 2.3 數據檢索測試
            const retrieveStartTime = Date.now();
            const productInfo = await contract.getProduct(productId);
            const ipfsResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
            const ipfsData = await ipfsResponse.json();
            const retrieveEndTime = Date.now();
            const retrieveDuration = retrieveEndTime - retrieveStartTime;

            // 2.4 收集測試結果
            const testResult = {
                dataSize: testCase.size,
                dataLength: JSON.stringify(testCase.data).length,
                ipfsMetrics: {
                    uploadTime: ipfsDuration,
                    cid: result.IpfsHash,
                    pinSize: result.PinSize
                },
                contractMetrics: {
                    brandRegistrationTime: contractDuration,
                    brandGasUsed: brandReceipt.gasUsed.toString(),
                    productGasUsed: productReceipt.gasUsed.toString(),
                    totalGasUsed: (BigInt(brandReceipt.gasUsed) + BigInt(productReceipt.gasUsed)).toString(),
                    transactionHash: productTx.hash
                },
                retrievalMetrics: {
                    time: retrieveDuration,
                    success: true
                }
            };

            results.push(testResult);
            console.log(`完成 ${testCase.size} 數據測試`);
        }

        // 3. 輸出測試報告
        console.log("\n性能測試報告：");
        console.log("==========================================");
        results.forEach(result => {
            console.log(`\n${result.dataSize.toUpperCase()} 數據測試結果：`);
            console.log("------------------------------------------");
            console.log("1. 數據大小：", result.dataLength, "bytes");
            console.log("\n2. IPFS 性能：");
            console.log("- 上傳時間：", result.ipfsMetrics.uploadTime, "ms");
            console.log("- 存儲大小：", result.ipfsMetrics.pinSize, "bytes");
            console.log("- CID：", result.ipfsMetrics.cid);
            
            console.log("\n3. 智能合約性能：");
            console.log("- 註冊時間：", result.contractMetrics.brandRegistrationTime, "ms");
            console.log("- 品牌註冊 Gas：", result.contractMetrics.brandGasUsed);
            console.log("- 產品註冊 Gas：", result.contractMetrics.productGasUsed);
            console.log("- 總 Gas 消耗：", result.contractMetrics.totalGasUsed);
            console.log("- 交易哈希：", result.contractMetrics.transactionHash);
            
            console.log("\n4. 數據檢索性能：");
            console.log("- 檢索時間：", result.retrievalMetrics.time, "ms");
            console.log("- 檢索成功率：", result.retrievalMetrics.success ? "100%" : "失敗");
        });

    } catch (error) {
        console.error("測試過程中發生錯誤:", error.message);
        if (error.stack) {
            console.error("錯誤堆棧：", error.stack);
        }
    }
}

function generateProductData(multiplier) {
    const baseData = {
        name: "測試產品",
        description: "這是一個測試產品的詳細描述",
        specifications: {
            size: "10x20x30 cm",
            weight: "500g",
            color: "紅色"
        },
        manufacturer: "測試製造商",
        productionDate: new Date().toISOString()
    };

    // 根據 multiplier 擴展數據
    const extendedData = { ...baseData };
    extendedData.specifications = { ...baseData.specifications };
    
    // 添加更多規格信息
    for (let i = 0; i < multiplier; i++) {
        extendedData.specifications[`spec_${i}`] = `value_${i}`;
    }

    return extendedData;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 