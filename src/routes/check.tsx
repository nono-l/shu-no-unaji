/*
  理解負債。四十問を順に出す。誤答で減り、-300 で反省室。
*/
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CHECK_QUESTIONS, type CheckQuestion } from "@/lib/check-bank";
import {
  CHECK_DEBT_KEY,
  CHECK_GAIN,
  CHECK_LOSS,
  CHECK_MISSED_KEY,
  CHECK_ROOM,
  CHECK_ROUND,
  applyScore,
  drawIds,
  roomOpen,
} from "@/lib/check-run";

export const Route = createFileRoute("/check")({
  component: CheckPage,
  head: () => ({
    meta: [{ title: "理解負債 · 朱のうなじ" }],
  }),
});

const byId = new Map(CHECK_QUESTIONS.map((question) => [question.id, question]));

function readDebt(): number {
  try {
    const debt = Number(localStorage.getItem(CHECK_DEBT_KEY));
    return Number.isFinite(debt) ? debt : 0;
  } catch {
    return 0;
  }
}

function readMissed(): string[] {
  try {
    const raw = localStorage.getItem(CHECK_MISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string" && byId.has(id));
  } catch {
    return [];
  }
}

function writeState(debt: number, missed: string[]) {
  try {
    localStorage.setItem(CHECK_DEBT_KEY, String(debt));
    localStorage.setItem(CHECK_MISSED_KEY, JSON.stringify(missed));
  } catch {
    /* private mode */
  }
}

function CheckPage() {
  const [ready, setReady] = useState(false);
  const [debt, setDebt] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [room, setRoom] = useState(false);
  const [done, setDone] = useState<null | "round" | "room">(null);

  useEffect(() => {
    const nextDebt = readDebt();
    const nextMissed = readMissed();
    setDebt(nextDebt);
    setMissed(nextMissed);
    if (roomOpen(nextDebt)) {
      setRoom(true);
      setQueue(nextMissed.length > 0 ? nextMissed : drawIds(CHECK_QUESTIONS.map((question) => question.id), 12, Math.random));
    } else {
      setQueue(drawIds(CHECK_QUESTIONS.map((question) => question.id), CHECK_ROUND, Math.random));
    }
    setReady(true);
  }, []);

  const question = byId.get(queue[cursor] ?? "");
  const correct = picked != null && question != null && picked === question.answer;

  useEffect(() => {
    if (!picked || !question) return;
    const wait = correct ? 420 : 1500;
    const timer = window.setTimeout(() => {
      setPicked(null);
      if (room) {
        if (!roomOpen(debt)) {
          setRoom(false);
          setDone("room");
          setQueue([]);
          return;
        }
        const rest = queue.filter((id) => id !== question.id);
        const again = correct ? rest : [...rest, question.id];
        setQueue(again.length > 0 ? again : drawIds(CHECK_QUESTIONS.map((item) => item.id), 8, Math.random));
        setCursor(0);
        return;
      }
      if (roomOpen(debt)) {
        setRoom(true);
        setCursor(0);
        setDone(null);
        setQueue(missed.length > 0 ? missed : [question.id]);
        return;
      }
      if (cursor + 1 >= queue.length) {
        setDone("round");
        return;
      }
      setCursor((index) => index + 1);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [picked, question, correct, room, debt, queue, cursor, missed]);

  function choose(choice: string) {
    if (!question || picked) return;
    const hit = choice === question.answer;
    const nextDebt = applyScore(debt, hit, room);
    const nextMissed = hit ? missed.filter((id) => id !== question.id) : [...new Set([...missed, question.id])];
    setDebt(nextDebt);
    setMissed(nextMissed);
    setPicked(choice);
    writeState(nextDebt, nextMissed);
  }

  function again() {
    setDone(null);
    setCursor(0);
    setPicked(null);
    setQueue(drawIds(CHECK_QUESTIONS.map((question) => question.id), CHECK_ROUND, Math.random));
  }

  return (
    <main className="check-page">
      <p className="check-kicker">朱のうなじ</p>
      <h1>理解負債</h1>
      <p className={debt < 0 ? "check-debt check-debt-bad" : "check-debt"}>{debt} 点</p>
      {ready && room ? <p className="check-room-label">反省室</p> : null}
      {!ready ? <p className="check-note">題を切っています。</p> : null}
      {ready && !done && question ? (
        <QuestionView
          question={question}
          index={room ? queue.length : cursor + 1}
          total={room ? null : queue.length}
          picked={picked}
          onChoose={choose}
        />
      ) : null}
      {ready && done ? (
        <section className="check-done">
          <p>{done === "room" ? "反省室を出ました。負債は -300 を超えています。" : "四十問の終わりです。負債は残ります。"}</p>
          <button type="button" className="check-next" onClick={again}>
            もう四十問
          </button>
        </section>
      ) : null}
      <p className="check-rule">
        通常は正解 +{CHECK_GAIN}、誤答 {CHECK_LOSS}。{CHECK_ROOM} 以下で反省室。落とした問いを返すと、誤答と同じ幅だけ戻る。
      </p>
      <Link to="/" className="check-back">
        夜へ戻る
      </Link>
    </main>
  );
}

function QuestionView({
  question,
  index,
  total,
  picked,
  onChoose,
}: {
  question: CheckQuestion;
  index: number;
  total: number | null;
  picked: string | null;
  onChoose: (choice: string) => void;
}) {
  const hit = picked === question.answer;
  return (
    <section className="check-ask">
      <p className="check-count">{total == null ? `残り ${index}` : `${index} / ${total}`}</p>
      <h2>{question.prompt}</h2>
      <div className="check-choices">
        {question.choices.map((choice) => {
          const state = picked == null ? "" : choice === question.answer ? "check-hit" : choice === picked ? "check-miss" : "";
          return (
            <button key={choice} type="button" className={state} disabled={picked != null} onClick={() => onChoose(choice)}>
              {choice}
            </button>
          );
        })}
      </div>
      {picked != null && !hit ? <p className="check-reveal">正は {question.answer}。{question.file}</p> : null}
    </section>
  );
}
