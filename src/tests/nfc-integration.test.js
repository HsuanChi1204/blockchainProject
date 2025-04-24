const NFCTag = require('../nfc/NFCTag');
const Ed25519Manager = require('../crypto/ed25519');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * NFC 標籤整合測試套件
 * 測試 NFC 標籤數據生成、簽章和驗證功能
 */
describe('NFC Tag Integration Tests', () => {
    let nfcTag;
    let ed25519;
    const testData = {
        productId: 'TEST-001',
        brandId: 'BRAND-001',
        manufacturingDate: '2024-03-20',
        batchNumber: 'BATCH-001'
    };

    /**
     * 測試前的設置
     * 初始化 NFC 標籤和加密管理器
     */
    before(() => {
        nfcTag = new NFCTag(
            testData.productId,
            testData.brandId,
            testData.manufacturingDate,
            testData.batchNumber
        );
        ed25519 = new Ed25519Manager();
    });

    /**
     * 測試 NFC 標籤數據生成
     * 驗證生成的數據結構是否正確
     */
    it('should generate valid NFC tag data', () => {
        const tagData = nfcTag.createTagData();
        assert(tagData.productInfo, 'Product info should exist');
        assert(tagData.signature, 'Signature should exist');
        assert(tagData.publicKey, 'Public key should exist');
        assert(tagData.timestamp, 'Timestamp should exist');
    });

    /**
     * 測試簽章生成
     * 驗證簽章生成是否成功
     */
    it('should generate valid signature', () => {
        const tagData = nfcTag.createTagData();
        const signature = tagData.signature;
        assert(signature && signature.length === 128, 'Signature should be 64 bytes (128 hex chars)');
    });

    /**
     * 測試數據驗證
     * 驗證生成的數據是否能被正確驗證
     */
    it('should verify tag data', () => {
        const tagData = nfcTag.createTagData();
        const isValid = Ed25519Manager.verify(
            nfcTag.getSignableMessage(),
            tagData.signature,
            tagData.publicKey
        );
        assert(isValid === true, 'Tag data should be valid');
    });

    /**
     * 測試文件保存和讀取
     * 驗證 NFC 標籤數據是否能被保存和讀取
     */
    it('should save and load tag data', () => {
        const tagData = nfcTag.createTagData();
        const filePath = path.join(__dirname, 'test-tag.json');
        
        // 保存數據
        NFCTag.saveToFile(filePath, tagData);
        assert(fs.existsSync(filePath), 'File should be created');

        // 讀取數據
        const loadedData = NFCTag.loadFromFile(filePath);
        assert.deepStrictEqual(loadedData, tagData, 'Loaded data should match original data');

        // 清理測試文件
        fs.unlinkSync(filePath);
    });

    /**
     * 測試篡改檢測
     * 驗證篡改後的數據是否會被拒絕
     */
    it('should detect tampered data', () => {
        const tagData = nfcTag.createTagData();
        tagData.productInfo.productId = 'TAMPERED-001';
        
        const isValid = Ed25519Manager.verify(
            nfcTag.getSignableMessage(),
            tagData.signature,
            tagData.publicKey
        );
        assert(isValid === false, 'Tampered data should be invalid');
    });
}); 