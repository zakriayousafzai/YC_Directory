type MDEditorMockProps = {
  value?: string;
  onChange?: (value?: string) => void;
  id?: string;
};

export default function MDEditorMock({
  value,
  onChange,
  id,
}: MDEditorMockProps) {
  return (
    <textarea
      id={id}
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}
