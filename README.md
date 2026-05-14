# ProvGate 🚪

> AI와 함께, 이해는 스스로

코딩 학습 플랫폼 - 단순 암기가 아닌 **진짜 이해**를 확인하는 서비스

---

## 📌 서비스 소개

ProvGate는 코딩 문제를 풀고 AI가 이해도를 검증하는 학습 플랫폼입니다.
단순히 정답을 맞추는 것이 아니라, 같은 개념의 다른 문제로 진짜 이해했는지 확인합니다.

**타겟 사용자**
- 코딩을 처음 시작하는 비전공자
- 개발 실력을 키우고 싶은 직장인
- AI 복붙이 아닌 직접 이해하며 성장하고 싶은 취준생

---

## ✨ 핵심 기능

### 1. 수준 진단 퀴즈
- Claude AI가 수준별 5문항 생성
- 진단 결과에 따라 맞춤 문제 추천

### 2. 코드 에디터
- 브라우저에서 바로 Python 실행 (Pyodide)
- `def solution()` 함수형 방식
- CodeMirror 6 기반 에디터

### 3. AI 소크라테스식 힌트
- 정답을 직접 알려주지 않고 질문으로 유도
- 3단계 힌트 (추상적 → 구체적)
- 사용자 코드 분석 기반 맞춤 힌트

### 4. 이해 확인 게이트 (핵심 USP)
- 테스트 통과 후 같은 개념의 다른 문제로 이해도 검증
- 게이트 통과 시 JWT 토큰 발급
- 토큰 없이는 최종 제출 불가

### 5. 학습 통계 대시보드
- 난이도별 완료 현황
- 평균 풀이 시간
- 힌트 사용 횟수
- 최근 풀이 히스토리

---

## 🛠 기술 스택

### Frontend
| 기술 | 용도 |
|------|------|
| Next.js 14 (App Router) | 프론트엔드 프레임워크 |
| TypeScript | 타입 안전성 |
| Tailwind CSS | 스타일링 |
| CodeMirror 6 | 코드 에디터 |
| Pyodide | 브라우저 Python 실행 (WebAssembly) |

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | 백엔드 프레임워크 |
| Python 3.10 | 서버 언어 |
| SQLAlchemy 2.0 (async) | ORM |
| asyncpg | PostgreSQL 비동기 드라이버 |
| Pydantic V2 | 데이터 검증 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Supabase | PostgreSQL DB + Auth |
| Vercel | 프론트엔드 배포 |
| Render | 백엔드 배포 |
| Claude API | AI 힌트/게이트/진단 |

---

## 📁 프로젝트 구조
```bash
provgate/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # 홈
│   │   ├── layout.tsx                  # 전역 레이아웃
│   │   ├── components/
│   │   │   ├── CodeEditor.tsx          # CodeMirror 에디터
│   │   │   ├── GateModal.tsx           # 이해 확인 게이트 모달
│   │   │   ├── GlobalHeader.tsx        # 전역 헤더
│   │   │   ├── ThemeToggle.tsx         # 다크/라이트 모드
│   │   │   └── AuthButton.tsx          # 로그인/로그아웃
│   │   ├── hooks/
│   │   │   ├── usePyodide.ts           # Python 실행 환경
│   │   │   ├── useTimer.ts             # 문제 풀이 타이머
│   │   │   ├── useTheme.ts             # 테마 관리
│   │   │   └── useAuth.ts              # 인증 상태 관리
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── onboarding/
│   │   │   ├── quiz/page.tsx
│   │   │   └── result/page.tsx
│   │   ├── problems/
│   │   │   ├── page.tsx                # 문제 목록
│   │   │   ├── [id]/page.tsx           # 문제 풀이
│   │   │   └── feedback/[id]/page.tsx  # 제출 피드백
│   │   └── stats/
│   │       └── page.tsx                # 학습 통계
│   └── lib/
│       └── supabase.ts
│
└── backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py               # 환경변수 관리
│   │   └── database.py             # DB 연결
│   └── api/routes/
│       ├── onboarding.py           # 진단 퀴즈
│       ├── problems.py             # 문제 목록/상세
│       ├── hint.py                 # AI 힌트
│       ├── gate.py                 # 이해 확인 게이트
│       ├── submit.py               # 최종 제출
│       └── stats.py                # 학습 통계
├── problems/                       # YAML 문제 파일 (로컬 전용)
│   ├── beginner/
│   ├── intermediate/
│   └── advanced/
└── sync_problems.py                # YAML → DB 동기화 스크립트
```

---

## 🗄 DB 스키마

```sql
-- 사용자
users
  id, email, declared_level, confirmed_level, onboarding_score

-- 문제
problems
  id, title, description, level, concept_tag,
  test_cases(JSONB), starter_code, order_idx

-- 제출 기록
submissions
  id, user_id, problem_id, code,
  hint_count, gate_passed, gate_attempts, time_spent_sec

-- 게이트 토큰
gate_tokens
  id, user_id, problem_id, token, used, expires_at
```

## 🌿 Git 브랜치 전략
```bash
main        # 배포 브랜치
develop     # 개발 통합 브랜치
feature/*   # 기능 개발
fix/*       # 버그 수정
release/*   # 릴리스 준비
```

**커밋 메시지 규칙**
```bash
feat:     새로운 기능
fix:      버그 수정
chore:    설정/환경 변경
docs:     문서 수정
refactor: 리팩토링
```
## 🚀 로컬 실행 방법

### 사전 준비
- Python 3.10
- Node.js 18+
- Supabase 프로젝트
- Anthropic API Key

### 백엔드 실행
```bash
cd backend
conda activate provgate  # 또는 가상환경 활성화
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

### 환경변수 설정

**backend/.env**
```bash
DATABASE_URL=postgresql+asyncpg://...
ANTHROPIC_API_KEY=sk-ant-...
DEBUG=True
```
**frontend/.env.local**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 문제 DB 동기화
```bash
cd backend
python sync_problems.py
```

---

## 📊 현재 문제 현황
| 난이도 | 문제 수 | 개념 |
|--------|---------|------|
| 입문자 (beginner) | 5개 | 사칙연산, 조건문, 반복문, 리스트, 문자열 |
| 초급자 (intermediate) | 5개 | 딕셔너리, 문자열, 리스트, 정렬 |
| 중급자 (advanced) | 5개 | 재귀, 클래스, 이진탐색, DP, 알고리즘 |

---

## 🗺 로드맵
- [x] v0.1.0 - 기본 인프라 구축
- [x] v0.2.0 - 핵심 기능 구현 (에디터, 힌트, 게이트)
- [x] v0.3.0 - solution() 함수형 방식 + YAML 문제 관리
- [x] v0.4.0 - 타이머 + 학습 통계 대시보드
- [ ] v0.5.0 - 보안 강화 (RLS + JWT)
- [ ] v0.6.0 - 다중 언어 지원 (JavaScript, Java, C/C++)
- [ ] v1.0.0 - MVP 출시 및 피드백 수렴

---

## 👨‍💻 개발자

**장승훈** - 1인 개발 / 기획

- GitHub: [@sHunjang](https://github.com/sHunjang)
- Email: seunghunj922@gmail.com