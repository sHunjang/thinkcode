# FastAPI의 라우터 기능 - main.py의 app에 붙일 미니 앱 같은 개념
# 기능별로 라우터를 분리하면 main.py가 복잡해지지 않음
from fastapi import APIRouter, HTTPException

# Pydantic: 요청/응답 데이터의 타입과 형식을 검증해주는 라이브러리
# BaseModel을 상속하면 자동으로 타입 체크 + 에러 메세지 생성
from pydantic import BaseModel

# anthropic: Claude API 공식 Python 라이브러리
import anthropic

# 환경변수에서 API 키 가져오기
from app.core.config import settings


# 이 라우터의 모든 엔드포인트는 /api/onboarding 으로 시작함.
router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

# Claude API 클라이언트 초기화 (싱글톤 패턴)
# 매 요청마다 새로 만들지 않고 모듈 레벨에서 한 번만 생성
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


# 퀴즈 생성 요청 데이터 형식 정의
class QuizGenerateRequest(BaseModel):
    # 사용자가 선택한 수준: "beginner", "intermediate", "advanced" 중 하나
    level: str


# 퀴즈 생성 엔드포인트
# POST /api/onboarding/quiz/generate
@router.post("/quiz/generate")
async def generate_quiz(request: QuizGenerateRequest):
    
    # 유효한 수준인지 검증
    # 딕셔너리를 쓰는 이유: O(1) 조회 - if/elif 체인보다 빠르고 깔끔
    level_description = {
        "beginner": "파이썬 기초 문법을 막 배우기 시작한 수준. 변수, 조건문, 반복문 정도 알고 있음",
        "intermediate": "파이썬 기본 문법은 알고 있고, 함수, 리스트, 딕셔너리를 다룰 수 있는 수준",
        "advanced": "클래스, 재귀, 알고리즘 등 기초를 알고 실무 프로젝트 경험이 있는 수준",
    }

    if request.level not in level_description:
        # 유효하지 않은 수준이면 400 에러 발생
        raise HTTPException(
            status_code=400,
            detail=f"올바르지 않은 수준입니다. beginner/intermediate/advanced 중 하나를 선택하세요."
        )

    level_desc = level_description[request.level]

    
    # Claude API 호출
    # 소크라테스 힌트가 아닌 진단 퀴즈용 프롬프트
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[
            {
                "role": "user",
                "content": f"""당신은 파이썬 코딩 교육 전문가입니다.
다음 수준의 학습자를 위한 진단 퀴즈 5문항을 생성해주세요.
학습자 수준: {request.level}
수준 설명: {level_desc}

요구사항:
1. 각 문항은 객관식 4지선다
2. 실제 이해도를 측정할 수 있는 문제 (단순 암기 말고)
3. 난이도는 아래 해당 수준에 맞게

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{{
    "question": [
        {{
            "id": 1,
            "question": "문제 내용",
            "options": ["A. 보기1", "B. 보기2", "C. 보기3", "D. 보기4"],
            "answer": "A",
            "concept": "측정하는 개념 (예: 반복문)"
        }}
    ]
}}"""
            }
        ]
    )


    # Claude 응답에서 텍스트 추출
    response_text = message.content[0].text


    # JSON 파싱
    import json
    try:
        quiz_data = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="퀴즈 생성 중 오류가 발생했습니다. 다시 시도해주세요."
        )
    
    return {
        "level": request.level,
        "questions": quiz_data["questions"]
    }