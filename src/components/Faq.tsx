'use client';

import { useId, useState } from 'react';
import { FAQS } from '@/data/content';

/**
 * 回答文は完成デザインに記載がないため未設定です。
 * 回答が決まったら FAQ_ANSWERS に同じ順番で追加してください（空の間は開閉しません）。
 */
const FAQ_ANSWERS: string[] = [];

export default function Faq() {
  const base = useId();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul className="faq__list">
      {FAQS.map((q, i) => {
        const answer = FAQ_ANSWERS[i];
        const isOpen = open === i && Boolean(answer);
        const panelId = `${base}-a${i}`;
        return (
          <li className={`faq__item${isOpen ? ' is-open' : ''}`} key={i}>
            <button
              type="button"
              className="faq__q"
              aria-expanded={isOpen}
              aria-controls={answer ? panelId : undefined}
              onClick={() => answer && setOpen(isOpen ? null : i)}
            >
              <span className="faq__mark" aria-hidden="true">Q</span>
              <span className="faq__text">
                {q.map((line, j) => (
                  <span key={j} className="faq__line">{line}</span>
                ))}
              </span>
              <span className="faq__icon" aria-hidden="true" />
            </button>
            {answer && (
              <div className="faq__a" id={panelId} hidden={!isOpen}>
                <p>{answer}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
