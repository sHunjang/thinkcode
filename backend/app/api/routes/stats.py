# 학습 통계 조회 라우터
# 유저의 문제 풀이 통계를 1번의 쿼리로 효율적으로 조회

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db


router = APIRouter(prefix="/api/stats", tags=["stats"])


# GET /api/stats/{email}
# 유저 학습 통계 조회
@router.get("/{email}")
async def get_stats(email: str, db: AsyncSession = Depends(get_db)):

    # 1. 유저 존재 여부 확인
    user_result = await db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": email}
    )

    user = user_result.fetchone()


    if not user:
        raise HTTPException(
            status_code=404,
            detail="존재하지 않는 사용자입니다.",
        )
    

    user_id = user._mapping["id"]


    # 2. 1번의 쿼리로 모든 통계 조회
    
    # N+1 문제란?
    #   나쁜 방법: 통계마다 DB 쿼리 1번씩 → 총 N번 호출 (느림)
    #   좋은 방법: 1번의 쿼리로 모든 통계 조회 → 총 1번 호출 (빠름)
    #
    # 사용된 SQL 개념:
    #   FILTER (WHERE 조건): 집계 함수 내부에서 조건 적용
    #     예: COUNT(*) FILTER (WHERE gate_passed = TRUE)
    #         → gate_passed가 TRUE인 행만 카운트
    #
    #   COALESCE(값, 기본값): NULL이면 기본값으로 대체
    #     예: COALESCE(AVG(...), 0)
    #         → 데이터가 없어서 AVG가 NULL이면 0으로 대체
    #
    #   JOIN: 두 테이블을 연결해서 조회
    #     예: submissions JOIN problems
    #         → 제출 기록에서 문제 정보(level 등)도 함께 조회


    stats_result = await db.execute(
        text("""
            SELECT
                -- 전체 완료 문제 수 (gate_passed = TRUE인 것만)
                COUNT(*) FILTER (WHERE gate_passed = TRUE) AS total_completed,
            
                -- 난이도별 완료 문제 수
                -- JOIN으로 가져온 problems.level로 필터링
                COUNT(*) FILTER (WHERE gate_passed = TRUE AND p.level = 'beginner') AS beginner_completed,
                COUNT(*) FILTER (WHERE gate_passed = TRUE AND p.level = 'intermediate') AS intermediate_completed,
                COUNT(*) FILTER (WHERE gate_passed = TRUE AND p.level = 'advanced') AS advanced_completed,
            
                -- 평균 풀이 시간 (완료된 문제만)
                -- COALESCE로 NULL 방지 (제출 기록 없으면 AVG = NULL)
                COALESCE(AVG(s.time_spent_sec) FILTER (WHERE gate_passed = TRUE), 0) AS avg_time_sec,

                -- 총 힌트 사용 횟수
                -- COALESCE로 NULL 방지 (제출 기록 없으면 SUM = NULL)
                COALESCE(SUM(s.hint_count), 0) AS total_hints,

                -- 총 게이트 시도 횟수
                COALESCE(SUM(s.gate_attempts), 0) AS total_gate_attempts

            FROM submissions s

            -- submissions와 problems 테이블 JOIN
            -- s.problem_id = p.id: 제출 기록의 문제 ID로 문제 정보 연결
            JOIN problems p ON s.problem_id = p.id

            WHERE s.user_id = :user_id
        """),
        {"user_id": user_id}
    )

    stats = stats_result.fetchone()


    # 제출 기록이 없으면 기본값 반환
    if not stats:
        return {
            "total_completed": 0,
            "beginner_completed": 0,
            "intermediate_completed": 0,
            "advanced_completed": 0,
            "avg_time_sec": 0,
            "total_hints": 0,
            "total_gate_attempts": 0,
            "recent_submissions": []
        }
    
    stats_dict = dict(stats._mapping)


    # 3. 최근 풀이 히스토리 조회 (최근 5개)

    # 집계 쿼리와 분리한 이유:
    #   COUNT, AVG 같은 집계 함수는 전체를 하나의 행으로 합침
    #   개별 제출 기록은 여러 행이 필요
    #   → 하나의 쿼리에 넣으면 SQL이 복잡해지고 성능도 나빠짐
    #   → 역할에 따라 쿼리를 분리하는 게 더 깔끔함

    recent_result = await db.execute(
        text("""
            SELECT
                p.title,
                p.level,
                p.concept_tag,
                s.time_spent_sec,
                s.hint_count,
                s.gate_passed,
                s.submitted_at
            FROM submissions s
            JOIN problems p ON s.problem_id = p.id
            WHERE s.user_id = :user_id

            -- submitted_at이 NULL인 건 제출 완료가 아니므로 제외
            AND s.submitted_at IS NOT NULL

            -- 최신순 정렬
            ORDER BY s.submitted_at DESC

            -- 최근 5개만 조회
            LIMIT 5
        """),
        {"user_id": user_id}
    )

    recent_submissions = [
        dict(row._mapping) for row in recent_result.fetchall()
    ]

    # submitted_at datetime -> 문자열로 변환
    # JSON 직렬화 시 datetime 타입은 자동 변환 안됨
    # isoformat(): "2026-05-14T20:00:00" 형식으로 변환
    for sub in recent_submissions:
        if sub["submitted_at"]:
            sub["submitted_at"] = sub["submitted_at"].isoformat()
    
    return {
        "total_completed": stats_dict["total_completed"],
        "beginner_completed": stats_dict["beginner_completed"],
        "intermediate_completed": stats_dict["intermediate_completed"],
        "advanced_completed": stats_dict["advanced_completed"],

        # int()로 변환하는 이유:
        # AVG, SUM 결과는 Decimal 타입 → JSON 직렬화 시 에러 발생
        # int()로 변환해서 안전하게 직렬화
        "avg_time_sec": int(stats_dict["avg_time_sec"]),
        "total_hints": int(stats_dict["total_hints"]),
        "total_gate_attempts": int(stats_dict["total_gate_attempts"]),
        "recent_submissions": recent_submissions
    }
