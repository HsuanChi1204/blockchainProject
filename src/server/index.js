const express = require('express');
const cors = require('cors');
const pinataSDK = require('@pinata/sdk');
const { sign, verifySignature, generateKeyPair } = require('../crypto/ed25519');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { ethers } = require("ethers");
const productRegistryAbi = require("../../artifacts/contracts/ProductRegistry.sol/ProductRegistry.json").abi;
const nacl = require('tweetnacl');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// 如果環境變數中沒有 PRIVATE_KEY，使用一個臨時的測試私鑰
if (!process.env.PRIVATE_KEY) {
    process.env.PRIVATE_KEY = "123456789abcdef123456789abcdef123456789abcdef123456789abcdef1234"; // 臨時測試私鑰
    console.log("使用臨時測試私鑰，請在生產環境設定真實私鑰");
}

const app = express();
app.use(cors());

// 先註冊檔案上傳相關路由
// 2. 上傳產品信息到 IPFS
app.post('/api/products/ipfs', upload.any(), async (req, res) => {
    try {
        console.log('req.body:', req.body);
        console.log('req.files:', req.files);
        let requestData;
        if (req.body.productData) {
            requestData = JSON.parse(req.body.productData);
        } else {
            requestData = req.body;
        }
        // 驗證數據
        const validationErrors = validateProductData(requestData);
        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }
        // 圖片處理
        let imageUrl = '';
        const imageFile = req.files && req.files.find(f => f.fieldname === 'image');
        if (imageFile) {
            // 上傳圖片到 Pinata
            let pinataResult;
            try {
                const readableStream = fs.createReadStream(imageFile.path);
                pinataResult = await pinata.pinFileToIPFS(readableStream);
                imageUrl = `https://gateway.pinata.cloud/ipfs/${pinataResult.IpfsHash}`;
            } catch (err) {
                // mock imageUrl
                imageUrl = 'https://placehold.co/300x300?text=Mock+Image';
            }
            // 刪除暫存檔
            fs.unlink(imageFile.path, () => {});
        }
        // 準備產品數據
        const productData = {
            ...requestData,
            imageUrl,
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        let result;
        try {
            // 上傳到 IPFS
            result = await pinata.pinJSONToIPFS(productData);
        } catch (error) {
            // mock IPFS
            result = { IpfsHash: 'QmT1234567890abcdef1234567890abcdef1234567890abcd' + Math.floor(Math.random() * 1000000).toString() };
        }
        // 生成 NFC Tag 數據
        const nfcData = {
            productId: requestData.productId,
            brandId: requestData.brandId,
            serialNumber: requestData.serialNumber,
            verificationUrl: `${process.env.VERIFICATION_BASE_URL || 'http://localhost:3000'}/verify/${requestData.productId}`
        };
        const response = {
            success: true,
            ipfsHash: result.IpfsHash,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
            nfcData,
            productId: requestData.productId,
            brandId: requestData.brandId,
            serialNumber: requestData.serialNumber,
            imageUrl,
            timestamp: new Date().toISOString()
        };
        logApiCall('/api/products/ipfs', requestData, response);
        res.json(response);
    } catch (error) {
        const errorResponse = { error: error.message };
        logApiCall('/api/products/ipfs', req.body, errorResponse);
        res.status(500).json(errorResponse);
    }
});

// 其他路由才加上 express.json()
app.use(express.json());

// 創建日誌目錄
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// 日誌記錄函數
function logApiCall(endpoint, request, response) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        endpoint,
        request,
        response
    };
    
    const logFile = path.join(logDir, 'api_calls.json');
    let logs = [];
    
    if (fs.existsSync(logFile)) {
        logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}

// 初始化 Pinata 客戶端
const pinata = new pinataSDK({
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretApiKey: process.env.PINATA_API_SECRET
});

// 初始化智能合約
const contractAddress = "0xe391aDF6Df8075D198C37b7B0cAC8C82fc4cE2BC";
let contract;

