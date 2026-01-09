/**
 * MITOU Optimizer - Cloudflare Worker
 * 
 * This worker serves a web application that helps users create
 * MITOU IT project application documents in LaTeX/PDF format.
 */

interface SectionData {
  projectName: string;  // プロジェクト名
  applicantName: string;  // 申請者名
  
  // Section 1: 何をつくるか
  section1_1: string;  // 概要
  section1_2_1: string;  // 背景 - 社会的背景
  section1_2_2: string;  // 背景 - 技術的背景
  section1_2_3: string;  // 背景 - 私的背景
  section1_3: string;  // 現状のプロトタイプ
  section1_4: string;  // 提案の目標
  
  // Section 2: 斬新さの主張、期待される効果など
  section2_1: string;  // 斬新さ(未踏性)の主張
  section2_2: string;  // 期待される効果
  
  // Section 3: どんな出し方を考えているか
  section3: string;
  
  // Section 4: 具体的な進め方と予算
  section4_1_1: string;  // 開発環境 - 開発を行う場所
  section4_1_2: string;  // 開発環境 - 計算機環境
  section4_1_3: string;  // 開発環境 - 使用するツール群
  section4_2: string;  // 事業期間中の開発内容（タスクベース）
  section4_3: string;  // 開発線表
  section4_4_1: string;  // 資金 - 開発にかける時間
  section4_4_2: string;  // 資金 - 予算内訳
  
  // Section 5-8: Keep as before
  section5: string;  // 私の腕前を証明できるもの
  section6: string;  // プロジェクト遂行にあたっての特記事項
  section7: string;  // ソフトウェア作成以外の勉強、特技、生活、趣味など
  section8: string;  // 将来のソフトウェア技術に対して思うこと・期待すること
}

/**
 * Escapes special LaTeX characters in text
 * Security: Backslashes are escaped FIRST to prevent injection attacks
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  
  // SECURITY: Escape backslashes FIRST, before any other replacements
  // This prevents any user input from creating new LaTeX commands
  let result = text.replace(/\\/g, '\\textbackslash{}');
  
  // Escape other special LaTeX characters (safe because backslashes are already escaped)
  result = result.replace(/[&%$#_{}]/g, '\\$&');
  result = result.replace(/\^/g, '\\textasciicircum{}');
  result = result.replace(/~/g, '\\textasciitilde{}');
  
  // Add vertical spacing between paragraphs (double newlines)
  result = result.replace(/\n\n+/g, '\n\n\\vspace{0.3em}\n\n');
  
  return result;
}

/**
 * Generates LaTeX document from section data
 */
function generateLatex(data: SectionData): string {
  let latex = `\\documentclass[a4paper,11pt]{jarticle}
\\usepackage[top=20mm,bottom=20mm,left=20mm,right=20mm]{geometry}
\\usepackage{graphicx}
\\usepackage{url}

\\title{未踏IT人材発掘・育成事業\\\\提案プロジェクト詳細資料}
\\date{\\today}

\\begin{document}

\\maketitle

\\makebox[0pt][l]{\\textbf{プロジェクト名：${escapeLatex(data.projectName)}}}\\\\
\\makebox[0pt][l]{\\textbf{申請者：${escapeLatex(data.applicantName)}}}

\\section{何をつくるか}
\\subsection{概要}
${escapeLatex(data.section1_1)}

\\subsection{背景}
\\subsubsection{社会的背景}
${escapeLatex(data.section1_2_1)}

\\subsubsection{技術的背景}
${escapeLatex(data.section1_2_2)}

\\subsubsection{私的背景}
${escapeLatex(data.section1_2_3)}

\\subsection{現状のプロトタイプ}
${escapeLatex(data.section1_3)}

\\subsection{提案の目標}
${escapeLatex(data.section1_4)}

\\section{斬新さの主張、期待される効果など}
\\subsection{斬新さ(未踏性)の主張}
${escapeLatex(data.section2_1)}

\\subsection{期待される効果}
${escapeLatex(data.section2_2)}

\\section{どんな出し方を考えているか}
${escapeLatex(data.section3)}

\\section{具体的な進め方と予算}
\\subsection{開発環境}
\\subsubsection{開発を行う場所}
${escapeLatex(data.section4_1_1)}

\\subsubsection{計算機環境}
${escapeLatex(data.section4_1_2)}

\\subsubsection{使用するツール群}
${escapeLatex(data.section4_1_3)}

\\subsection{事業期間中の開発内容（タスクベース）}
${escapeLatex(data.section4_2)}

\\subsection{開発線表}
${escapeLatex(data.section4_3)}

\\subsection{資金}
\\subsubsection{開発にかける時間}
${escapeLatex(data.section4_4_1)}

\\subsubsection{予算内訳}
${escapeLatex(data.section4_4_2)}

\\section{私の腕前を証明できるもの}
${escapeLatex(data.section5)}

\\section{プロジェクト遂行にあたっての特記事項}
${escapeLatex(data.section6)}

\\section{ソフトウェア作成以外の勉強、特技、生活、趣味など}
${escapeLatex(data.section7)}

\\section{将来のソフトウェア技術に対して思うこと・期待すること}
${escapeLatex(data.section8)}

\\end{document}`;

  return latex;
}

