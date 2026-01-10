/**
 * MITOU Optimizer - Cloudflare Worker
 * 
 * This worker serves a web application that helps users create
 * MITOU IT project application documents in LaTeX/PDF format.
 */

// Import extracted sections data from generated TypeScript file
import extractedSectionsData from './extracted-sections-data';
// Import deadline configuration
import deadlineConfigRaw from './deadline-config.json';
// Import Supabase client
import { createClient } from '@supabase/supabase-js';

interface DeadlineConfig {
  submissionDeadline: string;
  lastUpdated: string;
  note: string;
}

// Type-safe deadline configuration
const deadlineConfig = deadlineConfigRaw as DeadlineConfig;

/**
 * Environment bindings for Cloudflare Worker
 */
interface Env {
  USERS_KV: KVNamespace;
  MEMORIES_KV: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
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
 * Draft data stored in Supabase DRAFTS table
 */
interface Draft {
  id?: string;
  userId: string;
  data: SectionData;
  updatedAt: string;
  createdAt?: string;
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
  section9: string;  // Reference
}

/**
 * Validates and sanitizes the deadline date string
 * Security: Ensures the deadline is a valid ISO 8601 date to prevent injection attacks
 */
function sanitizeDeadline(deadline: string): string {
  // Validate that it's a valid date string
  const date = new Date(deadline);
  if (isNaN(date.getTime())) {
    // Fall back to a safe default if invalid
    return '2026-12-31T23:59:59+09:00';
  }
  
  // Validate that the string contains only safe characters for JavaScript string context
  // Allow: digits, hyphens, colons, T, Z, plus/minus (for timezone), and dots (for milliseconds)
  const safePattern = /^[0-9\-T:+Z.]+$/;
  if (!safePattern.test(deadline)) {
    // If contains potentially dangerous characters, convert to ISO string
    return date.toISOString();
  }
  
  // Return the original validated string to preserve timezone information
  // This is safe because we've validated it's a valid date and contains only safe characters
  return deadline;
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
\\usepackage{titlesec}

% Make subsubsection titles bold to match subsection style
\\titleformat{\\subsubsection}
  {\\normalfont\\normalsize\\bfseries}{\\thesubsubsection}{1em}{}

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

${escapeLatex(data.section9)}

\\end{document}`;

  return latex;
}

/**
 * Helper functions for authentication and session management with Supabase
 */

// Create Supabase client helper
function getSupabaseClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Verify session token using Supabase
async function verifySession(env: Env, token: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient(env);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    // Convert Supabase user to our User format
    const appUser: User = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email || '',
      picture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      createdAt: user.created_at,
      lastLogin: new Date().toISOString()
    };
    
    // Update user in KV for quick access (optional caching)
    await env.USERS_KV.put(`user:${user.id}`, JSON.stringify(appUser));
    
    return appUser;
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
function getHTMLPage(submissionDeadline: string): string {
  // SECURITY: Sanitize the deadline to prevent XSS injection
  const safeDeadline = sanitizeDeadline(submissionDeadline);
  
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
        
        .sidebar-toggle {
            position: fixed;
            left: 20px;
            top: 20px;
            width: 40px;
            height: 40px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 8px;
            cursor: pointer;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            transition: all 0.3s;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .sidebar-toggle:hover {
            background: #667eea;
        }
        
        .sidebar-toggle span {
            width: 20px;
            height: 2px;
            background: #667eea;
            transition: all 0.3s;
        }
        
        .sidebar-toggle:hover span {
            background: white;
        }
        
        .sidebar {
            position: fixed;
            left: -280px;
            top: 0;
            width: 280px;
            height: 100vh;
            background: white;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
            transition: left 0.3s ease-in-out;
            z-index: 1000;
            overflow-y: auto;
            padding-top: 80px;
        }
        
        .sidebar.open {
            left: 0;
        }
        
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
            z-index: 999;
        }
        
        .sidebar-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        
        .nav-tabs {
            display: flex;
            flex-direction: column;
            padding: 0;
        }
        
        .nav-tab {
            padding: 15px 20px;
            text-align: left;
            cursor: pointer;
            background: white;
            border: none;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
            font-weight: 600;
            color: #666;
            transition: all 0.3s;
        }
        
        .nav-tab:hover {
            background: #f5f5f5;
            padding-left: 25px;
        }
        
        .nav-tab.active {
            background: #f0f4ff;
            color: #667eea;
            border-left: 4px solid #667eea;
            padding-left: 16px;
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
        
        .language-selector {
            position: fixed;
            right: 20px;
            bottom: 20px;
            display: flex;
            gap: 8px;
            background: white;
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
        }
        
        .lang-btn {
            padding: 8px 10px;
            border: 2px solid transparent;
            border-radius: 6px;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s;
            background: transparent;
            line-height: 1;
            display: none;
            align-items: center;
            justify-content: center;
        }
        
        .lang-btn.active {
            display: flex;
        }
        
        .lang-btn:hover {
            background: #f5f5f5;
            transform: scale(1.1);
        }
        
        .account-section {
            position: fixed;
            right: 20px;
            top: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
            background: white;
            padding: 8px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
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
            pointer-events: none;
        }
        
        .action-btn.saved {
            background: #4caf50;
            color: white;
            border-color: #4caf50;
        }
        
        .action-btn.saved:hover {
            background: #45a049;
            border-color: #45a049;
        }
        
        .download-container {
            position: relative;
            display: inline-block;
        }
        
        .download-menu {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 2px solid #667eea;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-top: 5px;
            z-index: 1000;
            min-width: 180px;
        }
        
        .download-menu.active {
            display: block;
        }
        
        .download-option {
            padding: 12px 20px;
            cursor: pointer;
            transition: all 0.3s;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
            font-weight: 600;
            color: #667eea;
        }
        
        .download-option:last-child {
            border-bottom: none;
        }
        
        .download-option:hover {
            background: #f0f4ff;
        }
        
        .download-option-icon {
            margin-right: 8px;
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
        
        .toast-container {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        }
        
        .toast {
            background: white;
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out;
            border-left: 4px solid #667eea;
        }
        
        .toast.success {
            border-left-color: #4caf50;
        }
        
        .toast.error {
            border-left-color: #f44336;
        }
        
        .toast.warning {
            border-left-color: #ff9800;
        }
        
        .toast-icon {
            font-size: 20px;
            flex-shrink: 0;
        }
        
        .toast-message {
            flex: 1;
            color: #333;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }
        
        .toast-close:hover {
            background: #f5f5f5;
            color: #666;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
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
            cursor: pointer;
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
        
        .user-avatar-compact {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid #667eea;
            transition: all 0.3s;
        }
        
        .user-avatar-compact:hover {
            border-color: #5568d3;
            transform: scale(1.05);
        }
        
        .user-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border: 2px solid #667eea;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 200px;
            z-index: 1001;
        }
        
        .user-dropdown.active {
            display: block;
        }
        
        .user-dropdown-header {
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .user-dropdown-email {
            font-size: 13px;
            color: #333;
            font-weight: 500;
            word-break: break-word;
        }
        
        .user-dropdown-name {
            font-size: 11px;
            color: #999;
            margin-top: 2px;
        }
        
        .logout-btn {
            width: 100%;
            padding: 12px 16px;
            background: transparent;
            border: none;
            color: #c62828;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-align: left;
            border-radius: 0 0 6px 6px;
        }
        
        .logout-btn:hover {
            background: #ffebee;
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
            }
            
            .action-btn {
                width: 100%;
            }
            
            .language-selector {
                right: 10px;
                bottom: 10px;
                padding: 6px;
            }
            
            .lang-btn {
                font-size: 20px;
                padding: 6px 8px;
            }
            
            .account-section {
                right: 10px;
                top: 10px;
                padding: 6px;
            }
            
            .user-info {
                width: 100%;
                justify-content: center;
            }
            
            .sidebar {
                width: min(85%, 320px);
            }
            
            .sidebar-toggle {
                left: 10px;
                top: 10px;
            }
        }
    </style>
</head>
<body>
    <!-- Sidebar Toggle Button -->
    <button class="sidebar-toggle" onclick="toggleSidebar()" aria-label="Toggle sidebar">
        <span></span>
        <span></span>
        <span></span>
    </button>
    
    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" onclick="toggleSidebar()"></div>
    
    <!-- Sidebar with Navigation -->
    <div class="sidebar" id="sidebar">
        <div class="nav-tabs">
            <button class="nav-tab" data-tab="knowledge">General knowledge to pass MITOU</button>
            <button class="nav-tab active" data-tab="editing">Editing page</button>
            <button class="nav-tab" data-tab="examples">Successful applicants' examples</button>
        </div>
    </div>
    
    <!-- Language Selector - Fixed at bottom right -->
    <div class="language-selector">
        <button class="lang-btn" onclick="switchLanguage('ja')" id="langJa" title="日本語" aria-label="Switch to Japanese">🇯🇵</button>
        <button class="lang-btn" onclick="switchLanguage('en')" id="langEn" title="English" aria-label="Switch to English">🇺🇸</button>
    </div>
    
    <!-- Account Section - Fixed at top right -->
    <div class="account-section" id="accountSection">
        <!-- Login button -->
        <button class="login-btn" id="loginBtn" onclick="login()" style="display: none;">
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4"/><path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853"/><path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05"/><path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335"/></g></svg>
            Sign in with Google
        </button>
        
        <!-- User info (compact icon with dropdown) -->
        <div id="userInfoContainer" style="display: none; position: relative;">
            <img id="userAvatarCompact" class="user-avatar-compact" src="" alt="User" onclick="toggleUserDropdown()" title="">
            <div class="user-dropdown" id="userDropdown">
                <div class="user-dropdown-header">
                    <div class="user-dropdown-email" id="userDropdownEmail"></div>
                    <div class="user-dropdown-name" id="userDropdownName"></div>
                </div>
                <button class="logout-btn" onclick="logout()">
                    <span id="logoutText">Logout</span>
                </button>
            </div>
        </div>
    </div>
    <!-- Toast notification container -->
    <div id="toastContainer" class="toast-container"></div>
    
    <div class="top-bar">
        <div class="action-bar">
            <button class="action-btn disabled" id="saveBtn" onclick="saveDraft()" title="Login required"><span id="saveBtnText">Save</span></button>
            <button class="action-btn" id="previewBtn" onclick="previewDocument()">Preview</button>
            <div class="download-container">
                <button class="action-btn primary" id="downloadBtn" onclick="toggleDownloadMenu()">
                    <span id="downloadBtnText">Download</span> ▼
                </button>
                <div class="download-menu" id="downloadMenu">
                    <div class="download-option" onclick="downloadLatex(); closeDownloadMenu();">
                        <span class="download-option-icon">📄</span>
                        <span id="downloadLatexText">LaTeX (.tex)</span>
                    </div>
                    <div class="download-option" onclick="downloadPDF(); closeDownloadMenu();">
                        <span class="download-option-icon">📕</span>
                        <span id="downloadPdfText">PDF</span>
                    </div>
                </div>
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
                    <li><strong>対象：</strong>「独自性・革新性があり、将来社会的インパクトを与えイノベーションを創出する可能性を秘めたテーマを実現しようとしている若い逸材（2026年4月1日時点で25歳未満）」</li>
                    <li><strong>目的：</strong> 我が国の産業の活性化・競争力強化</li>
                    <li><strong>支援額：</strong>最大300万円</li>
                    <li><strong>期間：</strong>約9ヶ月</li>
                    <li><strong>特典：</strong>プロジェクトマネージャー（PM）による指導、開発環境の提供</li>
                </ul>
            </div>
        </div>
        
        <!-- Editing Tab -->
        <div class="tab-content active" id="editing">
            <h1>未踏IT人材発掘・育成事業</h1>
            <p class="subtitle">提案プロジェクト詳細資料 作成ツール</p>
            
            <div class="info-box">
                <p><strong>使い方：</strong></p>
                <p>各セクションに内容を記入して「ダウンロード」ボタンをクリックし、LaTeXまたはPDF形式を選択すると、ファイルがダウンロードされます。</p>
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

                <h2>9. 参考文献</h2>
                <div class="form-group">
                    <textarea id="section9" name="section9" placeholder=""></textarea>
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
        </div>
    </div>
    
    <script>
        // Toggle user dropdown
        function toggleUserDropdown() {
            const dropdown = document.getElementById('userDropdown');
            dropdown.classList.toggle('active');
        }
        
        // Close user dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const userContainer = document.getElementById('userInfoContainer');
            const dropdown = document.getElementById('userDropdown');
            const target = event.target;
            
            if (userContainer && dropdown && !userContainer.contains(target)) {
                dropdown.classList.remove('active');
            }
        });
        
        // Toggle sidebar
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        }
        
        // Close sidebar helper function
        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        }
        
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
                save: "下書き保存",
                saved: "✓ 保存済み",
                preview: "プレビュー",
                download: "ダウンロード",
                downloadLatex: "LaTeX (.tex)",
                downloadPDF: "PDF",
                loginRequired: "ログインが必要です",
                logout: "ログアウト",
                
                // Knowledge tab
                knowledgeTitle: "未踏IT人材発掘・育成事業について",
                knowledgeSubtitle: "General Knowledge to Pass MITOU",
                aboutMitouTitle: "未踏事業とは",
                aboutMitouText: "未踏IT人材発掘・育成事業は、独立行政法人情報処理推進機構（IPA）が実施する、優れたIT人材を発掘・育成するためのプログラムです。",
                eligibility: "対象：",
                eligibilityText: "25歳未満の個人またはグループ",
                funding: "支援額：",
                fundingText: "最大300万円/人",
                period: "期間：",
                periodText: "約9ヶ月",
                benefits: "特典：",
                benefitsText: "プロジェクトマネージャー（PM）による指導、開発環境の提供",
                
                // Editing tab
                editingTitle: "未踏IT人材発掘・育成事業",
                editingSubtitle: "提案プロジェクト詳細資料 作成ツール",
                howToUseLabel: "使い方：",
                howToUseText: "各セクションに内容を記入して「ダウンロード」ボタンをクリックし、LaTeXまたはPDF形式を選択すると、ファイルがダウンロードされます。",
                
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

                section9: "9. 参考文献",
                section9_placeholder: "",
                
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
                pdfInstruction: "PDF生成機能：\\n\\nLaTeXファイルをダウンロードした後、以下のいずれかの方法でPDFに変換してください：\\n\\n1. Overleaf (https://www.overleaf.com/) にアップロードして自動コンパイル\\n2. ローカルのLaTeX環境で 'platex' コマンドを使用\\n3. Cloud LaTeX などのオンラインサービスを利用\\n\\n最も簡単な方法はOverleafの利用です。まずLaTeXファイルをダウンロードしてください。",
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
                save: "Save",
                saved: "✓ Saved",
                preview: "Preview",
                download: "Download",
                downloadLatex: "LaTeX (.tex)",
                downloadPDF: "PDF",
                loginRequired: "Login required",
                logout: "Logout",
                
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
                howToUseText: "Fill in each section and click the \\"Download\\" button, then select LaTeX or PDF format to download the file.",
                
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

                section9: "9. Reference",
                section9_placeholder: "",
                
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
                pdfInstruction: "PDF Generation Feature:\\n\\nAfter downloading the LaTeX file, please convert it to PDF using one of the following methods:\\n\\n1. Upload to Overleaf (https://www.overleaf.com/) for automatic compilation\\n2. Use the 'platex' command in your local LaTeX environment\\n3. Use online services like Cloud LaTeX\\n\\nThe easiest method is using Overleaf. First, please download the LaTeX file.",
                previewComingSoon: "The preview feature is under development. Currently, please download the LaTeX file and preview it using services like Overleaf."
            }
        };
        
        // Current language
        let currentLang = localStorage.getItem('language') || 'ja';
        
        // Function to calculate and update days left until deadline
        function updateDaysLeft() {
            const t = translations[currentLang];
            const deadlineDate = new Date('${safeDeadline}'); // Sanitized deadline from configuration
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
            
            // Show only the button for the opposite language
            // When showing Japanese text, show English flag button
            // When showing English text, show Japanese flag button
            document.getElementById('langJa').classList.toggle('active', lang === 'en');
            document.getElementById('langEn').classList.toggle('active', lang === 'ja');
            
            // Update all translatable elements
            updateTranslations();
        }
        
        // Function to update all translations
        function updateTranslations() {
            const t = translations[currentLang];
            
            // Nav tabs in sidebar
            const navTabs = document.querySelectorAll('.nav-tab');
            navTabs[0].textContent = t.navKnowledge;
            navTabs[1].textContent = t.navEditing;
            navTabs[2].textContent = t.navExamples;
            
            // Update deadline label
            const deadlineLabel = document.querySelector('.deadline-label');
            if (deadlineLabel) {
                deadlineLabel.textContent = t.deadlineLabel;
            }
            
            // Update days left
            updateDaysLeft();
            
            // Action bar
            const saveBtnText = document.getElementById('saveBtnText');
            const saveBtn = document.getElementById('saveBtn');
            if (saveBtnText && saveBtn) {
                // Update text based on current state
                if (saveBtn.classList.contains('saved')) {
                    saveBtnText.textContent = t.saved;
                } else {
                    saveBtnText.textContent = t.save;
                }
                // Only update title if button is disabled and not in saved state
                if (saveBtn.classList.contains('disabled') && !saveBtn.classList.contains('saved')) {
                    saveBtn.title = t.loginRequired;
                } else if (saveBtn.classList.contains('saved')) {
                    saveBtn.title = t.saved;
                } else {
                    saveBtn.title = t.save;
                }
            }
            document.getElementById('previewBtn').textContent = t.preview;
            document.getElementById('downloadBtnText').textContent = t.download;
            document.getElementById('downloadLatexText').textContent = t.downloadLatex;
            document.getElementById('downloadPdfText').textContent = t.downloadPDF;
            document.getElementById('logoutText').textContent = t.logout;
            
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

            editingTab.querySelectorAll('h2')[8].textContent = t.section9;
            document.getElementById('section9').placeholder = t.section9_placeholder;
            
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
            
            // Setup click outside listener for download menu (optimized with cached elements)
            const downloadContainer = document.querySelector('.download-container');
            const downloadMenu = document.getElementById('downloadMenu');
            
            if (downloadContainer && downloadMenu) {
                document.addEventListener('click', function(event) {
                    const target = event.target;
                    if (target && !downloadContainer.contains(target)) {
                        downloadMenu.classList.remove('active');
                    }
                });
            }
        });
        
        // Constants (will be overridden by translation system)
        window.VALIDATION_ERROR_MSG = '必須項目を入力してください。';
        window.PDF_INSTRUCTION_MSG = 'PDF生成機能：\\n\\nLaTeXファイルをダウンロードした後、以下のいずれかの方法でPDFに変換してください：\\n\\n1. Overleaf (https://www.overleaf.com/) にアップロードして自動コンパイル\\n2. ローカルのLaTeX環境で "platex" コマンドを使用\\n3. Cloud LaTeX などのオンラインサービスを利用\\n\\n最も簡単な方法はOverleafの利用です。まずLaTeXファイルをダウンロードしてください。';
        window.PREVIEW_COMING_SOON_MSG = 'プレビュー機能は開発中です。現在はLaTeXファイルをダウンロードして、Overleafなどのサービスでプレビューしてください。';
        
        // Toast notification system
        function showToast(message, type = 'info', duration = 5000) {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = 'toast ' + type;
            
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            
            const icon = document.createElement('span');
            icon.className = 'toast-icon';
            icon.textContent = icons[type] || icons.info;
            
            const msg = document.createElement('span');
            msg.className = 'toast-message';
            msg.textContent = message;
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.textContent = '×';
            closeBtn.onclick = function() { toast.remove(); };
            
            toast.appendChild(icon);
            toast.appendChild(msg);
            toast.appendChild(closeBtn);
            container.appendChild(toast);
            
            // Auto-remove after duration
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
        
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
                
                // Close sidebar after selecting a tab
                closeSidebar();
            });
        });
        
        // Authentication and Draft Management
        let currentUser = null;
        let sessionToken = null;
        
        // Form state tracking
        let savedFormData = null;
        let isFormSaved = false;
        
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
            // Update compact avatar
            const avatarUrl = user.picture || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="%23667eea"/><text x="20" y="28" text-anchor="middle" fill="white" font-size="20" font-weight="bold">' + (user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U') + '</text></svg>';
            document.getElementById('userAvatarCompact').src = avatarUrl;
            document.getElementById('userAvatarCompact').title = user.name || user.email;
            
            // Update dropdown content
            document.getElementById('userDropdownEmail').textContent = user.email;
            document.getElementById('userDropdownName').textContent = user.name || '';
            
            // Show user info container, hide login button
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('userInfoContainer').style.display = 'block';
        }
        
        // Enable save button
        function enableSaveButton() {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.classList.remove('disabled');
            saveBtn.title = translations[currentLang].save;
        }
        
        // Disable save button
        function disableSaveButton() {
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.classList.add('disabled');
            saveBtn.title = translations[currentLang].loginRequired;
        }
        
        // Mark form as saved
        function markFormAsSaved() {
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            saveBtn.classList.add('saved');
            saveBtn.classList.add('disabled');
            saveBtnText.textContent = translations[currentLang].saved;
            saveBtn.title = translations[currentLang].saved;
            
            isFormSaved = true;
            
            // Store current form data as saved state
            const form = document.getElementById('applicationForm');
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            savedFormData = JSON.stringify(data);
        }
        
        // Mark form as modified (not saved)
        function markFormAsModified() {
            if (!currentUser || !sessionToken) {
                return; // Don't enable if not logged in
            }
            
            const saveBtn = document.getElementById('saveBtn');
            const saveBtnText = document.getElementById('saveBtnText');
            
            saveBtn.classList.remove('saved');
            saveBtn.classList.remove('disabled');
            saveBtnText.textContent = translations[currentLang].save;
            saveBtn.title = translations[currentLang].save;
            
            isFormSaved = false;
        }
        
        // Check if form has been modified
        function hasFormChanged() {
            if (savedFormData === null) {
                return true; // No saved state, consider as changed
            }
            
            const form = document.getElementById('applicationForm');
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            const currentData = JSON.stringify(data);
            
            return currentData !== savedFormData;
        }
        
        // Login with Google
        async function login() {
            try {
                // Start OAuth flow
                const response = await fetch('/api/auth/google/url');
                const data = await response.json();
                
                if (data.error) {
                    showToast(data.error, 'error');
                    return;
                }
                
                if (data.authUrl) {
                    // Redirect to Google OAuth
                    window.location.href = data.authUrl;
                }
            } catch (error) {
                console.error('Login failed:', error);
                showToast('ログインに失敗しました。もう一度お試しください。 / Login failed. Please try again.', 'error');
            }
        }
        
        // Logout
        async function logout() {
            // Close dropdown
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.classList.remove('active');
            }
            
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
            showToast('ログアウトしました。 / Logged out successfully.', 'success');
        }
        
        // Save draft
        async function saveDraft() {
            if (!currentUser || !sessionToken) {
                showToast('ログインが必要です。 / Please login to save your draft.', 'warning');
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
                    showToast('下書きを保存しました。 / Draft saved successfully.', 'success');
                    markFormAsSaved();
                } else {
                    throw new Error('Failed to save draft');
                }
            } catch (error) {
                console.error('Save draft failed:', error);
                showToast('下書きの保存に失敗しました。 / Failed to save draft.', 'error');
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
                        // Mark form as saved after loading
                        markFormAsSaved();
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
                        showToast('ログインしました。 / Logged in successfully.', 'success');
                    } else {
                        throw new Error('Authentication failed');
                    }
                } catch (error) {
                    console.error('OAuth callback failed:', error);
                    showToast('認証に失敗しました。もう一度お試しください。 / Authentication failed. Please try again.', 'error');
                }
            }
        }
        
        // Initialize authentication on page load
        document.addEventListener('DOMContentLoaded', function() {
            handleOAuthCallback().then(() => checkAuth());
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            // Ctrl+S (or Cmd+S on Mac) to save
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault(); // Prevent browser's default save behavior
                saveDraft();
            }
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
        
        // Download menu toggle functions
        function toggleDownloadMenu() {
            const menu = document.getElementById('downloadMenu');
            menu.classList.toggle('active');
        }
        
        function closeDownloadMenu() {
            const menu = document.getElementById('downloadMenu');
            menu.classList.remove('active');
        }
        
        // Close download menu when clicking outside
        document.addEventListener('click', function(event) {
            const downloadContainer = document.querySelector('.download-container');
            const downloadMenu = document.getElementById('downloadMenu');
            
            // Check if the click is outside the download container
            if (downloadContainer && downloadMenu && !downloadContainer.contains(event.target)) {
                downloadMenu.classList.remove('active');
            }
        });
        
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
                // Mark form as modified when any input changes
                if (isFormSaved) {
                    markFormAsModified();
                }
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
    
    // Get Google OAuth URL using Supabase
    if (url.pathname === '/api/auth/google/url') {
      try {
        const supabase = getSupabaseClient(env);
        
        // Generate auth URL using Supabase
        const redirectTo = `${url.origin}/auth/callback`;
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        
        if (error) {
          console.error('Supabase OAuth URL generation error:', error);
          return new Response(JSON.stringify({ 
            error: 'Failed to generate OAuth URL. Please check Supabase configuration.' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ authUrl: data.url }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('OAuth URL generation error:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to generate OAuth URL' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Supabase Auth callback handler
    if (url.pathname === '/auth/callback') {
      try {
        // Check if we have a code (PKCE flow) or will receive tokens in fragment (implicit flow)
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        
        // Handle OAuth errors
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Failed</title>
              <style>
                body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                h1 { color: #c62828; }
                a { color: #667eea; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <h1>Authentication Failed</h1>
              <p><strong>Error:</strong> ${error}</p>
              <p>${errorDescription || 'Please try again.'}</p>
              <a href="/">← Return to home</a>
            </body>
            </html>
          `, {
            status: 400,
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // If we have a code, exchange it for a session (PKCE flow)
        if (code) {
          const supabase = getSupabaseClient(env);
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error || !data.session) {
            console.error('Code exchange error:', error);
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Authentication Failed</title>
                <style>
                  body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                  h1 { color: #c62828; }
                  a { color: #667eea; text-decoration: none; }
                  a:hover { text-decoration: underline; }
                </style>
              </head>
              <body>
                <h1>Authentication Failed</h1>
                <p>Failed to complete authentication. Please try again.</p>
                <a href="/">← Return to home</a>
              </body>
              </html>
            `, {
              status: 400,
              headers: { 'Content-Type': 'text/html' }
            });
          }
          
          // Redirect back to the app with the access token
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Authentication Successful</title>
              <style>
                body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
                .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <p>Authentication successful! Redirecting...</p>
              <script>
                // Store the token and redirect
                localStorage.setItem('sessionToken', '${data.session.access_token}');
                window.location.href = '/';
              </script>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // If no code, handle tokens in URL fragment (implicit/PKCE flow)
        // The tokens will be in the URL fragment, which we need to handle client-side
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Completing Authentication...</title>
            <style>
              body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .error { color: #c62828; margin-top: 20px; }
              a { color: #667eea; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <p id="status">Processing authentication...</p>
            <div id="error" class="error" style="display: none;"></div>
            <script>
              (function() {
                try {
                  // Parse tokens from URL fragment
                  const hash = window.location.hash.substring(1);
                  const params = new URLSearchParams(hash);
                  
                  const accessToken = params.get('access_token');
                  const expiresIn = params.get('expires_in');
                  const refreshToken = params.get('refresh_token');
                  const tokenType = params.get('token_type');
                  const error = params.get('error');
                  const errorDescription = params.get('error_description');
                  
                  // Handle errors
                  if (error) {
                    console.error('OAuth error:', error, errorDescription);
                    document.getElementById('spinner')?.remove();
                    const errorDiv = document.getElementById('error');
                    const statusP = document.getElementById('status');
                    statusP.textContent = 'Authentication Failed';
                    errorDiv.innerHTML = '<strong>Error:</strong> ' + error + '<br>' + 
                                        (errorDescription || 'Please try again.') + 
                                        '<br><br><a href="/">← Return to home</a>';
                    errorDiv.style.display = 'block';
                    return;
                  }
                  
                  // Check if we have an access token
                  if (accessToken) {
                    // Store the token
                    localStorage.setItem('sessionToken', accessToken);
                    
                    // Store refresh token if available
                    if (refreshToken) {
                      localStorage.setItem('refreshToken', refreshToken);
                    }
                    
                    document.getElementById('status').textContent = 'Authentication successful! Redirecting...';
                    
                    // Redirect to home page
                    setTimeout(function() {
                      window.location.href = '/';
                    }, 500);
                  } else {
                    // No token found
                    console.error('No access token found in callback');
                    const errorDiv = document.getElementById('error');
                    const statusP = document.getElementById('status');
                    document.querySelector('.spinner')?.remove();
                    statusP.textContent = 'Authentication Failed';
                    errorDiv.innerHTML = 'No authentication token received. This may be due to:<br>' +
                                        '• Supabase configuration issue<br>' +
                                        '• OAuth flow not properly configured<br>' +
                                        '<br><a href="/">← Return to home and try again</a>';
                    errorDiv.style.display = 'block';
                  }
                } catch (e) {
                  console.error('Callback processing error:', e);
                  const errorDiv = document.getElementById('error');
                  const statusP = document.getElementById('status');
                  document.querySelector('.spinner')?.remove();
                  statusP.textContent = 'Authentication Failed';
                  errorDiv.innerHTML = 'Failed to process authentication callback.<br>' +
                                      '<br><a href="/">← Return to home</a>';
                  errorDiv.style.display = 'block';
                }
              })();
            </script>
          </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        });
      } catch (error) {
        console.error('Auth callback error:', error);
        return new Response(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              h1 { color: #c62828; }
              a { color: #667eea; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>Authentication Failed</h1>
            <p>An unexpected error occurred during authentication.</p>
            <a href="/">← Return to home</a>
          </body>
          </html>
        `, {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }
    
    // Google OAuth callback (legacy endpoint for frontend compatibility)
    if (url.pathname === '/api/auth/google/callback' && request.method === 'POST') {
      try {
        const { code } = await request.json() as any;
        
        if (!code) {
          return new Response(JSON.stringify({ error: 'No code provided' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const supabase = getSupabaseClient(env);
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error || !data.session || !data.user) {
          console.error('Code exchange error:', error);
          return new Response(JSON.stringify({ error: 'Failed to exchange code for session' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Convert Supabase user to our User format
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email || '',
          picture: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
          createdAt: data.user.created_at,
          lastLogin: new Date().toISOString()
        };
        
        // Store user in KV for quick access
        await env.USERS_KV.put(`user:${user.id}`, JSON.stringify(user));
        
        return new Response(JSON.stringify({ 
          token: data.session.access_token, 
          user 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Authentication error:', error);
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
        try {
          const supabase = getSupabaseClient(env);
          // Sign out from Supabase (this invalidates the JWT)
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        }
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
        const supabase = getSupabaseClient(env);
        
        // Upsert draft data into Supabase DRAFTS table
        // This will insert if no draft exists, or update if one already exists for this user
        const { error } = await supabase
          .from('drafts')
          .upsert({
            user_id: user.id,
            data: data,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        if (error) {
          console.error('Failed to save draft to Supabase:', error);
          return new Response(JSON.stringify({ error: 'Failed to save draft' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Save draft error:', error);
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
        const supabase = getSupabaseClient(env);
        
        // Query draft data from Supabase DRAFTS table
        const { data: drafts, error } = await supabase
          .from('drafts')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          // If no draft found (404), return empty data instead of error
          if (error.code === 'PGRST116') {
            return new Response(JSON.stringify({ data: null }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.error('Failed to load draft from Supabase:', error);
          return new Response(JSON.stringify({ error: 'Failed to load draft' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        if (!drafts) {
          return new Response(JSON.stringify({ data: null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Convert Supabase response to Draft format
        const draft: Draft = {
          id: drafts.id,
          userId: drafts.user_id,
          data: drafts.data as SectionData,
          updatedAt: drafts.updated_at,
          createdAt: drafts.created_at
        };
        
        return new Response(JSON.stringify(draft), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Load draft error:', error);
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
          section8: data.section8 || '',
          section9: data.section9 || '',
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
    return new Response(getHTMLPage(deadlineConfig.submissionDeadline), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
};
