# 소크라테스식 힌트 생성 라우터
# 소트라테스식: 정답을 직접 알려주지 않고 질문으로 유도하는 방식
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import anthropic
import json

from app.core.config import settings
from app.core.database import get_db

router = APIRouter(prefix="/api/hint", tags=["hint"])


# Claude API 클라이언트 초기화
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


# 힌트 요청 데이터 형식
class HintRequest(BaseModel):
    # 문제 ID - DB에서 문제 정보 조회용
    problem_id: str

    # 사용자 현재 코드 - 어디서 막혔는지 파악용
    current_code: str

    # 현재 힌트 단계 (1, 2, 3)
    # 단계가 높을수록 더 구체적인 힌트 제공
    hint_step: int

    # 사용자 이메일 - 힌트 사용 횟수 기록용
    email: str


# POST /api/hint
@router.post("")
async def generate_hint(
    request: HintRequest,
    db: AsyncSession = Depends(get_db)
):
    
    # 힌트 단계 검증
    if request.hint_step not in [1, 2, 3]:
        raise HTTPException(
            status_code=400,
            detail="힌트 단계는 1, 2, 3 중 하나여야 합니다."
        )
    
    # DB에서 문제 정보 조회
    result = await db.execute(
        text("SELECT title, description, concept_tag, starter_code FROM problems WHERE id = :id"),
        {"id": request.problem_id}
    )
    problem = result.fetchone()

    if not problem:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    
    problem_data = dict(problem._mapping)


    # 힌트 단계별 구체성 조절
    # 단계가 높을수록 더 직접적인 힌트
    hint_level_desc = {
        1: "Very abstract hint. Only point out which line needs work and suggest direction. Never mention specific methods.",
        2: "Intermediate hint. Point out the problematic line and mention what concept or approach to use, but never show code.",
        3: "Specific hint. Point out the line and tell what function or syntax to use, but never show complete code.",
    }

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system="""You are a friendly Python coding tutor.
    Help learners solve problems through Socratic questioning.
    Never reveal the answer or show complete code directly.
    Always respond in Korean. Keep responses concise and structured.
    Output plain text only. Never use markdown formatting like **bold** or ## headers.""",
        messages=[
            {
                "role": "user",
                "content": f"""Provide a hint for the following problem.

    [Problem Information]
    Title: {problem_data['title']}
    Description: {problem_data['description']}
    Concept: {problem_data['concept_tag']}

    [Starter Code - This is given to learner, do NOT analyze or comment on this part]
    ```python
    {problem_data['starter_code']}
    ```

    [Learner's Current Code - Analyze only the lines the learner wrote AFTER the starter code]
    ```python
    {request.current_code}
    ```

    [Hint Step]
    Step {request.hint_step}: {hint_level_desc[request.hint_step]}

    Format your response EXACTLY like this (plain text, no markdown):

    📍 코드 분석
    줄 {{번호}}: {{해당 줄에서 무엇이 부족하거나 개선이 필요한지}}
    (학습자가 작성한 코드가 starter_code와 동일하거나 비어있으면 "아직 풀이 코드를 작성하지 않으셨네요!" 라고만 작성)

    💡 핵심 힌트
    (1줄로 핵심 방향만 제시)

    🤔 생각해보세요
    (1가지 소크라테스식 질문)

    Rules:
    - Never reveal the answer or show complete code
    - Keep response concise and under 150 words in Korean
    - Analyze ONLY the lines learner wrote, not the starter code
    - No markdown formatting (no **, no ##, no backticks)
    - Plain text only"""
            }
        ]
    )

    hint_text = next(
        (block.text for block in message.content
        if isinstance(block, anthropic.types.TextBlock)),
        ""
    )

    # 힌트 사용 횟수 DB 기록
    # submissions 테이블에 hint_count 업데이트
    await db.execute(
        text("""
INSERT INTO submissions (user_id, problem_id, code, hint_count)
SELECT u.id, :problem_id, :code, 1
FROM users u
WHERE u.email = :email
ON CONFLICT (user_id, problem_id)
DO UPDATE SET
    hint_count = submissions.hint_count + 1,
    code = :code
"""),
    {
        "problem_id": request.problem_id,
        "code": request.current_code,
        "email": request.email,
    }
    )

    await db.commit()

    return {
        "hint": hint_text,
        "hint_step": request.hint_step,
    }