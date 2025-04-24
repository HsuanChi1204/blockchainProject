const Ed25519Manager = require('../crypto/ed25519');
const assert = require('assert');

/**
 * Ed25519 加密功能測試套件
 * 測試密鑰生成、簽章和驗證功能
 */
describe('Ed25519 Cryptography Tests', () => {
    let ed25519;
    let keyPair;
    const testMessage = 'Hello, Blockchain!';

    /**
     * 測試前的設置
     * 生成新的 Ed25519 實例和密鑰對
     */
    before(() => {
        ed25519 = new Ed25519Manager();
        console.time('Key Generation');
        keyPair = ed25519.generateKeyPair();
        console.timeEnd('Key Generation');
    });

    /**
     * 測試密鑰生成功能
     * 驗證生成的密鑰格式是否正確
     */
    it('should generate valid key pairs', () => {
        // 驗證公鑰長度（32字節 = 64個十六進制字符）
        assert(keyPair.publicKey && keyPair.publicKey.length === 64, 'Public key should be 32 bytes (64 hex chars)');
        // 驗證私鑰長度（64字節 = 128個十六進制字符）
        assert(keyPair.privateKey && keyPair.privateKey.length === 128, 'Private key should be 64 bytes (128 hex chars)');
    });

    /**
     * 測試簽章生成功能
     * 驗證簽章生成是否成功
     */
    it('should sign messages', () => {
        console.time('Signature Generation');
        const signature = ed25519.sign(testMessage);
        console.timeEnd('Signature Generation');
        // 驗證簽章長度（64字節 = 128個十六進制字符）
        assert(signature && signature.length === 128, 'Signature should be 64 bytes (128 hex chars)');
    });

    /**
     * 測試簽章驗證功能
     * 驗證正確的簽章是否能被驗證
     */
    it('should verify valid signatures', () => {
        const signature = ed25519.sign(testMessage);
        console.time('Signature Verification');
        const isValid = Ed25519Manager.verify(testMessage, signature, keyPair.publicKey);
        console.timeEnd('Signature Verification');
        assert(isValid === true, 'Signature should be valid');
    });

    /**
     * 測試篡改檢測功能
     * 驗證篡改後的訊息是否會被拒絕
     */
    it('should reject invalid signatures', () => {
        const signature = ed25519.sign(testMessage);
        const tamperedMessage = testMessage + ' tampered';
        console.time('Invalid Signature Verification');
        const isValid = Ed25519Manager.verify(tamperedMessage, signature, keyPair.publicKey);
        console.timeEnd('Invalid Signature Verification');
        assert(isValid === false, 'Signature should be invalid for tampered message');
    });

    /**
     * 性能測試
     * 進行100次驗證以評估系統穩定性
     */
    it('should perform 100 verifications for success rate test', () => {
        const signature = ed25519.sign(testMessage);
        let successCount = 0;
        console.time('100 Verifications');
        for (let i = 0; i < 100; i++) {
            if (Ed25519Manager.verify(testMessage, signature, keyPair.publicKey)) {
                successCount++;
            }
        }
        console.timeEnd('100 Verifications');
        console.log(`Success rate: ${successCount}%`);
        assert(successCount === 100, 'All 100 verifications should succeed');
    });
}); 