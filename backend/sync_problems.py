# YAML 파일을 읽어서 DB에 동기화는 스크립트
# 실행 방법: python sync_problems.py

import asyncio
import yaml
import os
import json
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv


# 환경변수 로드 (.env 파일)
load_dotenv()


# DB 연결 생성
DATABASE_URL = str(os.getenv("DATABASE_URL"))


# 비동기 엔진 생성
engine = create_async_engine(DATABASE_URL, echo=False)


# 세션 팩토리 생성
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


# YAML 파일이 있는 루트 폴더
PROBLEMS_DIR = Path(__file__).parent / "problems"


async def sync_problems():
    """YAML 파일을 읽어서 DB에 upsert (없으면 insert, 있으면 update)"""

    async with AsyncSessionLocal() as db:

        # 동기화 카운터
        inserted = 0
        updated = 0


        # beginner / intermediate / advanced 폴더 순회
        for level_dir in sorted(PROBLEMS_DIR.iterdir()):

            # 폴더가 아니면 스킵
            if not level_dir.is_dir():
                continue

            print(f"\n📂 {level_dir.name} 폴더 처리 중...")


            # 폴더 안의 yaml 파일 순회
            for yaml_file in sorted(level_dir.glob("*.yaml")):
                print(f"  📂 {yaml_file.name} 읽는 중 ...")

                # YAML 파일 읽기
                with open(yaml_file, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                

                # test_cases를 JSON 문자열로 변환
                # DB의 JSONB 컬럼에 저장하기 위해
                test_cases_json = json.dumps(data["test_cases"], ensure_ascii=False)

                # DB에서 upsert
                # title이 같으면 update, 없으면 insert
                result = await db.execute(
                    text("""
                        INSERT INTO problems (
                            title, description, level, concept_tag,
                            test_cases, starter_code, order_idx
                        )
                        VALUES (
                            :title, :description, :level, :concept_tag,
                            :test_cases, :starter_code, :order_idx
                        )
                        ON CONFLICT (title)
                        DO UPDATE SET
                            description = EXCLUDED.description,
                            level = EXCLUDED.level,
                            concept_tag = EXCLUDED.concept_tag,
                            test_cases = EXCLUDED.test_cases,
                            starter_code = EXCLUDED.starter_code,
                            order_idx = EXCLUDED.order_idx
                        RETURNING id, (xmax = 0) AS is_inserted
                    """),
                    {
                        "title": data["title"],
                        "description": data["description"],
                        "level": data["level"],
                        "concept_tag": data["concept_tag"],
                        "test_cases": test_cases_json,
                        "starter_code": data["starter_code"],
                        "order_idx": data["order_idx"],
                    }
                )

                row = result.fetchone()

                # row가 None이 아닐 때만 처리
                if row is None:
                    print(f"    ⚠️ 처리 실패: {data['title']}")
                    continue

                # 삽입/업데이트 카운터
                if row._mapping["is_inserted"]:
                    inserted += 1
                    print(f"    ✅ INSERT: {data['title']}")
                
                else:
                    updated += 1
                    print(f"    🔄 UPDATE: {data['title']}")
        
        await db.commit()

        print(f"\n🎉 동기화 완료!")
        print(f"   INSERT: {inserted}개")
        print(f"   UPDATE: {updated}개")


if __name__ == "__main__":
    asyncio.run(sync_problems())