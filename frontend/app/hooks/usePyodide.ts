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
            } catch {
                setError("Python 환경을 불러오는 중 오류가 발생했습니다.");
                setLoading(false);
            }
        };

        loadPyodide();
    }, []);

    // Python 코드 실행 함수
    // Test Case를 코드와 함께 실행되고 결과 반환
    const runCode = async (code: string, testCases: { input: string; output: string }[]) => {
        if (!pyodideRef.current) {
            return { success: false, message: "Python 환경이 준비되지 않았습니다." };
        }

        // 각 테스트 케이스 실행 결과
        const results = [];

        for (const testCase of testCases) {
            try {
                // test_cases의 input을 JSON 배열로 파싱
                // 예: "[1, 2]" -> [1, 2] / '["hello", 3]' -> ["hello", 3]
                let parsedInput: unknown[];
                try {
                    parsedInput = JSON.parse(testCase.input);
                } catch {
                    // JSON 파싱 실패 시 문자열 하나짜리 배열로 처리
                    parsedInput = [testCase.input];
                }

                // 기대 출력값도 JSON 파싱 시도
                // 예: "3" -> 3 / '"hello"' -> "hello" / "[1,2]" -> [1,2]
                let parsedExpected: unknown;
                try {
                    parsedExpected = JSON.parse(testCase.output);
                } catch {
                    parsedExpected = testCase.output.trim();
                }

                // solution() 함수 정의 + 호출 + 결과 저장
                // _args로 인자 전달, _result에 반환값 저장
                const wrappedCode = `
import json

# 테스트 인자 - JSON으로 직렬화해서 Python으로 전달
_args = json.loads(${JSON.stringify(JSON.stringify(parsedInput))})

# 사용자가 작성한 solution() 함수 정의
${code}

# solution() 호출 후 결과 저장
_result = solution(*_args)
`;

                await pyodideRef.current.runPythonAsync(wrappedCode);
                const rawOutput = pyodideRef.current.globals.get("_result");

                // Python 결과값을 JS로 변환 후 JSON 직렬화해서 비교
                // 예: Python list [1,2] -> JS Array -> "[1,2]"
                const outputStr = JSON.stringify(rawOutput);
                const expectedStr = JSON.stringify(parsedExpected);

                const passed = outputStr === expectedStr;

                results.push({
                    passed,
                    output: outputStr,
                    expected: expectedStr,
                    message: passed ? "통과" : `실패: 예상 ${expectedStr}, 실제 ${outputStr}`,
                });
            } catch (err) {
                const errorMessage =
                    String(err)
                        .replace("PythonError: Traceback (most recent call last):", "")
                        .trim()
                        .split("\n")
                        .pop() || String(err);

                results.push({
                    passed: false,
                    output: `❌ ${errorMessage}`,
                    expected: testCase.output,
                    message: `에러: ${err}`,
                });
            }
        }

        const allPassed = results.every((r) => r.passed);
        return {
            success: allPassed,
            results,
            message: allPassed
                ? "모든 테스트 통과! 🎉"
                : `${results.filter((r) => r.passed).length}/${results.length} 통과`,
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
