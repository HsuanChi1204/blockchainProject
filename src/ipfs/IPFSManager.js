const { Web3Storage, File } = require('web3.storage');
require('dotenv').config();

class IPFSManager {
    constructor(token) {
        if (!token) {
            throw new Error('Web3.Storage token is required');
        }
        this.client = new Web3Storage({ token });
    }

    /**
     * Upload product data to IPFS
     * @param {Object} productData - Product data to upload
     * @returns {Promise<string>} IPFS CID
     */
    async uploadProductData(productData) {
        const buffer = Buffer.from(JSON.stringify(productData));
        const files = [
            new File([buffer], 'product.json')
        ];

        console.time('IPFS Upload');
        const cid = await this.client.put(files);
        console.timeEnd('IPFS Upload');

        return cid;
    }

    /**
     * Retrieve product data from IPFS
     * @param {string} cid - IPFS CID
     * @returns {Promise<Object>} Product data
     */
    async getProductData(cid) {
        console.time('IPFS Retrieve');
        const res = await this.client.get(cid);
        console.timeEnd('IPFS Retrieve');

        if (!res.ok) {
            throw new Error(`Failed to get ${cid}`);
        }

        const files = await res.files();
        const file = files[0];
        const content = await file.text();
        return JSON.parse(content);
    }
}

module.exports = IPFSManager; 