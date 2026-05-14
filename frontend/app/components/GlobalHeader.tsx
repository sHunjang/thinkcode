"use client";

// usePathname: 현재 URL 경로를 읽어오는 훅
// 어떤 페이지에 있는지 판단해서 조건부 렌더링에 사용
import { usePathname, useRouter } from "next/navigation";
import AuthButton from "@/app/components/AuthButton";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useAuth } from "@/app/hooks/useAuth";

export default function GlobalHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    // 문제 풀이 페이지(/problems/[id])에서는 숨김
    // 조건: /problems/로 시작하고 /problems 자체는 아닌 경우
    // 예: /problems/abc123 → 숨김 (문제 풀이 페이지)
    //     /problems        → 표시 (문제 목록 페이지)
    const isProblemPage = pathname?.startsWith("/problems/") && pathname !== "/problems";

    // 문제 풀이 페이지면 null 반환 (렌더링 안 함)
    // 해당 페이지는 자체 헤더에 AuthButton + ThemeToggle 통합됨
    if (isProblemPage) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            {/* 로그인 상태일 때 유저 정보 + 통계 링크 표시 */}
            {user && (
                <button
                    onClick={() => router.push("/stats")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                        text-xs font-medium transition-all border
                        bg-gray-800 border-gray-600 text-gray-300
                        hover:bg-gray-700"
                >
                    {/* 유저 이메일 앞부분 */}
                    <span>👤</span>
                    {/* <span>{user.email?.split("@")[0]}</span> */}
                    {/* <span className="text-gray-500">·</span> */}
                    <span className="text-indigo-400">내 활동 확인</span>
                </button>
            )}
            <AuthButton />
            <ThemeToggle />
        </div>
    );
}