/**
 * Human handoff detection — aligned with Nexus Lead Suite ai_chat heuristics.
 */

const HANDOFF_USER =
  /\b(talk\s+to\s+(a\s+)?(human|person|agent|representative|someone|real\s+person|staff|team\s+member)|speak\s+to\s+(a\s+)?(human|person|agent|representative)|live\s+(agent|person|support|chat|rep)|real\s+(human|person)|connect\s+me\s+with|transfer\s+(me\s+)?to\s+(a\s+)?(human|agent|person)|i\s+want\s+(a\s+)?(human|person|agent)|need\s+(a\s+)?(human|person|agent)|customer\s+(service|support)|help\s?desk|service\s?desk)\b/i;

const HANDOFF_SHORT =
  /\b(agent|human|person|live|support|helpdesk|help\s*desk|callback|call\s?back|escalate|escalation|handoff|hand-?off)\b/i;

const HANDOFF_ANSWER =
  /\b(i\s+(don'?t|do not)\s+(know|have)|cannot\s+(help|answer)|unable\s+to\s+(help|answer)|not\s+sure|don'?t\s+have\s+that\s+(info|information)|please\s+(contact|call|email)|reach\s+out\s+to\s+(us|our\s+team))\b/i;

export function detectHandoffIntent(message: string): boolean {
  const text = String(message ?? "").trim();
  if (!text) return false;
  const words = text.split(/\s+/).filter(Boolean);
  const isQuestion = /\?\s*$/.test(text) || /^(what|how|when|where|why|who|can|do|does|is|are)\b/i.test(text);
  const shortHit =
    !isQuestion && words.length > 0 && words.length <= 4 && HANDOFF_SHORT.test(text);
  return HANDOFF_USER.test(text) || shortHit;
}

export function detectHandoffInAnswer(answer: string): boolean {
  return HANDOFF_ANSWER.test(String(answer ?? ""));
}
