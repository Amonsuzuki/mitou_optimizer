/**
 * MITOU Optimizer - Cloudflare Worker
 * 
 * This worker serves a web application that helps users create
 * MITOU IT project application documents in LaTeX/PDF format.
 */

// Import extracted sections data
import extractedSectionsData from './extracted-sections.json';

/**
 * Environment bindings for Cloudflare Worker
 */
interface Env {
  USERS_KV: KVNamespace;
  MEMORIES_KV: KVNamespace;
}

/**
 * User data stored in USERS_KV
 */
interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  lastLogin: string;
}

/**
 * Draft data stored in MEMORIES_KV
 */
interface Draft {
  userId: string;
  data: SectionData;
  updatedAt: string;
}

/**
 * Session data
 */
interface Session {
  userId: string;
  expiresAt: number;
}

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
 * Helper functions for authentication and session management
 */

// Generate a random state string for OAuth
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate a random session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Verify session token
async function verifySession(env: Env, token: string): Promise<User | null> {
  try {
    const sessionData = await env.USERS_KV.get(`session:${token}`);
    if (!sessionData) {
      return null;
    }
    
    const session: Session = JSON.parse(sessionData);
    if (session.expiresAt < Date.now()) {
      // Session expired
      await env.USERS_KV.delete(`session:${token}`);
      return null;
    }
    
    const userData = await env.USERS_KV.get(`user:${session.userId}`);
    if (!userData) {
      return null;
    }
    
    return JSON.parse(userData) as User;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

// Get authorization header token
function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
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
            position: relative;
        }
        
        .language-selector {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            gap: 5px;
            background: #f5f5f5;
            padding: 5px;
            border-radius: 6px;
        }
        
        .lang-btn {
            padding: 8px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            background: transparent;
            color: #666;
        }
        
        .lang-btn:hover {
            background: #e0e0e0;
        }
        
        .lang-btn.active {
            background: #667eea;
            color: white;
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
        
        .deadline-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 20px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            color: white;
        }
        
        .deadline-icon {
            font-size: 48px;
            line-height: 1;
        }
        
        .deadline-content {
            flex: 1;
        }
        
        .deadline-label {
            font-size: 14px;
            font-weight: 600;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        
        .deadline-days {
            font-size: 36px;
            font-weight: bold;
            line-height: 1;
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
        
        .section-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin: 30px 0;
        }
        
        .section-btn {
            padding: 15px 20px;
            border: 2px solid #667eea;
            border-radius: 8px;
            background: white;
            color: #667eea;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-align: left;
        }
        
        .section-btn:hover {
            background: #667eea;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .section-btn.active {
            background: #667eea;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .section-content {
            margin: 30px 0;
        }
        
        .section-placeholder {
            text-align: center;
            color: #999;
            padding: 40px;
            font-size: 16px;
            line-height: 1.8;
        }
        
        .project-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        
        .project-section h3 {
            margin-top: 0;
            color: #667eea;
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .project-section .section-text {
            color: #333;
            line-height: 1.8;
            white-space: pre-wrap;
            font-size: 14px;
        }
        
        .project-section .no-content {
            color: #999;
            font-style: italic;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 15px;
            background: #f5f5f5;
            border-radius: 20px;
            font-size: 14px;
        }
        
        .user-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
        }
        
        .user-email {
            color: #666;
            font-weight: 500;
        }
        
        .login-btn {
            padding: 10px 20px;
            background: white;
            border: 2px solid #4285f4;
            border-radius: 6px;
            color: #4285f4;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .login-btn:hover {
            background: #4285f4;
            color: white;
        }
        
        .login-btn img {
            width: 18px;
            height: 18px;
        }
        
        .logout-btn {
            padding: 6px 12px;
            background: transparent;
            border: 1px solid #ccc;
            border-radius: 4px;
            color: #666;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .logout-btn:hover {
            background: #f5f5f5;
            border-color: #999;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
                margin: 10px;
            }
            
            h1 {
                font-size: 22px;
            }
            
            .deadline-box {
                flex-direction: column;
                text-align: center;
                gap: 10px;
                padding: 15px;
            }
            
            .deadline-icon {
                font-size: 36px;
            }
            
            .deadline-days {
                font-size: 28px;
            }
            
            .action-bar {
                flex-direction: column;
                padding-top: 60px;
            }
            
            .action-btn {
                width: 100%;
            }
            
            .language-selector {
                position: absolute;
                right: 10px;
                top: 10px;
                transform: none;
            }
            
            .user-info {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="top-bar">
        <div class="nav-tabs">
            <button class="nav-tab" data-tab="knowledge">General knowledge to pass MITOU</button>
            <button class="nav-tab active" data-tab="editing">Editing page</button>
            <button class="nav-tab" data-tab="examples">Successful applicants' examples</button>
        </div>
        <div class="action-bar">
            <div id="userInfoContainer" style="display: none;">
                <div class="user-info">
                    <img id="userAvatar" class="user-avatar" src="" alt="User">
                    <span id="userEmail" class="user-email"></span>
                    <button class="logout-btn" onclick="logout()">Logout</button>
                </div>
            </div>
            <button class="login-btn" id="loginBtn" onclick="login()" style="display: none;">
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4"/><path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853"/><path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05"/><path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335"/></g></svg>
                Sign in with Google
            </button>
            <button class="toggle-btn" id="aiReviewToggle" onclick="toggleAIReview()">
                <span id="aiReviewLabel">AI review</span>: <span id="aiReviewStatus">OFF</span>
            </button>
            <button class="action-btn disabled" id="saveBtn" onclick="saveDraft()" title="Login required">Save</button>
            <button class="action-btn" id="previewBtn" onclick="previewDocument()">Preview</button>
            <button class="action-btn primary" id="downloadLatexBtn" onclick="downloadLatex()">Download LaTeX</button>
            <button class="action-btn primary" id="downloadPdfBtn" onclick="downloadPDF()">Download PDF</button>
            <div class="language-selector">
                <button class="lang-btn" onclick="switchLanguage('ja')" id="langJa">日本語</button>
                <button class="lang-btn" onclick="switchLanguage('en')" id="langEn">English</button>
            </div>
        </div>
    </div>
    
    <div class="container">
        <!-- Knowledge Tab -->
        <div class="tab-content" id="knowledge">
            <h1>未踏IT人材発掘・育成事業について</h1>
            <p class="subtitle">General Knowledge to Pass MITOU</p>
            
            <div class="deadline-box">
                <div class="deadline-icon">📅</div>
                <div class="deadline-content">
                    <div class="deadline-label">提出締切まで</div>
                    <div class="deadline-days" id="daysLeft">-- 日</div>
                </div>
            </div>
            
            <div class="info-box">
                <h3>未踏事業とは</h3>
                <p>未踏IT人材発掘・育成事業は、独立行政法人情報処理推進機構（IPA）が実施する、優れたIT人材を発掘・育成するためのプログラムです。</p>
                <ul>
                    <li><strong>対象：</strong>25歳未満の個人またはグループ</li>
                    <li><strong>支援額：</strong>最大300万円</li>
                    <li><strong>期間：</strong>約9ヶ月</li>
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
                <p>以下は実際に未踏事業に採択された申請書の例です。セクションごとに複数のプロジェクトの内容を比較できます。</p>
                <p>Below are examples of application documents that were actually accepted for the MITOU project. You can compare the content of multiple projects by section.</p>
            </div>
            
            <div class="section-buttons">
                <button class="section-btn" onclick="showSection(1, event)">1. 何をつくるか</button>
                <button class="section-btn" onclick="showSection(2, event)">2. 斬新さの主張</button>
                <button class="section-btn" onclick="showSection(3, event)">3. 出し方</button>
                <button class="section-btn" onclick="showSection(4, event)">4. 進め方と予算</button>
                <button class="section-btn" onclick="showSection(5, event)">5. 腕前の証明</button>
                <button class="section-btn" onclick="showSection(6, event)">6. 特記事項</button>
                <button class="section-btn" onclick="showSection(7, event)">7. 趣味など</button>
                <button class="section-btn" onclick="showSection(8, event)">8. 将来への思い</button>
            </div>
            
            <div id="sectionContent" class="section-content">
                <p class="section-placeholder">上のボタンをクリックして、各セクションの内容を表示してください。<br>Click a button above to view the content of each section.</p>
            </div>
            
            <div class="example-card">
                <h3>PDFファイル / PDF Files</h3>
                <p>完全な申請書のPDFファイルはこちらからアクセスできます。<br>Complete application PDF files can be accessed here:</p>
                <p><a href="/wada_未踏一次審査資料.pdf" target="_blank">📄 和田さん (Wada-san)</a></p>
                <p><a href="/水野竣介_提案プロジェクト詳細資料.pdf" target="_blank">📄 水野さん (Mizuno-san)</a></p>
            </div>
            
            <div class="info-box">
                <p><strong>参考にする際のポイント / Key Points:</strong></p>
                <ul>
                    <li>各セクションの書き方や分量を参考にする / Reference the writing style and content length</li>
                    <li>技術的な詳細度を確認する / Check the level of technical detail</li>
                    <li>スケジュールや予算の記載方法を学ぶ / Learn how to describe schedules and budgets</li>
                    <li>ただし、丸写しは避け、自分の言葉で書くこと / However, write in your own words</li>
                </ul>
            </div>
        </div>
    </div>
    
    <script>
        // Language translations
        const translations = {
            ja: {
                // Nav tabs
                navKnowledge: "未踏採択のための一般知識",
                navEditing: "編集ページ",
                navExamples: "過去採択者の申請書",
                
                // Deadline
                deadlineLabel: "提出締切まで",
                daysLeftSuffix: "日",
                deadlinePassed: "締切を過ぎました",
                
                // Action bar
                aiReview: "AIレビュー",
                aiOn: "ON",
                aiOff: "OFF",
                save: "保存",
                preview: "プレビュー",
                downloadLatex: "LaTeXダウンロード",
                downloadPDF: "PDFダウンロード",
                loginRequired: "ログインが必要です",
                
                // Knowledge tab
                knowledgeTitle: "未踏IT人材発掘・育成事業について",
                knowledgeSubtitle: "General Knowledge to Pass MITOU",
                aboutMitouTitle: "未踏事業とは",
                aboutMitouText: "未踏IT人材発掘・育成事業は、独立行政法人情報処理推進機構（IPA）が実施する、優れたIT人材を発掘・育成するためのプログラムです。",
                eligibility: "対象：",
                eligibilityText: "25歳未満の個人または5名以下のグループ",
                funding: "支援額：",
                fundingText: "最大300万円/人",
                period: "期間：",
                periodText: "約6ヶ月",
                benefits: "特典：",
                benefitsText: "プロジェクトマネージャー（PM）による指導、開発環境の提供",
                screeningTitle: "審査のポイント",
                originality: "独創性：",
                originalityText: "既存のものとは異なる新しいアイデアか",
                technicalSkill: "技術力：",
                technicalSkillText: "実現するための技術的能力があるか",
                feasibility: "実現可能性：",
                feasibilityText: "期間内に完成できるか",
                socialValue: "社会的意義：",
                socialValueText: "世の中に価値を提供できるか",
                passion: "熱意：",
                passionText: "プロジェクトへの情熱が伝わるか",
                tipsTitle: "申請書作成のコツ",
                tipsBeSpecific: "具体的に書く：抽象的な表現ではなく、具体的な技術や数値を示す",
                tipsClarifyBackground: "背景を明確に：なぜこのプロジェクトが必要なのかを丁寧に説明する",
                tipsShowEvidence: "実績を示す：過去の作品やGitHubリポジトリで技術力を証明する",
                tipsDetailPlan: "計画を詳細に：開発スケジュールと予算の使い道を明確にする",
                tipsShowPassion: "情熱を伝える：なぜこのプロジェクトをやりたいのか、熱意を込める",
                
                // Editing tab
                editingTitle: "未踏IT人材発掘・育成事業",
                editingSubtitle: "提案プロジェクト詳細資料 作成ツール",
                howToUseLabel: "使い方：",
                howToUseText: "各セクションに内容を記入して「Download LaTeX」または「Download PDF」ボタンをクリックすると、ファイルがダウンロードされます。",
                autoSaveText: "入力内容は自動的に保存されますので、安心して編集を進めてください。",
                
                projectName: "プロジェクト名",
                projectNamePlaceholder: "例：AIを活用した教育支援システム",
                applicantName: "申請者氏名",
                applicantNamePlaceholder: "例：山田 太郎",
                
                // Sections
                section1: "1. 何をつくるか",
                section1_1: "1.1 概要",
                section1_1_placeholder: "プロジェクトの概要を簡潔に説明してください...",
                section1_2: "1.2 背景",
                section1_2_1: "1.2.1 社会的背景",
                section1_2_1_placeholder: "このプロジェクトを始める社会的な背景を説明してください...",
                section1_2_2: "1.2.2 技術的背景",
                section1_2_2_placeholder: "技術的な背景や既存技術の課題を説明してください...",
                section1_2_3: "1.2.3 私的背景",
                section1_2_3_placeholder: "あなた自身がこのプロジェクトを始める動機を説明してください...",
                section1_3: "1.3 現状のプロトタイプ",
                section1_3_placeholder: "既に作成しているプロトタイプがあれば説明してください...",
                section1_4: "1.4 提案の目標",
                section1_4_placeholder: "このプロジェクトで達成したい目標を説明してください...",
                
                section2: "2. 斬新さの主張、期待される効果など",
                section2_1: "2.1 斬新さ(未踏性)の主張",
                section2_1_placeholder: "プロジェクトの独創性や新規性について説明してください...",
                section2_2: "2.2 期待される効果",
                section2_2_placeholder: "このプロジェクトによって得られる効果を説明してください...",
                
                section3: "3. どんな出し方を考えているか",
                section3_placeholder: "成果物の公開方法や展開について説明してください...",
                
                section4: "4. 具体的な進め方と予算",
                section4_1: "4.1 開発環境",
                section4_1_1: "4.1.1 開発を行う場所",
                section4_1_1_placeholder: "開発を行う場所について説明してください...",
                section4_1_2: "4.1.2 計算機環境",
                section4_1_2_placeholder: "使用する計算機環境について説明してください...",
                section4_1_3: "4.1.3 使用するツール群",
                section4_1_3_placeholder: "使用する開発ツールやライブラリを列挙してください...",
                section4_2: "4.2 事業期間中の開発内容（タスクベース）",
                section4_2_placeholder: "開発するタスクを具体的に列挙してください...",
                section4_3: "4.3 開発線表",
                section4_3_placeholder: "月ごとの開発スケジュールを説明してください...",
                section4_4: "4.4 資金",
                section4_4_1: "4.4.1 開発にかける時間",
                section4_4_1_placeholder: "週あたりの開発時間など、時間の使い方を説明してください...",
                section4_4_2: "4.4.2 予算内訳",
                section4_4_2_placeholder: "予算の使い道を項目ごとに説明してください...",
                
                section5: "5. 私の腕前を証明できるもの",
                section5_placeholder: "過去の作品、GitHubリポジトリ、技術ブログ、受賞歴などを紹介してください...",
                
                section6: "6. プロジェクト遂行にあたっての特記事項",
                section6_placeholder: "協力者、使用する技術、その他特記事項があれば記述してください...",
                
                section7: "7. ソフトウェア作成以外の勉強、特技、生活、趣味など",
                section7_placeholder: "あなた自身について自由に記述してください...",
                
                section8: "8. 将来のソフトウェア技術に対して思うこと・期待すること",
                section8_placeholder: "ソフトウェア技術の将来についてあなたの考えを述べてください...",
                
                // Examples tab
                examplesTitle: "合格者の申請書例",
                examplesSubtitle: "Successful Applicants' Examples",
                examplesIntro: "以下は実際に未踏事業に採択された申請書の例です。参考にして、あなた自身の申請書を作成してください。",
                example1Title: "例1：和田 卓人さん",
                example1Desc: "未踏一次審査資料の例です。",
                example2Title: "例2：水野 竣介さん",
                example2Desc: "提案プロジェクト詳細資料の例です。",
                openPdf: "📄 PDFを開く",
                referencePointsLabel: "参考にする際のポイント：",
                referencePoint1: "各セクションの書き方や分量を参考にする",
                referencePoint2: "技術的な詳細度を確認する",
                referencePoint3: "スケジュールや予算の記載方法を学ぶ",
                referencePoint4: "ただし、丸写しは避け、自分の言葉で書くこと",
                
                // Loading and error messages
                generating: "ファイルを生成中...",
                errorPrefix: "",
                
                // Alert messages
                validationError: "必須項目を入力してください。",
                pdfInstruction: "PDF生成機能：\\n\\nLaTeXファイルをダウンロードした後、以下のいずれかの方法でPDFに変換してください：\\n\\n1. Overleaf (https://www.overleaf.com/) にアップロードして自動コンパイル\\n2. ローカルのLaTeX環境で \\"platex\\" コマンドを使用\\n3. Cloud LaTeX などのオンラインサービスを利用\\n\\n最も簡単な方法はOverleafの利用です。まずLaTeXファイルをダウンロードしてください。",
                previewComingSoon: "プレビュー機能は開発中です。現在はLaTeXファイルをダウンロードして、Overleafなどのサービスでプレビューしてください。"
            },
            en: {
                // Nav tabs
                navKnowledge: "General knowledge to pass MITOU",
                navEditing: "Editing page",
                navExamples: "Successful applicants' examples",
                
                // Deadline
                deadlineLabel: "Days until submission deadline",
                daysLeftSuffix: " days",
                deadlinePassed: "Deadline has passed",
                
                // Action bar
                aiReview: "AI review",
                aiOn: "ON",
                aiOff: "OFF",
                save: "Save",
                preview: "Preview",
                downloadLatex: "Download LaTeX",
                downloadPDF: "Download PDF",
                loginRequired: "Login required",
                
                // Knowledge tab
                knowledgeTitle: "About MITOU IT Personnel Discovery and Development Project",
                knowledgeSubtitle: "General Knowledge to Pass MITOU",
                aboutMitouTitle: "What is MITOU Project?",
                aboutMitouText: "The MITOU IT Personnel Discovery and Development Project is a program operated by IPA (Information-technology Promotion Agency, Japan) to discover and nurture excellent IT talent.",
                eligibility: "Eligibility:",
                eligibilityText: "Individuals under 25 or groups of up to 5 people",
                funding: "Funding:",
                fundingText: "Up to 3 million yen per person",
                period: "Period:",
                periodText: "Approximately 6 months",
                benefits: "Benefits:",
                benefitsText: "Guidance from Project Managers (PM) and development environment provision",
                screeningTitle: "Screening Points",
                originality: "Originality:",
                originalityText: "Is it a new idea different from existing ones?",
                technicalSkill: "Technical Skills:",
                technicalSkillText: "Do you have the technical ability to realize it?",
                feasibility: "Feasibility:",
                feasibilityText: "Can it be completed within the period?",
                socialValue: "Social Value:",
                socialValueText: "Can it provide value to society?",
                passion: "Passion:",
                passionText: "Does your passion for the project come through?",
                tipsTitle: "Tips for Writing Applications",
                tipsBeSpecific: "Be specific: Show specific technologies and numbers rather than abstract expressions",
                tipsClarifyBackground: "Clarify background: Carefully explain why this project is necessary",
                tipsShowEvidence: "Show evidence: Prove your technical skills with past works and GitHub repositories",
                tipsDetailPlan: "Detail your plan: Clearly specify development schedule and budget allocation",
                tipsShowPassion: "Convey passion: Express your enthusiasm for why you want to do this project",
                
                // Editing tab
                editingTitle: "MITOU IT Personnel Discovery and Development Project",
                editingSubtitle: "Proposal Project Detailed Document Creation Tool",
                howToUseLabel: "How to use:",
                howToUseText: "Fill in each section and click \\"Download LaTeX\\" or \\"Download PDF\\" button to download the file.",
                autoSaveText: "Your input is automatically saved, so you can edit with confidence.",
                
                projectName: "Project Name",
                projectNamePlaceholder: "e.g., AI-based Educational Support System",
                applicantName: "Applicant Name",
                applicantNamePlaceholder: "e.g., Taro Yamada",
                
                // Sections
                section1: "1. What to Create",
                section1_1: "1.1 Overview",
                section1_1_placeholder: "Please briefly describe the overview of your project...",
                section1_2: "1.2 Background",
                section1_2_1: "1.2.1 Social Background",
                section1_2_1_placeholder: "Please explain the social background for starting this project...",
                section1_2_2: "1.2.2 Technical Background",
                section1_2_2_placeholder: "Please explain the technical background and challenges of existing technologies...",
                section1_2_3: "1.2.3 Personal Background",
                section1_2_3_placeholder: "Please explain your personal motivation for starting this project...",
                section1_3: "1.3 Current Prototype",
                section1_3_placeholder: "If you have already created a prototype, please describe it...",
                section1_4: "1.4 Proposal Goals",
                section1_4_placeholder: "Please explain the goals you want to achieve with this project...",
                
                section2: "2. Innovation Claims and Expected Effects",
                section2_1: "2.1 Innovation (Unexplored Nature) Claims",
                section2_1_placeholder: "Please explain the originality and novelty of your project...",
                section2_2: "2.2 Expected Effects",
                section2_2_placeholder: "Please explain the effects that will be obtained through this project...",
                
                section3: "3. How to Release",
                section3_placeholder: "Please explain the release method and deployment of your deliverables...",
                
                section4: "4. Specific Approach and Budget",
                section4_1: "4.1 Development Environment",
                section4_1_1: "4.1.1 Development Location",
                section4_1_1_placeholder: "Please explain where you will develop...",
                section4_1_2: "4.1.2 Computing Environment",
                section4_1_2_placeholder: "Please explain the computing environment you will use...",
                section4_1_3: "4.1.3 Tools to Use",
                section4_1_3_placeholder: "Please list the development tools and libraries you will use...",
                section4_2: "4.2 Development Content During Project Period (Task-based)",
                section4_2_placeholder: "Please list the specific tasks to be developed...",
                section4_3: "4.3 Development Schedule",
                section4_3_placeholder: "Please explain the monthly development schedule...",
                section4_4: "4.4 Budget",
                section4_4_1: "4.4.1 Time for Development",
                section4_4_1_placeholder: "Please explain how you will use your time, such as development hours per week...",
                section4_4_2: "4.4.2 Budget Breakdown",
                section4_4_2_placeholder: "Please explain how the budget will be used by item...",
                
                section5: "5. Evidence of My Skills",
                section5_placeholder: "Please introduce past works, GitHub repositories, technical blogs, awards, etc...",
                
                section6: "6. Special Notes for Project Execution",
                section6_placeholder: "If there are any collaborators, technologies to use, or other special notes, please describe them...",
                
                section7: "7. Studies, Skills, Life, Hobbies, etc. Other Than Software Development",
                section7_placeholder: "Please freely describe yourself...",
                
                section8: "8. Thoughts and Expectations for Future Software Technology",
                section8_placeholder: "Please express your thoughts on the future of software technology...",
                
                // Examples tab
                examplesTitle: "Successful Applicants' Examples",
                examplesSubtitle: "Successful Applicants' Examples",
                examplesIntro: "Below are examples of application documents that were actually accepted for the MITOU project. Please use them as reference to create your own application.",
                example1Title: "Example 1: Takuto Wada",
                example1Desc: "Example of MITOU first-round screening document.",
                example2Title: "Example 2: Shunsuke Mizuno",
                example2Desc: "Example of proposal project detailed document.",
                openPdf: "📄 Open PDF",
                referencePointsLabel: "Key points when referencing:",
                referencePoint1: "Reference the writing style and content length of each section",
                referencePoint2: "Check the level of technical detail",
                referencePoint3: "Learn how to describe schedules and budgets",
                referencePoint4: "However, avoid copying verbatim and write in your own words",
                
                // Loading and error messages
                generating: "Generating file...",
                errorPrefix: "",
                
                // Alert messages
                validationError: "Please fill in all required fields.",
                pdfInstruction: "PDF Generation Feature:\\n\\nAfter downloading the LaTeX file, please convert it to PDF using one of the following methods:\\n\\n1. Upload to Overleaf (https://www.overleaf.com/) for automatic compilation\\n2. Use the \\"platex\\" command in your local LaTeX environment\\n3. Use online services like Cloud LaTeX\\n\\nThe easiest method is using Overleaf. First, please download the LaTeX file.",
                previewComingSoon: "The preview feature is under development. Currently, please download the LaTeX file and preview it using services like Overleaf."
            }
        };
        
        // Current language
        let currentLang = localStorage.getItem('language') || 'ja';
        
        // Function to calculate and update days left until deadline
        function updateDaysLeft() {
            const t = translations[currentLang];
            const deadlineDate = new Date('2026-03-13T23:59:59+09:00'); // March 13, 2026, Japan Time
            const today = new Date();
            
            const diffTime = deadlineDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const daysLeftElement = document.getElementById('daysLeft');
            if (!daysLeftElement) return;
            
            if (diffDays > 0) {
                daysLeftElement.textContent = diffDays + t.daysLeftSuffix;
            } else {
                daysLeftElement.textContent = t.deadlinePassed;
                daysLeftElement.style.fontSize = '24px';
            }
        }
        
        // Function to switch language
        function switchLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('language', lang);
            
            // Update active button
            document.getElementById('langJa').classList.toggle('active', lang === 'ja');
            document.getElementById('langEn').classList.toggle('active', lang === 'en');
            
            // Update all translatable elements
            updateTranslations();
        }
        
        // Function to update all translations
        function updateTranslations() {
            const t = translations[currentLang];
            
            // Nav tabs
            document.querySelectorAll('.nav-tab')[0].textContent = t.navKnowledge;
            document.querySelectorAll('.nav-tab')[1].textContent = t.navEditing;
            document.querySelectorAll('.nav-tab')[2].textContent = t.navExamples;
            
            // Update deadline label
            const deadlineLabel = document.querySelector('.deadline-label');
            if (deadlineLabel) {
                deadlineLabel.textContent = t.deadlineLabel;
            }
            
            // Update days left
            updateDaysLeft();
            
            // Action bar
            document.getElementById('aiReviewLabel').textContent = t.aiReview;
            document.getElementById('saveBtn').textContent = t.save;
            document.getElementById('saveBtn').title = t.loginRequired;
            document.getElementById('previewBtn').textContent = t.preview;
            document.getElementById('downloadLatexBtn').textContent = t.downloadLatex;
            document.getElementById('downloadPdfBtn').textContent = t.downloadPDF;
            
            // Knowledge tab
            const knowledgeTab = document.getElementById('knowledge');
            knowledgeTab.querySelector('h1').textContent = t.knowledgeTitle;
            knowledgeTab.querySelector('.subtitle').textContent = t.knowledgeSubtitle;
            
            const knowledgeInfoBoxes = knowledgeTab.querySelectorAll('.info-box');
            knowledgeInfoBoxes[0].querySelector('h3').textContent = t.aboutMitouTitle;
            knowledgeInfoBoxes[0].querySelector('p').textContent = t.aboutMitouText;
            const aboutList = knowledgeInfoBoxes[0].querySelectorAll('li');
            aboutList[0].innerHTML = '<strong>' + t.eligibility + '</strong>' + t.eligibilityText;
            aboutList[1].innerHTML = '<strong>' + t.funding + '</strong>' + t.fundingText;
            aboutList[2].innerHTML = '<strong>' + t.period + '</strong>' + t.periodText;
            aboutList[3].innerHTML = '<strong>' + t.benefits + '</strong>' + t.benefitsText;
            
            knowledgeInfoBoxes[1].querySelector('h3').textContent = t.screeningTitle;
            const screeningList = knowledgeInfoBoxes[1].querySelectorAll('li');
            screeningList[0].innerHTML = '<strong>' + t.originality + '</strong>' + t.originalityText;
            screeningList[1].innerHTML = '<strong>' + t.technicalSkill + '</strong>' + t.technicalSkillText;
            screeningList[2].innerHTML = '<strong>' + t.feasibility + '</strong>' + t.feasibilityText;
            screeningList[3].innerHTML = '<strong>' + t.socialValue + '</strong>' + t.socialValueText;
            screeningList[4].innerHTML = '<strong>' + t.passion + '</strong>' + t.passionText;
            
            knowledgeInfoBoxes[2].querySelector('h3').textContent = t.tipsTitle;
            const tipsList = knowledgeInfoBoxes[2].querySelectorAll('li');
            tipsList[0].textContent = t.tipsBeSpecific;
            tipsList[1].textContent = t.tipsClarifyBackground;
            tipsList[2].textContent = t.tipsShowEvidence;
            tipsList[3].textContent = t.tipsDetailPlan;
            tipsList[4].textContent = t.tipsShowPassion;
            
            // Editing tab
            const editingTab = document.getElementById('editing');
            editingTab.querySelector('h1').textContent = t.editingTitle;
            editingTab.querySelector('.subtitle').textContent = t.editingSubtitle;
            
            const editingInfoBox = editingTab.querySelector('.info-box');
            editingInfoBox.querySelectorAll('p')[0].innerHTML = '<strong>' + t.howToUseLabel + '</strong>';
            editingInfoBox.querySelectorAll('p')[1].textContent = t.howToUseText;
            editingInfoBox.querySelectorAll('p')[2].textContent = t.autoSaveText;
            
            // Form labels and placeholders
            const formLabels = editingTab.querySelectorAll('label');
            const formInputs = editingTab.querySelectorAll('input, textarea');
            
            formLabels[0].textContent = t.projectName;
            document.getElementById('projectName').placeholder = t.projectNamePlaceholder;
            formLabels[1].textContent = t.applicantName;
            document.getElementById('applicantName').placeholder = t.applicantNamePlaceholder;
            
            editingTab.querySelectorAll('h2')[0].textContent = t.section1;
            formLabels[2].textContent = t.section1_1;
            document.getElementById('section1_1').placeholder = t.section1_1_placeholder;
            
            editingTab.querySelectorAll('h3')[0].textContent = t.section1_2;
            formLabels[3].textContent = t.section1_2_1;
            document.getElementById('section1_2_1').placeholder = t.section1_2_1_placeholder;
            formLabels[4].textContent = t.section1_2_2;
            document.getElementById('section1_2_2').placeholder = t.section1_2_2_placeholder;
            formLabels[5].textContent = t.section1_2_3;
            document.getElementById('section1_2_3').placeholder = t.section1_2_3_placeholder;
            
            formLabels[6].textContent = t.section1_3;
            document.getElementById('section1_3').placeholder = t.section1_3_placeholder;
            formLabels[7].textContent = t.section1_4;
            document.getElementById('section1_4').placeholder = t.section1_4_placeholder;
            
            editingTab.querySelectorAll('h2')[1].textContent = t.section2;
            formLabels[8].textContent = t.section2_1;
            document.getElementById('section2_1').placeholder = t.section2_1_placeholder;
            formLabels[9].textContent = t.section2_2;
            document.getElementById('section2_2').placeholder = t.section2_2_placeholder;
            
            editingTab.querySelectorAll('h2')[2].textContent = t.section3;
            document.getElementById('section3').placeholder = t.section3_placeholder;
            
            editingTab.querySelectorAll('h2')[3].textContent = t.section4;
            editingTab.querySelectorAll('h3')[1].textContent = t.section4_1;
            formLabels[10].textContent = t.section4_1_1;
            document.getElementById('section4_1_1').placeholder = t.section4_1_1_placeholder;
            formLabels[11].textContent = t.section4_1_2;
            document.getElementById('section4_1_2').placeholder = t.section4_1_2_placeholder;
            formLabels[12].textContent = t.section4_1_3;
            document.getElementById('section4_1_3').placeholder = t.section4_1_3_placeholder;
            
            formLabels[13].textContent = t.section4_2;
            document.getElementById('section4_2').placeholder = t.section4_2_placeholder;
            formLabels[14].textContent = t.section4_3;
            document.getElementById('section4_3').placeholder = t.section4_3_placeholder;
            
            editingTab.querySelectorAll('h3')[2].textContent = t.section4_4;
            formLabels[15].textContent = t.section4_4_1;
            document.getElementById('section4_4_1').placeholder = t.section4_4_1_placeholder;
            formLabels[16].textContent = t.section4_4_2;
            document.getElementById('section4_4_2').placeholder = t.section4_4_2_placeholder;
            
            editingTab.querySelectorAll('h2')[4].textContent = t.section5;
            document.getElementById('section5').placeholder = t.section5_placeholder;
            
            editingTab.querySelectorAll('h2')[5].textContent = t.section6;
            document.getElementById('section6').placeholder = t.section6_placeholder;
            
            editingTab.querySelectorAll('h2')[6].textContent = t.section7;
            document.getElementById('section7').placeholder = t.section7_placeholder;
            
            editingTab.querySelectorAll('h2')[7].textContent = t.section8;
            document.getElementById('section8').placeholder = t.section8_placeholder;
            
            // Loading and error
            document.querySelector('#loading p').textContent = t.generating;
            
            // Examples tab
            const examplesTab = document.getElementById('examples');
            examplesTab.querySelector('h1').textContent = t.examplesTitle;
            examplesTab.querySelector('.subtitle').textContent = t.examplesSubtitle;
            
            const examplesInfoBoxes = examplesTab.querySelectorAll('.info-box');
            examplesInfoBoxes[0].querySelector('p').textContent = t.examplesIntro;
            
            const exampleCards = examplesTab.querySelectorAll('.example-card');
            exampleCards[0].querySelector('h3').textContent = t.example1Title;
            exampleCards[0].querySelectorAll('p')[0].textContent = t.example1Desc;
            exampleCards[0].querySelectorAll('a')[0].textContent = t.openPdf;
            
            exampleCards[1].querySelector('h3').textContent = t.example2Title;
            exampleCards[1].querySelectorAll('p')[0].textContent = t.example2Desc;
            exampleCards[1].querySelectorAll('a')[0].textContent = t.openPdf;
            
            examplesInfoBoxes[1].querySelectorAll('p')[0].innerHTML = '<strong>' + t.referencePointsLabel + '</strong>';
            const refList = examplesInfoBoxes[1].querySelectorAll('li');
            refList[0].textContent = t.referencePoint1;
            refList[1].textContent = t.referencePoint2;
            refList[2].textContent = t.referencePoint3;
            refList[3].textContent = t.referencePoint4;
            
            // Update constants for alerts
            window.VALIDATION_ERROR_MSG = t.validationError;
            window.PDF_INSTRUCTION_MSG = t.pdfInstruction;
            window.PREVIEW_COMING_SOON_MSG = t.previewComingSoon;
        }
        
        // Initialize language on page load
        document.addEventListener('DOMContentLoaded', function() {
            switchLanguage(currentLang);
        });
        
        // Constants (will be overridden by translation system)
        window.VALIDATION_ERROR_MSG = '必須項目を入力してください。';
        window.PDF_INSTRUCTION_MSG = 'PDF生成機能：\\n\\nLaTeXファイルをダウンロードした後、以下のいずれかの方法でPDFに変換してください：\\n\\n1. Overleaf (https://www.overleaf.com/) にアップロードして自動コンパイル\\n2. ローカルのLaTeX環境で "platex" コマンドを使用\\n3. Cloud LaTeX などのオンラインサービスを利用\\n\\n最も簡単な方法はOverleafの利用です。まずLaTeXファイルをダウンロードしてください。';
        window.PREVIEW_COMING_SOON_MSG = 'プレビュー機能は開発中です。現在はLaTeXファイルをダウンロードして、Overleafなどのサービスでプレビューしてください。';
        
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
        
        // Authentication and Draft Management
        let currentUser = null;
        let sessionToken = null;
        
        // Check authentication status on page load
        async function checkAuth() {
            const token = localStorage.getItem('sessionToken');
            if (!token) {
                showLoginButton();
                return;
            }
            
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                
                if (response.ok) {
                    const user = await response.json();
                    currentUser = user;
                    sessionToken = token;
                    showUserInfo(user);
                    enableSaveButton();
                    await loadDraft();
                } else {
                    localStorage.removeItem('sessionToken');
                    showLoginButton();
                }
            } catch (error) {
                console.error('Auth verification failed:', error);
                showLoginButton();
            }
        }
        
        // Show login button
        function showLoginButton() {
            document.getElementById('loginBtn').style.display = 'flex';
            document.getElementById('userInfoContainer').style.display = 'none';
        }
        
        // Show user info
        function showUserInfo(user) {
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('userAvatar').src = user.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="%23667eea"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="16">' + (user.name?.[0] || 'U') + '</text></svg>';
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('userInfoContainer').style.display = 'block';
        }
        
        // Enable save button
        function enableSaveButton() {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.classList.remove('disabled');
            saveBtn.title = 'Save your draft';
        }
        
        // Disable save button
        function disableSaveButton() {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.classList.add('disabled');
            saveBtn.title = 'Login required';
        }
        
        // Login with Google
        async function login() {
            try {
                // Start OAuth flow
                const response = await fetch('/api/auth/google/url');
                const data = await response.json();
                
                if (data.authUrl) {
                    // Redirect to Google OAuth
                    window.location.href = data.authUrl;
                }
            } catch (error) {
                console.error('Login failed:', error);
                alert('ログインに失敗しました。もう一度お試しください。\\nLogin failed. Please try again.');
            }
        }
        
        // Logout
        async function logout() {
            try {
                if (sessionToken) {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + sessionToken
                        }
                    });
                }
            } catch (error) {
                console.error('Logout request failed:', error);
            }
            
            currentUser = null;
            sessionToken = null;
            localStorage.removeItem('sessionToken');
            showLoginButton();
            disableSaveButton();
            alert('ログアウトしました。\\nLogged out successfully.');
        }
        
        // Save draft
        async function saveDraft() {
            if (!currentUser || !sessionToken) {
                alert('ログインが必要です。\\nPlease login to save your draft.');
                return;
            }
            
            const form = document.getElementById('applicationForm');
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            try {
                const response = await fetch('/api/drafts/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + sessionToken
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('下書きを保存しました。\\nDraft saved successfully.');
                } else {
                    throw new Error('Failed to save draft');
                }
            } catch (error) {
                console.error('Save draft failed:', error);
                alert('下書きの保存に失敗しました。\\nFailed to save draft.');
            }
        }
        
        // Load draft
        async function loadDraft() {
            if (!currentUser || !sessionToken) {
                return;
            }
            
            try {
                const response = await fetch('/api/drafts/load', {
                    headers: {
                        'Authorization': 'Bearer ' + sessionToken
                    }
                });
                
                if (response.ok) {
                    const draft = await response.json();
                    if (draft && draft.data) {
                        // Populate form with draft data
                        Object.keys(draft.data).forEach(key => {
                            const field = document.getElementById(key);
                            if (field && draft.data[key]) {
                                field.value = draft.data[key];
                                // Update localStorage as well
                                localStorage.setItem(key, draft.data[key]);
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Load draft failed:', error);
            }
        }
        
        // Handle OAuth callback
        async function handleOAuthCallback() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            
            if (code && state) {
                try {
                    const response = await fetch('/api/auth/google/callback', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ code, state })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        sessionToken = data.token;
                        currentUser = data.user;
                        localStorage.setItem('sessionToken', sessionToken);
                        
                        // Remove query parameters from URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                        
                        showUserInfo(currentUser);
                        enableSaveButton();
                        await loadDraft();
                    } else {
                        throw new Error('Authentication failed');
                    }
                } catch (error) {
                    console.error('OAuth callback failed:', error);
                    alert('認証に失敗しました。もう一度お試しください。\\nAuthentication failed. Please try again.');
                }
            }
        }
        
        // Initialize authentication on page load
        document.addEventListener('DOMContentLoaded', function() {
            handleOAuthCallback().then(() => checkAuth());
        });
        
        // Section viewing functionality
        let sectionsData = null;
        let currentSection = null;
        
        // Load sections data
        async function loadSectionsData() {
            if (sectionsData) return sectionsData;
            
            try {
                const response = await fetch('/api/sections');
                sectionsData = await response.json();
                return sectionsData;
            } catch (error) {
                console.error('Failed to load sections data:', error);
                return null;
            }
        }
        
        // Show section content
        async function showSection(sectionNum, event) {
            currentSection = sectionNum;
            const data = await loadSectionsData();
            
            if (!data) {
                alert('セクションデータの読み込みに失敗しました。');
                return;
            }
            
            // Update button states
            document.querySelectorAll('.section-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            // Get section title
            const sectionTitle = data.sectionTitles.find(s => s.id === sectionNum);
            
            if (!sectionTitle) {
                alert('セクション情報が見つかりませんでした。');
                return;
            }
            
            // Build content HTML
            let contentHTML = '<h2>' + escapeHtml(sectionTitle.title) + '</h2>';
            
            // Add all projects' content for this section
            data.projects.forEach(project => {
                const sectionText = project.sections[sectionNum];
                
                if (sectionText && sectionText.trim().length > 0) {
                    contentHTML += '<div class="project-section">';
                    contentHTML += '<h3>' + escapeHtml(project.name) + ' (' + escapeHtml(project.category) + ')</h3>';
                    contentHTML += '<div class="section-text">' + escapeHtml(sectionText) + '</div>';
                    contentHTML += '</div>';
                } else {
                    contentHTML += '<div class="project-section">';
                    contentHTML += '<h3>' + escapeHtml(project.name) + ' (' + escapeHtml(project.category) + ')</h3>';
                    contentHTML += '<div class="section-text no-content">このセクションの内容が抽出できませんでした。<br>Content not available for this section.</div>';
                    contentHTML += '</div>';
                }
            });
            
            document.getElementById('sectionContent').innerHTML = contentHTML;
        }
        
        // HTML escape function
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Download LaTeX
        async function downloadLatex() {
            const form = document.getElementById('applicationForm');
            if (!form.checkValidity()) {
                alert(window.VALIDATION_ERROR_MSG);
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
                alert(window.VALIDATION_ERROR_MSG);
                form.reportValidity();
                return;
            }
            
            alert(window.PDF_INSTRUCTION_MSG);
            
            // Also trigger LaTeX download
            await downloadLatex();
        }
        
        // Preview
        function previewDocument() {
            alert(window.PREVIEW_COMING_SOON_MSG);
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers for API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // Handle OPTIONS for CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Authentication endpoints
    
    // Get Google OAuth URL
    if (url.pathname === '/api/auth/google/url') {
      const state = generateState();
      // Store state in KV with 10 minute expiration
      await env.USERS_KV.put(`oauth_state:${state}`, Date.now().toString(), { expirationTtl: 600 });
      
      // Note: You need to set up Google OAuth credentials and add the client ID here
      const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // This should be configured as an environment variable
      const redirectUri = `${url.origin}/api/auth/google/callback`;
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid email profile')}&` +
        `state=${state}`;
      
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Google OAuth callback
    if (url.pathname === '/api/auth/google/callback' && request.method === 'POST') {
      try {
        const { code, state } = await request.json() as any;
        
        // Verify state
        const storedTime = await env.USERS_KV.get(`oauth_state:${state}`);
        if (!storedTime) {
          return new Response(JSON.stringify({ error: 'Invalid state' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        await env.USERS_KV.delete(`oauth_state:${state}`);
        
        // TODO: Complete Google OAuth implementation
        // To fully implement Google OAuth, you need to:
        // 1. Exchange the authorization code for an access token by calling:
        //    POST https://oauth2.googleapis.com/token
        //    with client_id, client_secret, code, redirect_uri, and grant_type=authorization_code
        // 2. Use the access token to get user info from:
        //    GET https://www.googleapis.com/oauth2/v2/userinfo
        // 3. Store the user information in USERS_KV
        //
        // For now, this is a simplified mock implementation for demonstration purposes.
        // Replace this section with actual Google API calls in production.
        
        const mockUserInfo = {
          id: 'google_' + Date.now(),
          email: 'user@example.com',
          name: 'User',
          picture: ''
        };
        
        // Create or update user
        const user: User = {
          id: mockUserInfo.id,
          email: mockUserInfo.email,
          name: mockUserInfo.name,
          picture: mockUserInfo.picture,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        
        await env.USERS_KV.put(`user:${user.id}`, JSON.stringify(user));
        
        // Create session
        const sessionToken = generateSessionToken();
        const session: Session = {
          userId: user.id,
          expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        };
        
        await env.USERS_KV.put(`session:${sessionToken}`, JSON.stringify(session), {
          expirationTtl: 30 * 24 * 60 * 60 // 30 days
        });
        
        return new Response(JSON.stringify({ token: sessionToken, user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Authentication failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Verify session
    if (url.pathname === '/api/auth/verify') {
      const token = getAuthToken(request);
      if (!token) {
        return new Response(JSON.stringify({ error: 'No token provided' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const user = await verifySession(env, token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(user), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Logout
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      const token = getAuthToken(request);
      if (token) {
        await env.USERS_KV.delete(`session:${token}`);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Save draft
    if (url.pathname === '/api/drafts/save' && request.method === 'POST') {
      const token = getAuthToken(request);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const user = await verifySession(env, token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const data = await request.json() as any;
        const draft: Draft = {
          userId: user.id,
          data: data as SectionData,
          updatedAt: new Date().toISOString()
        };
        
        await env.MEMORIES_KV.put(`draft:${user.id}`, JSON.stringify(draft));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to save draft' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Load draft
    if (url.pathname === '/api/drafts/load') {
      const token = getAuthToken(request);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const user = await verifySession(env, token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const draftData = await env.MEMORIES_KV.get(`draft:${user.id}`);
        if (!draftData) {
          return new Response(JSON.stringify({ data: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const draft: Draft = JSON.parse(draftData);
        return new Response(JSON.stringify(draft), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to load draft' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Handle request for extracted sections data
    if (url.pathname === '/api/sections') {
      return new Response(JSON.stringify(extractedSectionsData), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    
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
