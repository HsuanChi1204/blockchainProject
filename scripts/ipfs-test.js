import dotenv from 'dotenv';
import pinataSDK from '@pinata/sdk';
import fetch from 'node-fetch';
import FormData from 'form-data';

// 設置全局 fetch
if (!globalThis.fetch) {
    globalThis.fetch = fetch;
}

dotenv.config();

async function main() {
    try {
        console.log('初始化 Pinata 客戶端...');
        const pinata = new pinataSDK({
            pinataApiKey: process.env.PINATA_API_KEY,
            pinataSecretApiKey: process.env.PINATA_API_SECRET
        });

        // 測試連接
        await pinata.testAuthentication();
        console.log('Pinata 連接成功！');
        
        console.log('\n準備測試數據...');
        
        // 測試產品數據
        const productData = {
            name: "測試產品-001",
            description: "這是一個測試產品的詳細描述",
            specifications: {
                size: "10x20x30 cm",
                weight: "500g",
                color: "紅色"
            },
            manufacturer: "測試製造商",
            productionDate: new Date().toISOString(),
            images: ["https://example.com/image1.jpg"]
        };

        console.log('正在上傳數據到 IPFS...');
        
        // 上傳到 IPFS
        const result = await pinata.pinJSONToIPFS(productData, {
            pinataMetadata: {
                name: 'product-data.json'
            }
        });
        
        console.log('上傳成功！');
        console.log('IPFS CID:', result.IpfsHash);
        console.log('可以通過以下鏈接訪問：');
        console.log(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);

        // 測試讀取數據
        console.log('\n正在從 IPFS 讀取數據...');
        const response = await fetch(`https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`);
        if (!response.ok) {
            throw new Error(`讀取失敗: ${response.statusText}`);
        }
        const retrievedData = await response.json();
        console.log('讀取的數據：', retrievedData);

    } catch (error) {
        console.error('發生錯誤：', error);
        if (error.message) {
            console.error('錯誤信息：', error.message);
        }
        if (error.stack) {
            console.error('錯誤堆棧：', error.stack);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 