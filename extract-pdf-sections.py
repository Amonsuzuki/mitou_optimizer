#!/usr/bin/env python3
"""
PDF Text Extraction Script
Extracts text from MITOU application PDFs and classifies them by sections
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

try:
    import PyPDF2
except ImportError:
    print("Installing PyPDF2...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'PyPDF2'])
    import PyPDF2

# Section titles to look for (Japanese)
SECTION_PATTERNS = [
    {'id': 1, 'pattern': r'(?:1\s*[\.．]?\s*何をつくるか|^何をつくるか)', 'title': '何をつくるか'},
    {'id': 2, 'pattern': r'(?:2\s*[\.．]?\s*斬新さの主張|^斬新さの主張|^斬新さ|期待される効果)', 'title': '斬新さの主張、期待される効果など'},
    {'id': 3, 'pattern': r'(?:3\s*[\.．]?\s*どんな出し方|^どんな出し方)', 'title': 'どんな出し方を考えているか'},
    {'id': 4, 'pattern': r'(?:4\s*[\.．]?\s*具体的な進め方|^具体的な進め方|^進め方と予算)', 'title': '具体的な進め方と予算'},
    {'id': 5, 'pattern': r'(?:5\s*[\.．]?\s*(?:私の)?腕前|^腕前を証明)', 'title': '私の腕前を証明できるもの'},
    {'id': 6, 'pattern': r'(?:6\s*[\.．]?\s*特記事項|プロジェクト遂行)', 'title': 'プロジェクト遂行にあたっての特記事項'},
    {'id': 7, 'pattern': r'(?:7\s*[\.．]?\s*(?:ソフトウェア作成以外|勉強.*特技.*趣味)|^ソフトウェア作成以外)', 'title': 'ソフトウェア作成以外の勉強、特技、生活、趣味など'},
    {'id': 8, 'pattern': r'(?:8\s*[\.．]?\s*将来のソフトウェア|^将来.*ソフトウェア.*技術)', 'title': '将来のソフトウェア技術に対して思うこと・期待すること'}
]

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ''
            for page in pdf_reader.pages:
                text += page.extract_text() + '\n'
            return text
    except Exception as e:
        print(f"  Error extracting text from {pdf_path}: {str(e)}")
        return ''

def split_into_sections(text, filename):
    """Splits text into sections based on section patterns"""
    sections = {i: '' for i in range(1, 9)}
    lines = text.split('\n')
    
    current_section = 0
    section_content = []
    
    for line in lines:
        line = line.strip()
        
        # Check if this line matches any section header
        found_section = False
        for pattern_info in SECTION_PATTERNS:
            if re.search(pattern_info['pattern'], line, re.IGNORECASE):
                # Save previous section content
                if current_section > 0 and section_content:
                    sections[current_section] = '\n'.join(section_content).strip()
                
                # Start new section
                current_section = pattern_info['id']
                section_content = []
                found_section = True
                break
        
        # If not a section header and we're in a section, add to content
        if not found_section and current_section > 0:
            section_content.append(line)
    
    # Save last section content
    if current_section > 0 and section_content:
        sections[current_section] = '\n'.join(section_content).strip()
    
    # Limit each section to reasonable length (first 1000 characters)
    for i in range(1, 9):
        if sections[i] and len(sections[i]) > 1000:
            sections[i] = sections[i][:1000] + '...'
    
    return sections

def get_short_name(filename):
    """Gets a short name from the filename"""
    name = filename.replace('.pdf', '')
    
    # Extract meaningful parts
    if 'wada' in name.lower():
        return '和田さん'
    if '水野' in name:
        return '水野さん'
    if 'matsuura' in name.lower():
        return '松浦さん'
    if 'yoshiki' in name.lower():
        return 'Yoshikiさん'
    if 'smartgoal' in name.lower():
        return 'SmartGoalプロジェクト'
    if 'ニューラル' in name:
        return '日本語入力システム'
    if 'proposal' in name.lower():
        return 'Proposal'
    if '1st_screening' in name:
        return '1st Screening'
    if 'report' in name.lower():
        return 'Report'
    if '提案プロジェクト' in name:
        return 'プロジェクト詳細'
    
    # Default: truncate long names
    if len(name) > 30:
        return name[:27] + '...'
    
    return name

def main():
    """Main function to process all PDFs"""
    script_dir = Path(__file__).parent
    examples_dir = script_dir / 'examples'
    output_path = script_dir / 'extracted-sections.json'
    
    all_projects = []
    
    # Process both open and closed directories
    subdirs = ['open', 'closed']
    
    for subdir in subdirs:
        dir_path = examples_dir / subdir
        
        if not dir_path.exists():
            print(f"Directory not found: {dir_path}")
            continue
        
        pdf_files = list(dir_path.glob('*.pdf'))
        print(f"\nProcessing {len(pdf_files)} PDFs in {subdir}...")
        
        for pdf_path in pdf_files:
            filename = pdf_path.name
            print(f"  Extracting: {filename}")
            
            text = extract_text_from_pdf(pdf_path)
            
            if not text:
                print(f"    ⚠ No text extracted")
                continue
            
            sections = split_into_sections(text, filename)
            
            # Count how many sections have content
            filled_sections = sum(1 for s in sections.values() if s and len(s) > 10)
            print(f"    ✓ Extracted {filled_sections} sections")
            
            all_projects.append({
                'name': get_short_name(filename),
                'filename': filename,
                'category': subdir,
                'sections': sections
            })
    
    # Save to JSON file
    output = {
        'generated': datetime.now().isoformat(),
        'sectionTitles': [{'id': p['id'], 'title': p['title']} for p in SECTION_PATTERNS],
        'projects': all_projects
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Extracted data saved to {output_path}")
    print(f"  Total projects: {len(all_projects)}")

if __name__ == '__main__':
    main()