// 臨時 mock function 與變數，用於測試
const mockProducts = {
    "PROD_TEST_001": {
        ipfsCid: "QmTpci23rn5ENmSgxj3DN9nqRDcuY887WSdhjrBRyZG8MH",
        publicKey: "0x123456",
        timestamp: Math.floor(Date.now() / 1000),
        isActive: true
    },
    "PROD_001": {
        ipfsCid: "QmSYBWRM6s4e69bhCPhg9hL8K3P6JraYRdqo2jetsjgpjg",
        publicKey: "0x123456",
        timestamp: Math.floor(Date.now() / 1000),
        isActive: true
    }
};

const mockBrands = {
    "BRAND_TEST_001": { registered: true, timestamp: Math.floor(Date.now() / 1000) },
    "BRAND_001": { registered: true, timestamp: Math.floor(Date.now() / 1000) }
};

async function initContract() {
    try {
        if (process.env.USE_MOCK_CONTRACT === 'true') throw new Error('Mock mode enabled');
        // 1. 初始化 provider (v6)
        const provider = new ethers.JsonRpcProvider("https://rpc.cardona.zkevm-rpc.com");
        // 2. 初始化 wallet (v6)
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        // 3. 初始化合約 (v6)
        contract = new ethers.Contract(contractAddress, productRegistryAbi, wallet);
        console.log("Contract initialized successfully (real chain)");
    } catch (error) {
        console.error("Failed to initialize contract:", error.message);
        console.log("Using mock contract for testing...");
        // 建立 mock 合約用於測試
        contract = {
            registerBrand: async (brandId) => {
                console.log(`Mock: Registering brand ${brandId}`);
                mockBrands[brandId] = {
                    registered: true,
                    timestamp: Math.floor(Date.now() / 1000)
                };
                return {
                    hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    wait: async () => ({
                        blockNumber: Math.floor(Math.random() * 1000000),
                        gasUsed: { toString: () => Math.floor(Math.random() * 1000000).toString() }
                    })
                };
            },
            registerProduct: async (productId, ipfsCid, publicKey) => {
                console.log(`Mock: Registering product ${productId} with CID ${ipfsCid}`);
                mockProducts[productId] = {
                    ipfsCid,
                    publicKey,
                    timestamp: Math.floor(Date.now() / 1000),
                    isActive: true
                };
                return {
                    hash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    wait: async () => ({
                        blockNumber: Math.floor(Math.random() * 1000000),
                        gasUsed: { toString: () => Math.floor(Math.random() * 1000000).toString() }
                    })
                };
            },
            getProduct: async (productId) => {
                console.log(`Mock: Getting product ${productId}`);
                if (!mockProducts[productId]) {
                    throw new Error(`Product ${productId} not found`);
                }
                const product = mockProducts[productId];
                return [
                    product.ipfsCid,
                    product.publicKey,
                    product.timestamp,
                    product.isActive
                ];
            }
        };
    }
}

// 資料驗證函數
function validateProductData(data) {
    const errors = [];

    // 必填欄位驗證
    if (!data.productId) errors.push('Product ID is required');
    if (!data.brandId) errors.push('Brand ID is required');
    if (!data.name) errors.push('Product name is required');
    if (!data.serialNumber) errors.push('Serial number is required');
    if (!data.manufactureDate) errors.push('Manufacture date is required');

    // 格式驗證
    if (data.productId && !/^[A-Z0-9_]{3,20}$/.test(data.productId)) {
        errors.push('Product ID must be 3-20 characters long and contain only uppercase letters, numbers, and underscores');
    }
    if (data.brandId && !/^[A-Z0-9_]{3,20}$/.test(data.brandId)) {
        errors.push('Brand ID must be 3-20 characters long and contain only uppercase letters, numbers, and underscores');
    }
    if (data.serialNumber && !/^[A-Z0-9-]{3,20}$/.test(data.serialNumber)) {
        errors.push('Serial number must be 3-20 characters long and contain only uppercase letters, numbers, and hyphens');
    }
    if (data.manufactureDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.manufactureDate)) {
        errors.push('Manufacture date must be in YYYY-MM-DD format');
    }

    // 選填欄位驗證
    if (data.price && (isNaN(data.price) || data.price < 0)) {
        errors.push('Price must be a positive number');
    }
    if (data.warranty?.period && !/^\d+\s*(year|month|day)s?$/.test(data.warranty.period)) {
        errors.push('Warranty period must be in format: "X year(s)", "X month(s)", or "X day(s)"');
    }
    if (data.warranty?.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.warranty.startDate)) {
        errors.push('Warranty start date must be in YYYY-MM-DD format');
    }

    return errors;
}

