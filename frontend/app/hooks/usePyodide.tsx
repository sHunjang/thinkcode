"use client";

// useState: Pyodide 로딩 상태 관리
// useEffect: 컴포넌트 마운트 시 Pyodide 로드
// useRef: Pyodide 인스턴스 컴포넌트 리렌더링과 무관하게 유지
//         useState와 달리 값이 바뀌어도 리렌더링 안 됨.
import { useState, useEffect, useRef } from "react";

// Pyodide 타입 정의 - TypeScript용
// 실제 Pyodide는 CDN에서 로드되므로 타입만 가져옴
type PyodideType = {
    runPythonAsync: (code: string) => Promise<unknown>;

    globals: {
        get: (key: string) => unknown;
        set: (key: string, value: unknown) => void;
    };
};

// 전역 window 타입 확장
// Pyodide는 CDN 스크립트로 window.loadPyodide를 주입함
declare global {
    interface Window {
        loadPyodide: (config: { indexURL: string }) => Promise<PyodideType>;
    }
}

export function usePyodide() {
    // Pyodide 인스턴스 - ref로 관리해서 리렌터링 방지
    const pyodideRef = useRef<PyodideType | null>(null);

    // 로딩 상태 관리
    const [loading, setLoading] = useState(true);

    // 에러 상태
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        const loadPyodide = async () => {
            try {
                // Pyodide 스크립트가 이미 로드됐는지 확인
                // 중복 로드 방지 (Strict Mode에서 2번 실행할 수 있음)
                if (pyodideRef.current) return;

                // CDN에서 Pyodide 스크립트 동작 코드
                // 스크립트 태그를 동적으로 생성해서 head에 추가
                if (!document.getElementById("pyodide-script")) {
                    const script = document.createElement("script");

                    script.id = "pyodide-script";
                    script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";

                    document.head.appendChild(script);


                    // 스크립트 로드 완료까지 대기
                    await new Promise<void>((resolve, reject) => {
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error("Pyodide 스크립트 로드 실패"));
                    });
                }

                // Pyodide 초기화
                // indexURL: Pyodide 패키지들의 CDN 주소
                const pyodide = await window.loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
                });

                pyodideRef.current = pyodide;
                setLoading(false);
            } catch (err) {
                setError("Python 환경을 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        };

        loadPyodide();
    }, []);

    // Python 코드 실행 함수
    // Test Case를 코드와 함께 실행되고 결과 반환
    const runCode = async (
        code: string,
        testCases: { input: string, output: string }[]
    ) => {
        if (!pyodideRef.current) {
            return { success: false, message: "Python 환경이 준비되지 않았습니다." };
        }

        // 각 테스트 케이스 실행 결과
        const results = [];

        for (const testCase of testCases) {
            try {
                const wrappedCode = `import sys
from io import StringIO

# 표준 출력을 캡처하기 위해 StringIO로 교체
_stdout = StringIO()
sys.stdout = _stdout

# input() 함수를 mock해서 테스트 입력값 주입
_input_values = ${JSON.stringify(testCase.input.split("\\n"))}
_input_idx = 0

def input(prompt=""):
    global _input_idx
    val = _input_values[_input_idx]
    _input_idx += 1
    return val

# 사용자 코드 실행
${code}

# 출력 결과 캡처
sys.stdout = sys.__stdout__
_result = _stdout.getvalue().strip()
                `;

                // 반환값 대신 전역변수로 겨로가 저장 방식으로 변경
                await pyodideRef.current.runPythonAsync(wrappedCode);
                const output = pyodideRef.current.globals.get("_result") as string ?? "";

                // 실행 결과 가져오기
                const expected = testCase.output.trim();
                const passed = output === expected;

                results.push({
                    passed,
                    output,
                    expected,
                    message: passed ? "통과" : `실패: 예상 ${expected}, 실제 ${output}`,
                });
            } catch (err) {
                // 런타임 에러 (문법 오류, 예외 등)
                results.push({
                    passed: false,
                    output: "",
                    expected: testCase.output,
                    message: `에러: ${err}`,
                });
            }
        }

        // 전체 테스트 결과 요약
        const allPassed = results.every((r) => r.passed);
        return {
            success: allPassed,
            results,
            message: allPassed ? "모든 테스트 통과! 🎉" : `${results.filter((r) => r.passed).length}/${results.length} 통과`,
        };
    };

    return {
        // Pyodide 로딩 중 여부
        loading,

        // 에러 메세지
        error,

        // 코드 실행 함수
        runCode,
    };
}
