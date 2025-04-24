/**
 * NFC 標籤模擬類
 * 用於模擬實體 NFC 標籤的數據結構和操作
 * 包含產品資訊、簽章和公鑰等數據
 */
class NFCTag {
    /**
     * 創建新的 NFC 標籤實例
     * @param {string} productId - 產品唯一識別碼
     * @param {string} brandId - 品牌識別碼
     * @param {string} manufacturingDate - 生產日期
     * @param {string} batchNumber - 批次號
     */
    constructor(productId, brandId, manufacturingDate, batchNumber) {
        this.productId = productId;
        this.brandId = brandId;
        this.manufacturingDate = manufacturingDate;
        this.batchNumber = batchNumber;
        // 記錄標籤創建時間
        this.timestamp = Date.now();
    }

    /**
     * 獲取待簽署的訊息內容
     * 將所有產品資訊轉換為 JSON 字符串
     * @returns {string} JSON 格式的待簽署訊息
     */
    getSignableMessage() {
        return JSON.stringify({
            productId: this.productId,
            brandId: this.brandId,
            manufacturingDate: this.manufacturingDate,
            batchNumber: this.batchNumber,
            timestamp: this.timestamp
        });
    }

    /**
     * 創建完整的標籤數據，包含簽章和公鑰
     * @param {string} signature - 簽章（十六進制字符串）
     * @param {string} publicKey - 公鑰（十六進制字符串）
     * @returns {Object} 完整的標籤數據
     */
    createTagData(signature, publicKey) {
        return {
            data: {
                productId: this.productId,
                brandId: this.brandId,
                manufacturingDate: this.manufacturingDate,
                batchNumber: this.batchNumber,
                timestamp: this.timestamp
            },
            signature: signature,
            publicKey: publicKey
        };
    }

    /**
     * 將標籤數據保存到本地文件
     * @param {string} filePath - 文件保存路徑
     * @param {Object} tagData - 標籤數據
     */
    static async saveToFile(filePath, tagData) {
        const fs = require('fs').promises;
        // 將數據轉換為格式化的 JSON 字符串
        await fs.writeFile(filePath, JSON.stringify(tagData, null, 2));
    }

    /**
     * 從本地文件讀取標籤數據
     * @param {string} filePath - 文件路徑
     * @returns {Object} 標籤數據
     */
    static async loadFromFile(filePath) {
        const fs = require('fs').promises;
        // 讀取文件內容並解析 JSON
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }
}

module.exports = NFCTag; 