// API 路由

// 1. 註冊品牌
app.post('/api/brands', async (req, res) => {
    const requestData = req.body;
    try {
        const { brandId } = requestData;
        const tx = await contract.registerBrand(brandId);
        const receipt = await tx.wait();
        
        const response = {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
        };
        
        logApiCall('/api/brands', requestData, response);
        res.json(response);
    } catch (error) {
        const errorResponse = { error: error.message };
        logApiCall('/api/brands', requestData, errorResponse);
        res.status(500).json(errorResponse);
    }
});

// 3. 註冊產品
app.post('/api/products', async (req, res) => {
    const requestData = req.body;
    try {
        // 強制要求所有欄位必須存在
        const productId = requestData.productId;
        const brandId = requestData.brandId;
        const serialNumber = requestData.serialNumber;
        const ipfsCid = requestData.ipfsCid;
        if (!productId || !brandId || !serialNumber || !ipfsCid) {
            throw new Error('productId, brandId, serialNumber, ipfsCid are required for product registration and signature.');
        }
        if (!process.env.PRIVATE_KEY) {
            throw new Error('Private key is not configured in environment variables');
        }
        // 用工具檔產生 Ed25519 公私鑰
        const { publicKey, privateKey } = generateKeyPair();
        // 用工具檔產生簽章（用產品私鑰簽名）
        const message = JSON.stringify({ productId, brandId, serialNumber });
        const signature = await sign(message, privateKey);
        // 用公鑰上鏈
        const tx = await contract.registerProduct(productId, ipfsCid, publicKey);
        const receipt = await tx.wait();
        const response = {
            success: true,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            signature,
            tagPublicKey: publicKey,
            productId,
            brandId,
            serialNumber,
            ipfsCid,
            timestamp: new Date().toISOString(),
            ed25519: {
                publicKey,
                privateKey,
                signature
            },
            signedMessage: message // 確保 message 一致
        };
        logApiCall('/api/products', requestData, response);
        res.json(response);
    } catch (error) {
        const errorResponse = { error: error.message };
        logApiCall('/api/products', requestData, errorResponse);
        res.status(500).json(errorResponse);
    }
});

