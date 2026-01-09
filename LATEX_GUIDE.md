# LaTeX コンパイルガイド / LaTeX Compilation Guide

このガイドでは、生成されたLaTeXファイルをPDFに変換する方法を説明します。

## オンラインでコンパイル（推奨）

### Overleaf（最も簡単）

1. [Overleaf](https://www.overleaf.com/)にアクセス
2. 新しいプロジェクトを作成
3. ダウンロードした `mitou_application.tex` ファイルをアップロード
4. コンパイラを「LaTeX」に設定
5. 「Recompile」をクリックしてPDFを生成

### Cloud LaTeX

1. [Cloud LaTeX](https://cloudlatex.io/)にアクセス
2. 新しいプロジェクトを作成
3. `mitou_application.tex` をアップロード
4. 自動的にPDFが生成されます

## ローカルでコンパイル

### macOS

```bash
# MacTeXをインストール（初回のみ）
brew install --cask mactex

# LaTeXファイルをコンパイル
platex mitou_application.tex
dvipdfmx mitou_application.dvi
```

### Windows

1. [TeX Live](https://www.tug.org/texlive/)または[W32TeX](https://www.tug.org/interest.html#free)をインストール
2. コマンドプロンプトを開く
3. 以下のコマンドを実行：

```cmd
platex mitou_application.tex
dvipdfmx mitou_application.dvi
```

### Linux (Ubuntu/Debian)

```bash
# TeX Liveをインストール（初回のみ）
sudo apt-get install texlive-lang-japanese texlive-fonts-recommended

# LaTeXファイルをコンパイル
platex mitou_application.tex
dvipdfmx mitou_application.dvi
```

## トラブルシューティング

### 日本語が正しく表示されない

- `jarticle`クラスに対応したLaTeXディストリビューションを使用していることを確認してください
- `texlive-lang-japanese`パッケージがインストールされていることを確認してください

### コンパイルエラーが発生する

- 特殊文字が正しくエスケープされているか確認してください
- エラーメッセージを読み、該当行を確認してください
- オンラインサービス（Overleaf）を使用すると、多くの場合問題を回避できます

## 生成されるファイル

コンパイル後、以下のファイルが生成されます：

- `mitou_application.dvi` - デバイス独立形式の中間ファイル
- `mitou_application.pdf` - 最終的なPDFファイル（提出用）
- `mitou_application.aux`, `.log` など - 補助ファイル（削除可能）

## ヘルプ

問題が解決しない場合は、[TeX Wiki](https://texwiki.texjp.org/)や[TeX フォーラム](https://oku.edu.mie-u.ac.jp/tex/)を参照してください。
