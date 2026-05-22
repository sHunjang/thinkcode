# JWT 인증 미들웨어
# Supabase가 발급한 JWT 토큰을 검증해서 유저 정보를 추출
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

from app.core.config import settings

# HTTPBearer: Authorization: Bearer <token> 형식의 헤더를 자동으로 파싱
# auto_error=False: 토큰 없어도 에러 안 냄 (선택적 인증에 사용)
security = HTTPBearer(auto_error=False)

# Supabase 클라이언트 초기화 (싱글톤)
# service_role_key 대신 anon_key 사용 (최소 권한 원칙)
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_ANON_KEY,
)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    JWT 토큰을 검증하고 현재 유저 정보를 반환하는 의존성 함수

    동작 방식:
    1. Authorization 헤더에서 JWT 토큰 추출
    2. Supabase SDK의 get_user()로 토큰 검증
        - Supabase 서버에서 직접 검증하므로 ECC/HS256 모두 지원
        - 토큰 만료, 위조 여부 자동 검증
    3. 검증된 유저 정보 반환
    """

    # 토큰이 없으면 인증 실패
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="인증이 필요합니다. 로그인 후 다시 시도하세요."
        )
    
    token = credentials.credentials


    try:
        
        # Supabase SDK로 토큰 검증
        # get_user(): 토큰을 Supabase 서버에서 직접 검증
        # ECC (P-256), HS256 모두 지원
        response = supabase.auth.get_user(token)

        if not response or not response.user:
            raise HTTPException(
                status_code=401,
                detail="유효하지 않은 토큰입니다."
            )
        
        user = response.user

        return {
            "user_id": str(user.id),
            "email": user.email,
        }
    
    except Exception as e:
        print(f"[AUTH] Error: {e}")
        raise HTTPException(
            status_code=401,
            detail="토큰 검증 실패. 다시 로그인해주세요."
        )