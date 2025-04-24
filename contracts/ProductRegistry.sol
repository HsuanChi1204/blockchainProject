// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * 產品註冊智能合約
 * 用於管理產品和品牌的註冊信息
 * 包含產品資訊、IPFS CID、公鑰等數據
 * 使用 OpenZeppelin 的 Ownable 進行權限控制
 */
contract ProductRegistry is Ownable {
    // 產品數據結構
    struct Product {
        string ipfsCid;        // IPFS 上的產品詳細信息 CID
        string publicKey;      // 用於驗證產品簽章的公鑰
        uint256 registrationTime;  // 產品註冊時間
        bool isActive;         // 產品是否處於活動狀態
    }

    // 產品映射：productId => Product
    mapping(string => Product) public products;
    // 品牌映射：brandId => isRegistered
    mapping(string => bool) public brandIds;

    // 事件定義
    event ProductRegistered(string productId, string ipfsCid, string publicKey);
    event BrandRegistered(string brandId);
    event ProductDeactivated(string productId);

    /**
     * 合約建構函數
     * 設置合約擁有者為部署者
     */
    constructor() Ownable(msg.sender) {}

    /**
     * 註冊新品牌
     * 只有合約擁有者可以調用
     * @param brandId 品牌識別碼
     */
    function registerBrand(string memory brandId) public onlyOwner {
        require(!brandIds[brandId], "Brand already registered");
        brandIds[brandId] = true;
        emit BrandRegistered(brandId);
    }

    /**
     * 註冊新產品
     * 只有合約擁有者可以調用
     * @param productId 產品識別碼
     * @param ipfsCid IPFS 上的產品信息 CID
     * @param publicKey 用於驗證的公鑰
     */
    function registerProduct(
        string memory productId,
        string memory ipfsCid,
        string memory publicKey
    ) public onlyOwner {
        require(!products[productId].isActive, "Product already registered");
        
        products[productId] = Product({
            ipfsCid: ipfsCid,
            publicKey: publicKey,
            registrationTime: block.timestamp,
            isActive: true
        });

        emit ProductRegistered(productId, ipfsCid, publicKey);
    }

    /**
     * 停用產品
     * 只有合約擁有者可以調用
     * @param productId 產品識別碼
     */
    function deactivateProduct(string memory productId) public onlyOwner {
        require(products[productId].isActive, "Product not active");
        products[productId].isActive = false;
        emit ProductDeactivated(productId);
    }

    /**
     * 獲取產品信息
     * @param productId 產品識別碼
     * @return ipfsCid IPFS CID
     * @return publicKey 公鑰
     * @return registrationTime 註冊時間
     * @return isActive 是否活動
     */
    function getProduct(string memory productId) public view returns (
        string memory ipfsCid,
        string memory publicKey,
        uint256 registrationTime,
        bool isActive
    ) {
        Product memory product = products[productId];
        require(product.isActive, "Product not found or not active");
        
        return (
            product.ipfsCid,
            product.publicKey,
            product.registrationTime,
            product.isActive
        );
    }

    /**
     * 檢查品牌是否已註冊
     * @param brandId 品牌識別碼
     * @return 是否已註冊
     */
    function isBrandRegistered(string memory brandId) public view returns (bool) {
        return brandIds[brandId];
    }
} 