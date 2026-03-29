"use client";

// CodeMirror 핵심 컴포넌트
// ReactCodeMirror: CodeMirror를 React에서 쓸 수 있게 감싼 래퍼 컴포넌트
import ReactCodeMirror from "@uiw/react-codemirror";

// Python 문법 하이라이팅 확장
import { python } from "@codemirror/lang-python";

// CodeMirror 테마 - VSCode 다크 테마
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

// 에디터 컴포넌트가 받을 props 타입 정의
type CodeEditorProps = {
    // 현재 코드 값
    value: string;

    // 코드가 바뀔 때 호출되는 콜백 함수
    onChange: (value: string) => void;

    // 에디터 높이 (default: 400px)
    height?: string;

    // 읽기 전용 여부 (default: false)
    readOnly?: boolean;
};

export default function CodeEditor({ value, onChange, height = "400px", readOnly = false }: CodeEditorProps) {
    return (
        <div className="rounded-xl overflow-hidden border border-gray-700">
            <ReactCodeMirror
                // 현재 코드 값
                value={value}
                // 코드 변경 시 부모 컴포넌트에 알림
                onChange={onChange}
                // 에디터 높이
                height={height}
                // VSCode 다크 테마 적용
                theme={vscodeDark}
                // Python 문법 하이라이팅 활성화
                extensions={[python()]}
                // 읽기 전용 설정
                editable={!readOnly}
                // 기본 설정
                basicSetup={{
                    // 줄 번호 표시
                    lineNumbers: true,
                    // 현재 줄 하이라이팅
                    highlightActiveLine: true,
                    // 자동 들여쓰기
                    indentOnInput: true,
                    // 괄호 매칭 하이라이팅
                    bracketMatching: true,
                    // 코드 접기
                    foldGutter: true,
                }}
            />
        </div>
    );
}
