#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Entrip 프로젝트 전체 코드를 하나의 마크다운 파일로 생성하는 스크립트
Sprint 진행 상황 파악 및 AI 협업을 위한 스냅샷 생성 도구
"""

import os
import datetime
from pathlib import Path

def is_binary_file(filepath):
    """바이너리 파일인지 확인"""
    binary_extensions = {
        '.pyc', '.pyo', '.pyd', '.so', '.dll', '.exe', '.bin', 
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
        '.mp3', '.mp4', '.avi', '.mov', '.wav',
        '.zip', '.rar', '.7z', '.tar', '.gz',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.db', '.sqlite', '.sqlite3',
        '.woff', '.woff2', '.ttf', '.eot',
        '.map', '.lock'
    }
    
    return Path(filepath).suffix.lower() in binary_extensions

def should_exclude_file(filepath):
    """제외할 파일인지 확인"""
    exclude_patterns = [
        '__pycache__', '.git', '.pytest_cache', '.coverage',
        'htmlcov', '.idea', '.vscode', 'venv', 'env',
        'node_modules', 'build', 'dist', '.next',
        '*.egg-info', 'history', 'legacy', 'profiling_data',
        'profiling_charts', 'tests/large_docs', '.github',
        'coverage', '.turbo', '.swc', 'out',
        'storybook-static', '.storybook/cache',
        'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'
    ]
    
    filepath_str = str(filepath)
    for pattern in exclude_patterns:
        if pattern in filepath_str:
            return True
    
    # 특정 파일명 제외
    filename = os.path.basename(filepath)
    if filename in ['프로젝트_스냅샷.md', 'generate_project_snapshot.py', '.DS_Store', 'Thumbs.db']:
        return True
        
    return False

def get_file_content(filepath):
    """파일 내용을 읽어서 반환"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(filepath, 'r', encoding='cp949') as f:
                return f.read()
        except:
            return "[읽기 오류: 인코딩 문제]"
    except Exception as e:
        return f"[읽기 오류: {str(e)}]"

def create_project_structure(root_dir):
    """프로젝트 구조를 문자열로 생성"""
    structure = []
    
    for root, dirs, files in os.walk(root_dir):
        # 제외할 디렉토리 필터링
        dirs[:] = [d for d in dirs if not should_exclude_file(os.path.join(root, d))]
        
        level = root.replace(root_dir, '').count(os.sep)
        indent = '  ' * level
        
        if level == 0:
            structure.append('Entrip/')
        else:
            folder_name = os.path.basename(root)
            structure.append(f'{indent}{folder_name}/')
        
        # 파일들 추가
        subindent = '  ' * (level + 1)
        for file in sorted(files):
            filepath = os.path.join(root, file)
            if not should_exclude_file(filepath) and not is_binary_file(filepath):
                structure.append(f'{subindent}{file}')
    
    return '\n'.join(structure)

def get_file_extension_language(filepath):
    """파일 확장자에 따른 언어 타입 반환"""
    ext_map = {
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.json': 'json',
        '.md': 'markdown',
        '.css': 'css',
        '.scss': 'scss',
        '.html': 'html',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.py': 'python',
        '.sh': 'bash',
        '.env': 'bash',
        '.gitignore': 'bash',
        '.prettierrc': 'json',
        '.eslintrc.json': 'json',
        '.txt': 'text'
    }
    
    ext = Path(filepath).suffix.lower()
    filename = os.path.basename(filepath)
    
    # 특수 파일명 처리
    if filename in ['.prettierrc', '.eslintrc', '.babelrc']:
        return 'json'
    elif filename == '.gitignore':
        return 'bash'
    elif filename == '.env' or filename.startswith('.env.'):
        return 'bash'
    
    return ext_map.get(ext, 'text')