/**
 * Generates the HTML form page
 */
function getHTMLPage(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>未踏IT人材発掘・育成事業 - 申請書作成ツール</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 0;
        }
        
        .top-bar {
            background: white;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .nav-tabs {
            display: flex;
            max-width: 1200px;
            margin: 0 auto;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .nav-tab {
            flex: 1;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
            background: #f5f5f5;
            border: none;
            font-size: 14px;
            font-weight: 600;
            color: #666;
            transition: all 0.3s;
        }
        
        .nav-tab:hover {
            background: #e8e8e8;
        }
        
        .nav-tab.active {
            background: white;
            color: #667eea;
            border-bottom: 3px solid #667eea;
        }
        
        .action-bar {
            background: white;
            padding: 15px 20px;
            display: flex;
            gap: 10px;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .action-btn {
            padding: 10px 20px;
            border: 2px solid #667eea;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            background: white;
            color: #667eea;
        }
        
        .action-btn:hover {
            background: #667eea;
            color: white;
        }
        
        .action-btn.primary {
            background: #667eea;
            color: white;
        }
        
        .action-btn.primary:hover {
            background: #5568d3;
        }
        
        .action-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .toggle-btn {
            padding: 10px 20px;
            border: 2px solid #ccc;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            background: white;
            color: #666;
        }
        
        .toggle-btn.active {
            border-color: #4caf50;
            background: #4caf50;
            color: white;
        }
        
        .container {
            max-width: 1200px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        h2 {
            color: #667eea;
            margin-top: 30px;
            margin-bottom: 15px;
            font-size: 22px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
        }
        
        h3 {
            color: #555;
            margin-top: 20px;
            margin-bottom: 10px;
            font-size: 18px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .info-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin-bottom: 30px;
            border-radius: 4px;
        }
        
        .info-box p {
            color: #555;
            line-height: 1.6;
            margin-bottom: 8px;
        }
        
        .info-box ul {
            margin-left: 20px;
            margin-top: 10px;
        }
        
        .info-box li {
            margin-bottom: 5px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        .form-group-compact {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
            font-size: 15px;
        }
        
        .subsection-label {
            font-size: 14px;
            color: #555;
            font-weight: 500;
        }
        
        .section-number {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 8px;
        }
        
        input[type="text"],
        textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            transition: border-color 0.3s;
        }
        
        input[type="text"]:focus,
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        textarea.small {
            min-height: 80px;
        }
        
        .subsection-group {
            margin-left: 20px;
            padding-left: 15px;
            border-left: 3px solid #e0e0e0;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 20px;
            color: #667eea;
        }
        
        .loading.active {
            display: block;
        }
        
        .error {
            background: #ffebee;
            border-left: 4px solid #f44336;
            padding: 15px;
            margin-top: 20px;
            border-radius: 4px;
            display: none;
        }
        
        .error.active {
            display: block;
        }
        
        .error-message {
            color: #c62828;
        }
        
        .example-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border: 2px solid #e0e0e0;
        }
        
        .example-card h3 {
            margin-top: 0;
            color: #667eea;
        }
        
        .example-card a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .example-card a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
                margin: 10px;
            }
            
            h1 {
                font-size: 22px;
            }
            
            .action-bar {
                flex-direction: column;
            }
            
            .action-btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="top-bar">
        <div class="nav-tabs">
            <button class="nav-tab" data-tab="knowledge">General knowledges to pass MITOU</button>
            <button class="nav-tab active" data-tab="editing">Editing page</button>
            <button class="nav-tab" data-tab="examples">Successful applicants' examples</button>
        </div>
        <div class="action-bar">
            <button class="toggle-btn" id="aiReviewToggle" onclick="toggleAIReview()">
                AI review: <span id="aiReviewStatus">OFF</span>
            </button>
            <button class="action-btn disabled" id="saveBtn" title="Login required">Save</button>
            <button class="action-btn" onclick="previewDocument()">Preview</button>
            <button class="action-btn primary" onclick="downloadLatex()">Download LaTeX</button>
            <button class="action-btn primary" onclick="downloadPDF()">Download PDF</button>
        </div>
    </div>
    
    <div class="container">
        <!-- Knowledge Tab -->
        <div class="tab-content" id="knowledge">
            <h1>未踏IT人材発掘・育成事業について</h1>
            <p class="subtitle">General Knowledge to Pass MITOU</p>
            
            <div class="info-box">
                <h3>未踏事業とは</h3>
                <p>未踏IT人材発掘・育成事業は、独立行政法人情報処理推進機構（IPA）が実施する、優れたIT人材を発掘・育成するためのプログラムです。</p>
                <ul>
                    <li><strong>対象：</strong>25歳未満の個人または5名以下のグループ</li>
                    <li><strong>支援額：</strong>最大300万円/人</li>
                    <li><strong>期間：</strong>約6ヶ月</li>
                    <li><strong>特典：</strong>プロジェクトマネージャー（PM）による指導、開発環境の提供</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h3>審査のポイント</h3>
                <ul>
                    <li><strong>独創性：</strong>既存のものとは異なる新しいアイデアか</li>
                    <li><strong>技術力：</strong>実現するための技術的能力があるか</li>
                    <li><strong>実現可能性：</strong>期間内に完成できるか</li>
                    <li><strong>社会的意義：</strong>世の中に価値を提供できるか</li>
                    <li><strong>熱意：</strong>プロジェクトへの情熱が伝わるか</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h3>申請書作成のコツ</h3>
                <ul>
                    <li>具体的に書く：抽象的な表現ではなく、具体的な技術や数値を示す</li>
                    <li>背景を明確に：なぜこのプロジェクトが必要なのかを丁寧に説明する</li>
                    <li>実績を示す：過去の作品やGitHubリポジトリで技術力を証明する</li>
                    <li>計画を詳細に：開発スケジュールと予算の使い道を明確にする</li>
                    <li>情熱を伝える：なぜこのプロジェクトをやりたいのか、熱意を込める</li>
                </ul>
            </div>
        </div>
        
        <!-- Editing Tab -->
        <div class="tab-content active" id="editing">
            <h1>未踏IT人材発掘・育成事業</h1>
            <p class="subtitle">提案プロジェクト詳細資料 作成ツール</p>
            
            <div class="info-box">
                <p><strong>使い方：</strong></p>
                <p>各セクションに内容を記入して「Download LaTeX」または「Download PDF」ボタンをクリックすると、ファイルがダウンロードされます。</p>
                <p>入力内容は自動的に保存されますので、安心して編集を進めてください。</p>
            </div>
            
            <form id="applicationForm">
                <!-- Project Name and Applicant -->
                <div class="form-group">
                    <label>プロジェクト名</label>
                    <input type="text" id="projectName" name="projectName" placeholder="例：AIを活用した教育支援システム" required>
                </div>
                
                <div class="form-group">
                    <label>申請者氏名</label>
                    <input type="text" id="applicantName" name="applicantName" placeholder="例：山田 太郎" required>
                </div>
                
                <!-- Section 1: 何をつくるか -->
                <h2>1. 何をつくるか</h2>
                
                <div class="form-group">
                    <label class="subsection-label">1.1 概要</label>
                    <textarea id="section1_1" name="section1_1" class="small" required placeholder="プロジェクトの概要を簡潔に説明してください..."></textarea>
                </div>
                
                <h3>1.2 背景</h3>
                <div class="subsection-group">
                    <div class="form-group-compact">
                        <label class="subsection-label">1.2.1 社会的背景</label>
                        <textarea id="section1_2_1" name="section1_2_1" class="small" required placeholder="このプロジェクトを始める社会的な背景を説明してください..."></textarea>
                    </div>
                    
                    <div class="form-group-compact">
                        <label class="subsection-label">1.2.2 技術的背景</label>
                        <textarea id="section1_2_2" name="section1_2_2" class="small" required placeholder="技術的な背景や既存技術の課題を説明してください..."></textarea>
                    </div>
                    
                    <div class="form-group-compact">
                        <label class="subsection-label">1.2.3 私的背景</label>
                        <textarea id="section1_2_3" name="section1_2_3" class="small" required placeholder="あなた自身がこのプロジェクトを始める動機を説明してください..."></textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="subsection-label">1.3 現状のプロトタイプ</label>
                    <textarea id="section1_3" name="section1_3" class="small" placeholder="既に作成しているプロトタイプがあれば説明してください..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="subsection-label">1.4 提案の目標</label>
                    <textarea id="section1_4" name="section1_4" class="small" required placeholder="このプロジェクトで達成したい目標を説明してください..."></textarea>
                </div>
                
                <!-- Section 2: 斬新さの主張、期待される効果など -->
                <h2>2. 斬新さの主張、期待される効果など</h2>
                
                <div class="form-group">
                    <label class="subsection-label">2.1 斬新さ(未踏性)の主張</label>
                    <textarea id="section2_1" name="section2_1" required placeholder="プロジェクトの独創性や新規性について説明してください..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="subsection-label">2.2 期待される効果</label>
                    <textarea id="section2_2" name="section2_2" required placeholder="このプロジェクトによって得られる効果を説明してください..."></textarea>
                </div>
                
                <!-- Section 3: どんな出し方を考えているか -->
                <h2>3. どんな出し方を考えているか</h2>
                
                <div class="form-group">
                    <textarea id="section3" name="section3" required placeholder="成果物の公開方法や展開について説明してください..."></textarea>
                </div>
                
                <!-- Section 4: 具体的な進め方と予算 -->
                <h2>4. 具体的な進め方と予算</h2>
                
                <h3>4.1 開発環境</h3>
                <div class="subsection-group">
                    <div class="form-group-compact">
                        <label class="subsection-label">4.1.1 開発を行う場所</label>
                        <textarea id="section4_1_1" name="section4_1_1" class="small" required placeholder="開発を行う場所について説明してください..."></textarea>
                    </div>
                    
                    <div class="form-group-compact">
                        <label class="subsection-label">4.1.2 計算機環境</label>
                        <textarea id="section4_1_2" name="section4_1_2" class="small" required placeholder="使用する計算機環境について説明してください..."></textarea>
                    </div>
                    
                    <div class="form-group-compact">
                        <label class="subsection-label">4.1.3 使用するツール群</label>
                        <textarea id="section4_1_3" name="section4_1_3" class="small" required placeholder="使用する開発ツールやライブラリを列挙してください..."></textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="subsection-label">4.2 事業期間中の開発内容（タスクベース）</label>
                    <textarea id="section4_2" name="section4_2" required placeholder="開発するタスクを具体的に列挙してください..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="subsection-label">4.3 開発線表</label>
                    <textarea id="section4_3" name="section4_3" required placeholder="月ごとの開発スケジュールを説明してください..."></textarea>
                </div>
                
                <h3>4.4 資金</h3>
                <div class="subsection-group">
                    <div class="form-group-compact">
                        <label class="subsection-label">4.4.1 開発にかける時間</label>
                        <textarea id="section4_4_1" name="section4_4_1" class="small" required placeholder="週あたりの開発時間など、時間の使い方を説明してください..."></textarea>
                    </div>
                    
                    <div class="form-group-compact">
                        <label class="subsection-label">4.4.2 予算内訳</label>
                        <textarea id="section4_4_2" name="section4_4_2" class="small" required placeholder="予算の使い道を項目ごとに説明してください..."></textarea>
                    </div>
                </div>
                
                <!-- Section 5-8 -->
                <h2>5. 私の腕前を証明できるもの</h2>
                <div class="form-group">
                    <textarea id="section5" name="section5" required placeholder="過去の作品、GitHubリポジトリ、技術ブログ、受賞歴などを紹介してください..."></textarea>
                </div>
                
                <h2>6. プロジェクト遂行にあたっての特記事項</h2>
                <div class="form-group">
                    <textarea id="section6" name="section6" placeholder="協力者、使用する技術、その他特記事項があれば記述してください..."></textarea>
                </div>
                
                <h2>7. ソフトウェア作成以外の勉強、特技、生活、趣味など</h2>
                <div class="form-group">
                    <textarea id="section7" name="section7" placeholder="あなた自身について自由に記述してください..."></textarea>
                </div>
                
                <h2>8. 将来のソフトウェア技術に対して思うこと・期待すること</h2>
                <div class="form-group">
                    <textarea id="section8" name="section8" placeholder="ソフトウェア技術の将来についてあなたの考えを述べてください..."></textarea>
                </div>
            </form>
            
            <div class="loading" id="loading">
                <p>ファイルを生成中...</p>
            </div>
            
            <div class="error" id="error">
                <p class="error-message" id="errorMessage"></p>
            </div>
        </div>
        
        <!-- Examples Tab -->
        <div class="tab-content" id="examples">
            <h1>合格者の申請書例</h1>
            <p class="subtitle">Successful Applicants' Examples</p>
            
            <div class="info-box">
                <p>以下は実際に未踏事業に採択された申請書の例です。参考にして、あなた自身の申請書を作成してください。</p>
            </div>
            
            <div class="example-card">
                <h3>例1：和田 卓人さん</h3>
                <p>未踏一次審査資料の例です。</p>
                <p><a href="/wada_未踏一次審査資料.pdf" target="_blank">📄 PDFを開く</a></p>
            </div>
            
            <div class="example-card">
                <h3>例2：水野 竣介さん</h3>
                <p>提案プロジェクト詳細資料の例です。</p>
                <p><a href="/水野竣介_提案プロジェクト詳細資料.pdf" target="_blank">📄 PDFを開く</a></p>
            </div>
            
            <div class="info-box">
                <p><strong>参考にする際のポイント：</strong></p>
                <ul>
                    <li>各セクションの書き方や分量を参考にする</li>
                    <li>技術的な詳細度を確認する</li>
                    <li>スケジュールや予算の記載方法を学ぶ</li>
                    <li>ただし、丸写しは避け、自分の言葉で書くこと</li>
                </ul>
            </div>
        </div>
    </div>
    
    <script>
        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                
                // Update active tab button
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(targetTab).classList.add('active');
            });
        });
        
        // AI Review Toggle
        let aiReviewEnabled = false;
        function toggleAIReview() {
            aiReviewEnabled = !aiReviewEnabled;
            const statusSpan = document.getElementById('aiReviewStatus');
            const toggleBtn = document.getElementById('aiReviewToggle');
            
            if (aiReviewEnabled) {
                statusSpan.textContent = 'ON';
                toggleBtn.classList.add('active');
            } else {
                statusSpan.textContent = 'OFF';
                toggleBtn.classList.remove('active');
            }
        }
        
        // Download LaTeX
        async function downloadLatex() {
            const form = document.getElementById('applicationForm');
            if (!form.checkValidity()) {
                alert('必須項目を入力してください。');
                form.reportValidity();
                return;
            }
            
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const errorMessage = document.getElementById('errorMessage');
            
            error.classList.remove('active');
            loading.classList.add('active');
            
            try {
                const formData = new FormData(form);
                const data = {};
                
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }
                
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error('LaTeX生成に失敗しました');
                }
                
                const latex = await response.text();
                
                // Download the LaTeX file
                const blob = new Blob([latex], { type: 'text/plain;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mitou_application.tex';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                loading.classList.remove('active');
            } catch (err) {
                loading.classList.remove('active');
                error.classList.add('active');
                errorMessage.textContent = err.message;
            }
        }
        
        // Download PDF - Opens Overleaf
        async function downloadPDF() {
            const form = document.getElementById('applicationForm');
            if (!form.checkValidity()) {
                alert('必須項目を入力してください。');
                form.reportValidity();
                return;
            }
            
            alert('PDF生成機能：\\n\\nLaTeXファイルをダウンロードした後、以下のいずれかの方法でPDFに変換してください：\\n\\n1. Overleaf (https://www.overleaf.com/) にアップロードして自動コンパイル\\n2. ローカルのLaTeX環境で "platex" コマンドを使用\\n3. Cloud LaTeX などのオンラインサービスを利用\\n\\n最も簡単な方法はOverleafの利用です。まずLaTeXファイルをダウンロードしてください。');
            
            // Also trigger LaTeX download
            await downloadLatex();
        }
        
        // Preview
        function previewDocument() {
            alert('プレビュー機能は開発中です。現在はLaTeXファイルをダウンロードして、Overleafなどのサービスでプレビューしてください。');
        }
        
        // Auto-save to localStorage
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            // Load saved value
            const saved = localStorage.getItem(input.id);
            if (saved) {
                input.value = saved;
            }
            
            // Save on change
            input.addEventListener('input', function() {
                localStorage.setItem(this.id, this.value);
            });
        });
    </script>
