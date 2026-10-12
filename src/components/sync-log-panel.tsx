/*
  公開版でコピーできる同期ログ。再生は持たない。
*/
import { useEffect, useState } from "react";
import { subscribeSync, syncText } from "@/lib/sync-log";

export function SyncLogPanel() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeSync(() => setText(syncText())), []);

  function copy() {
    const next = syncText();
    setText(next);
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    };
    if (!navigator.clipboard) {
      window.prompt("同期ログ", next);
      return;
    }
    void navigator.clipboard.writeText(next).then(done, () => {
      window.prompt("同期ログ", next);
    });
  }

  return (
    <div className="sync-log" data-ui="">
      <button type="button" className="text-btn" onClick={() => setOpen((value) => !value)}>
        同期ログ
      </button>
      {open ? (
        <>
          <button type="button" className="text-btn" onClick={copy}>
            {copied ? "コピーした" : "コピー"}
          </button>
          <pre>{text || "まだ出ていません"}</pre>
        </>
      ) : null}
    </div>
  );
}
