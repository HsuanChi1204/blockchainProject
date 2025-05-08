/**
 * Ed25519 密鑰管理模組
 * 使用 tweetnacl 庫實現 Ed25519 加密算法
 * Ed25519 是一種高效且安全的非對稱加密算法，特別適合用於數位簽章
 */
const nacl = require('tweetnacl');
const { Buffer } = require('buffer');

/**
 * 生成新的 Ed25519 密鑰對
 * @returns {Object} 包含公鑰和私鑰的對象，以十六進制字符串形式返回
 */
function generateKeyPair() {
    // 使用 tweetnacl 生成密鑰對
    const keyPair = nacl.sign.keyPair();
    // 將密鑰轉換為十六進制字符串格式
    return {
        publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
        privateKey: Buffer.from(keyPair.secretKey).toString('hex')
    };
}

/**
 * 使用私鑰對訊息進行簽章
 * @param {string} message - 需要簽章的訊息
 * @param {string} privateKeyHex - 私鑰（十六進制字符串）
 * @returns {string} 簽章結果（十六進制字符串）
 */
async function sign(message, privateKeyHex) {
    try {
        // 檢查 privateKeyHex 是否有前綴 '0x'，如果有則去除
        if (privateKeyHex.startsWith('0x')) {
            privateKeyHex = privateKeyHex.substring(2);
        }
        
        // 如果私鑰長度不足，自動補足到完整長度（測試環境使用）
        if (privateKeyHex.length < 128) {
            privateKeyHex = privateKeyHex.padEnd(128, '0');
        }
        
        // 私鑰必須是64字節（128個十六進制字符）
        if (privateKeyHex.length !== 128) {
            throw new Error(`Invalid private key length: ${privateKeyHex.length} chars, expected 128`);
        }
        
        // 轉換私鑰為 Uint8Array
        const secretKey = Buffer.from(privateKeyHex, 'hex');
        
        // 由於 tweetnacl 需要完整密鑰對，若我們只有 secretKey，可能會有問題
        // 這裡我們嘗試從 secretKey 提取 publicKey（Ed25519 私鑰的前32字節通常包含公鑰）
        const keyPair = {
            secretKey: secretKey,
            publicKey: secretKey.slice(0, 32)  // 嘗試從私鑰提取公鑰部分
        };
        
        // 將訊息轉換為 Uint8Array 格式
        const messageUint8 = new TextEncoder().encode(message);
        
        // 使用 tweetnacl 生成獨立簽章
        const signature = nacl.sign.detached(messageUint8, secretKey);
        
        // 將簽章轉換為十六進制字符串
        return Buffer.from(signature).toString('hex');
    } catch (error) {
        console.error('Signing error:', error);
        throw new Error(`Failed to sign message: ${error.message}`);
    }
}

/**
 * 驗證簽章的有效性
 * @param {string} message - 原始訊息
 * @param {string} signatureHex - 簽章（十六進制字符串）
 * @param {string} publicKeyHex - 公鑰（十六進制字符串）
 * @returns {boolean} 驗證結果
 */
async function verifySignature(message, signatureHex, publicKeyHex) {
    try {
        // 檢查 publicKeyHex 是否有前綴 '0x'，如果有則去除
        if (publicKeyHex.startsWith('0x')) {
            publicKeyHex = publicKeyHex.substring(2);
        }
        
        // 將訊息轉換為 Uint8Array 格式
        const messageUint8 = new TextEncoder().encode(message);
        
        // 將簽章和公鑰轉換為 Uint8Array 格式
        const signatureUint8 = Buffer.from(signatureHex, 'hex');
        const publicKeyUint8 = Buffer.from(publicKeyHex, 'hex');
        
        // 使用 tweetnacl 驗證簽章
        return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
    } catch (error) {
        console.error('Verification error:', error);
        throw new Error(`Failed to verify signature: ${error.message}`);
    }
}

module.exports = { 
    generateKeyPair,
    sign,
    verifySignature
}; 