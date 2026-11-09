import { injectGlobal } from '@emotion/css';

injectGlobal`
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.text-button,
.inline-button {
  min-height: 2.75rem;
  padding: 0.45rem 0.75rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-primary-dark);
  font-weight: 750;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
  cursor: pointer;
}

.property-page {
  --page-inline-padding: 1rem;

  min-height: 100%;
  padding: 0 var(--page-inline-padding) 1.5rem;
  background: var(--color-canvas);
}

.property-page.checklist-editor-page {
  padding-top: 0.5rem;
}

.page-container {
  width: min(100%, 1080px);
  margin: 0 auto;
}

.page-container--form {
  max-width: 640px;
}

.top-navigation-danger-action {
  min-height: 2.25rem;
  padding: 0.35rem 0.25rem;
  border: 0;
  background: transparent;
  color: var(--color-error);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.content-state {
  display: grid;
  min-height: 7rem;
  align-content: center;
  justify-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
  padding: 1rem;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 72%, transparent);
  color: var(--color-ink-soft);
  text-align: center;
}

.content-state strong {
  color: var(--color-ink);
  font-size: 0.82rem;
}

.content-state a {
  color: var(--color-primary-dark);
  font-weight: 750;
}

.content-state-screen {
  display: grid;
  min-height: 85dvh;
  place-items: center;
}

.content-state--page {
  min-height: 0;
  margin-top: 0;
  padding: 2rem 1rem;
  border: 0;
  background: transparent;
}

.content-state--page strong {
  font-size: 1.05rem;
}

.content-state--page > span {
  font-size: 0.9rem;
}

.content-state--error {
  border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
  background: var(--color-error-surface);
}

.content-state--page.content-state--error {
  border-color: transparent;
  background: transparent;
}

.section-note,
.field-help {
  color: var(--color-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.field-error,
.form-error {
  color: var(--color-error);
}

.field-error,
.field-help {
  margin: 0;
  font-size: 0.78rem;
}

.form-error,
.form-notice {
  margin: 0 0 0.85rem;
  padding: 0.75rem 0.85rem;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  line-height: 1.5;
}

.form-error {
  background: var(--color-error-surface);
}

.form-error a {
  color: var(--color-primary-dark);
  font-weight: 750;
}

.form-notice {
  background: var(--color-surface-muted);
  color: var(--color-primary-dark);
}

.load-more {
  max-width: 28rem;
  margin: 1rem auto 0;
  text-align: center;
}

.load-more p {
  color: var(--color-error);
  font-size: 0.82rem;
}

.spinner {
  width: 1.4rem;
  height: 1.4rem;
  border: 3px solid color-mix(in srgb, var(--color-primary) 24%, transparent);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 340px) {
  .property-page {
    --page-inline-padding: 0.7rem;
  }
}
`;
