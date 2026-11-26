import React, { useState } from 'react';
import type { SubjectKind } from '../lib/types';
import { BACKGROUNDS, posesFor } from '../lib/options';

interface Props {
  subject: SubjectKind;
  poseKey: string;
  readyPoses: string[];
  disabled: boolean;
  onPose: (key: string, value: string) => void;
  onCustomPose: (text: string) => void;
  onBackground: (label: string, value: string) => void;
}

const MAX_TEXT = 200;

/** Step 4: change the pose or the background of the current look. */
const EditsPanel: React.FC<Props> = ({ subject, poseKey, readyPoses, disabled, onPose, onCustomPose, onBackground }) => {
  const [customPose, setCustomPose] = useState('');
  const [customBg, setCustomBg] = useState('');
  const poses = posesFor(subject);
  const customReady = readyPoses.filter((k) => k.startsWith('custom:'));

  const submitPose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPose.trim() || disabled) return;
    onCustomPose(customPose);
    setCustomPose('');
  };

  const submitBg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBg.trim() || disabled) return;
    onBackground('خلفية مخصوصة', customBg.trim());
    setCustomBg('');
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="step-num bg-cream-200 text-ink">٤</span>
        <div>
          <h2 className="text-base font-bold">الوضعية والخلفية</h2>
          <p className="text-xs text-ink-muted">اختياري، كل تغيير بياخد ثواني</p>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-bold">الوضعية</h3>
      <div className="flex flex-wrap gap-2">
        {poses.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPose(p.key, p.value)}
            disabled={disabled}
            aria-pressed={poseKey === p.key}
            className={`chip ${poseKey === p.key ? 'chip-active' : ''}`}
          >
            {p.label}
            {readyPoses.includes(p.key) && poseKey !== p.key && p.key !== 'default' && <span className="ms-1 text-wine">•</span>}
          </button>
        ))}
        {customReady.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onPose(k, k.slice(7))}
            disabled={disabled}
            aria-pressed={poseKey === k}
            className={`chip max-w-full truncate ${poseKey === k ? 'chip-active' : ''}`}
          >
            {k.slice(7)}
          </button>
        ))}
      </div>
      <form onSubmit={submitPose} className="mt-3 flex gap-2">
        <input
          value={customPose}
          onChange={(e) => setCustomPose(e.target.value.slice(0, MAX_TEXT))}
          placeholder="أو اكتب وضعية: مثلا بتلف شعرها"
          className="field"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !customPose.trim()} className="btn-primary h-11 shrink-0 px-4 text-sm">
          نفّذ
        </button>
      </form>

      <h3 className="mb-2 mt-6 text-sm font-bold">الخلفية</h3>
      <div className="flex flex-wrap gap-2">
        {BACKGROUNDS.map((b) => (
          <button key={b.label} type="button" onClick={() => onBackground(b.label, b.value)} disabled={disabled} className="chip">
            {b.label}
          </button>
        ))}
      </div>
      <form onSubmit={submitBg} className="mt-3 flex gap-2">
        <input
          value={customBg}
          onChange={(e) => setCustomBg(e.target.value.slice(0, MAX_TEXT))}
          placeholder="أو اوصف خلفية: مثلا بلكونة فيها ورد"
          className="field"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !customBg.trim()} className="btn-primary h-11 shrink-0 px-4 text-sm">
          نفّذ
        </button>
      </form>
    </section>
  );
};

export default EditsPanel;
