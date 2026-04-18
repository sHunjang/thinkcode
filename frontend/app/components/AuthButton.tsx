"use client";

// useRouter: 페이지 이동
import { useRouter } from "next/navigation";

// useAuth: 인증 상태 관리 커스텀 훅
// user: 현재 로그인한 유저 (null이면 비로그인)
// loading: 인증 확인 중 여부
// signOut: 로그아웃 함수
import { useAuth } from "@/app/hooks/useAuth";

export default function AuthButton() {
    const router = useRouter();
    const { user, loading, signOut } = useAuth();

    // 인증 확인 중에는 버튼 표시 안 함
    if (loading) return null;

    // 로그인 상태일 때
    if (user) {
        return (
            <div className="flex items-center gap-2">
                {/* 유저 이메일 표시 (앞 부분만) */}
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {user.email?.split("@")[0]}
                </span>
                {/* 로그아웃 버튼 */}
                <button
                    onClick={async () => {
                        await signOut();
                        router.push("/auth/login");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full
                        text-xs font-medium transition-all border
                        bg-gray-800 border-gray-600 text-gray-300
                        hover:bg-gray-700"
                >
                    로그아웃
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => router.push("/auth/login")}
            className="flex items-center gap-1 px-4 py-2 rounded-full
            text-sm font-medium transition-all border
            bg-indigo-600 border-indigo-500 text-white
            hover:bg-indigo-700"
        >
            🔐 로그인
        </button>
    );
}
