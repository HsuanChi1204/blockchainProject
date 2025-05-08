const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// 提供靜態文件
app.use(express.static(path.join(__dirname)));

// 啟動服務器
app.listen(port, () => {
    console.log(`Frontend server running at http://localhost:${port}`);
}); 