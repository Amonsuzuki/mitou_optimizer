/**
 * MITOU Optimizer - Cloudflare Worker
 * 
 * This worker serves a web application that helps users create
 * MITOU IT project application documents in LaTeX/PDF format.
 */

interface SectionData {
  section1: string;  // 何をつくるか
  section2: string;  // 斬新さの主張、期待される効果など
  section3: string;  // どんな出し方を考えているか
  section4: string;  // 具体的な進め方と予算
  section5: string;  // 私の腕前を証明できるもの
  section6: string;  // プロジェクト遂行にあたっての特記事項
  section7: string;  // ソフトウェア作成以外の勉強、特技、生活、趣味など
  section8: string;  // 将来のソフトウェア技術に対して思うこと・期待すること
}

/**
 * Escapes special LaTeX characters in text
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\n\n+/g, '\n\n\\vspace{0.3em}\n\n')
    .replace(/\n/g, '\n');
}

/**
 * Generates LaTeX document from section data
 */
function generateLatex(data: SectionData, applicantName: string = ''): string {
  const sections = [
    { title: '何をつくるか', content: data.section1 },
    { title: '斬新さの主張、期待される効果など', content: data.section2 },
    { title: 'どんな出し方を考えているか', content: data.section3 },
    { title: '具体的な進め方と予算', content: data.section4 },
    { title: '私の腕前を証明できるもの', content: data.section5 },
    { title: 'プロジェクト遂行にあたっての特記事項', content: data.section6 },
    { title: 'ソフトウェア作成以外の勉強、特技、生活、趣味など', content: data.section7 },
    { title: '将来のソフトウェア技術に対して思うこと・期待すること', content: data.section8 }
  ];

  let latex = `\\documentclass[a4paper,11pt]{jarticle}
\\usepackage[top=20mm,bottom=20mm,left=20mm,right=20mm]{geometry}
\\usepackage{graphicx}
\\usepackage{url}

\\title{未踏IT人材発掘・育成事業\\\\提案プロジェクト詳細資料}
${applicantName ? `\\author{${escapeLatex(applicantName)}}` : ''}
\\date{\\today}

\\begin{document}

\\maketitle

`;

  for (const section of sections) {
    latex += `\\section{${section.title}}\n\n`;
    latex += `${escapeLatex(section.content)}\n\n`;
  }

  latex += `\\end{document}`;

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
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
        }
        
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .subtitle {
            text-align: center;
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
        
        .form-group {
            margin-bottom: 30px;
        }
        
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
            font-size: 16px;
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
            min-height: 150px;
            resize: vertical;
        }
        
        .button-group {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }
        
        button {
            flex: 1;
            padding: 15px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-generate {
            background: #667eea;
            color: white;
        }
        
        .btn-generate:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-clear {
            background: #e0e0e0;
            color: #333;
        }
        
        .btn-clear:hover {
            background: #d0d0d0;
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
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            h1 {
                font-size: 22px;
            }
            
            .button-group {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>未踏IT人材発掘・育成事業</h1>
        <p class="subtitle">提案プロジェクト詳細資料 作成ツール</p>
        
        <div class="info-box">
            <p><strong>使い方：</strong></p>
            <p>各セクションに内容を記入して「LaTeX生成」ボタンをクリックすると、LaTeX形式のファイルがダウンロードされます。</p>
            <p>LaTeXファイルをコンパイルすることでPDFを生成できます。</p>
        </div>
        
        <form id="applicationForm">
            <div class="form-group">
                <label>
                    <span class="section-number">氏名</span>
                    応募者氏名（オプション）
                </label>
                <input type="text" id="applicantName" name="applicantName" placeholder="山田 太郎">
            </div>
            
            <div class="form-group">
                <label for="section1">
                    <span class="section-number">1</span>
                    何をつくるか
                </label>
                <textarea id="section1" name="section1" required placeholder="あなたが作りたいプロジェクトについて説明してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section2">
                    <span class="section-number">2</span>
                    斬新さの主張、期待される効果など
                </label>
                <textarea id="section2" name="section2" required placeholder="プロジェクトの独創性や期待される効果を記述してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section3">
                    <span class="section-number">3</span>
                    どんな出し方を考えているか
                </label>
                <textarea id="section3" name="section3" required placeholder="成果物の公開方法や展開について説明してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section4">
                    <span class="section-number">4</span>
                    具体的な進め方と予算
                </label>
                <textarea id="section4" name="section4" required placeholder="開発スケジュールと予算の使い道を記述してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section5">
                    <span class="section-number">5</span>
                    私の腕前を証明できるもの
                </label>
                <textarea id="section5" name="section5" required placeholder="過去の作品、GitHubリポジトリ、技術ブログなどを紹介してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section6">
                    <span class="section-number">6</span>
                    プロジェクト遂行にあたっての特記事項
                </label>
                <textarea id="section6" name="section6" placeholder="協力者、使用する技術、その他特記事項があれば記述してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section7">
                    <span class="section-number">7</span>
                    ソフトウェア作成以外の勉強、特技、生活、趣味など
                </label>
                <textarea id="section7" name="section7" placeholder="あなた自身について自由に記述してください..."></textarea>
            </div>
            
            <div class="form-group">
                <label for="section8">
                    <span class="section-number">8</span>
                    将来のソフトウェア技術に対して思うこと・期待すること
                </label>
                <textarea id="section8" name="section8" placeholder="ソフトウェア技術の将来についてあなたの考えを述べてください..."></textarea>
            </div>
            
            <div class="button-group">
                <button type="submit" class="btn-generate">LaTeX生成・ダウンロード</button>
                <button type="button" class="btn-clear" onclick="clearForm()">クリア</button>
            </div>
        </form>
        
        <div class="loading" id="loading">
            <p>LaTeXファイルを生成中...</p>
        </div>
        
        <div class="error" id="error">
            <p class="error-message" id="errorMessage"></p>
        </div>
    </div>
    
    <script>
        document.getElementById('applicationForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const errorMessage = document.getElementById('errorMessage');
            
            // Hide error, show loading
            error.classList.remove('active');
            loading.classList.add('active');
            
            try {
                const formData = new FormData(e.target);
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
        });
        
        function clearForm() {
            if (confirm('入力内容をすべてクリアしますか？')) {
                document.getElementById('applicationForm').reset();
            }
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
          section1: data.section1 || '',
          section2: data.section2 || '',
          section3: data.section3 || '',
          section4: data.section4 || '',
          section5: data.section5 || '',
          section6: data.section6 || '',
          section7: data.section7 || '',
          section8: data.section8 || ''
        };
        
        const applicantName = data.applicantName || '';
        const latex = generateLatex(sectionData, applicantName);
        
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
    
    // Serve the HTML form for all other requests
    return new Response(getHTMLPage(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }
};
