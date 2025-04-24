const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * ProductRegistry 智能合約測試套件
 * 測試品牌註冊、產品註冊和權限控制功能
 */
describe("ProductRegistry", function () {
    let ProductRegistry;
    let productRegistry;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    const testBrandId = "BRAND001";
    const testProductId = "PROD001";
    const testIpfsCid = "QmTest...";
    const testPublicKey = "ed25519_public_key_hex";

    /**
     * 測試前的設置
     * 部署合約並設置測試賬戶
     */
    beforeEach(async function () {
        // 獲取測試賬戶
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        
        // 部署合約
        ProductRegistry = await ethers.getContractFactory("ProductRegistry");
        productRegistry = await ProductRegistry.deploy();
        await productRegistry.deployed();
    });

    /**
     * 測試合約部署
     * 驗證合約是否正確部署
     */
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await productRegistry.owner()).to.equal(owner.address);
        });
    });

    /**
     * 測試品牌註冊功能
     * 驗證品牌註冊的權限控制和事件觸發
     */
    describe("Brand Registration", function () {
        it("Should register a new brand", async function () {
            await productRegistry.registerBrand(testBrandId);
            expect(await productRegistry.isBrandRegistered(testBrandId)).to.be.true;
        });

        it("Should not allow registering the same brand twice", async function () {
            await productRegistry.registerBrand(testBrandId);
            await expect(
                productRegistry.registerBrand(testBrandId)
            ).to.be.revertedWith("Brand already registered");
        });

        it("Should not allow non-owner to register brand", async function () {
            await expect(
                productRegistry.connect(addr1).registerBrand(testBrandId)
            ).to.be.revertedWithCustomError(productRegistry, "OwnableUnauthorizedAccount");
        });
    });

    /**
     * 測試產品註冊功能
     * 驗證產品註冊的權限控制和數據存儲
     */
    describe("Product Registration", function () {
        beforeEach(async function () {
            await productRegistry.registerBrand(testBrandId);
        });

        it("Should register a new product", async function () {
            await productRegistry.registerProduct(testProductId, testIpfsCid, testPublicKey);
            const product = await productRegistry.getProduct(testProductId);
            
            expect(product.ipfsCid).to.equal(testIpfsCid);
            expect(product.publicKey).to.equal(testPublicKey);
            expect(product.isActive).to.be.true;
        });

        it("Should not allow registering the same product twice", async function () {
            await productRegistry.registerProduct(testProductId, testIpfsCid, testPublicKey);
            await expect(
                productRegistry.registerProduct(testProductId, testIpfsCid, testPublicKey)
            ).to.be.revertedWith("Product already registered");
        });

        it("Should allow deactivating a product", async function () {
            await productRegistry.registerProduct(testProductId, testIpfsCid, testPublicKey);
            await productRegistry.deactivateProduct(testProductId);
            
            await expect(
                productRegistry.getProduct(testProductId)
            ).to.be.revertedWith("Product not found or not active");
        });

        it("Should not allow non-owner to register product", async function () {
            await expect(
                productRegistry.connect(addr1).registerProduct(testProductId, testIpfsCid, testPublicKey)
            ).to.be.revertedWithCustomError(productRegistry, "OwnableUnauthorizedAccount");
        });
    });

    /**
     * 測試產品查詢功能
     * 驗證產品信息的正確存儲和檢索
     */
    describe("Product Queries", function () {
        const testCid = "QmTest123";
        const testPublicKey = "0x1234567890abcdef";

        beforeEach(async function () {
            await productRegistry.registerBrand(addr1.address);
            await productRegistry.connect(addr1).registerProduct(
                "PROD123",
                testCid,
                testPublicKey
            );
        });

        it("Should return correct product information", async function () {
            const product = await productRegistry.getProduct("PROD123");
            expect(product.ipfsCid).to.equal(testCid);
            expect(product.publicKey).to.equal(testPublicKey);
            expect(product.isActive).to.be.true;
        });

        it("Should return empty product for non-existent product", async function () {
            const product = await productRegistry.getProduct("NONEXISTENT");
            expect(product.ipfsCid).to.equal("");
            expect(product.publicKey).to.equal("0x0000000000000000000000000000000000000000");
            expect(product.isActive).to.be.false;
        });
    });

    /**
     * 測試產品停用功能
     * 驗證產品停用的權限控制和狀態更新
     */
    describe("Product Deactivation", function () {
        const testCid = "QmTest123";
        const testPublicKey = "0x1234567890abcdef";

        beforeEach(async function () {
            await productRegistry.registerBrand(addr1.address);
            await productRegistry.connect(addr1).registerProduct(
                "PROD123",
                testCid,
                testPublicKey
            );
        });

        it("Should allow owner to deactivate product", async function () {
            await expect(productRegistry.deactivateProduct("PROD123"))
                .to.emit(productRegistry, "ProductDeactivated")
                .withArgs("PROD123");
            
            const product = await productRegistry.getProduct("PROD123");
            expect(product.isActive).to.be.false;
        });

        it("Should not allow non-owner to deactivate product", async function () {
            await expect(
                productRegistry.connect(addr1).deactivateProduct("PROD123")
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should not allow deactivation of non-existent product", async function () {
            await expect(productRegistry.deactivateProduct("NONEXISTENT"))
                .to.be.revertedWith("Product not registered");
        });
    });

    describe("Gas Usage Analysis", function () {
        it("Should measure gas usage for brand registration", async function () {
            const tx = await productRegistry.registerBrand(testBrandId);
            const receipt = await tx.wait();
            console.log(`Gas used for brand registration: ${receipt.gasUsed}`);
        });

        it("Should measure gas usage for product registration", async function () {
            await productRegistry.registerBrand(testBrandId);
            const tx = await productRegistry.registerProduct(testProductId, testIpfsCid, testPublicKey);
            const receipt = await tx.wait();
            console.log(`Gas used for product registration: ${receipt.gasUsed}`);
        });
    });
}); 