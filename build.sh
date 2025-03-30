#!/bin/bash

# 获取版本号
version=$(grep '"version"' manifest.json | cut -d '"' -f 4)
zip_name="book-smith-${version}.zip"

# 检查目标文件是否存在
if [ -f "../${zip_name}" ]; then
    read -p "文件 ${zip_name} 已存在，是否覆盖？(y/n) " answer
    if [ "$answer" != "y" ]; then
        echo "打包已取消"
        exit 1
    fi
fi

# 创建临时目录
mkdir -p ../temp/book-smith

# 复制必要文件
cp main.js manifest.json styles.css ../temp/book-smith/

# 切换到临时目录的上级目录
cd ../temp

# 创建 zip 文件
zip -r "${zip_name}" book-smith

# 移动 zip 文件到上级目录
mv "${zip_name}" ../

# 清理临时目录
cd ..
rm -rf temp

echo "打包完成：${zip_name}"