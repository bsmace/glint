/**
 * Glint Core - Detection Strategies
 * Implements the Strategy Pattern for site-agnostic input detection.
 * Prioritizes ARIA roles and native HTML5 input methods.
 */

import { z } from "zod";

// --- Schema Definitions for AI Context (Zod) ---
const InputContextSchema = z.object({
  type: z.enum(["text", "textarea", "content-editable", "unknown"]),
  role: z.string().optional(),
  ariaLabel: z.string().optional(),
  placeholder: z.string().optional(),
  hasFocus: z.boolean(),
});

export type InputContext = z.infer<typeof InputContextSchema>;

// --- Strategy Interface ---
export interface DetectionStrategy {
  name: string;
  priority: number; // Lower number = higher priority
  matches(element: Element): boolean;
  extractContext(element: HTMLElement): InputContext;
  highlight(element: HTMLElement): void;
  unhighlight(element: HTMLElement): void;
}

// --- Concrete Strategy: ARIA & Native Inputs ---
export class AriaInputStrategy implements DetectionStrategy {
  name = "AriaInputStrategy";
  priority = 1; // Highest priority

  matches(element: Element): boolean {
    const role = element.getAttribute("role");
    const tagName = element.tagName.toLowerCase();
    
    // Prioritize explicit ARIA textbox/combox roles
    if (role === "textbox" || role === "combobox") return true;
    
    // Fallback to native inputs
    if (tagName === "input" && (element as HTMLInputElement).type === "text") return true;
    if (tagName === "textarea") return true;
    
    return false;
  }

  extractContext(element: HTMLElement): InputContext {
    const role = element.getAttribute("role") || "";
    const isNativeTextarea = element.tagName.toLowerCase() === "textarea";
    const isNativeInput = element.tagName.toLowerCase() === "input";

    return {
      type: isNativeTextarea ? "textarea" : isNativeInput ? "text" : role === "textbox" ? "text" : "unknown",
      role: role || undefined,
      ariaLabel: element.getAttribute("aria-label") || undefined,
      placeholder: element.getAttribute("placeholder") || undefined,
      hasFocus: document.activeElement === element,
    };
  }

  highlight(element: HTMLElement): void {
    // Use CSS Anchor API if available, else fallback to outline
    if (CSS.supports("anchor-name", "--glint-target")) {
      element.style.anchorName = "--glint-target";
    }
    element.style.outline = "2px solid #3b82f6"; // Tailwind blue-500
    element.style.outlineOffset = "2px";
  }

  unhighlight(element: HTMLElement): void {
    element.style.outline = "";
    element.style.outlineOffset = "";
    if (element.style.anchorName === "--glint-target") {
      element.style.anchorName = "";
    }
  }
}

// --- Concrete Strategy: ContentEditable (Rich Text Editors) ---
export class ContentEditableStrategy implements DetectionStrategy {
  name = "ContentEditableStrategy";
  priority = 2;

  matches(element: Element): boolean {
    return element.getAttribute("contenteditable") === "true" || element.getAttribute("contenteditable") === "plaintext-only";
  }

  extractContext(element: HTMLElement): InputContext {
    return {
      type: "content-editable",
      role: element.getAttribute("role") || undefined,
      ariaLabel: element.getAttribute("aria-label") || undefined,
      placeholder: element.getAttribute("placeholder") || undefined,
      hasFocus: document.activeElement === element,
    };
  }

  highlight(element: HTMLElement): void {
    element.style.boxShadow = "0 0 0 2px #10b981"; // Tailwind emerald-500
    element.style.borderRadius = "4px";
  }

  unhighlight(element: HTMLElement): void {
    element.style.boxShadow = "";
    element.style.borderRadius = "";
  }
}

// --- Registry ---
export const defaultStrategies: DetectionStrategy[] = [
  new AriaInputStrategy(),
  new ContentEditableStrategy(),
];