def generate_project_snapshot(root_dir):
    """프로젝트 전체 마크다운 파일 생성"""
    output_lines = []
    
    # 헤더
    output_lines.append("# Entrip 프로젝트 스냅샷")
    output_lines.append("")
    output_lines.append(f"생성일시: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    output_lines.append("")
    output_lines.append("## 프로젝트 정보")
    output_lines.append("- **프로젝트명**: Entrip - 여행사 통합 ERP 시스템")
    output_lines.append("- **기술 스택**: React 18, Next.js 14, TypeScript, Tailwind CSS")
    output_lines.append("- **아키텍처**: Monorepo (pnpm workspaces)")
    output_lines.append("- **현재 Sprint**: Sprint 03")
    output_lines.append("")
    
    # 프로젝트 구조
    output_lines.append("## 프로젝트 구조")
    output_lines.append("```")
    output_lines.append(create_project_structure(root_dir))
    output_lines.append("```")
    output_lines.append("")
    output_lines.append("---")
    output_lines.append("")
    
    # 파일 내용들
    file_count = 0
    total_lines = 0
    file_types = {}
    
    # 중요한 파일들을 우선순위별로 정렬
    priority_files = [
        'PROJECT_PLAN.md',
        'package.json',
        'pnpm-workspace.yaml',
        'tailwind.config.js',
        'tsconfig.json'
    ]
    
    # 파일 목록 수집
    all_files = []
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if not should_exclude_file(os.path.join(root, d))]
        for file in files:
            filepath = os.path.join(root, file)
            if not should_exclude_file(filepath) and not is_binary_file(filepath):
                relative_path = os.path.relpath(filepath, root_dir)
                all_files.append((filepath, file, relative_path))
    
    # 우선순위별로 정렬
    def get_priority(item):
        _, filename, _ = item
        if filename in priority_files:
            return priority_files.index(filename)
        return len(priority_files)
    
    all_files.sort(key=get_priority)
    
    # 파일 내용 추가
    for filepath, filename, relative_path in all_files:
        lang = get_file_extension_language(filepath)
        content = get_file_content(filepath)
        lines = content.count('\n') + 1
        
        # 파일 타입 통계
        ext = Path(filepath).suffix or 'no-ext'
        file_types[ext] = file_types.get(ext, 0) + 1
        
        output_lines.append(f"## 📄 {filename}")
        output_lines.append(f"**경로**: `{relative_path}`")
        output_lines.append(f"**라인 수**: {lines}")
        output_lines.append("")
        output_lines.append(f"```{lang}")
        output_lines.append(content)
        output_lines.append("```")
        output_lines.append("")
        output_lines.append("---")
        output_lines.append("")
        
        file_count += 1
        total_lines += lines
    
    # 통계 정보
    output_lines.append("## 📊 프로젝트 통계")
    output_lines.append("")
    output_lines.append(f"- **총 파일 수**: {file_count}개")
    output_lines.append(f"- **총 코드 라인**: {total_lines:,}줄")
    output_lines.append("")
    output_lines.append("### 파일 타입별 분포")
    for ext, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True):
        output_lines.append(f"- `{ext}`: {count}개")
    output_lines.append("")
    output_lines.append("---")
    output_lines.append("")
    output_lines.append("*이 스냅샷은 AI 협업 및 코드 리뷰를 위해 자동 생성되었습니다.*")
    
    # 파일 저장
    output_path = os.path.join(root_dir, "프로젝트_스냅샷.md")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    
    print(f"[O] 프로젝트 스냅샷이 생성되었습니다: {output_path}")
    print(f"[*] 통계:")
    print(f"   - 총 {file_count}개 파일")
    print(f"   - 총 {total_lines:,}줄의 코드")
    print(f"   - 파일 크기: {os.path.getsize(output_path) / 1024 / 1024:.2f}MB")

if __name__ == "__main__":
    # 현재 스크립트의 위치에서 프로젝트 루트 찾기
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # tools의 상위 디렉토리가 프로젝트 루트
    
    print(f"[*] 프로젝트 루트: {project_root}")
    generate_project_snapshot(project_root)
