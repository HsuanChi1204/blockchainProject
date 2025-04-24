/**
 * Ed25519 密鑰管理類
 * 使用 tweetnacl 庫實現 Ed25519 加密算法
 * Ed25519 是一種高效且安全的非對稱加密算法，特別適合用於數位簽章
 */
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

class Ed25519Manager {
    constructor() {
        // 初始化時不生成密鑰對，等待需要時再生成
        this.keyPair = null;
    }

    /**
     * 生成新的 Ed25519 密鑰對
     * @returns {Object} 包含公鑰和私鑰的對象，以十六進制字符串形式返回
     */
    generateKeyPair() {
        // 使用 tweetnacl 生成密鑰對
        this.keyPair = nacl.sign.keyPair();
        // 將密鑰轉換為十六進制字符串格式
        return {
            publicKey: Buffer.from(this.keyPair.publicKey).toString('hex'),
            privateKey: Buffer.from(this.keyPair.secretKey).toString('hex')
        };
    }

    /**
     * 使用私鑰對訊息進行簽章
     * @param {string} message - 需要簽章的訊息
     * @returns {string} 簽章結果（十六進制字符串）
     */
    sign(message) {
        if (!this.keyPair) {
            throw new Error('No key pair available. Generate one first.');
        }
        // 將訊息轉換為 Uint8Array 格式
        const messageUint8 = new TextEncoder().encode(message);
        // 使用 tweetnacl 生成獨立簽章
        const signature = nacl.sign.detached(messageUint8, this.keyPair.secretKey);
        // 將簽章轉換為十六進制字符串
        return Buffer.from(signature).toString('hex');
    }

    /**
     * 驗證簽章的有效性
     * @param {string} message - 原始訊息
     * @param {string} signature - 簽章（十六進制字符串）
     * @param {string} publicKey - 公鑰（十六進制字符串）
     * @returns {boolean} 驗證結果
     */
    static verify(message, signature, publicKey) {
        // 將訊息轉換為 Uint8Array 格式
        const messageUint8 = new TextEncoder().encode(message);
        // 將簽章和公鑰轉換為 Uint8Array 格式
        const signatureUint8 = Buffer.from(signature, 'hex');
        const publicKeyUint8 = Buffer.from(publicKey, 'hex');
        // 使用 tweetnacl 驗證簽章
        return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
    }
}

module.exports = Ed25519Manager; 