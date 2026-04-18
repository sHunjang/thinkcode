// Supabase 클라이언트 생성 함수
// createBrowserClient: 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트
import { createBrowserClient } from "@supabase/ssr";

// 환경변수에서 Supabase URL과 anon 키를 가져와서 클라이언트 생성
// NEXT_PUBLIC_ 접두사: 브라우저에서 접근 가능한 환경변수
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}