"use client";

import { useState } from "react";

// useParams: URL의 동적 파라미터를 읽어오는 Hook
// /problems/1 -> params.id = "1"
import { useParams } from "next/navigation";
import CodeEditor from "@/app/components/CodeEditor";
import { usePyodide } from "@/app/hooks/usePyodide";

// 테스트 케이스 타입
type TestCase = {
    input: string;
    output: string;
};

// 문제 타입
type Problem = {
    id: string;
    title: string;
    description: string;
    level: string;
    concept_tag: string;
    test_cases: TestCase[];
    starter_code: string;
};

// 테스트 결과 타입
type TestResult = {
    success: boolean;
    message: string;
    results?: {
        passed: boolean;
        output: string;
        expected: string;
        message: string;
    }[];
};

// 임시 문제 데이터 - 나중에 API로 교체
const MOCK_PROBLEM: Problem = {
    id: "1",
    title: "두 수의 합",
    description: `두 정수 a, b를 입력받아 합을 출력하는 프로그램을 작성하세요.
    입력: 두 정수 a, b (공백으로 구분)
    출력: a + b의 값`,
    level: "beginner",
    concept_tag: "입출력, 변수",
    test_cases: [
        { input: "1 2", output: "3" },
        { input: "10 20", output: "30" },
        { input: "-1 1", output: "0" },
    ],
    starter_code: `# 두 수를 입력받아 합을 출력하세요
a, b = map(int, input().split())

# 여기에 코드를 작성하세요
print(a+b)
`,
};

export default function ProblemPage() {
    // URL 파라미터에서 문제 id 가져오기
    const params = useParams();
    const problemId = params.id as string;

    // 현재 에디터 코드 상태
    const [code, setCode] = useState(MOCK_PROBLEM.starter_code);

    // 테스트 실행 결과 상태
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    // 테스트 실행 중 여부
    const [running, setRunning] = useState(false);

    // Pyodide 훅 - Python 실행 환경
    const { loading: pyodideLoading, error: pyodideError, runCode } = usePyodide();

    // 코드 실행 핸들러
    const handleRun = async () => {
        setRunning(true);
        setTestResult(null);

        const result = await runCode(code, MOCK_PROBLEM.test_cases);

        setTestResult(result);
        setRunning(false);
    };

    return (
        <main className="min-h-screen bg-gray-900 text-white">
            {/* 상단 헤더 */}
            <header className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <div>
                    <span className="text-xs text-indigo-400 font-medium uppercase">{MOCK_PROBLEM.concept_tag}</span>
                    <h1 className="text-lg font-bold mt-1">{MOCK_PROBLEM.title}</h1>
                </div>
                {/* Pyodide 로딩 상태 */}
                <div className="flex items-center gap-2">
                    {pyodideLoading ? (
                        <span className="text-xs text-yellow-400">⏳ Python 환경 로딩 중...</span>
                    ) : pyodideError ? (
                        <span className="text-xs text-red-400">❌ Python 로드 실패</span>
                    ) : (
                        <span className="text-xs text-green-400">✅ Python 준비 완료</span>
                    )}
                </div>
            </header>

            {/* 메인 레이아웃 - 좌우 분할 */}
            <div className="flex h-[calc(100vh-64px)]">
                {/* 왼쪽: 문제 설명 */}
                <div className="w-1/2 border-r border-gray-700 p-6 overflow-y-auto">
                    {/* 난이도 뱃지 */}
                    <span className="text-xs px-2 py-1 rounded-full bg-green-900 text-green-300">
                        {MOCK_PROBLEM.level}
                    </span>

                    {/* 문제 설명 */}
                    <div className="mt-4 text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {MOCK_PROBLEM.description}
                    </div>

                    {/* 테스트 케이스 */}
                    <div className="mt-6">
                        <h3 className="text-sm font-bold text-gray-400 mb-3">예제 입출력</h3>
                        {MOCK_PROBLEM.test_cases.map((tc, idx) => (
                            <div
                                key={idx}
                                className="mb-3 bg-gray-800 rounded-lg p-4"
                            >
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">입력</p>
                                        <code className="text-sm text-green-300">{tc.input}</code>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">출력</p>
                                        <code className="text-sm text-blue-300">{tc.output}</code>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 테스트 결과 */}
                    {testResult && (
                        <div
                            className={`mt-6 p-4 rounded-lg ${
                                testResult.success ? "bg-green-900/50" : "bg-red-900/50"
                            }`}
                        >
                            <p className="font-bold mb-3">{testResult.message}</p>
                            {testResult.results?.map((r, idx) => (
                                <div
                                    key={idx}
                                    className="text-sm mb-2 flex items-center gap-2"
                                >
                                    <span>{r.passed ? "✅" : "❌"}</span>
                                    <span className="text-gray-300">
                                        테스트 {idx + 1}: {r.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 오른쪽: 코드 에디터 */}
                <div className="w-1/2 flex flex-col p-6">
                    <CodeEditor
                        value={code}
                        onChange={setCode}
                        height="calc(100vh - 200px)"
                    />

                    {/* 실행 버튼 */}
                    <button
                        onClick={handleRun}
                        disabled={pyodideLoading || running}
                        className={`mt-4 py-3 rounded-xl font-semibold transition-all
                ${
                    pyodideLoading || running
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
                    >
                        {running ? "실행 중..." : "▶ 코드 실행"}
                    </button>
                </div>
            </div>
        </main>
    );
}