// 4. 進階驗證產品
app.post('/api/products/:productId/verify', async (req, res) => {
    const requestData = req.body;
    try {
        const { productId } = req.params;
        const { brandId, serialNumber, signature, tagPublicKey } = requestData;
        let productInfo;
        let blockchainError = null;
        let usingMockData = false;

        // 查詢區塊鏈
        try {
            productInfo = await contract.getProduct(productId);
        } catch (error) {
            blockchainError = error.message;
            if (mockProducts && mockProducts[productId]) {
                const product = mockProducts[productId];
                productInfo = [
                    product.ipfsCid,
                    product.publicKey,
                    product.timestamp,
                    product.isActive
                ];
                usingMockData = true;
            } else {
                throw new Error(`Product ${productId} not found or contract error: ${error.message}`);
            }
        }

        // 從 IPFS 取得產品詳細資料
        let productData;
        let ipfsError = null;
        try {
            const ipfsResponse = await fetch(`https://gateway.pinata.cloud/ipfs/${productInfo[0]}`);
            if (!ipfsResponse.ok) throw new Error(`IPFS fetch returned status ${ipfsResponse.status}`);
            productData = await ipfsResponse.json();
        } catch (error) {
            ipfsError = error.message;
            if (usingMockData) {
                productData = {
                    productId,
                    brandId: productId.includes("TEST") ? "BRAND_TEST_001" : "BRAND_001",
                    name: `${productId} Demo Product`,
                    serialNumber: `SN-${productId}`,
                    manufactureDate: "2024-05-01",
                    description: "This is a mock product for testing purposes",
                    price: 1999,
                    model: "DEMO-X1",
                    specifications: { material: "Premium Metal", size: "Medium", color: "Silver" },
                    warranty: { period: "2 years", startDate: "2024-05-01" },
                    registrationDate: new Date(Number(productInfo[2]) * 1000).toISOString(),
                    imageUrl: "https://placehold.co/300x300?text=Mock+Image"
                };
            } else {
                productData = {
                    productId,
                    brandId: "Unknown (IPFS Error)",
                    name: "Unknown Product",
                    serialNumber: "Unknown",
                    manufactureDate: "Unknown",
                    description: "Unable to fetch product details from IPFS",
                    registrationDate: new Date(Number(productInfo[2]) * 1000).toISOString(),
                    imageUrl: ""
                };
            }
        }

        // 1. 統一由後端組裝 message
        let signatureValid = false;
        let signatureError = null;
        const message = JSON.stringify({ productId, brandId, serialNumber });
        try {
            signatureValid = await verifySignature(message, signature, tagPublicKey);
        } catch (error) {
            signatureError = error.message;
        }

        // 2. 比對 tag 內容與區塊鏈/IPFS 資料
        const brandIdMatch = productData.brandId === brandId;
        const serialNumberMatch = productData.serialNumber === serialNumber;
        const productIdMatch = productData.productId === productId;

        const response = {
            success: true,
            productInfo: {
                ipfsCid: productInfo[0],
                publicKey: productInfo[1],
                registrationTime: new Date(Number(productInfo[2]) * 1000).toISOString(),
                isActive: productInfo[3],
                productData,
                signatureValid,
                brandIdMatch,
                serialNumberMatch,
                productIdMatch,
                ipfsUrl: `https://gateway.pinata.cloud/ipfs/${productInfo[0]}`,
                verificationTimestamp: new Date().toISOString(),
                usingMockData,
                diagnostics: {
                    blockchainError,
                    ipfsError,
                    signatureError,
                    message // 回傳實際驗證用的 message，方便 debug
                }
            }
        };
        logApiCall('/api/products/verify', requestData, response);
        res.json(response);
    } catch (error) {
        const errorResponse = { error: error.message };
        logApiCall('/api/products/verify', requestData, errorResponse);
        res.status(500).json(errorResponse);
    }
});

// 5. 生成數位簽章
app.post('/api/sign', async (req, res) => {
    const requestData = req.body;
    try {
        const { message, privateKey } = requestData;
        
        if (!privateKey) {
            throw new Error('Private key is required');
        }
        
        // 嘗試生成簽章
        let signature;
        try {
            signature = await sign(message, privateKey);
        } catch (signError) {
            console.error('Error generating signature:', signError);
            throw new Error(`Signature generation failed: ${signError.message}`);
        }
        
        const response = {
            success: true,
            signature,
            timestamp: new Date().toISOString()
        };
        
        logApiCall('/api/sign', requestData, response);
        res.json(response);
    } catch (error) {
        const errorResponse = { error: error.message };
        logApiCall('/api/sign', requestData, errorResponse);
        res.status(500).json(errorResponse);
    }
});

// 6. 獲取 API 調用日誌
app.get('/api/logs', (req, res) => {
    try {
        const logFile = path.join(logDir, 'api_calls.json');
        if (fs.existsSync(logFile)) {
            const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            res.json({ success: true, logs });
        } else {
            res.json({ success: true, logs: [] });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    await initContract();
    console.log(`Server running on port ${PORT}`);
}); 