</body>
</html>`;
}

/**
 * Main request handler
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle POST request to generate LaTeX
    if (url.pathname === '/generate' && request.method === 'POST') {
      try {
        const data = await request.json() as any;
        
        const sectionData: SectionData = {
          projectName: data.projectName || '',
          applicantName: data.applicantName || '',
          section1_1: data.section1_1 || '',
          section1_2_1: data.section1_2_1 || '',
          section1_2_2: data.section1_2_2 || '',
          section1_2_3: data.section1_2_3 || '',
          section1_3: data.section1_3 || '',
          section1_4: data.section1_4 || '',
          section2_1: data.section2_1 || '',
          section2_2: data.section2_2 || '',
          section3: data.section3 || '',
          section4_1_1: data.section4_1_1 || '',
          section4_1_2: data.section4_1_2 || '',
          section4_1_3: data.section4_1_3 || '',
          section4_2: data.section4_2 || '',
          section4_3: data.section4_3 || '',
          section4_4_1: data.section4_4_1 || '',
          section4_4_2: data.section4_4_2 || '',
          section5: data.section5 || '',
          section6: data.section6 || '',
          section7: data.section7 || '',
          section8: data.section8 || ''
        };
        
        const latex = generateLatex(sectionData);
        
        return new Response(latex, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': 'attachment; filename="mitou_application.tex"'
          }
        });
      } catch (error) {
        return new Response('Invalid request data', { status: 400 });
      }
    }
    
    // Note: PDF file serving would need to be handled by Cloudflare Pages
    // or by including the PDFs as assets in the worker bundle
    // For now, we return 404 for PDF requests as a placeholder
    if (url.pathname.endsWith('.pdf')) {
      return new Response('PDF files need to be served separately via Cloudflare Pages or R2 storage', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Serve the HTML form for all other requests
    return new Response(getHTMLPage(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
};
