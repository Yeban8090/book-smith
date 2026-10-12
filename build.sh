#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
npm run check:release
npm run build

version=$(node -p "require('./manifest.json').version")
zip_path="$(pwd)/../book-smith-${version}.zip"
if [ -f "$zip_path" ]; then
    read -r -p "文件 ${zip_path} 已存在，是否覆盖？(y/n) " answer
    if [ "$answer" != "y" ]; then
        echo "打包已取消"
        exit 1
    fi
fi

package_dir=$(mktemp -d)
trap 'rm -rf "$package_dir"' EXIT
mkdir "$package_dir/book-smith"
cp main.js manifest.json styles.css "$package_dir/book-smith/"
(
    cd "$package_dir"
    zip -r package.zip book-smith
)
mv "$package_dir/package.zip" "$zip_path"
echo "打包完成：${zip_path}"
